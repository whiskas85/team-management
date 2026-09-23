import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { StatoOperatore } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elencoOperatori } from '@/lib/query';
import {
  NOTA_AGGIUNTO_STAFF,
  etichettaEvento,
  etichettaRisposta,
  eAtleta,
  etichettaVisibilita,
  inRegola,
  inSquadra,
  isAdmin,
  puoGestireEventi,
  etichettaAssegnazione,
  occupaPosto,
  puoGestirePagamenti,
  puoModerareChat,
  schierato,
  puoSchierare,
  isContatto,
  puoVedereNuovi,
  serveCertificato,
  soloAtleti,
  tonoAssegnazione,
  tonoEvento,
  tonoRsvp,
  vedeAttivitaSquadra,
} from '@/lib/domain';
import { comeChiamare, fmtDate, fmtDateTime, fmtEuro, fmtTime, umanizza } from '@/lib/format';
import { listinoAttivo, quotaPer } from '@/lib/quote';
import { stagioniAperte } from '@/lib/stagioni';
import { Avatar, Badge, Blocco, Campo, Dato, Intestazione, Vuoto } from '@/components/ui';
import { Conferma, FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { FormEvento } from '@/components/FormEvento';
import { FormRiunione } from '@/components/FormRiunione';
import { SegnaEventoLetto } from '@/components/SegnaEventoLetto';
import { CondividiEvento } from '@/components/CondividiEvento';
import { SquadreOspiti } from '@/components/SquadreOspiti';
import { AllegatiEvento } from '@/components/AllegatiEvento';
import { ReferentiEvento } from '@/components/ReferentiEvento';
import { ContaRisposte } from '@/components/ContaRisposte';
import { BottoneModale } from '@/components/Modale';
import { AzioniEvento } from '@/components/AzioniEvento';
import { Mappa } from '@/components/Mappa';
import { metaNaviga } from '@/components/Naviga';
import { ComeArrivare, type Tappa } from '@/components/ComeArrivare';
import { Quando } from '@/components/Quando';
import { AzioneBottone } from '@/components/AzioneBottone';
import { AdesioneEvento } from '@/components/AdesioneEvento';
import { ContoAllaRovescia } from '@/components/ContoAllaRovescia';
import {
  creaRiunione,
  eliminaEvento,
  registraPresenze,
  rimuoviPartecipante,
  salvaEvento,
  scambiaTitolare,
  schiera,
} from '@/actions/eventi';
import { chiediRimborso } from '@/actions/pagamenti';
import {
  ETICHETTA_ASSICURAZIONE,
  TONO_ASSICURAZIONE,
  chiaveDaColonna,
  dataLocale,
  etichettaGiorno,
  giorniDi,
  quotaOnorata,
  cassePerPolizza,
  quotePerPolizza,
  tariffePolizza,
  serveGiornaliera,
} from '@/lib/assicurazione';
import { FormGiornaliera } from '@/components/FormGiornaliera';
import { ScegliPartecipanti, type Candidato } from '@/components/ScegliPartecipanti';
import { Social, type Commento } from '@/components/Social';
import { Debriefing } from '@/components/Debriefing';
import { SegnaDebriefingLetti } from '@/components/SegnaDebriefingLetti';
import { BloccoNote, FormNota, type NotaLetta } from '@/components/Note';
import { citabili } from '@/lib/note';
import { haIncarichi } from '@/lib/domain';
import { Icona } from '@/components/Icona';
import { faseAttivita, finestraAttivita } from '@/lib/giorni';
import { quotaChiusa } from '@/lib/casse';
import { tieneInMano } from '@/lib/domain';
import { BottoneElimina } from '@/components/CardRiga';

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  const evento = await prisma.event.findUnique({
    where: { id },
    include: {
      tipo: true,
      field: { include: { squadra: { select: { nome: true } } } },
      // le altre attività che fanno parte della stessa giornata, per dirlo
      collegatoA: { select: { id: true, titolo: true } },
      collegate: { select: { id: true, titolo: true } },
      createdBy: { select: { nome: true, cognome: true } },
      // le squadre di fuori invitate, con il loro link
      ospiti: { orderBy: { creatoIl: 'asc' } },
      // il book di missione e quello che gli sta intorno
      allegati: {
        orderBy: [{ ordine: 'asc' }, { creatoIl: 'asc' }],
        include: { caricatoDa: { select: { nome: true, cognome: true, callsign: true } } },
      },
      // chi tiene in mano l'attività: di loro serve il solo callsign
      referenti: {
        include: {
          // il numero sta qui perché il referente è il nome a cui si telefona:
          // saperlo e non poterlo chiamare non serve a niente
          utente: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              callsign: true,
              telefono: true,
            },
          },
        },
      },
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              callsign: true,
              stato: true,
              // la riga mostra la faccia e il motto di chi si è segnato
              fotoPath: true,
              frase: true,
              // servono a capire chi è già coperto dalla tessera annuale
              figtCards: { select: { status: true, scadeIl: true } },
              // ICE: quello che serve se qualcuno si fa male in campo. Lo
              // leggono solo admin e team leader, e solo di chi c'è quel
              // giorno — l'elenco di tutta la squadra è un'altra cosa e sta
              // nella sua pagina.
              telefono: true,
              gruppoSanguigno: true,
              allergie: true,
              emergenzaNome: true,
              emergenzaTel: true,
            },
          },
        },
        orderBy: { respondedAt: 'asc' },
      },
      // il resoconto della giornata, se qualcuno l'ha scritto
      debriefing: {
        include: { autore: { select: { nome: true, cognome: true, callsign: true } } },
      },
      giornaliere: true,
      // tutte le quote: quella del club e quelle delle altre casse
      payments: {
        select: {
          id: true,
          tipo: true,
          userId: true,
          cassaId: true,
          cassa: { select: { nome: true } },
          importo: true,
          pagato: true,
          status: true,
          dichiaratoIl: true,
          rimborso: { select: { id: true } },
        },
      },
      quoteCasse: {
        orderBy: { createdAt: 'asc' },
        include: { cassa: { select: { nome: true } } },
      },
      // le quote aggiunte con il +: il modulo le rimette com'erano
      vociAttivita: {
        orderBy: { createdAt: 'asc' },
        include: { cassa: { select: { nome: true } } },
      },
    },
  });

  if (!evento) notFound();

  const admin = isAdmin(me.roles);
  if (evento.status === 'CREATA' && !admin) notFound();
  // chi amministra apre tutto: nell'elenco vede gia' ogni attivita', e trovare
  // un 404 aprendo una riga che il calendario gli mostra sarebbe assurdo.
  // Chi è fra i partecipanti la apre sempre: se lo si è aggiunto a mano — un
  // nuovo forzato su un'attività di squadra, un invitato — deve poter vedere
  // dove andare. Su invito, invece, chi non c'è non la apre nemmeno se è in
  // squadra: è la stessa regola del calendario, scritta per la pagina.
  const partecipo = evento.rsvps.some((r) => r.userId === me.id);
  const aperta =
    evento.visibilita === 'TUTTI' ||
    (evento.visibilita === 'TEAM' && vedeAttivitaSquadra(me.stato));
  if (!admin && !partecipo && !aperta) notFound();
  const tl = puoSchierare(me.roles);
  // le casse a cui un'attività può chiedere una quota: le sceglie l'admin
  const casseAttive = admin
    ? await prisma.cassa.findMany({
        where: { attiva: true },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true },
      })
    : [];

  // Commenti e "mi piace" li vede chiunque veda l'attività; le note sotto sono
  // l'opposto e stanno nella stessa pagina solo perché è lì che uno le scrive.
  const [commenti, miPiace, mioMiPiace] = await Promise.all([
    prisma.commentoEvento.findMany({
      where: { eventId: evento.id },
      orderBy: { createdAt: 'asc' },
      include: {
        utente: {
          select: { id: true, nome: true, cognome: true, callsign: true, fotoPath: true },
        },
      },
    }),
    prisma.miPiaceEvento.findMany({
      where: { eventId: evento.id },
      include: { utente: { select: { nome: true, cognome: true, callsign: true } } },
    }),
    prisma.miPiaceEvento.findUnique({
      where: { eventId_userId: { eventId: evento.id, userId: me.id } },
      select: { userId: true },
    }),
  ]);

  /**
   * L'indirizzo della scheda di una persona, oppure niente se non la si può
   * aprire. Sta qui e non dentro il JSX perché la stessa regola serve in più
   * punti della pagina, e due copie divergono.
   */
  const profiloDi = (u: { id: string; stato: StatoOperatore }) => {
    if (isContatto(u.stato)) return puoVedereNuovi(me.roles) ? `/admin/operatori/${u.id}` : null;
    // fra membri della squadra: la pagina manda da sola alla scheda completa
    // chi ha un incarico, quindi l'indirizzo è uno solo
    return inSquadra(me.stato) && inSquadra(u.stato) ? `/operatori/${u.id}` : null;
  };

  /**
   * Un badge solo per persona, che dice l'ultima cosa vera.
   *
   * Prima dell'appello conta quello che ha risposto; dopo l'appello conta se
   * c'era davvero, e allora la risposta non serve più a nessuno. Tenerli
   * entrambi a vista dava due badge quasi uguali — "presente" e "Presente" —
   * e toccava indovinare quale dei due stesse parlando di cosa.
   */
  const statoDiFatto = (r: { status: string; presente: boolean | null }) =>
    r.presente === null
      ? { testo: umanizza(r.status), tono: tonoRsvp[r.status] ?? 'neutro' }
      : r.presente
        ? { testo: 'c’era', tono: 'ok' as const }
        : { testo: 'non c’era', tono: 'danger' as const };

  const scrivoNote = haIncarichi(me.roles);

  // Le mie note su chi partecipa, prese in una query sola e poi divise per
  // persona: una per partecipante sarebbero venti query per una pagina.
  // Una nota conta per chi vi è appuntata e per chi vi è nominato, come
  // sulla scheda personale — se le due cose contassero in modo diverso, il
  // numero sul pulsante non tornerebbe con quello che poi si apre.
  const idPartecipanti = evento.rsvps.map((r) => r.userId);
  const noteSullePersone = scrivoNote
    ? await prisma.nota.findMany({
        where: {
          autoreId: me.id,
          OR: [
            { userId: { in: idPartecipanti } },
            { citate: { some: { userId: { in: idPartecipanti } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          persona: { select: { nome: true, cognome: true, callsign: true } },
          evento: { select: { titolo: true } },
          citate: {
            include: {
              utente: { select: { id: true, nome: true, cognome: true, callsign: true } },
            },
          },
        },
      })
    : [];

  const notePerPersona = (userId: string) =>
    noteSullePersone.filter(
      (n) => n.userId === userId || n.citate.some((c) => c.userId === userId),
    ) as NotaLetta[];
  const [mieNote, persone] = scrivoNote
    ? await Promise.all([
        prisma.nota.findMany({
          where: { autoreId: me.id, eventId: evento.id },
          orderBy: { createdAt: 'desc' },
          include: {
            persona: { select: { nome: true, cognome: true, callsign: true } },
            evento: { select: { titolo: true } },
            citate: {
              include: {
                utente: { select: { id: true, nome: true, cognome: true, callsign: true } },
              },
            },
          },
        }),
        citabili(),
      ])
    : [[], []];
  const gestisce = puoGestireEventi(me.roles);

  // chi si è segnato appare col callsign se ce l'ha; l'anagrafica intera resta
  // a chi segue i contatti, e senza callsign un nuovo è "Mario R."
  const vedeNuovi = puoVedereNuovi(me.roles);
  type Chiunque = { nome: string; cognome: string; callsign: string | null; stato: StatoOperatore };
  const chiamato = (u: Chiunque) =>
    comeChiamare(u, { incarico: vedeNuovi, diSquadra: vedeAttivitaSquadra(u.stato) });
  const nomeDi = (u: Chiunque) => chiamato(u).nome;

  const mio = evento.rsvps.find((r) => r.userId === me.id);
  const presenti = evento.rsvps.filter((r) => r.status === 'PRESENTE');
  const forse = evento.rsvps.filter((r) => r.status === 'FORSE');
  const assenti = evento.rsvps.filter((r) => r.status === 'ASSENTE');
  /*
   * Chi non ha detto niente.
   *
   * Non è un assente: è la riga da cui nasce il messaggio nel gruppo il sabato
   * sera, e finora non si vedeva da nessuna parte — mancava semplicemente
   * all'appello, senza che nessuno potesse contarlo.
   *
   * **Si conta solo chi è in squadra** — stato SQUADRA o SOSPESO — senza una
   * risposta su questa attività. Non i nuovi: da loro non si aspetta una
   * risposta, uno che si affaccia a un'aperta viene se gli va, e contarlo fra
   * i silenziosi gonfierebbe il numero con gente a cui nessuno ha intenzione
   * di scrivere. Non chi è da riconfermare: quello il pulsante per segnarsi
   * non ce l'ha nemmeno, e aspettarsi una risposta da lui sarebbe assurdo.
   *
   * Su un'attività su invito la domanda non ha senso — lì non è invitata la
   * squadra, sono invitate delle persone — e il numero resta fuori invece di
   * dire una cosa falsa.
   */
  const silenziosi =
    evento.visibilita === 'INVITO'
      ? null
      : await prisma.user.count({
          where: {
            stato: { in: ['SQUADRA', 'SOSPESO'] },
            // solo il libro atleti: a chi in campo non ci va non si e' chiesto
            // niente, e contarlo fra i silenziosi vorrebbe dire aspettare per
            // sempre una risposta che nessuno gli ha domandato
            ...soloAtleti,
            rsvps: { none: { eventId: evento.id } },
          },
        });
  const titolari = presenti.filter((r) => r.assegnazione === 'TITOLARE');
  // i convocati tengono già il posto: mancano solo i soldi
  const convocati = presenti.filter((r) => r.assegnazione === 'CONVOCATO');
  // la sala controllo c'è ma non in campo: non toglie un posto e non paga
  const toc = presenti.filter((r) => r.assegnazione === 'TOC');
  const riserve = presenti.filter((r) => r.assegnazione === 'RISERVA');
  // il posto lo occupa anche chi è convocato: sta solo aspettando di pagarlo.
  // Il TOC no: sta in sala controllo e non toglie un posto in campo.
  const pieno =
    !!evento.maxPartecipanti && presenti.filter(occupaPosto).length >= evento.maxPartecipanti;
  const chiuso =
    evento.status !== 'RILASCIATA' ||
    (!!evento.chiusuraIscrizioni && evento.chiusuraIscrizioni < new Date());

  // Conclusa: la giornata è passata e registrata. Da qui in poi la scheda serve
  // a **rileggere** com'è andata, non più a organizzarla — quindi spariscono le
  // cose che si fanno prima o durante: la propria adesione, i dati sanitari di
  // chi c'era, e l'appello. Le presenze restano dove sono, sulle righe dei
  // partecipanti: quelle sono il risultato, non uno strumento.
  const conclusa = evento.status === 'CONCLUSA';
  // L'appello sparisce anche sulle annullate, e per un motivo in più: a
  // giornata finita è lui a concludere l'attività, e spuntarlo su una giornata
  // annullata la farebbe risorgere come conclusa, cioè come se si fosse
  // giocata. Mentre l'attività è ancora in corso invece l'appello registra e
  // basta: chiude solo dopo l'ora della fine.
  const senzaAppello = conclusa || evento.status === 'ANNULLATA';

  // In corso: dal ritrovo — o dall'inizio — alla fine. Non è uno stato da
  // scegliere, lo dice l'orologio: nessuno si ricorderebbe di metterlo e
  // tantomeno di toglierlo. Iniziata è la stessa cosa senza il limite della
  // fine: l'appello resta aperto finché qualcuno non lo chiude, anche se la
  // giornata è finita e lo si fa la sera a casa.
  const adesso = new Date();
  const finestra = finestraAttivita(evento.inizio, evento.fine, evento.oraRitrovo);
  const fase = faseAttivita(evento, adesso);
  const iniziata = !senzaAppello && fase !== null;
  const inCorso = fase === 'in corso';
  // finita la finestra e nessuno l'ha ancora chiusa: aspetta l'appello
  const terminata = fase === 'terminata';
  const statoLetto = inCorso
    ? 'In corso'
    : terminata
      ? 'Terminata'
      : etichettaEvento[evento.status];
  const coloreStato = inCorso
    ? 'border-nvg bg-nvg/25 text-nvg'
    : terminata
      ? 'border-warn bg-warn/20 text-warn'
      : evento.status === 'RILASCIATA'
      ? 'border-nvg/50 bg-nvg/15 text-nvg'
      : evento.status === 'CREATA'
        ? 'border-warn/50 bg-warn/15 text-warn'
        : evento.status === 'ANNULLATA'
          ? 'border-danger/50 bg-danger/15 text-danger'
          : 'border-line bg-surface2 text-muted';

  const [campi, tipologie, operatoriGrezzi, listino, stagioni] = tl
    ? await Promise.all([
        // teniamo anche la voce già collegata, se nel frattempo è stata
        // archiviata: modificando l'attività non deve sparire
        admin
          ? prisma.field.findMany({
              where: { OR: [{ attivo: true }, { id: evento.fieldId ?? '' }] },
              orderBy: { nome: 'asc' },
            })
          : Promise.resolve([]),
        admin
          ? prisma.tipoAttivita.findMany({
              where: { OR: [{ attivo: true }, { id: evento.tipoId ?? '' }] },
              orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
              select: { id: true, nome: true, attivo: true },
            })
          : Promise.resolve([]),
        // Nuovi compresi, anche sull'attività di sola squadra: lì restano
        // nascosti finché chi schiera non decide di forzarne uno, ma per
        // poterlo fare devono esserci. Chi non è in squadra vede la squadra.
        prisma.user.findMany({
          where: inSquadra(me.stato)
            ? { stato: { notIn: ['DISABILITATO', 'RIFIUTATO'] } }
            : { stato: { in: ['SQUADRA', 'SOSPESO'] } },
          orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
          select: {
            id: true,
            nome: true,
            cognome: true,
            callsign: true,
            stato: true,
            roles: true,
            certificates: { select: { status: true, scadeIl: true } },
          },
        }),
        // serve solo al modulo di modifica, che è dell'admin
        admin ? listinoAttivo() : Promise.resolve([]),
        // le stagioni servono al modulo: un’attività si può spostare in quella dopo
        admin ? stagioniAperte() : Promise.resolve([]),
      ])
    : [[], [], [], [], [], []];

  const gia = new Set(evento.rsvps.map((r) => r.userId));

  /*
   * Per ognuno diciamo subito se è schierabile: il certificato è vincolante.
   *
   * **Chi è del club ma non è nel libro atleti non compare proprio.** Non è
   * uno «schierabile con riserva» come chi ha il certificato scaduto: quello
   * ci andrebbe e gli manca un foglio, questo in campo non ci va e basta.
   * Offrirlo voleva dire mettere in una giocata un nome che quella domenica
   * non si sarebbe presentato.
   *
   * I nuovi restano: non sono del club, sono in prova, e il libro atleti parla
   * di chi il club ce l'ha già. Un nuovo lo si porta in campo apposta — è
   * esattamente come lo si conosce.
   */
  const candidati: Candidato[] = operatoriGrezzi
    .filter((o) => !gia.has(o.id))
    .filter((o) => !vedeAttivitaSquadra(o.stato) || eAtleta(o.roles))
    .map((o) => {
      const serve = inSquadra(o.stato) && serveCertificato(evento.tipo);
      const ok = !serve || inRegola(o.certificates);
      // il team leader schiera anche i nuovi: qui li chiama come li vede in elenco
      const come = chiamato(o);
      return {
        id: o.id,
        etichetta: come.nome,
        iniziali: come.iniziali,
        callsign: o.callsign,
        certificatoOk: ok,
        motivo: ok ? null : 'Certificato medico mancante o scaduto',
        // chi è da riconfermare è della squadra: aspetta solo il reinvito
        gruppo: (vedeAttivitaSquadra(o.stato) ? 'squadra' : 'nuovi') as Candidato['gruppo'],
      };
    })
    // prima chi è schierabile, poi chi ha il certificato scaduto o mancante:
    // dentro i due gruppi resta l'ordine alfabetico arrivato dal database
    // (Array.sort è stabile, quindi basta confrontare l'idoneità)
    .sort((a, b) => Number(b.certificatoOk) - Number(a.certificatoOk));

  const costo = evento.costo ? Number(evento.costo) : 0;
  // ognuno legge la quota che riguarda lui: la squadra la sua, chi viene da
  // fuori quella degli esterni. Sono due numeri scritti sull'attività, non un
  // automatismo nascosto da qualche altra parte
  const { importo: mioCosto, dettaglio: mioDettaglio } = quotaPer(evento, me.stato);
  const quotaEsterni = evento.costoEsterni === null ? null : Number(evento.costoEsterni);
  // lo stato di pagamento degli altri è un dato riservato a chi amministra
  const vedeQuoteAltrui = tl || puoGestirePagamenti(me.roles);
  // i rimborsi sono movimenti a sé: la quota di un operatore è quella dovuta,
  // altrimenti si finirebbe per chiedere il rimborso di un rimborso
  // (quella del club: è la sola che si rimborsa da qui)
  const quotePerUtente = new Map(
    evento.payments
      .filter((p) => p.tipo !== 'RIMBORSO' && p.cassaId === null)
      .map((p) => [p.userId, p]),
  );
  const miaQuota = quotePerUtente.get(me.id) ?? null;
  // tutte le quote di una persona, club e altre casse: il posto si conferma
  // quando sono chiuse tutte
  const quoteDi = (userId: string) =>
    evento.payments.filter((p) => p.tipo !== 'RIMBORSO' && p.userId === userId);
  const mieQuote = quoteDi(me.id);
  const mieSaldate = mieQuote.length > 0 && mieQuote.every((q) => quotaChiusa(q.status));
  // quanto mi chiedono le altre casse, una per una
  const mieAltreVoci = evento.quoteCasse
    .map((q) => ({
      id: q.id,
      cassa: q.cassa.nome,
      descrizione: q.descrizione,
      importo: quotaPer({ costo: q.importo, costoEsterni: q.importoEsterni }, me.stato).importo,
    }))
    .filter((v) => v.importo > 0);
  const mioTotale = mioCosto + mieAltreVoci.reduce((t, v) => t + v.importo, 0);
  // le casse la cui quota paga la polizza: lo dicono le voci del tariffario e
  // le quote aggiunte con il +, non la cassa
  const cassePolizza = cassePerPolizza(
    evento,
    await tariffePolizza([...evento.vociSquadra, ...evento.vociEsterni]),
  );
  // dove c'è la formazione la quota la deve chi scende in campo, non chi si è
  // solo reso disponibile: serve a dirlo prima, invece di farlo scoprire dopo
  const mioTitolare = mio?.assegnazione === 'TITOLARE';
  const mioConvocato = mio?.assegnazione === 'CONVOCATO';

  // senza certificato in corso di validità non ci si segna e non si gioca —
  // dove la tipologia lo richiede: a una riunione si va comunque
  const certificatoDovuto = inSquadra(me.stato) && serveCertificato(evento.tipo);
  const mieiCertificati = certificatoDovuto
    ? await prisma.medicalCertificate.findMany({
        where: { userId: me.id },
        select: { status: true, scadeIl: true },
      })
    : [];
  const certificatoOk = !certificatoDovuto || inRegola(mieiCertificati);

  /*
   * Se non sei nel libro atleti, i pulsanti della disponibilità non ci sono.
   *
   * L'azione li rifiuterebbe comunque, ma un pulsante che si può premere e
   * risponde «no» e' una porta finta: chi la trova pensa di aver sbagliato
   * qualcosa. Meglio dire prima come stanno le cose.
   *
   * Chi è già fra i partecipanti li vede lo stesso: se qualcuno ce l'ha messo
   * apposta, deve poter dire se viene o no.
   */
  const fuoriDalLibro = vedeAttivitaSquadra(me.stato) && !eAtleta(me.roles) && !mio;
  // titolari e riserve hanno senso solo dove la tipologia li prevede
  // Si schiera dove la tipologia lo prevede, **e anche dove i posti sono
  // contati**: se un'attività ha un limite ma nessuno può essere messo in
  // formazione, quel limite non lo fa rispettare nessuno e il numero sulla
  // card resterebbe fermo a zero schierati per sempre.
  const schieraQuesta = (evento.tipo?.riserve ?? false) || !!evento.maxPartecipanti;

  // una sola lista, raggruppata: con la formazione separa titolari e riserve,
  // altrimenti bastano le tre risposte
  const daAssegnare = presenti.filter((r) => r.assegnazione === 'NON_ASSEGNATO');

  // L'indirizzo da cui si sta guardando è quello che deve funzionare anche per
  // chi riceve il messaggio: dentro ZeroTier è lo stesso per tutti, e scriverlo
  // a mano nel codice vorrebbe dire cambiarlo il giorno che arriva un dominio.
  const intestazioni = await headers();
  const host = intestazioni.get('host');
  const origine = host
    ? `${intestazioni.get('x-forwarded-proto') ?? 'http'}://${host}`
    : '';
  const indirizzoPagina = `${origine}/calendario/${evento.id}`;

  // Le squadre di fuori: chi le invita ne sceglie una fra quelle conosciute o
  // scrive il nome, e ognuna si porta dietro il proprio link.
  const conosciute = tl
    ? await prisma.squadraEsterna.findMany({
        where: { attiva: true },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true },
      })
    : [];
  // La rosa, per spuntare i referenti nel modulo: si scelgono fra chi è in
  // squadra **e ha il ruolo atleta**, perché è un nome a cui chiedere come si
  // svolge quella giornata — non un incarico da dare a chi passa di qui una
  // volta, né a chi il campo non lo vede.
  const rosa = tl
    ? await prisma.user.findMany({
        where: { stato: { in: ['SQUADRA', 'SOSPESO'] }, roles: { has: 'ATLETA' } },
        orderBy: [{ callsign: 'asc' }, { cognome: 'asc' }],
        select: { id: true, nome: true, cognome: true, callsign: true },
      })
    : [];
  const referentiScelti = evento.referenti.map((r) => r.userId);

  const ospiti = evento.ospiti.map((o) => ({
    id: o.id,
    nome: o.nome,
    operatori: o.operatori,
    link: `${origine}/invito/${o.token}`,
    rispostoIl: o.rispostoIl ? fmtDateTime(o.rispostoIl) : null,
  }));

  // Gli allegati li carica chi tiene in mano l'attività: l'admin, i team
  // leader e **i referenti di questa**. Il book lo scrive chi ci va, e spesso
  // lo finisce la sera prima: farglielo caricare da qualcun altro vorrebbe
  // dire che arriva su WhatsApp e il riquadro resta vuoto.
  // Del referente si legge il **solo callsign** — o il nome con l'iniziale per
  // chi non ce l'ha — perché il cognome non serve a chiamarlo. Il numero sì:
  // è il motivo per cui quel nome sta scritto lì.
  const referenti = evento.referenti.map((r) => ({
    id: r.userId,
    nome: r.utente.callsign ?? `${r.utente.nome} ${r.utente.cognome[0] ?? ''}.`,
    telefono: r.utente.telefono,
  }));

  // Chi tiene in mano questa attività: l'admin, i team leader e **i referenti
  // di questa**. Il book lo scrive chi ci va, e spesso lo finisce la sera
  // prima; il link di una squadra ospite lo rimanda chi si sente dire che non
  // è arrivato. Farglielo chiedere a qualcun altro è un giro che fa solo tardi.
  const inMano = tieneInMano(me, evento.referenti);
  const allegati = evento.allegati.map((a) => ({
    id: a.id,
    titolo: a.titolo,
    fileName: a.fileName,
    mimeType: a.mimeType,
    fileSize: a.fileSize,
    pubblico: a.pubblico,
    aggiornatoIl: fmtDateTime(a.aggiornatoIl),
    // come i referenti: il callsign, o nome e iniziale. Basta a sapere a chi
    // chiedere e non mette in giro il cognome di nessuno.
    caricatoDa: a.caricatoDa
      ? comeChiamare(a.caricatoDa, { incarico: false, diSquadra: false }).nome
      : null,
  }));

  // Le tipologie segnate come riunione: se non ce n'è nessuna il pulsante non
  // compare, invece di aprire un modulo che non può funzionare.
  const tipiRiunione = tl
    ? await prisma.tipoAttivita.findMany({
        where: { riunione: true, attivo: true },
        orderBy: { ordine: 'asc' },
        select: { id: true, nome: true },
      })
    : [];

  // L'appello è di chi doveva esserci: dove c'è una formazione, titolari,
  // convocati e sala controllo. Le riserve non hanno giocato e segnarle
  // assenti sarebbe scriverlo sulla loro scheda per una colpa che non hanno.
  // Chi ha detto "non ci sono" fuori dall'appello: non c'è niente da spuntare
  // accanto al suo nome, e vederselo davanti fa dubitare di aver letto male la
  // sua risposta. Resta comunque registrato come assente — l'appello segna
  // assente chiunque non venga spuntato, e lui non lo è.
  const daAppello = (schieraQuesta ? evento.rsvps.filter(schierato) : evento.rsvps).filter(
    (r) => r.status !== 'ASSENTE',
  );

  type Riga = (typeof evento.rsvps)[number];
  const diSquadra = (r: Riga) => inSquadra(r.user.stato) || r.user.stato === 'DA_RICONFERMARE';

  /** Questa riga l'ha aperta lo staff segnando qualcuno, non la persona. */
  const aggiuntoDalloStaff = (r: Riga) => r.note === NOTA_AGGIUNTO_STAFF;

  // Quanti siamo in campo, da dove: si contano quelli che hanno detto «ci
  // sono» — come nel numero che leggono le squadre ospiti — e gli operatori
  // che le squadre di fuori hanno annunciato. Chi non ha ancora risposto non
  // può stare nel conto, ma si dice che manca.
  const interniInGiocata = presenti.filter(diSquadra).length;
  const inGiocata = {
    interni: interniInGiocata,
    nuovi: presenti.length - interniInGiocata,
    esterni: evento.ospiti.reduce((t, o) => t + (o.operatori ?? 0), 0),
    squadre: evento.ospiti.filter((o) => (o.operatori ?? 0) > 0).length,
    mancanti: evento.ospiti.filter((o) => o.operatori === null).length,
    conOspiti: evento.ospiti.length > 0,
  };

  /*
   * Le tappe del viaggio, nell'ordine in cui si fa la strada.
   *
   * Prima il ritrovo, poi il campo: chi parte da casa punta al primo, chi
   * arriva tardi punta al secondo, e finché il pulsante era uno solo uno dei
   * due sbagliava sempre strada.
   *
   * **Un ritrovo scritto a mano non è una tappa**: «davanti al bar» non porta
   * nessuno da nessuna parte, e un navigatore che apre il nulla è peggio di un
   * pulsante che non c'è. Ci vuole il punto sulla mappa.
   */
  const metaRitrovo =
    evento.ritrovoLat != null
      ? metaNaviga(evento.ritrovoLat, evento.ritrovoLng, evento.ritrovo)
      : null;

  const campo = evento.field
    ? {
        testo: evento.field.nome,
        meta: metaNaviga(
          evento.field.lat,
          evento.field.lng,
          [evento.field.indirizzo, evento.field.citta].filter(Boolean).join(', ') ||
            evento.field.nome,
        ),
      }
    : evento.luogo
      ? { testo: evento.luogo, meta: metaNaviga(evento.luogoLat, evento.luogoLng, evento.luogo) }
      : null;

  /*
   * A quali altre attività si può dichiarare legata questa.
   *
   * Solo quelle vicine di data — cinque giorni prima e cinque dopo — perché
   * «fa parte della stessa giornata» ha senso su una trasferta o su un fine
   * settimana, non su una gara di marzo. Una tendina con dentro tre anni di
   * calendario non la guarda nessuno.
   */
  /** Le altre attività della stessa giornata, dette per nome. */
  const insieme = [
    ...(evento.collegatoA ? [evento.collegatoA] : []),
    ...evento.collegate,
  ];

  const collegabili = (
    await prisma.event.findMany({
      where: {
        id: { not: evento.id },
        inizio: {
          gte: new Date(evento.inizio.getTime() - 5 * 86_400_000),
          lte: new Date(evento.inizio.getTime() + 5 * 86_400_000),
        },
      },
      orderBy: { inizio: 'asc' },
      select: { id: true, titolo: true, inizio: true },
    })
  ).map((a) => ({ id: a.id, titolo: a.titolo, quando: fmtDateTime(a.inizio) }));

  const tappe: Tappa[] = [
    ...(metaRitrovo && evento.ritrovo
      ? [{ etichetta: 'Luogo di ritrovo', testo: evento.ritrovo, meta: metaRitrovo }]
      : []),
    ...(campo?.meta ? [{ etichetta: 'Campo', testo: campo.testo, meta: campo.meta }] : []),
  ];

  /**
   * Dove si gioca, detto in tre righe: il nome, l'indirizzo, e chi lo tiene.
   *
   * Un campo in anagrafica ha un nome nostro — «Area Boschiva Nord» — che non
   * porta nessuno da nessuna parte: l'indirizzo va detto sotto, non al posto
   * suo. Una riunione un posto non ce l'ha, e dirlo «—» sarebbe far cercare
   * qualcosa che non esiste: si gioca online, e il collegamento è lì sotto.
   */
  const dove = evento.field
    ? {
        nome: evento.field.nome,
        indirizzo:
          [evento.field.indirizzo, evento.field.citta].filter(Boolean).join(', ') || null,
        nota: evento.field.squadra ? `gestito da ${evento.field.squadra.nome}` : null,
      }
    : evento.luogo
      ? { nome: evento.luogo, indirizzo: null, nota: null }
      : evento.linkRiunione
        ? { nome: 'Online', indirizzo: null, nota: 'ci si trova sul collegamento qui sotto' }
        : { nome: '—', indirizzo: null, nota: 'il posto non è ancora deciso' };

  /** Quante persone si presentano in campo, i nostri e quelli di fuori. */
  const attesi = inGiocata.interni + inGiocata.nuovi + inGiocata.esterni;

  /**
   * Da dove vengono, e **solo quelli che ci sono**.
   *
   * «2 del club · 0 nuovi» fa leggere uno zero per scoprire che non c'è niente
   * da sapere: i numeri che contano sono quelli diversi da zero, e una riga
   * corta si legge in un colpo d'occhio invece che parola per parola.
   */
  const pezziGiocata = [
    inGiocata.interni > 0
      ? { chiave: 'interni', n: inGiocata.interni, classe: 'text-ink', testo: 'del club' }
      : null,
    inGiocata.nuovi > 0
      ? {
          chiave: 'nuovi',
          n: inGiocata.nuovi,
          classe: 'text-sky-300',
          testo: inGiocata.nuovi === 1 ? 'nuovo' : 'nuovi',
        }
      : null,
    inGiocata.esterni > 0
      ? {
          chiave: 'esterni',
          n: inGiocata.esterni,
          classe: 'text-warn',
          testo: `da ${inGiocata.squadre} ${
            inGiocata.squadre === 1 ? 'squadra esterna' : 'squadre esterne'
          }`,
        }
      : null,
  ].filter((p): p is { chiave: string; n: number; classe: string; testo: string } => p !== null);

  /**
   * Com'è fatta la quota, quando dirlo aggiunge qualcosa.
   *
   * Una voce sola e senza dettaglio ripeterebbe il numero grande scritto sopra;
   * due voci, o una che si paga a una cassa diversa, no — lì cambia **a chi**
   * si paga, e chi deve saldare deve saperlo.
   */
  /**
   * Quanto costa la giocata, per chi la governa: **due numeri, non uno**.
   *
   * A chi deve pagare interessa la propria cifra e basta. A chi tiene il
   * calendario interessa il prezzo com'è fatto — quanto ai nostri, quanto a
   * quelli di fuori — perché è la cosa che decide, e che gli chiedono al
   * telefono. Finiva in una riga grigia in fondo, sotto un trattino: il
   * trattino era la sua quota personale, zero, e il prezzo vero non si vedeva.
   *
   * Sono **totali**: la quota dell'attività più tutte le casse che ci sono
   * attaccate, perché è quello che esce dal portafoglio di chi viene.
   */
  const tariffaInterni =
    costo + evento.quoteCasse.reduce((t, q) => t + Number(q.importo), 0);
  const tariffaEsterni =
    (quotaEsterni ?? costo) +
    evento.quoteCasse.reduce(
      (t, q) => t + Number(q.importoEsterni === null ? q.importo : q.importoEsterni),
      0,
    );
  const vociQuota = [
    ...(mioCosto > 0
      ? [`${fmtEuro(mioCosto)} alla squadra${mioDettaglio ? ` (${mioDettaglio})` : ''}`]
      : []),
    ...mieAltreVoci.map(
      (v) => `${fmtEuro(v.importo)} a ${v.cassa}${v.descrizione ? ` (${v.descrizione})` : ''}`,
    ),
  ];
  const composizione =
    vociQuota.length > 1 || mioDettaglio || mieAltreVoci.length > 0 ? vociQuota : [];

  // squadra e ospiti restano separati: hanno adempimenti diversi (i nuovi vanno
  // assicurati con la giornaliera) e mescolarli nasconde chi manca di cosa
  const dividi = (
    chiave: string,
    titolo: string,
    colore: string,
    righe: Riga[],
  ) => {
    const squadra = righe.filter(diSquadra);
    const nuovi = righe.filter((r) => !diSquadra(r));
    if (nuovi.length === 0) return [{ chiave, titolo, colore, righe: squadra }];
    if (squadra.length === 0) return [{ chiave: `${chiave}-n`, titolo: `${titolo} · nuovi`, colore, righe: nuovi }];
    return [
      { chiave, titolo: `${titolo} · squadra`, colore, righe: squadra },
      { chiave: `${chiave}-n`, titolo: `${titolo} · nuovi`, colore, righe: nuovi },
    ];
  };

  const gruppi = schieraQuesta
    ? [
        ...dividi('titolari', 'Titolari', 'text-nvg', titolari),
        ...dividi('convocati', 'Convocati · in attesa del saldo', 'text-warn', convocati),
        ...dividi('toc', 'TOC · sala controllo', 'text-sky-300', toc),
        ...dividi('riserve', 'Riserve', 'text-warn', riserve),
        ...dividi('daassegnare', 'Da assegnare', 'text-muted', daAssegnare),
        ...dividi('forse', 'Forse', 'text-warn', forse),
        ...dividi('assenti', 'Non ci sono', 'text-danger', assenti),
      ]
    : [
        ...dividi('presenti', 'Presenti', 'text-nvg', presenti),
        ...dividi('forse', 'Forse', 'text-warn', forse),
        ...dividi('assenti', 'Non ci sono', 'text-danger', assenti),
      ];

  // copertura assicurativa: una per persona e per giorno, perché la
  // giornaliera vale fino alle 24 del giorno della prova
  const giornaliere = new Map(
    evento.giornaliere.map((g) => [`${g.userId}|${chiaveDaColonna(g.giorno)}`, g]),
  );
  const giorniEvento = giorniDi(evento.inizio, evento.fine);
  const piuGiorni = giorniEvento.length > 1;

  /*
   * Chi oggi non può giocare perché non è coperto.
   *
   * Un nuovo senza tessera annuale gioca solo con la giornaliera di quel
   * giorno; se anche un solo giorno dell'attività gli manca, in campo non ci
   * va — assicurazione a parte, è la regola del campo e dell'assicuratore.
   * Nell'appello va visto **prima di tutto il resto**, anche se ha detto «ci
   * sono»: è l'ultimo momento in cui qualcuno lo può fermare, e in una lista
   * di spunte tutte uguali passerebbe come gli altri.
   */
  const scoperto = (r: Riga) =>
    giorniEvento.some(
      (giorno) =>
        serveGiornaliera(diSquadra(r), r.user.stato, r.user.figtCards, dataLocale(giorno)) &&
        giornaliere.get(`${r.userId}|${giorno}`)?.stato !== 'ASSICURATO',
    );

  // Un nuovo paga il prezzo per gli esterni, o quello della squadra se il primo
  // non c'è. Se non c'è nessuno dei due, aggiungerlo vorrebbe dire farlo giocare
  // gratis senza averlo deciso — e poterlo assicurare senza che abbia pagato:
  // il selettore allora chiede il prezzo prima di aggiungerlo.
  // Conta anche una quota di un'altra cassa: il Corso CQB non chiede niente al
  // club, ma i suoi prezzi li ha — a SAT & Gaming e a chi tiene i nuovi.
  const prezzoEsterniDaDecidere =
    evento.costoEsterni === null &&
    !(Number(evento.costo ?? 0) > 0) &&
    !evento.quoteCasse.some((q) => Number(q.importo) > 0 || q.importoEsterni !== null);

  return (
    <>
      {/* aperta: smette di contare fra le novità, per chi la sta guardando */}
      <SegnaEventoLetto eventId={evento.id} />

      <Link href="/calendario" className="mb-4 inline-block text-xs text-muted hover:text-nvg">
        ← Calendario
      </Link>

      <Intestazione
        titolo={evento.titolo}
        sottotitolo={`${evento.tipo?.nome ?? 'Senza tipologia'} · ${fmtDateTime(evento.inizio)}`}
        azioni={
          <div className="flex flex-wrap items-center gap-2">
            {/* la propria risposta, in testa: aprendo l'attività la prima cosa
                da sapere è se ci si è già segnati, e la card sta più in basso */}
            {mio ? (
              <Badge tono={tonoRsvp[mio.status]}>{etichettaRisposta[mio.status]}</Badge>
            ) : (
              !chiuso && <Badge tono="warn">Non hai risposto</Badge>
            )}

            {/* quanto manca per decidere: una data costringe a fare il conto a
                mente, un conto alla rovescia no */}
            {evento.status === 'RILASCIATA' && evento.chiusuraIscrizioni && (
              <ContoAllaRovescia scadenza={evento.chiusuraIscrizioni.toISOString()} />
            )}
{/* Il team leader può sistemare la logistica: è lui che il sabato sera
                scopre che il campo ha cambiato ingresso, e farglielo chiedere
                all'admin vuol dire che la squadra lo saprà il giorno dopo.
                Quote, posti e destinatari restano di chi gestisce il
                calendario: lì si decide, non si corregge. */}
            {(admin || tl) && (
              <BottoneModale
                etichetta={admin ? 'Modifica' : 'Luoghi e titolo'}
                icona="modifica"
                titolo={admin ? `Modifica "${evento.titolo}"` : `Luoghi di "${evento.titolo}"`}
                className="btn-ghost btn-sm"
                larga
              >
                <FormAzione azione={salvaEvento}>
                  <FormEvento
                    squadra={rosa}
                    referenti={referentiScelti}
                    giorni={giorniEvento.length}
                    campi={campi}
                    tipologie={tipologie}
                    listino={listino}
                    stagioneId={evento.stagioneId}
                    stagioni={stagioni}
                    evento={evento}
                    casse={casseAttive}
                    collegabili={collegabili}
                    soloLogistica={!admin}
                    // un nuovo forzato su un'attività di squadra ha bisogno del
                    // suo prezzo: senza, la card esterni resterebbe nascosta
                    conNuovi={evento.rsvps.some((r) => !vedeAttivitaSquadra(r.user.stato))}
                  />
                  <Invia icona="salva">Salva modifiche</Invia>
                </FormAzione>
                {/* Eliminare è l'ultima cosa che si fa a un'attività, e sta in
                    fondo alla sua modifica: fra i cambi di stato stava accanto
                    a gesti di tutti i giorni, e non è un passo indietro ma una
                    cancellazione. Solo l'admin, e con conferma. */}
                {admin && (
                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
                    <p className="text-xs text-muted">
                      Cancella l’attività con tutte le adesioni raccolte. Non si torna indietro.
                    </p>
                    <BottoneElimina
                      azione={eliminaEvento}
                      valori={{ id: evento.id }}
                      conferma={`Eliminare definitivamente "${evento.titolo}" e tutte le adesioni raccolte?`}
                      etichetta="Elimina attività"
                    />
                  </div>
                )}
              </BottoneModale>
            )}
            {/* Da una gara si decide di vedersi per prepararla: è così che
                succede, e il titolo arriva già scritto perché è quello che uno
                scriverebbe comunque. */}
            {tl && tipiRiunione.length > 0 && (
              <BottoneModale
                etichetta="Organizza una riunione"
                icona="calendario"
                titolo="Nuova riunione"
                className="btn-ghost btn-sm"
                larga
              >
                <FormAzione azione={creaRiunione}>
                  <FormRiunione
                    tipologie={tipiRiunione}
                    daEventId={evento.id}
                    titoloPredefinito={`Riunione: ${evento.titolo}`}
                  />
                  <Invia icona="salva">Crea la riunione</Invia>
                </FormAzione>
              </BottoneModale>
            )}

            {/* stato e destinatari raccontano come è messa l'attività a chi la
                gestisce: all'operatore non cambiano niente, e quando non è
                rilasciata glielo dice comunque la fascia qui sotto */}
            {gestisce && (
              <>
                {/* Lo stato si legge qui in cima e si cambia in fondo, accanto
                    al condividi: era un'etichetta che apriva una finestra, e
                    una cosa che si legge non dovrebbe anche essere il pulsante
                    che la cambia — in cima alla pagina, per giunta, prima di
                    aver letto di cosa si tratta. */}
                <span
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold ${coloreStato}`}
                >
                  {statoLetto}
                </span>
                {evento.visibilita ? (
                  <Badge
                    tono={
                      evento.visibilita === 'TUTTI'
                        ? 'warn'
                        : evento.visibilita === 'INVITO'
                          ? 'info'
                          : 'neutro'
                    }
                  >
                    {etichettaVisibilita[evento.visibilita]}
                  </Badge>
                ) : (
                  <Badge tono="neutro">Destinatari da scegliere</Badge>
                )}
              </>
            )}
          </div>
        }
      />

      {inCorso && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-nvg/40 bg-nvg/10 px-4 py-3 text-nvg">
          <span className="text-base font-semibold">IN CORSO</span>
          <span className="text-sm">
            {evento.fine
              ? `Fino ${piuGiorni ? 'a ' + fmtDateTime(finestra.a) : 'alle ' + fmtTime(finestra.a)}.`
              : 'Fino a fine giornata.'}
            {tl && ' L’appello resta aperto finché non lo chiudi.'}
          </span>
        </div>
      )}

      {/* finita ma non chiusa: resta in cima al programma finché qualcuno non
          fa l'appello, o non la conclude */}
      {terminata && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-warn">
          <span className="text-base font-semibold">TERMINATA</span>
          <span className="text-sm">
            {tl
              ? 'La giornata è finita: fai l’appello per chiuderla.'
              : 'La giornata è finita: manca solo che venga chiusa.'}
          </span>
        </div>
      )}

      {evento.status !== 'RILASCIATA' && (
        <div
          className={`mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-3 ${
            evento.status === 'CREATA'
              ? 'border-warn/40 bg-warn/10 text-warn'
              : evento.status === 'ANNULLATA'
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-line bg-surface2 text-muted'
          }`}
        >
          <span className="text-base font-semibold">
            {etichettaEvento[evento.status].toUpperCase()}
          </span>
          <span className="text-sm">
            {evento.status === 'CREATA'
              ? 'Bozza: non è ancora visibile agli operatori e non accetta adesioni.'
              : evento.status === 'ANNULLATA'
                ? 'Attività annullata: le adesioni sono chiuse.'
                : 'Attività conclusa: restano solo le presenze registrate.'}
          </span>
          {/* Il motivo va a capo, tutto intero: è la prima cosa che cerca chi
              si era segnato e trova l'attività saltata. */}
          {evento.motivoAnnullamento && (
            <p className="w-full text-sm">
              <span className="opacity-70">Motivo: </span>
              {evento.motivoAnnullamento}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            {/* Quando, in grande e per primo, come nell'invito delle squadre
                ospiti: il giorno e l'ora sono quello che si sbaglia, e in due
                caselle grigie della griglia si leggevano come un dettaglio
                anagrafico. A quelli di casa non c'era ragione di dirlo peggio
                che a quelli di fuori. */}
            <Quando
              inizio={evento.inizio}
              fine={evento.fine}
              ritrovo={evento.oraRitrovo}
              durataOre={evento.durataOre}
            />

            {/* Se fa parte di una giornata più grande, si dice qui: altrimenti
                il collegamento resta una spunta invisibile dentro al modulo, e
                chi guarda le statistiche non capisce perché due attività
                contano per una. */}
            {insieme.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                Stessa giornata di{' '}
                {insieme.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && ', '}
                    <Link href={`/calendario/${a.id}`} className="text-nvg hover:underline">
                      {a.titolo}
                    </Link>
                  </span>
                ))}
                : per le statistiche contano come un impegno solo.
              </p>
            )}

            {/* ------------------------------------------------ dove si gioca */}
            {/* Un posto solo. Il campo, il ritrovo, la mappa e i pulsanti per
                farsi portare stavano in quattro punti diversi della pagina, e
                chi doveva arrivarci li raccoglieva scorrendo avanti e indietro. */}
            <div className="mt-5 border-t border-line pt-4">
              <Blocco
                etichetta="Dove si gioca"
                valore={dove.nome}
                sotto={dove.indirizzo}
                nota={dove.nota}
              />

              {/* Il ritrovo è un'altra cosa dal campo: è dove ci si trova
                  prima, spesso a chilometri di distanza, e con un'ora sua.
                  Grande come il campo: in una riga piccola sotto al campo si
                  leggeva come una nota, ed è invece il posto dove si va. */}
              {(evento.ritrovo || evento.oraRitrovo) && (
                <Blocco
                  className="mt-4"
                  etichetta="Ritrovo"
                  valore={evento.ritrovo ?? 'Sul posto'}
                  sotto={evento.oraRitrovo ? `ore ${fmtTime(evento.oraRitrovo)}` : undefined}
                />
              )}

              {evento.linkRiunione && (
                <p className="mt-3">
                  <a
                    href={evento.linkRiunione}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-primary btn-sm"
                  >
                    <Icona nome="apri" size={15} />
                    Entra nella riunione
                  </a>
                </p>
              )}

              {evento.field?.lat != null && evento.field?.lng != null && (
                <div className="mt-3">
                  <Mappa
                    lat={evento.field.lat}
                    lng={evento.field.lng}
                    nome={evento.field.nome}
                    altezza={200}
                  />
                </div>
              )}

              {tappe.length > 0 && (
                <div className="mt-3">
                  <ComeArrivare tappe={tappe} />
                </div>
              )}
            </div>

            {/* ------------------------------------------------- referenti */}
            {/* Chi tiene in mano l'attività, e lo vedono tutti — nuovi
                compresi: uno arrivato da poco che non conosce nessuno è
                esattamente la persona che deve poter chiedere come ci si veste
                o a che ora si parte. È un elenco di persone da chiamare, non
                un numero da leggere: una riga per uno, col recapito accanto. */}
            <ReferentiEvento referenti={referenti} />

            {/* --------------------------------------------- tutto il resto */}
            {/* Una linea sola sopra, e nessuna dentro. Le righe orizzontali
                separano i tre discorsi grossi — quando, dove, a chi si chiede —
                e usarle anche qui spezzettava la pagina in dieci riquadri, dove
                non si capiva più cosa fosse importante. */}
            <div className="mt-5 space-y-4 border-t border-line pt-4">
              {/* Quanti saremo, per intero.
                  La domanda per cui si apre un'attività non è «quante
                  adesioni ci sono fra i nostri»: è quanta gente ci sarà in
                  campo, e quel numero comprende i nuovi e chi arriva con le
                  altre squadre. Si tocca e si finisce fra i partecipanti, dove
                  ci sono i nomi. */}
              <a
                href="#partecipanti"
                className="-mx-2 block rounded-md px-2 py-1 transition-colors hover:bg-surface2/60"
              >
                <Blocco
                  etichetta="In giocata"
                  valore={
                    <>
                      <span className="num">{attesi}</span>{' '}
                      <span className="text-base font-normal text-muted">
                        {attesi === 1 ? 'persona attesa' : 'persone attese'}
                      </span>
                    </>
                  }
                  sotto={
                    pezziGiocata.length > 0 ? (
                      <>
                        {pezziGiocata.map((p, i) => (
                          <span key={p.chiave}>
                            {i > 0 && <span className="text-muted"> · </span>}
                            <span className={p.classe}>{p.n}</span>{' '}
                            <span className="text-sm text-muted">{p.testo}</span>
                          </span>
                        ))}
                      </>
                    ) : null
                  }
                  nota={
                    <>
                      {/* i posti non chiudono le adesioni: alzare la mano si
                          può sempre, e chi avanza va in riserva */}
                      {evento.maxPartecipanti !== null && (
                        <p>
                          {evento.maxPartecipanti} posti in formazione
                          {pieno && presenti.length > evento.maxPartecipanti
                            ? ` · ${presenti.length - evento.maxPartecipanti} in più`
                            : ''}
                        </p>
                      )}
                      {inGiocata.mancanti > 0 && (
                        <p>
                          {inGiocata.mancanti}{' '}
                          {inGiocata.mancanti === 1 ? 'squadra non ha' : 'squadre non hanno'} ancora
                          detto in quanti vengono
                        </p>
                      )}
                    </>
                  }
                />
              </a>

              {/* La quota: quanto tocca a me, e basta. Le due tariffe —
                  squadra ed esterni — le vede chi le decide: a chi deve pagare
                  non serve sapere quanto paga un altro, e messe in fila
                  facevano sembrare che ci fosse da scegliere. */}
              <Blocco
                etichetta="Quota"
                valore={
                  gestisce ? (
                    <>
                      <span className="num">{fmtEuro(tariffaInterni)}</span>{' '}
                      <span className="text-base font-normal text-muted">interni</span>
                    </>
                  ) : mioTotale > 0 ? (
                    fmtEuro(mioTotale)
                  ) : (
                    'Gratis'
                  )
                }
                sotto={
                  gestisce ? (
                    <>
                      <span className="text-warn">{fmtEuro(tariffaEsterni)}</span>{' '}
                      <span className="text-sm text-muted">esterni</span>
                    </>
                  ) : null
                }
                nota={
                  <>
                    {/* come si arriva a quella cifra: solo quando aggiunge
                        qualcosa, cioè quando le voci sono più d'una o vanno
                        pagate a una cassa diversa */}
                    {!gestisce && mioTotale > 0 && composizione.length > 0 && (
                      <p>{composizione.join(' · ')}</p>
                    )}

                    {/* a chi governa: di cosa sono fatti i due totali, cassa
                        per cassa. Il numero grande dice quanto, questo dice a
                        chi va. */}
                    {gestisce && evento.quoteCasse.length > 0 && (
                      <p>
                        attività &middot; interni {fmtEuro(costo)} &middot; esterni{' '}
                        {quotaEsterni === null ? fmtEuro(costo) : fmtEuro(quotaEsterni)}
                        {evento.quoteCasse.map((q) => (
                          <span key={q.id} className="block">
                            {q.cassa.nome} &middot; interni {fmtEuro(Number(q.importo))} &middot;{' '}
                            esterni{' '}
                            {fmtEuro(Number(q.importoEsterni === null ? q.importo : q.importoEsterni))}
                          </span>
                        ))}
                      </p>
                    )}

                    {/* Quanto tocca a chi sta guardando: il numero grande qui
                        sopra è il listino, non la sua quota. Senza la
                        composizione fra parentesi — dove va, l'ha appena
                        letto riga per riga. */}
                    {gestisce && mioTotale > 0 && <p>la tua &middot; {fmtEuro(mioTotale)}</p>}

                    {mioTotale > 0 && (
                      <p className="text-warn">
                        {mioConvocato
                          ? 'sei convocato: il posto è tuo, diventa tuo davvero al saldo'
                          : schieraQuesta && !mioTitolare
                            ? 'si paga solo se il TL ti schiera titolare'
                            : 'presenza confermata a quota saldata'}
                      </p>
                    )}
                  </>
                }
              />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Dato
                  etichetta="Chiusura adesioni"
                  valore={evento.chiusuraIscrizioni ? fmtDateTime(evento.chiusuraIscrizioni) : '—'}
                />
                <Dato
                  etichetta="Creato da"
                  valore={
                    evento.createdBy
                      ? `${evento.createdBy.nome} ${evento.createdBy.cognome}`
                      : 'sistema'
                  }
                />
              </div>

              {evento.descrizione && (
                <div>
                  <p className="titolo-sezione mb-2">Briefing</p>
                  <p className="whitespace-pre-wrap text-sm text-ink/90">{evento.descrizione}</p>
                </div>
              )}

              {tl && evento.note && (
                <div>
                  <p className="titolo-sezione mb-2">Note interne</p>
                  <p className="whitespace-pre-wrap text-sm text-muted">{evento.note}</p>
                </div>
              )}
            </div>

            {/* Il link si manda in fondo ai dati, dove uno arriva dopo aver
                letto quando e dove: è quello il momento in cui viene voglia di
                mandarlo a qualcuno. Sul telefono si apre il foglio di
                condivisione del sistema — dove va a finire lo decide chi
                condivide, non il gestionale. */}
{/* Una bozza non si condivide: chi riceve il link non vedrebbe niente, e
                mandare un indirizzo che si apre solo per chi gestisce il calendario
                è un modo per farsi richiamare. Da rilasciata in poi sì, anche a
                cose fatte — di una giocata finita si manda volentieri il racconto. */}
            {(evento.status !== 'CREATA' || admin) && (
              <div className="piede mt-5 justify-between">
                <p className="text-[11px] text-muted">
                  {evento.status === 'CREATA'
                    ? 'Bozza: finché non la rilasci non la vede nessuno.'
                    : evento.status === 'RILASCIATA'
                      ? 'Manda l’attività a qualcuno: il link apre questa pagina, sempre aggiornata.'
                      : 'Il link apre questa pagina: quello che c’è scritto resta.'}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {/* I passi di stato stanno qui, in fondo, accanto al
                      condividi: sono i gesti che si fanno sull'attività intera
                      — rilasciarla, concluderla, annullarla — e prima stavano
                      nelle card dell'elenco, dove si premevano di sfuggita
                      passando. Qui si arriva dopo averla letta. */}
                  {admin && (
                    <AzioniEvento
                      id={evento.id}
                      titolo={evento.titolo}
                      status={evento.status}
                      visibilita={evento.visibilita}
                      soloInterno={evento.tipo?.soloInterno ?? false}
                      compatto
                    />
                  )}
                  {evento.status !== 'CREATA' && (
                    <CondividiEvento
                      indirizzo={indirizzoPagina}
                      etichetta="Condividi l’attività"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------ squadre ospiti */}
          {/* Sta prima dei nostri partecipanti perché è la domanda che viene
              subito dopo «quando e dove»: con chi si gioca. Una bozza non ha
              ospiti da invitare — il link non aprirebbe niente — e si mostra
              da rilasciata in poi. */}
          {evento.status !== 'CREATA' && (
            <SquadreOspiti
              eventId={evento.id}
              ospiti={ospiti}
              conosciute={conosciute}
              puoGestire={tl}
              puoCondividere={inMano}
            />
          )}

          {/* ----------------------------------------------------- allegati */}
          {/* Il book di missione sta subito sotto: è la cosa che si apre
              prima di partire, e cercarla in fondo alla pagina fra le quote e
              i commenti vorrebbe dire non trovarla il giorno che serve. */}
          <AllegatiEvento
            eventId={evento.id}
            allegati={allegati}
            puoGestire={inMano}
            conOspiti={evento.ospiti.length > 0}
          />

          {/* -------------------------------------------------- partecipanti */}
          {/* In bozza non c'è nessuno da mostrare, e non è un caso da gestire:
              è la definizione di bozza. Finché non la rilasci l'attività non la
              vede nessuno, quindi nessuno può rispondere — un riquadro
              «Partecipanti · 0 presenti, 0 forse, 0 assenti» non racconta uno
              zero, racconta che sei arrivato prima tu.
              L'ancora del numero in cima resta: chi tocca «in giocata» finisce
              qui, e il margine tiene la barra in alto fuori dai piedi. */}
          {evento.status !== 'CREATA' && (
          <div id="partecipanti" className="scroll-mt-24">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              {/* Il conto sta in cima e si legge da lontano: è il dato per cui
                  si apre un'attività, e in grigio piccolo si leggeva come una
                  didascalia. */}
              <ContaRisposte
                presenti={presenti.length}
                forse={forse.length}
                assenti={assenti.length}
                silenziosi={silenziosi}
                inGiocata={inGiocata}
              />

              {tl && (
                <BottoneModale
                  etichetta="Aggiungi partecipanti"
                  icona="invita"
                  titolo="Aggiungi partecipanti"
                  className="btn-ghost btn-sm"
                  larga
                >
                  <ScegliPartecipanti
                    eventId={evento.id}
                    candidati={candidati}
                    soloSquadra={evento.visibilita === 'TEAM'}
                    prezzoEsterni={
                      prezzoEsterniDaDecidere
                        ? {
                            listino,
                            stagioneId: evento.stagioneId,
                            giorni: giorniEvento.length,
                            puoImpostare: admin,
                          }
                        : null
                    }
                  />
                </BottoneModale>
              )}
            </div>

            {evento.rsvps.length === 0 ? (
              <Vuoto testo="Nessuna risposta ancora." />
            ) : (
              <div className="space-y-5">
                {gruppi.map((g) =>
                  g.righe.length === 0 ? null : (
                    <div key={g.chiave}>
                      <p
                        className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] ${g.colore}`}
                      >
                        {g.titolo} · {g.righe.length}
                      </p>
                      <div className="space-y-2">
                        {g.righe.map((r) => (
                          <div
                            key={r.id}
                            /* Lo schema di tutte le card: in alto chi è, col cestino
                               rosso alla sua altezza a destra; sotto, a destra, quello
                               che si fa. Il nome non si stringe più per far posto ai
                               pulsanti: se è lungo va a capo. */
                            className="rounded-lg border border-line bg-surface p-3 [--pad:0.75rem]"
                          >
                            <div className="flex min-w-0 items-start gap-2">
                            <Avatar
                              iniziali={chiamato(r.user).iniziali}
                              size="sm"
                              fotoDi={r.user.fotoPath ? r.user.id : null}
                            />
                            <div className="min-w-0 flex-1">
                              {/* Si apre la scheda di chi si ha diritto di vedere,
                                  e la regola è la stessa di ogni altro elenco: fra
                                  compagni di squadra ci si apre a vicenda, mentre
                                  la scheda di un contatto la apre solo chi lo segue
                                  — comando, amministrazione, segreteria. Al team
                                  leader resta il nome e basta: in campo gli serve
                                  sapere chi c'è, non chi sia. */}
                              {profiloDi(r.user) ? (
                                <Link
                                  href={profiloDi(r.user)!}
                                  className="block break-words text-sm hover:text-nvg"
                                >
                                  {nomeDi(r.user)}
                                </Link>
                              ) : (
                                <p className="break-words text-sm">{nomeDi(r.user)}</p>
                              )}
                              {/* Una riga sola sotto il nome, così l'elenco resta
                                  regolare: la nota riguarda questa attività e
                                  viene prima del motto, che è sempre lì.
                                  «Aggiunto dallo staff» invece non è una nota di
                                  nessuno — è il modo in cui quella riga è nata —
                                  e sta in fondo con la data, dove si racconta da
                                  dove viene la risposta. */}
                              {r.note && !aggiuntoDalloStaff(r) ? (
                                <p className="break-words text-xs text-muted">{r.note}</p>
                              ) : (
                                r.user.frase && (
                                  <p className="break-words text-xs italic text-muted/80">
                                    {r.user.frase}
                                  </p>
                                )
                              )}

                              {/* Soldi e polizze sotto il nome, non in fila con i
                                  pulsanti: sono cose da leggere e non da premere,
                                  e messe in riga con «Nota» e «Presente» erano una
                                  fila di etichette da decifrare. Se non c'è niente
                                  da dire, la riga non occupa spazio. */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 empty:hidden">
                                {/* la quota può esserci anche su un'attività gratis:
                                    i nuovi pagano la loro tariffa fissa */}
                                {/* Il badge guarda la quota **di quella persona**, non
                                    il costo dell'attività: dove c'è la formazione una
                                    riserva non deve niente, e vedersi scritto "quota da
                                    saldare" senza avere nessun pagamento era falso. */}
                {/* Tre situazioni, non due: «dichiarata» sta in mezzo, ed è
                                    quella che spiega perché uno si può assicurare pur non
                                    risultando ancora incassato. */}
                                {vedeQuoteAltrui &&
                                  quoteDi(r.userId).length > 0 &&
                                  (() => {
                                    // tutte le sue quote insieme: il club e le altre casse
                                    const qs = quoteDi(r.userId);
                                    const aperte = qs.filter((q) => !quotaChiusa(q.status));
                                    if (aperte.length === 0) {
                                      return qs.every((q) => q.status === 'NON_GESTITO') ? (
                                        <Badge tono="neutro">gestita fuori</Badge>
                                      ) : (
                                        <Badge tono="ok">
                                          {qs.length > 1 ? 'quote saldate' : 'quota saldata'}
                                        </Badge>
                                      );
                                    }
                                    if (aperte.every((q) => q.dichiaratoIl)) {
                                      return <Badge tono="info">pagamento dichiarato</Badge>;
                                    }
                                    return (
                                      <Badge tono="warn">
                                        {aperte.length > 1
                                          ? `${aperte.length} quote da saldare`
                                          : 'quota da saldare'}
                                      </Badge>
                                    );
                                  })()}

                                {/* Copertura: chi non ha l'annuale valida gioca con la
                                    giornaliera, e la giornaliera vale fino alle 24
                                    del suo giorno. Un'attività di due giorni ne
                                    vuole due, e ognuna si fa quando serve — non
                                    tutte insieme e non da sola: chi viene solo il
                                    sabato, la domenica non va coperto. */}
                                {/* Solo chi ha confermato di venire. Per un "forse" la
                                    giornaliera non si fa: consuma una polizza vera, la paga
                                    il club e non torna indietro. Il pulsante ricompare
                                    quando passa a "ci sono". */}
                                {r.status === 'PRESENTE' &&
                                  (() => {
                                    const giorniScoperti = giorniEvento.filter((giorno) =>
                                      serveGiornaliera(
                                        diSquadra(r),
                                        r.user.stato,
                                        r.user.figtCards,
                                        dataLocale(giorno),
                                      ),
                                    );
                                    if (giorniScoperti.length === 0) return null;

                                    // La polizza la paga il club e non torna indietro:
                                    // prima si incassa. Chi ha dichiarato il pagamento
                                    // passa, ci ha messo la faccia. Contano le quote con
                                    // le voci che pagano la polizza. Finché non si può,
                                    // il pulsante non c'è e basta: una riga che spiega
                                    // perché manca era una scritta in più su ogni card,
                                    // e il pulsante compare da solo quando serve.
                                    const copribile = quotePerPolizza(
                                      quoteDi(r.userId),
                                      cassePolizza,
                                    ).every((q) => quotaOnorata(q));

                                    return (
                                      <span className="flex flex-wrap items-center gap-1.5">
                                        {giorniScoperti.map((giorno) => {
                                          const g = giornaliere.get(`${r.userId}|${giorno}`);
                                          const stato = g?.stato ?? 'NON_ASSICURATO';
                                          const quando = etichettaGiorno(giorno);
                                          return (
                                            <span key={giorno} className="flex items-center gap-1.5">
                                              <Badge tono={TONO_ASSICURAZIONE[stato]}>
                                                {piuGiorni ? `${quando} · ` : ''}
                                                {ETICHETTA_ASSICURAZIONE[stato]}
                                                {g?.codice ? ` · ${g.codice}` : ''}
                                              </Badge>
                                              {tl && copribile && stato !== 'ASSICURATO' && (
                                                <BottoneModale
                                                  etichetta={piuGiorni ? `Assicura ${quando}` : 'Assicura'}
                                                  icona="tessera"
                                                  titolo={`Giornaliera per ${nomeDi(r.user)} · ${quando}`}
                                                  className="btn-ghost btn-sm"
                                                >
                                                  <FormGiornaliera
                                                    userId={r.userId}
                                                    eventId={evento.id}
                                                    nome={nomeDi(r.user)}
                                                    giorno={giorno}
                                                  />
                                                </BottoneModale>
                                              )}
                                            </span>
                                          );
                                        })}
                                      </span>
                                    );
                                  })()}
                              </div>
                            </div>
                            {/* Fatto l'appello la riga si congela: di quella
                                persona non si dice più «forse viene», si dice
                                se c'era. Togliere il cestino non è nascondere
                                un comando, è dire che quel gesto non ha più
                                senso — cancellarla cancellerebbe una presenza
                                registrata, cioè un pezzo di storia della
                                giornata. */}
                            {tl && r.presente === null && (
                              <div className="-mr-1 -mt-0.5 shrink-0">
                                <BottoneElimina
                                  azione={rimuoviPartecipante}
                                  valori={{ rsvpId: r.id }}
                                  conferma={`Rimuovere ${r.user.nome} dall’attività?`}
                                  etichetta={`Rimuovi ${nomeDi(r.user)} dall’attività`}
                                />
                              </div>
                            )}
                            </div>

                            {/* Sotto, allineato a destra, quello che si fa: la
                                nota e lo stato su un piano, lo schieramento — che
                                si tocca e ritocca finché la formazione non torna
                                — su quello dopo. Il cestino non è qui ma in alto,
                                lontano dal pollice che schiera. */}
                            <div className="piede flex-col items-end">
                            <div className="flex w-full flex-wrap items-center justify-end gap-2">
                            {/* Da dove viene questa riga, e di quando è.
                                «Ha risposto il 18 set, 14:32» è la domanda che
                                si fa chi organizza il sabato sera: uno che ha
                                detto «ci sono» a luglio e non si è più fatto
                                vivo non è come uno che ha confermato stamattina.
                                La data è sempre quella dell'ultima volta che ha
                                toccato la risposta — se l'ha cambiata, è quando
                                l'ha cambiata. */}
                            <span className="mr-auto text-[11px] text-muted">
                              {/* A appello fatto quando ha risposto non
                                  interessa più a nessuno: la domanda «verrà?»
                                  ha avuto la sua risposta sul campo, ed è il
                                  badge qui accanto. */}
                              {r.presente !== null ? null : aggiuntoDalloStaff(r) ? (
                                <>
                                  aggiunto dallo staff ·{' '}
                                  <span className="num">{fmtDateTime(r.respondedAt)}</span>
                                </>
                              ) : (
                                <>
                                  ha risposto il{' '}
                                  <span className="num">{fmtDateTime(r.respondedAt)}</span>
                                </>
                              )}
                            </span>

                            {/* Nota al volo su questa persona in questa attività.
                                Nasce già legata a tutte e due: è il momento in cui
                                ci si ricorda cos'è successo, e chiederlo dopo dalla
                                scheda vuol dire riscrivere anche dov'era. */}
                            {scrivoNote &&
                              (() => {
                                const sue = notePerPersona(r.user.id);
                                return (
                                  <BottoneModale
                                    /* il numero sul pulsante dice se su questa
                                       persona c'è già qualcosa da rileggere,
                                       senza doverlo aprire per scoprirlo */
                                    etichetta={sue.length ? `Nota · ${sue.length}` : 'Nota'}
                                    icona="bozza"
                                    titolo={`Nota su ${nomeDi(r.user)}`}
                                    className="btn-ghost btn-sm"
                                    larga
                                  >
                                    <FormNota
                                      persone={persone}
                                      userId={r.user.id}
                                      eventId={evento.id}
                                      precedenti={sue}
                                    />
                                  </BottoneModale>
                                );
                              })()}

                            {/* La risposta non si ripete sulla card: la dice già il
                                gruppo in cui sta — «Presenti», «Forse», «Non ci
                                sono» — e un «Presente» sotto il titolo «Presenti»
                                è solo una parola in più da leggere. Resta il
                                verdetto dell'appello, che invece è un'informazione
                                nuova: c'era davvero, o no. */}
                            {r.presente !== null && (
                              <Badge tono={statoDiFatto(r).tono}>{statoDiFatto(r).testo}</Badge>
                            )}

                            </div>

                            {/* lo schieramento, su una riga sua */}
                            {r.presente === null && tl && schieraQuesta && r.status === 'PRESENTE' && (
                              <div className="flex flex-wrap items-center justify-end gap-1">

                                {/* Chi è dentro si può scambiare con una riserva:

                                    uno si fa male il giorno prima e la formazione

                                    non si smonta a mano. Se aveva già pagato, chi

                                    subentra non paga — la somma per quel posto il

                                    club l'ha incassata. */}

                                {(r.assegnazione === 'TITOLARE' ||

                                  r.assegnazione === 'CONVOCATO') &&

                                  riserve.length > 0 && (

                                    <BottoneModale

                                      etichetta="Sostituisci"

                                      icona="squadra"

                                      titolo={`Chi entra al posto di ${nomeDi(r.user)}?`}

                                      className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:border-nvgdim hover:text-ink"

                                    >

                                      <div className="space-y-2">

                                        {riserve.map((s) => (

                                          <div

                                            key={s.id}

                                            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2"

                                          >

                                            <span className="min-w-0 break-words text-sm">

                                              {nomeDi(s.user)}

                                            </span>

                                            <AzioneBottone

                                              azione={scambiaTitolare}

                                              valori={{ rsvpId: r.id, conRsvpId: s.id }}

                                              icona="squadra"

                                              className="btn-primary btn-sm"

                                            >

                                              Fai entrare

                                            </AzioneBottone>

                                          </div>

                                        ))}

                                      </div>

                                    </BottoneModale>

                                  )}



                                {(['TITOLARE', 'TOC', 'RISERVA', 'NON_ASSEGNATO'] as const).map((a) => (

                                  <AzioneBottone

                                    key={a}

                                    azione={schiera}

                                    valori={{ rsvpId: r.id, assegnazione: a }}

                                    className={`rounded border px-2 py-1 text-[11px] transition-colors ${

                                      r.assegnazione === a ||

                                      (a === 'TITOLARE' && r.assegnazione === 'CONVOCATO')

                                        ? a === 'TITOLARE'

                                          ? 'border-nvg bg-nvg/15 text-nvg'

                                          : a === 'TOC'

                                            ? 'border-sky-400 bg-sky-400/15 text-sky-300'

                                            : a === 'RISERVA'

                                              ? 'border-warn bg-warn/15 text-warn'

                                              : 'border-line bg-surface2 text-muted'

                                        : 'border-line text-muted hover:border-nvgdim'

                                    }`}

                                  >

                                    {a === 'NON_ASSEGNATO'

                                      ? '—'

                                      : a === 'TITOLARE' && r.assegnazione === 'CONVOCATO'

                                        ? 'Convocato'

                                        : etichettaAssegnazione[a]}

                                  </AzioneBottone>

                                ))}

                              </div>

                            )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
          )}

          {/* ------------------------------------------------ debriefing */}
          {/* letto qui è letto: il testo è tutto in pagina */}
          {evento.debriefing?.pubblicato && (
            <SegnaDebriefingLetti ids={[evento.debriefing.id]} />
          )}
          <Debriefing
            eventId={evento.id}
            debriefing={evento.debriefing}
            scrive={tl}
            // prima che cominci non c'è niente da raccontare
            passata={evento.inizio <= new Date()}
          />

          {/* ------------------------------------------------ commenti */}
          {/* Come sopra: una bozza non la legge nessuno, e una casella per
              commentare una cosa che non esiste ancora è solo un invito a
              parlare da soli. */}
          {evento.status !== 'CREATA' && (
          <Social
            eventId={evento.id}
            commenti={commenti as Commento[]}
            miPiace={miPiace.map((m) => ({
              nome: comeChiamare(m.utente, { incarico: false, diSquadra: true }).nome,
            }))}
            mioMiPiace={mioMiPiace != null}
            ioSono={me.id}
            chiSono={comeChiamare(me, { incarico: false, diSquadra: true }).nome}
            puoModerare={admin || puoModerareChat(me.roles)}
          />
          )}

          {/* ------------------------------------------------ note private */}
          {scrivoNote && (
            <BloccoNote
              note={mieNote as NotaLetta[]}
              persone={persone}
              eventId={evento.id}
              titolo="Le tue note su questa attività"
              contesto
            />
          )}
        </div>

        {/* -------------------------------------------------- laterale */}
        <div className="space-y-6">
          {/* ICE di chi viene: gruppo sanguigno, allergie e chi chiamare. In
              campo serve avere questi dati addosso, non doverli cercare in
              un'altra pagina mentre qualcuno è per terra. Li vedono solo admin
              e team leader, e solo di chi si è segnato.

              Ci sono solo mentre l'attività è in corso: sono dati sanitari, e
              servono **mentre** si gioca. Tenerli affacciati prima e dopo
              vorrebbe dire lasciare in giro il gruppo sanguigno di venti
              persone su schede che nessuno chiude più. E anche in corso
              restano chiusi, da aprire con la freccia: si guardano quando
              servono, non a chiunque passi sopra il telefono del TL. */}
          {tl && inCorso && daAppello.length > 0 && (
            <details className="card group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="titolo-sezione">ICE · chi c’è · {daAppello.length}</span>
                <span className="inline-flex text-muted transition-transform group-open:rotate-90">
                  <Icona nome="freccia" size={15} />
                </span>
              </summary>
              <p className="mb-3 mt-2 text-[11px] text-muted">
                Se succede qualcosa in campo. Dati sanitari: si guardano quando servono.
              </p>
              <div className="space-y-2">
                {daAppello.map((r) => (
                  <div key={r.id} className="rounded-lg border border-line px-3 py-2">
                    <p className="text-sm font-medium">{nomeDi(r.user)}</p>
                    <p className="num text-[11px] text-muted">
                      {r.user.gruppoSanguigno ? `gruppo ${r.user.gruppoSanguigno}` : 'gruppo —'}
                      {r.user.telefono && ` · ${r.user.telefono}`}
                    </p>
                    {r.user.allergie?.trim() && (
                      <p className="mt-1 text-[11px] text-warn">{r.user.allergie}</p>
                    )}
                    {r.user.emergenzaTel ? (
                      <p className="mt-1 text-[11px] text-muted">
                        chiamare {r.user.emergenzaNome ?? '—'}:{' '}
                        <a href={`tel:${r.user.emergenzaTel}`} className="text-nvg">
                          {r.user.emergenzaTel}
                        </a>
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-danger">nessun contatto d’emergenza</p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* A giornata conclusa la propria adesione non c'è più: non si risponde
              a un invito per una domenica passata. Quello che ne resta — c'eri
              o non c'eri — è scritto sulla riga dei partecipanti, ed è un fatto,
              non una scelta ancora da fare. */}
          {!conclusa && (
          <div className="card">
            <p className="titolo-sezione mb-3">
              {schieraQuesta ? 'La tua disponibilità' : 'La tua adesione'}
            </p>

            {fuoriDalLibro ? (
              <p className="text-sm text-muted">
                A questa non ti segni: non sei nel <strong className="text-ink">libro atleti</strong>,
                e il libro è chi scende in campo. Resti del club come tutti gli altri — se è un
                errore, l’admin ti dà il ruolo atleta e da lì ti segni come chiunque.
              </p>
            ) : !certificatoOk ? (
              <div className="space-y-3">
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                  Non puoi segnarti: il certificato medico manca o non è più valido.
                </div>
                <Link href="/certificati" className="btn-primary w-full btn-sm">
                  Carica il certificato
                </Link>
              </div>
            ) : chiuso ? (
              <p className="text-sm text-muted">
                {evento.status === 'CREATA'
                  ? 'Attività in bozza: non è ancora stata rilasciata.'
                  : evento.status === 'ANNULLATA'
                    ? evento.motivoAnnullamento
                      ? `Attività annullata: ${evento.motivoAnnullamento}`
                      : 'Attività annullata.'
                    : 'Le adesioni sono chiuse.'}
              </p>
            ) : (
              <>
                <AdesioneEvento
                  eventId={evento.id}
                  scelta={mio?.status ?? null}
                  nota={mio?.note ?? null}
                  pieno={pieno}
                />
                {schieraQuesta && (
                  <p className="mt-3 text-xs text-muted">
                    {mio?.assegnazione && mio.assegnazione !== 'NON_ASSEGNATO' ? (
                      <span className="text-nvg">
                        Il TL ti ha schierato come {umanizza(mio.assegnazione).toLowerCase()}.
                      </span>
                    ) : (
                      'Qui dichiari la disponibilità: alla gara partecipa chi il TL schiera come titolare.'
                    )}
                  </p>
                )}

                {mioCosto > 0 &&
                  mio?.status !== 'PRESENTE' &&
                  miaQuota &&
                  Number(miaQuota.pagato) > 0 && (
                    <div className="mt-3 space-y-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                      <p>
                        Hai versato {fmtEuro(Number(miaQuota.pagato))} per questa attività e non
                        partecipi più.
                      </p>
                      {miaQuota.rimborso ? (
                        <p className="text-nvg">
                          Rimborso già richiesto: la segreteria lo erogherà.
                        </p>
                      ) : (
                        <AzioneBottone
                          azione={chiediRimborso}
                          valori={{ id: miaQuota.id }}
                          icona="incassa"
                          className="btn-ghost btn-sm"
                        >
                          Chiedi il rimborso
                        </AzioneBottone>
                      )}
                    </div>
                  )}

                {mioTotale > 0 && mio?.status === 'PRESENTE' && (
                  <div
                    className={`mt-3 rounded-md border px-3 py-2 text-xs ${
                      mieSaldate
                        ? 'border-nvg/40 bg-nvg/10 text-nvg'
                        : 'border-warn/40 bg-warn/10 text-warn'
                    }`}
                  >
                    {mieSaldate ? (
                      <>
                        {mieQuote.length > 1
                          ? 'Quote saldate'
                          : `Quota di ${fmtEuro(mioTotale)} saldata`}
                        : il posto è confermato.
                      </>
                    ) : (
                      <>
                        {schieraQuesta ? 'La disponibilità vale' : 'Il posto è confermato'} al saldo
                        {mieAltreVoci.length > 0 ? ' di tutte le quote' : ' della quota'} (
                        {fmtEuro(mioTotale)}).{' '}
                        {/* le altre casse non passano dalla segreteria: si pagano
                            a chi le tiene, e conviene dirlo qui */}
                        {mieQuote
                          .filter((q) => q.cassaId && !quotaChiusa(q.status))
                          .map((q) => (
                            <span key={q.id} className="block">
                              {fmtEuro(Number(q.importo) - Number(q.pagato))} da pagare a{' '}
                              {q.cassa?.nome}.
                            </span>
                          ))}
                        <Link href="/pagamenti" className="underline underline-offset-2">
                          Vai ai pagamenti
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          )}

          {/* l'appello si fa dal ritrovo in poi, e resta finché non lo si
              chiude: prima non c'è ancora nessuno da spuntare */}
          {tl && iniziata && (
            <>
              <div className="card">
                <p className="titolo-sezione mb-3">Appello</p>
                <FormAzione azione={registraPresenze} className="space-y-3">
                  <input type="hidden" name="eventId" value={evento.id} />
                  {daAppello.length === 0 ? (
                    <p className="text-sm text-muted">
                      {schieraQuesta
                        ? 'Nessuno in formazione: l’appello si fa su chi doveva esserci.'
                        : 'Nessun partecipante da spuntare.'}
                    </p>
                  ) : (
                    <>
                      {/* Chi non è assicurato sta a parte, in rosso e in cima,
                          fuori dalla lista che scorre: deve saltare all'occhio
                          anche se ha detto «ci sono». La spunta resta sua — chi
                          fa l'appello registra chi c'era — ma la frase dice
                          chiaro che in campo non ci va. */}
                      {daAppello.some(scoperto) && (
                        <div className="rounded-lg border-2 border-danger/70 bg-danger/10 p-3">
                          <p className="flex items-center gap-2 text-sm font-semibold text-danger">
                            <Icona nome="scudo" size={16} />
                            Non assicurati · non possono giocare
                          </p>
                          <div className="mt-2 space-y-2">
                            {daAppello.filter(scoperto).map((r) => (
                              <label key={r.id} className="flex items-start gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  name="presenti"
                                  value={r.id}
                                  defaultChecked={r.presente ?? r.status === 'PRESENTE'}
                                  className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
                                />
                                <span className="min-w-0">
                                  <span className="block break-words font-medium">
                                    {nomeDi(r.user)}
                                  </span>
                                  <span className="block text-xs text-danger">
                                    Non può giocare: manca l’assicurazione giornaliera
                                    {piuGiorni ? ' per almeno un giorno' : ''}.
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* squadra e nuovi separati anche qui: hanno adempimenti
                          diversi — i nuovi vanno assicurati con la giornaliera —
                          e in una lista sola non si vede più chi è chi */}
                      <div className="max-h-64 space-y-1.5 overflow-y-auto">
                        {[
                          {
                            titolo: 'Operatori',
                            righe: daAppello.filter(
                              (r) => r.assegnazione !== 'TOC' && diSquadra(r),
                            ),
                          },
                          {
                            titolo: 'Nuovi',
                            righe: daAppello.filter(
                              (r) => r.assegnazione !== 'TOC' && !diSquadra(r) && !scoperto(r),
                            ),
                          },
                          {
                            // il TOC c'era, ma non in campo: tenerlo a parte
                            // evita di contarlo fra chi ha giocato mentre si
                            // spunta l'elenco
                            titolo: 'TOC · sala controllo',
                            righe: daAppello.filter(
                              (r) => r.assegnazione === 'TOC' && !scoperto(r),
                            ),
                          },
                        ]
                          .filter((g) => g.righe.length > 0)
                          .map((g) => (
                            <div key={g.titolo}>
                              <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted first:mt-0">
                                {g.titolo} · {g.righe.length}
                              </p>
                              <div className="space-y-1.5">
                                {g.righe.map((r) => (
                                  <label
                                    key={r.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      name="presenti"
                                      value={r.id}
                                      defaultChecked={r.presente ?? r.status === 'PRESENTE'}
                                      className="h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
                                    />
                                    <span className="break-words">{nomeDi(r.user)}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                      {/* L'appello registra e basta: chiudere l'attività è un
                          gesto a parte, in fondo alla pagina. Dirlo sul
                          pulsante evita di non premerlo per paura di chiudere
                          tutto alle otto del mattino. */}
                      <Invia className="btn-ghost w-full btn-sm">Salva presenze</Invia>
                      <p className="text-[11px] text-muted">
                        Si può rifare per chi arriva dopo. L’attività la chiudi tu, in fondo alla
                        pagina, quando la giornata è finita davvero.
                      </p>
                    </>
                  )}
                </FormAzione>
              </div>


            </>
          )}

        </div>
      </div>

    </>
  );
}
