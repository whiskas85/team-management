import { redirect } from 'next/navigation';
import { requireUser, segnaAttivita } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoVedereDatiMedici } from '@/lib/medico';
import {
  certificatoInScadenza,
  inRegola,
  statoEffettivo,
  haIncarichi,
  isAdmin,
  puoAmministrare,
  puoGestirePagamenti,
  inAttesaDiApprovazione,
  puoModerareChat,
  puoVedereNuovi,
  puoVedereOperatori,
  vedeAreaTesseramento,
  vedeAttivitaSquadra,
  vedeDebriefing,
} from '@/lib/domain';
import { attivitaDaCoprire } from '@/lib/assicurazione';
import { loRiguarda } from '@/lib/sondaggi';
import { filtroBacheche, puoCreareBacheche } from '@/lib/bacheche';
import { filtroVisibilita } from '@/lib/query';
import { iniziali } from '@/lib/format';
import { mancanze, qualcosaManca } from '@/lib/consensi';
import { Nav, type VoceMenu } from '@/components/Nav';
import { ContestoMenu } from '@/components/ContestoMenu';
import { Diario } from '@/components/Diario';
import { ContenitoreToast } from '@/components/Toast';
import { puoVedereMerchandising } from '@/lib/mercatino';
import { inTest } from '@/lib/ambiente';
import { esci } from '@/actions/auth';
import { Aggiornamento } from '@/components/Aggiornamento';
import { InvitoNotifiche } from '@/components/InvitoNotifiche';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const utente = await requireUser();

  // password generata dall'admin: prima di ogni altra cosa se ne sceglie una
  // propria. La pagina sta fuori da questo gruppo, altrimenti si rimanderebbe
  // a se stessa
  // Passa di qui ogni pagina dell'applicazione, ed è il posto giusto per
  // segnare che questa persona la sta usando: si scrive al massimo ogni cinque
  // minuti, e non si aspetta il risultato — la pagina non deve rallentare per
  // un dato di comodo.
  void segnaAttivita(utente);

  if (utente.deveCambiarePassword) redirect('/cambia-password');

  // Chi si è registrato da solo aspetta il via libera, e finché aspetta vede
  // una pagina sola: prima ancora dei consensi, perché non c'è niente da
  // acconsentire se non si è ancora entrati.
  if (inAttesaDiApprovazione(utente.stato)) redirect('/in-attesa');

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

  // Due conti diversi sulla stessa voce di menu:
  //
  // - chi si è iscritto dal sito e **aspetta una risposta**: è una cosa da
  //   fare, e vale per tutti quelli che la possono fare;
  // - chi è già un contatto ma non l'ha ancora guardato in faccia **chi sta
  //   navigando**: quel pallino è personale e si spegne aprendo la scheda.
  //
  // Sul badge finiscono insieme, perché insieme rispondono alla domanda
  // «quante persone mi stanno aspettando da quella parte?».
  const [daApprovare, nuoviDaLeggere] = puoVedereNuovi(utente.roles)
    ? await Promise.all([
        prisma.user.count({ where: { stato: 'REGISTRATO' } }),
        prisma.user.count({
          where: {
            stato: 'NUOVO',
            NOT: { letturaDaAltri: { some: { lettoreId: utente.id } } },
          },
        }),
      ])
    : [0, 0];

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
          where: { status: { not: 'PAGATO' }, dichiaratoIl: { not: null }, cassaId: null },
        }),
        prisma.payment.count({
          where: { tipo: 'RIMBORSO', status: { notIn: ['PAGATO', 'ANNULLATO'] }, cassaId: null },
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
        filtroVisibilita(utente.stato, false, utente.id),
        { status: 'RILASCIATA' },
        { inizio: { gte: inizioDiOggi } },
        { letture: { none: { userId: utente.id } } },
      ],
    },
  });

  /*
   * I sondaggi aperti a cui questa persona non ha ancora risposto.
   *
   * È il pallino che li fa esistere: una domanda senza un numero addosso la
   * vede chi passa di lì, e chi non passa non risponde — che è esattamente il
   * problema che i sondaggi dovevano risolvere.
   */
  /*
   * La bacheca: quante comunicazioni aspettano di essere lette, e se ce n'è
   * almeno una per questa persona. Chi non ne vede nessuna non ha la voce: un
   * menu con una porta che si apre su una stanza vuota insegna a ignorarla.
   */
  const [bachecheMie, bachecheDaLeggere] = await Promise.all([
    prisma.bacheca.findMany({
      where: filtroBacheche(utente),
      orderBy: [{ ordine: 'asc' }, { creataIl: 'asc' }],
      select: { id: true, nome: true },
    }),
    // solo nelle bacheche che vede ancora: chi esce da una selezione non deve
    // portarsi dietro un pallino che non può più spegnere
    prisma.consegnaBacheca.findMany({
      where: { userId: utente.id, lettaIl: null, messaggio: { bacheca: filtroBacheche(utente) } },
      select: { messaggio: { select: { bachecaId: true } } },
    }),
  ]);
  const daLeggereIn = (id: string) =>
    bachecheDaLeggere.filter((c) => c.messaggio.bachecaId === id).length;

  const sondaggiDaVotare = (
    await prisma.sondaggio.findMany({
      where: {
        chiusoIl: null,
        OR: [{ scadeIl: null }, { scadeIl: { gt: new Date() } }],
        voti: { none: { userId: utente.id } },
      },
      select: { destinatari: true },
    })
  ).filter((s) => loRiguarda(s.destinatari, utente.stato)).length;

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

  // I debriefing che non hai ancora letto. La lettura è di chi legge: se lo
  // apre un altro, a te resta segnalato — un resoconto che nessuno sa di dover
  // leggere non lo legge nessuno.
  const debriefingDaLeggere = vedeDebriefing(utente.roles)
    ? await prisma.debriefing.count({
        where: {
          pubblicato: true,
          letture: { none: { userId: utente.id } },
          evento: filtroVisibilita(utente.stato, isAdmin(utente.roles), utente.id),
        },
      })
    : 0;

  // Le polizze giornaliere ancora da fare: ospiti che hanno pagato, non sono
  // coperti e hanno i dati per esserlo. Il pallino conta esattamente quello
  // che la pagina mostra — è la stessa lettura — perché un numero che dice
  // tre davanti a un elenco di due non lo si guarda più.
  const polizzeDaFare = puoAmministrare(utente.roles)
    ? (await attivitaDaCoprire()).reduce((t, a) => t + a.daFare, 0)
    : 0;

  // I guasti arrivati dai browser e non ancora guardati: senza il pallino,
  // un registro che si riempie da solo non lo apre mai nessuno.
  const guastiDaGuardare = isAdmin(utente.roles)
    ? await prisma.erroreClient.count({ where: { visto: false } })
    : 0;

  const voci: VoceMenu[] = [
    { href: '/dashboard', label: 'Home', icona: 'dashboard', gruppo: 'principale' },
    {
      href: '/calendario',
      label: 'Calendario',
      icona: 'calendario',
      gruppo: 'principale',
      badge: attivitaNuove,
      // le viste del calendario: si cercano col loro nome, «storico», «mese»
      sotto: [
        { label: 'Mese', href: '/calendario?vista=mese' },
        { label: 'Storico', href: '/calendario?vista=passati' },
      ],
    },
    // La memoria della squadra — com’è andata alle giocate — la rilegge chi
    // gioca e chi la porta in campo. Un incarico da scrivania non basta: il
    // debriefing non gli serve a niente, e una voce che non si apre mai è solo
    // un elenco più lungo per tutti.
    ...(vedeDebriefing(utente.roles)
      ? [
          {
            href: '/debriefing',
            label: 'Debriefing',
            icona: 'bozza',
            gruppo: 'principale',
            badge: debriefingDaLeggere,
          } satisfies VoceMenu,
        ]
      : []),
    { href: '/profilo', label: 'Profilo', icona: 'profilo', gruppo: 'principale' },
    {
      href: '/pagamenti',
      label: 'Miei pagamenti',
      icona: 'pagamenti',
      gruppo: 'principale',
      badge: mieiPagamentiAperti,
    },
    /*
     * Gli annunci: una riga per bacheca, con il suo pallino, e in fondo
     * l'elenco di tutte — da li' se ne creano di nuove. Stanno in un gruppo
     * loro e non fra le cose operative: si leggono, non si fanno.
     */
    ...bachecheMie.map((b) => ({
      href: `/bacheca/${b.id}`,
      label: b.nome,
      icona: 'bacheca' as const,
      gruppo: 'annunci' as const,
      badge: daLeggereIn(b.id),
    })),
    ...(bachecheMie.length > 0 || puoCreareBacheche(utente.roles)
      ? [
          {
            href: '/bacheca',
            label: 'Tutte le bacheche',
            icona: 'menu' as const,
            gruppo: 'annunci' as const,
          },
        ]
      : []),
    {
      href: '/sondaggi',
      label: 'Sondaggi',
      icona: 'avvisi',
      gruppo: 'principale',
      badge: sondaggiDaVotare,
      sotto: [{ label: 'Storico', href: '/sondaggi?vista=storico' }],
    },
    // vale per tutti: una chiave non dà poteri, eredita quelli di chi la crea
    { href: '/assistente', label: 'Assistente', icona: 'chiave', gruppo: 'principale' },
  ];

  // Le casse che questa persona gestisce, se ne gestisce: la cassa del corso di
  // Mario è di Mario, e la voce nel menu la vede solo lui. Il pallino conta chi
  // ha detto di averlo pagato e aspetta la sua conferma, e i rimborsi da dare
  // la foto del profilo, se c'è: senza, nel menu restano le iniziali invece di
  // un'immagine rotta
  const conFoto = !!(
    await prisma.user.findUnique({ where: { id: utente.id }, select: { fotoPath: true } })
  )?.fotoPath;

  const mieCasse = await prisma.cassa.findMany({
    where: { gestori: { some: { id: utente.id } } },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });
  if (mieCasse.length > 0) {
    // Il pallino conta le righe ancora aperte della cassa: le quote da
    // incassare — dichiarate o no — e i rimborsi da dare. Contare solo quelle
    // dichiarate lasciava il pallino spento su una cassa piena di quote da
    // riscuotere; quelle chiuse (pagate, annullate, gestite fuori) non contano,
    // se no non si spegnerebbe mai.
    const inAttesa = await prisma.payment.count({
      where: {
        cassaId: { in: mieCasse.map((c) => c.id) },
        OR: [
          { tipo: { not: 'RIMBORSO' }, status: { in: ['DA_PAGARE', 'PARZIALE'] } },
          { tipo: 'RIMBORSO', status: { notIn: ['PAGATO', 'ANNULLATO', 'NON_GESTITO'] } },
        ],
      },
    });
    voci.splice(voci.findIndex((v) => v.href === '/pagamenti') + 1, 0, {
      href: '/cassa',
      label: mieCasse.length === 1 ? mieCasse[0].nome : 'Le mie casse',
      icona: 'incassa',
      gruppo: 'principale',
      badge: inAttesa,
    });
  }

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
    // prima del profilo, non alla terza riga: con il debriefing che ora può
    // non esserci, un numero scritto a mano finiva per infilarli in mezzo ai
    // pagamenti
    voci.splice(voci.findIndex((v) => v.href === '/profilo'), 0, {
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
    voci.push({
      href: '/admin/operatori',
      label: 'Operatori',
      icona: 'operatori',
      gruppo: 'persone',
      // la vista degli avvisi la trova chi cerca «notifiche», che e' la
      // parola con cui la si chiama a voce
      ...(isAdmin(utente.roles)
        ? { sotto: [{ label: 'Avvisi e notifiche', href: '/admin/operatori?vista=notifiche' }] }
        : {}),
    });
  }
  if (puoVedereNuovi(utente.roles)) {
    voci.push({
      href: '/admin/nuovi',
      label: 'Nuovi',
      icona: 'nuovi',
      gruppo: 'persone',
      badge: daApprovare + nuoviDaLeggere,
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
      {
        href: '/admin/polizze',
        label: 'Polizze giornaliere',
        icona: 'scudo',
        gruppo: 'amministrazione',
        badge: polizzeDaFare,
      },
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
        href: '/admin/magazzino',
        label: 'Magazzino',
        icona: 'maglietta',
        gruppo: 'segreteria',
        badge: riordiniDaPagare,
      },
      // le casse che non sono del club: si configurano qui, si usano altrove
      { href: '/admin/casse', label: 'Altre casse', icona: 'incassa', gruppo: 'segreteria' },
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
      {
        href: '/admin/errori',
        label: 'Guasti',
        icona: 'annulla',
        gruppo: 'comando',
        badge: guastiDaGuardare,
      },
    );
  }

  // I preferiti di chi sta guardando: solo gli indirizzi, nell'ordine che ha
  // scelto. Etichette e icone le mette il menu, che è l'unico a sapere cosa
  // questa persona può vedere davvero.
  const preferiti = (
    await prisma.preferito.findMany({
      where: { userId: utente.id },
      orderBy: { ordine: 'asc' },
      select: { href: true },
    })
  ).map((p) => p.href);

  // la stellina si accende sulla voce che si sta guardando: la risposta la sa
  // il menu, e gliela si porta dietro invece di farla ricalcolare al client
  const messiDaParte = new Set(preferiti);
  for (const v of voci) v.preferito = messiDaParte.has(v.href);

  return (
    /* 100dvh e non 100vh: su iPhone il vh conta anche la parte coperta dalle
       barre del browser, così la pagina risulta più alta dello schermo e la
       striscia in basso non arriva mai a toccare il fondo. */
    <div className="min-h-[100dvh] md:pl-60">
      <Nav
        voci={voci}
        preferiti={preferiti}
        utente={{
          id: utente.id,
          nome: utente.nome,
          cognome: utente.cognome,
          callsign: utente.callsign,
          iniziali: iniziali(utente.nome, utente.cognome),
          foto: conFoto,
          roles: utente.roles,
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
      {/* tiene il diario di bordo e raccoglie i guasti che nessuno vedrebbe */}
      <Diario />

      {/* Il menu a disposizione della stellina, che vive nella riga del
          titolo di ogni pagina e da lì non saprebbe né dove si trova né se ci
          è già stata messa. */}
      {/* sul computer sopra c'è la striscia con chi sei: meno spazio in cima,
          o il titolo scende di due centimetri per niente */}
      {/* lo spazio in fondo tiene conto anche della barra gesti dell'iPhone:
          senza, l'ultima riga di ogni pagina finisce sotto il menu */}
      {/* Tiene fresco quello che si sta guardando: adesioni, incassi, polizze
          si muovono mentre la pagina è aperta, senza ricaricare a mano. */}
      <Aggiornamento />

      {/* Chiede una volta sola, in un angolo, a chi non ha le notifiche: da
          soli non si possono accendere — il browser vuole un gesto — e un
          permesso chiesto all'apertura viene negato per riflesso. */}
      <InvitoNotifiche />

      <main className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-12 md:pt-2">
        <div className="mx-auto max-w-6xl">
          <ContestoMenu voci={voci}>{children}</ContestoMenu>
        </div>
      </main>
    </div>
  );
}
