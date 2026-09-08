import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoVedereDatiMedici } from '@/lib/medico';
import {
  certificatoInScadenza,
  etichettaRuolo,
  inRegola,
  statoEffettivo,
  haIncarichi,
  isAdmin,
  puoAmministrare,
  puoGestirePagamenti,
  puoModerareChat,
  puoVedereNuovi,
  puoVedereOperatori,
  vedeAreaTesseramento,
  vedeAttivitaSquadra,
} from '@/lib/domain';
import { filtroVisibilita } from '@/lib/query';
import { mancanze, qualcosaManca } from '@/lib/consensi';
import { Nav, type VoceMenu } from '@/components/Nav';
import { ContenitoreToast } from '@/components/Toast';
import { puoVedereMerchandising } from '@/lib/mercatino';
import { inTest } from '@/lib/ambiente';
import { esci } from '@/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const utente = await requireUser();

  // password generata dall'admin: prima di ogni altra cosa se ne sceglie una
  // propria. La pagina sta fuori da questo gruppo, altrimenti si rimanderebbe
  // a se stessa
  if (utente.deveCambiarePassword) redirect('/cambia-password');

  // Poi i consensi: informativa privacy e regole del club sono obbligatorie,
  // la scelta sulle foto va fatta — in un senso o nell’altro. Anche questa
  // pagina sta fuori dal gruppo, o si rimanderebbe a sé stessa.
  const daAccettare = await mancanze(utente.id);
  if (qualcosaManca(daAccettare)) redirect('/consensi');

  // contatori mostrati come pallino accanto alle voci di back office
  let certificatiDaVagliare = 0;
  let richiesteDaValutare = 0;
  if (puoAmministrare(utente.roles)) {
    [certificatiDaVagliare, richiesteDaValutare] = await Promise.all([
      prisma.medicalCertificate.count({ where: { status: 'IN_ATTESA' } }),
      prisma.membership.count({ where: { status: 'COMPILATA' } }),
    ]);
  }

  // chi si e' registrato e non e' ancora stato guardato in faccia da chi sta
  // navigando: il pallino resta finche' non se ne apre la scheda, e la lettura
  // e' di chi legge, non della squadra
  const nuoviDaLeggere = puoVedereNuovi(utente.roles)
    ? await prisma.user.count({
        where: {
          stato: 'NUOVO',
          NOT: { letturaDaAltri: { some: { lettoreId: utente.id } } },
        },
      })
    : 0;

  // cosa aspetta la segreteria: incassi segnalati da verificare e rimborsi da
  // erogare. Sul badge vanno insieme, perché in entrambi i casi c'è una
  // persona che sta aspettando una risposta
  // gli ordini del merchandising che aspettano: finché la raccolta è aperta
  // c'è un giro da chiudere, ed è una cosa da fare come le altre
  const ordiniInRaccolta = puoGestirePagamenti(utente.roles)
    ? await prisma.ordine.count({ where: { stato: 'RACCOLTA' } })
    : 0;

  // i riordini al fornitore ancora da pagare: sono soldi che devono uscire, e
  // un ordine aperto dimenticato è merce che non arriva
  const riordiniDaPagare = puoGestirePagamenti(utente.roles)
    ? await prisma.riordino.count({ where: { stato: 'APERTO' } })
    : 0;

  const [pagamentiDaConfermare, rimborsiDaErogare] = puoGestirePagamenti(utente.roles)
    ? await Promise.all([
        prisma.payment.count({
          where: { status: { not: 'PAGATO' }, dichiaratoIl: { not: null } },
        }),
        prisma.payment.count({
          where: { tipo: 'RIMBORSO', status: { notIn: ['PAGATO', 'ANNULLATO'] } },
        }),
      ])
    : [0, 0];

  // Quello che devo io: senza il pallino, una quota appena addebitata resta
  // invisibile finché non si apre la pagina per caso. I rimborsi non contano —
  // sono soldi in arrivo, non una cosa da fare.
  const mieiPagamentiAperti = await prisma.payment.count({
    where: {
      userId: utente.id,
      status: { in: ['DA_PAGARE', 'PARZIALE'] },
      tipo: { not: 'RIMBORSO' },
    },
  });

  // Le attività rilasciate che questa persona non ha ancora aperto. È il
  // pallino sul calendario: senza, un'attività appena pubblicata la scopre
  // solo chi passa di lì per caso.
  const inizioDiOggi = new Date();
  inizioDiOggi.setHours(0, 0, 0, 0);
  const attivitaNuove = await prisma.event.count({
    where: {
      AND: [
        filtroVisibilita(utente.stato),
        { status: 'RILASCIATA' },
        { inizio: { gte: inizioDiOggi } },
        { letture: { none: { userId: utente.id } } },
      ],
    },
  });

  // il carrello è uno solo e attraversa il catalogo: il pallino dice quanti
  // pezzi ci sono dentro, o uno lo dimentica pieno per settimane
  const nelCarrello = puoVedereMerchandising(utente.stato)
    ? await prisma.rigaCarrello.aggregate({
        where: { userId: utente.id },
        _sum: { quantita: true },
      })
    : null;

  // i messaggi che qualcuno ha trovato fuori posto: il pallino resta finché
  // non li si è guardati, perché una segnalazione lasciata lì è una persona
  // che non ha avuto risposta
  const segnalazioniAperte = puoModerareChat(utente.roles)
    ? await prisma.segnalazione.count({ where: { stato: 'APERTA' } })
    : 0;

  // Il proprio certificato: il pallino si accende quando manca, è scaduto o
  // sta per scadere. È l'unico avviso che si può dare — non c'è una posta a cui
  // scrivere — e arriva un mese prima, che è il tempo che serve per prenotare
  // la visita e rifarla.
  const certificatiMiei = vedeAreaTesseramento(utente.stato)
    ? await prisma.medicalCertificate.findMany({
        where: { userId: utente.id },
        select: { status: true, scadeIl: true },
      })
    : [];

  const certificatoDaFare =
    vedeAreaTesseramento(utente.stato) &&
    (!inRegola(certificatiMiei) ||
      certificatiMiei.some(
        (c) => statoEffettivo(c) === 'VALIDO' && certificatoInScadenza(c.scadeIl),
      ))
      ? 1
      : 0;

  const voci: VoceMenu[] = [
    { href: '/dashboard', label: 'Home', icona: 'dashboard', gruppo: 'principale' },
    {
      href: '/calendario',
      label: 'Calendario',
      icona: 'calendario',
      gruppo: 'principale',
      badge: attivitaNuove,
    },
    { href: '/profilo', label: 'Profilo', icona: 'profilo', gruppo: 'principale' },
    {
      href: '/pagamenti',
      label: 'Miei pagamenti',
      icona: 'pagamenti',
      gruppo: 'principale',
      badge: mieiPagamentiAperti,
    },
    // vale per tutti: una chiave non dà poteri, eredita quelli di chi la crea
    { href: '/assistente', label: 'Assistente', icona: 'chiave', gruppo: 'principale' },
  ];

  // Mercatino e merchandising sono due cose diverse, non un filtro dello stesso
  // elenco — e nemmeno le vede la stessa gente. L'usato passa di mano fra soci
  // e non costa niente alla squadra, quindi lo sfoglia chiunque; le magliette
  // le fa fare e le paga il club, e chi al club non appartiene ancora non ha
  // motivo di vederne il catalogo.
  voci.push({ href: '/mercatino', label: 'Usato', icona: 'mercatino', gruppo: 'mercatino' });
  if (puoVedereMerchandising(utente.stato)) {
    voci.push({
      href: '/merchandising',
      label: 'Merchandising',
      icona: 'maglietta',
      gruppo: 'mercatino',
    });
    voci.push({
      href: '/mercatino/carrello',
      label: 'Carrello',
      icona: 'carrello',
      gruppo: 'mercatino',
      badge: nelCarrello?._sum.quantita ?? 0,
    });
  }

  // le regole della bacheca si leggono mentre la si usa, non andandole a
  // cercare in un'altra sezione: è lo stesso documento che sta fra i
  // regolamenti, aperto da dove serve
  voci.push({
    href: '/mercatino/regolamento',
    label: 'Regolamento',
    icona: 'regolamento',
    gruppo: 'mercatino',
  });

  // I regolamenti li legge chiunque abbia un account, contatti compresi: sono
  // quello che si mostra a chi si sta affacciando. Lo statuto no — dice come
  // funziona il team, e riguarda chi è dentro.
  voci.push({
    href: '/regolamenti',
    label: 'Regolamenti',
    icona: 'regolamento',
    gruppo: 'regolamenti',
  });
  if (vedeAttivitaSquadra(utente.stato)) {
    voci.push({ href: '/statuto', label: 'Statuto', icona: 'bozza', gruppo: 'regolamenti' });
  }

  // certificati e tesseramento hanno senso solo per chi è in squadra
  if (vedeAreaTesseramento(utente.stato)) {
    voci.splice(3, 0, {
      href: '/certificati',
      label: 'Miei certificati',
      icona: 'certificato',
      gruppo: 'principale',
      badge: certificatoDaFare,
    });
  }

  // le note se le scrive chi ha un incarico, e le rilegge solo lui: la voce sta
  // fra le cose operative perché è lì che si usa, non in un'area riservata
  if (haIncarichi(utente.roles)) {
    voci.push({ href: '/note', label: 'Note', icona: 'bozza', gruppo: 'principale' });
  }

  // Le persone stanno in un gruppo loro: chi è già in squadra e chi si sta
  // affacciando sono la stessa cosa in due momenti diversi, e chi le segue
  // apre l'una o l'altra pagina di continuo. In mezzo ai dati di base — campi,
  // tariffe, tipologie — ci finivano solo perché lì c'era posto.
  if (puoVedereOperatori(utente.roles)) {
    voci.push({ href: '/admin/operatori', label: 'Operatori', icona: 'operatori', gruppo: 'persone' });
  }
  if (puoVedereNuovi(utente.roles)) {
    voci.push({
      href: '/admin/nuovi',
      label: 'Nuovi',
      icona: 'nuovi',
      gruppo: 'persone',
      badge: nuoviDaLeggere,
    });
  }

  if (puoAmministrare(utente.roles)) {
    voci.push(
      { href: '/admin/inviti', label: 'Invio richieste', icona: 'nuovi', gruppo: 'amministrazione' },
      {
        href: '/admin/richieste',
        label: 'Richieste iscrizione',
        icona: 'iscrizioni',
        gruppo: 'amministrazione',
        badge: richiesteDaValutare,
      },
      {
        href: '/admin/certificati',
        label: 'Certificati medici',
        icona: 'certificato',
        gruppo: 'amministrazione',
        badge: certificatiDaVagliare,
      },
      { href: '/admin/tessere', label: 'Tessere FIGT', icona: 'tessera', gruppo: 'amministrazione' },
    );
  }

  // L'elenco ICE di tutti lo apre solo l'admin: è l'anagrafica sanitaria della
  // squadra in una pagina sola, e non serve a nessun altro averla sott'occhio.
  // Quello che serve in campo — i dati di chi c'è quel giorno — sta dentro
  // l'attività, dove lo vedono admin e team leader.
  if (isAdmin(utente.roles)) {
    voci.push({
      href: '/ice',
      label: 'ICE · emergenze',
      icona: 'stellaVita',
      gruppo: 'amministrazione',
    });
  }

  // Moderazione: è un ruolo suo, e può essere l'unico che uno ha. La voce
  // compare a chi modera, admin compreso.
  if (puoModerareChat(utente.roles)) {
    voci.push({
      href: '/admin/segnalazioni',
      label: 'Segnalazioni',
      icona: 'commento',
      gruppo: 'amministrazione',
      badge: segnalazioniAperte,
    });
  }

  if (puoGestirePagamenti(utente.roles)) {
    voci.push(
      {
        href: '/admin/pagamenti',
        label: 'Pagamenti',
        icona: 'pagamenti',
        gruppo: 'segreteria',
        badge: pagamentiDaConfermare + rimborsiDaErogare,
      },
      { href: '/admin/cassa', label: 'Cassa', icona: 'incassa', gruppo: 'segreteria' },
      {
        href: '/admin/ordini',
        label: 'Ordini',
        icona: 'carrello',
        gruppo: 'segreteria',
        badge: ordiniInRaccolta,
      },
      {
        href: '/admin/inventario',
        label: 'Inventario',
        icona: 'maglietta',
        gruppo: 'segreteria',
        badge: riordiniDaPagare,
      },
    );
  }

  if (isAdmin(utente.roles)) {
    voci.push(
      { href: '/admin/ruoli', label: 'Ruoli', icona: 'chiave', gruppo: 'comando' },
      { href: '/admin/campi', label: 'Campi', icona: 'campi', gruppo: 'comando' },
      { href: '/admin/squadre', label: 'Squadre esterne', icona: 'squadra', gruppo: 'comando' },
      { href: '/admin/stagioni', label: 'Stagioni', icona: 'calendario', gruppo: 'comando' },
      { href: '/admin/tariffe', label: 'Tariffario', icona: 'pagamenti', gruppo: 'comando' },
      { href: '/admin/tipologie', label: 'Tipologie attività', icona: 'bozza', gruppo: 'comando' },
      { href: '/admin/metodi', label: 'Metodi di pagamento', icona: 'incassa', gruppo: 'comando' },
      { href: '/admin/statistiche', label: 'Statistiche', icona: 'grafici', gruppo: 'comando' },
      { href: '/admin/messaggi', label: 'Messaggi WhatsApp', icona: 'whatsapp', gruppo: 'comando' },
    );
  }

  const ruoli =
    utente.roles.length > 0
      ? utente.roles.map((r) => etichettaRuolo[r]).join(' · ')
      : 'Nuovo';

  return (
    <div className="min-h-screen md:pl-60">
      <Nav
        voci={voci}
        utente={{
          nome: utente.nome,
          cognome: utente.cognome,
          callsign: utente.callsign,
          ruolo: ruoli,
        }}
        esci={esci}
      />
      {/* in test si deve vedere a colpo d'occhio: confondere i due ambienti
          vuol dire scrivere sui dati veri credendo di giocare */}
      {inTest && (
        <div className="sticky top-0 z-40 border-b border-warn/50 bg-warn/20 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-warn">
          Ambiente di test
        </div>
      )}

      <ContenitoreToast />

      <main className="px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
