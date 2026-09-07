import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoVedereDatiMedici } from '@/lib/medico';
import {
  etichettaRuolo,
  haIncarichi,
  isAdmin,
  puoAmministrare,
  puoGestirePagamenti,
  puoVedereNuovi,
  vedeAreaTesseramento,
  vedeAttivitaSquadra,
} from '@/lib/domain';
import { Nav, type VoceMenu } from '@/components/Nav';
import { puoVedereMerchandising } from '@/lib/mercatino';
import { inTest } from '@/lib/ambiente';
import { esci } from '@/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const utente = await requireUser();

  // password generata dall'admin: prima di ogni altra cosa se ne sceglie una
  // propria. La pagina sta fuori da questo gruppo, altrimenti si rimanderebbe
  // a se stessa
  if (utente.deveCambiarePassword) redirect('/cambia-password');

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

  const voci: VoceMenu[] = [
    { href: '/dashboard', label: 'Situazione', icona: 'dashboard', gruppo: 'principale' },
    { href: '/calendario', label: 'Calendario', icona: 'calendario', gruppo: 'principale' },
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
  }

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
    });
  }

  // le note se le scrive chi ha un incarico, e le rilegge solo lui: la voce sta
  // fra le cose operative perché è lì che si usa, non in un'area riservata
  if (haIncarichi(utente.roles)) {
    voci.push({ href: '/note', label: 'Note', icona: 'bozza', gruppo: 'principale' });
  }

  // i contatti li seguono comando, amministrazione e segreteria: sono gli unici
  // a vederli con nome e cognome e ad aprirne la scheda
  if (puoVedereNuovi(utente.roles)) {
    voci.push({
      href: '/admin/nuovi',
      label: 'Nuovi',
      icona: 'nuovi',
      gruppo: 'amministrazione',
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

  if (puoVedereDatiMedici(utente.roles)) {
    voci.push({
      href: '/ice',
      label: 'ICE · emergenze',
      icona: 'stellaVita',
      gruppo: 'amministrazione',
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
    );
  }

  if (isAdmin(utente.roles)) {
    voci.push(
      { href: '/admin/operatori', label: 'Operatori', icona: 'operatori', gruppo: 'comando' },
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

      <main className="px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
