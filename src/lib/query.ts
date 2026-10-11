import type { Prisma, StatoOperatore } from '@prisma/client';
import { prisma } from './db';
import { vedeAttivitaSquadra } from './domain';
import { quotaPer } from './quote';
import { faseAttivita } from './giorni';
import type { EventoLista, ViaggioInCard } from '@/components/CardEvento';
import { linkNaviga, metaNaviga } from '@/components/Naviga';
import { linkViaggio } from './viaggio';
import { datiOrigine, descriviCosto, organizzatoreDi } from './eventi-condivisi';

/**
 * Chi vede quali attività.
 *
 * Le bozze le vede solo chi gestisce il calendario. Delle rilasciate, quelle
 * aperte a tutti le vede chiunque, quelle di squadra chi è in squadra, e
 * quelle **su invito** nessuno per il solo fatto di esserci — nemmeno la
 * squadra.
 *
 * Sopra tutte le regole ne vale una: **chi è fra i partecipanti la vede
 * sempre.** È l'unico modo in cui un invito ha senso, ed è quello che serve a
 * un nuovo aggiunto a mano su un'attività di squadra: lo si è messo lì
 * apposta, e deve poter sapere dove andare. Chi invece non c'è non la vede —
 * forzare uno non apre l'attività a tutti gli altri nuovi.
 */
export const filtroVisibilita = (
  stato: StatoOperatore,
  vedeBozze = false,
  userId?: string,
): Prisma.EventWhereInput => {
  if (vedeBozze) return {};

  const aperte: Prisma.EventWhereInput = vedeAttivitaSquadra(stato)
    ? { visibilita: { in: ['TEAM', 'TUTTI'] } }
    : { visibilita: 'TUTTI' };

  return {
    // le bozze, e gli inviti di altre squadre non ancora accettati
    status: { notIn: ['CREATA', 'INVITATA'] },
    OR: [aperte, ...(userId ? [{ rsvps: { some: { userId } } }] : [])],
  };
};

type Opzioni = {
  stato: StatoOperatore;
  userId: string;
  vedeBozze?: boolean;
  /**
   * Chi guarda è admin. Solo lui sa che un'attività di un'altra squadra è a
   * pagamento, e quanto chiedono: è il prezzo d'acquisto, e accanto alla
   * quota interna farebbe vedere il ricarico a tutti.
   */
  admin?: boolean;
  dove?: Prisma.EventWhereInput;
  ordine?: 'asc' | 'desc';
  limite?: number;
};

type MacchinaInLista = {
  id: string;
  autistaId: string;
  modo: 'PRENDO' | 'RITROVO';
  partenza: string | null;
  partenzaLat: number | null;
  partenzaLng: number | null;
  arrivo: string | null;
  arrivoLat: number | null;
  arrivoLng: number | null;
  arrivoOra: Date | null;
  autista: { nome: string; cognome: string; callsign: string | null };
  tappe: { id: string; nome: string | null; luogo: string; lat: number | null; lng: number | null; ora: Date | null }[];
  passeggeri: { userId: string; stato: string; tappaId: string | null }[];
};

/**
 * La mia macchinata per la card: chi guida l'itinerario intero, chi sale il
 * suo punto di salita (al posto del ritrovo dell'attività), chi è invitato
 * l'offerta da guardare.
 */
function viaggioDi(macchine: MacchinaInLista[], userId: string, eventId: string): ViaggioInCard | null {
  const guido = macchine.find((m) => m.autistaId === userId);
  const link = (id: string) => `/calendario/${eventId}/viaggio/${id}`;
  if (guido) {
    const punti = [
      metaNaviga(guido.partenzaLat, guido.partenzaLng, guido.partenza),
      ...guido.tappe.map((t) => metaNaviga(t.lat, t.lng, t.luogo)),
      metaNaviga(guido.arrivoLat, guido.arrivoLng, guido.arrivo),
    ].filter((p): p is string => !!p);
    return {
      ruolo: 'autista',
      con: null,
      aBordo: guido.passeggeri.filter((p) => p.stato === 'ACCETTATO').length,
      dove: guido.arrivo,
      ora: guido.arrivoOra,
      naviga: linkViaggio(punti),
      pagina: link(guido.id),
    };
  }
  const salito = macchine.find((m) =>
    m.passeggeri.some((p) => p.userId === userId && p.stato === 'ACCETTATO'),
  );
  if (salito) {
    const io = salito.passeggeri.find((p) => p.userId === userId)!;
    const t = salito.tappe.find((x) => x.id === io.tappaId);
    const punto = t ? metaNaviga(t.lat, t.lng, t.luogo) : null;
    return {
      ruolo: 'passeggero',
      con: salito.autista.callsign || `${salito.autista.nome} ${salito.autista.cognome}`,
      aBordo: salito.passeggeri.filter((p) => p.stato === 'ACCETTATO').length,
      dove: t ? (t.nome ?? t.luogo) : null,
      ora: t?.ora ?? null,
      naviga: punto ? linkNaviga(punto) : null,
      pagina: link(salito.id),
      prendo: salito.modo === 'PRENDO',
    };
  }
  const offerta = macchine.find((m) =>
    m.passeggeri.some((p) => p.userId === userId && p.stato === 'INVITATO'),
  );
  const chiesta = macchine.find((m) =>
    m.passeggeri.some((p) => p.userId === userId && p.stato === 'RICHIESTO'),
  );
  if (!offerta && chiesta) {
    return {
      ruolo: 'richiesto',
      con: chiesta.autista.callsign || `${chiesta.autista.nome} ${chiesta.autista.cognome}`,
      aBordo: 0,
      dove: null,
      ora: null,
      naviga: null,
      pagina: link(chiesta.id),
    };
  }
  if (!offerta) return null;
  return {
    ruolo: 'invitato',
    con: offerta.autista.callsign || `${offerta.autista.nome} ${offerta.autista.cognome}`,
    aBordo: 0,
    dove: null,
    ora: null,
    naviga: null,
    pagina: link(offerta.id),
  };
}

/** Eventi già appiattiti per le liste: include il conteggio presenti e la mia risposta. */
export async function eventiPerLista({
  stato,
  userId,
  vedeBozze = false,
  admin = false,
  dove = {},
  ordine = 'asc',
  limite,
}: Opzioni): Promise<EventoLista[]> {
  const eventi = await prisma.event.findMany({
    // AND e non spread: un filtro sullo stato passato dal chiamante non deve
    // poter sovrascrivere quello di visibilità e far trapelare le bozze
    where: { AND: [filtroVisibilita(stato, vedeBozze, userId), dove] },
    orderBy: { inizio: ordine },
    take: limite,
    include: {
      tipo: { select: { nome: true, colore: true, riserve: true, soloInterno: true } },
      field: { select: { nome: true, citta: true, indirizzo: true, lat: true, lng: true } },
      // tutte le risposte: servono i tre conteggi, non solo i presenti
      rsvps: {
        select: { status: true, userId: true, note: true, assegnazione: true, presente: true },
      },
      // le mie quote di questa attività: quella del club e quelle delle altre
      // casse, che contano tutte per dire se ho saldato
      payments: {
        // un'annullata (passata, tenuta come credito) non si deve più
        where: { userId, tipo: { not: 'RIMBORSO' }, status: { not: 'ANNULLATO' } },
        select: { importo: true, pagato: true, status: true },
      },
      quoteCasse: { select: { importo: true, importoEsterni: true } },
      // se c'è la riga, quest'attività l'ho già aperta
      letture: { where: { userId }, select: { userId: true } },
      // organizzata da un'altra squadra collegata: il badge con nome e logo
      origineCollegamento: {
        select: { profilo: true, squadra: { select: { id: true, nome: true, logoPath: true } } },
      },
      // il sondaggio «partecipiamo?» aperto su un invito
      sondaggio: { select: { id: true } },
      // la mia macchinata: quella che guido, quella su cui salgo o mi offrono
      macchine: {
        where: {
          OR: [
            { autistaId: userId },
            {
              passeggeri: {
                some: { userId, stato: { in: ['ACCETTATO', 'INVITATO', 'RICHIESTO'] } },
              },
            },
          ],
        },
        select: {
          id: true,
          autistaId: true,
          modo: true,
          partenza: true,
          partenzaLat: true,
          partenzaLng: true,
          arrivo: true,
          arrivoLat: true,
          arrivoLng: true,
          arrivoOra: true,
          autista: { select: { nome: true, cognome: true, callsign: true } },
          tappe: { orderBy: { ordine: 'asc' }, select: { id: true, nome: true, luogo: true, lat: true, lng: true, ora: true } },
          passeggeri: {
            where: { stato: { in: ['ACCETTATO', 'INVITATO', 'RICHIESTO'] } },
            select: { userId: true, stato: true, tappaId: true },
          },
        },
      },
    },
  });

  const ora = new Date();
  // la giornata conta intera: un'attività cominciata stamattina è ancora di oggi
  const inizioDiOggi = new Date(ora);
  inizioDiOggi.setHours(0, 0, 0, 0);

  // ognuno legge la quota che riguarda lui: chi è in squadra la sua, chi viene
  // da fuori quella degli esterni
  // e dove l'attività ha anche quote di altre casse, quanto costa in tutto
  const quotaDi = (e: (typeof eventi)[number]) => {
    const q =
      quotaPer(e, stato).importo +
      e.quoteCasse.reduce(
        (t, c) => t + quotaPer({ costo: c.importo, costoEsterni: c.importoEsterni }, stato).importo,
        0,
      );
    return q > 0 ? q : null;
  };

  return eventi.map((e) => ({
    organizzatore: organizzatoreDi(e.origineCollegamento),
    // di un'altra squadra e a pagamento: lo sa solo l'admin, e senza cifra
    // sulla card (vedi `admin` qui sopra)
    pagaOrganizzatore: admin && !!e.origineCollegamento && !!datiOrigine(e.origineDati).costo,
    // sull'invito ancora da decidere la cifra serve: è lì che l'admin sceglie
    // se accettare. Gli inviti li vede solo lui
    costoInvito: (() => {
      const c = admin && e.status === 'INVITATA' ? datiOrigine(e.origineDati).costo : null;
      return c ? descriviCosto(c) : null;
    })(),
    // la cifra serve solo all'admin che accetta l'invito
    costoChiesto: admin && e.origineCollegamento ? datiOrigine(e.origineDati).costo : null,
    sondaggioId: e.sondaggio?.id ?? null,
    ritrovo: e.ritrovoNome ?? e.ritrovo,
    ritrovoMeta: metaNaviga(e.ritrovoLat, e.ritrovoLng, e.ritrovo),
    oraRitrovo: e.oraRitrovo,
    viaggio: viaggioDi(e.macchine, userId, e.id),
    propostaDa: e.origineCollegamento ? (datiOrigine(e.origineDati).propostaDa ?? null) : null,
    id: e.id,
    titolo: e.titolo,
    // un invito non ha ancora una tipologia nostra: si legge la loro
    tipo: e.tipo?.nome ?? datiOrigine(e.origineDati).tipo ?? 'Senza tipologia',
    colore: e.tipo?.colore ?? 'grigio',
    // tipologia riservata alla squadra: non si rilascia a tutti
    soloInterno: e.tipo?.soloInterno ?? false,
    status: e.status,
    // in corso, o finita e ancora da chiudere: lo dice l'orologio
    fase: faseAttivita(e, ora),
    visibilita: e.visibilita,
    inizio: e.inizio,
    fine: e.fine,
    costo: quotaDi(e),
    maxPartecipanti: e.maxPartecipanti,
    // senza un campo in anagrafica vale il luogo scritto a mano: è quello delle
    // riunioni, e delle attività in un posto che non è un campo
    campo: e.field
      ? `${e.field.nome}${e.field.citta ? ` · ${e.field.citta}` : ''}`
      : e.luogo?.trim() || null,
    // per il pulsante "Naviga": si parte dalle coordinate, l'indirizzo è la riserva
    lat: e.field ? e.field.lat : e.luogoLat,
    lng: e.field ? e.field.lng : e.luogoLng,
    indirizzo: e.field
      ? [e.field.indirizzo, e.field.citta].filter(Boolean).join(', ') || e.field.nome
      : e.luogo?.trim() || null,
    presenti: e.rsvps.filter((r) => r.status === 'PRESENTE').length,
    // quanti sono già schierati: con un limite di posti, sapere quanti ne
    // mancano alla formazione conta più di sapere quanti si sono proposti
    titolari: e.rsvps.filter((r) => r.assegnazione === 'TITOLARE').length,
    forse: e.rsvps.filter((r) => r.status === 'FORSE').length,
    assenti: e.rsvps.filter((r) => r.status === 'ASSENTE').length,
    mioStato: e.rsvps.find((r) => r.userId === userId)?.status ?? null,
    miaNota: e.rsvps.find((r) => r.userId === userId)?.note ?? null,
    // si può rispondere solo su un'attività rilasciata e non ancora chiusa
    adesioniAperte:
      e.status === 'RILASCIATA' && (!e.chiusuraIscrizioni || e.chiusuraIscrizioni > ora),
    // attiva, ma le iscrizioni sono chiuse (bloccate o scadute): al posto dei
    // pulsanti per rispondere ci va un badge che lo dice
    iscrizioniChiuse:
      e.status === 'RILASCIATA' && !!e.chiusuraIscrizioni && e.chiusuraIscrizioni <= ora,
    // la mia quota per questa attività, se prevista
    quotaDovuta:
      e.payments.length > 0 ? e.payments.reduce((t, p) => t + Number(p.importo), 0) : null,
    // saldata vuol dire saldate tutte: il club e le altre casse
    quotaSaldata:
      e.payments.length > 0 &&
      e.payments.every((p) => p.status === 'PAGATO' || p.status === 'NON_GESTITO'),
    conFormazione: e.tipo?.riserve ?? false,
    // Novità: rilasciata, ancora da fare, e mai aperta da me. Un'attività
    // passata non è più una novità nemmeno se non l'ho guardata — segnalarla
    // per sempre sarebbe un pallino che non si spegne mai.
    nuovo:
      e.status === 'RILASCIATA' && e.inizio >= inizioDiOggi && e.letture.length === 0,
    // Su un'attività finita conta chi c'era davvero, non chi si era proposto:
    // è l'unico numero che nello storico si va a cercare.
    presenze: e.rsvps.filter((r) => r.presente === true).length,
    mancati: e.rsvps.filter((r) => r.presente === false).length,
    appelloFatto: e.rsvps.some((r) => r.presente !== null),
    mioPresente: e.rsvps.find((r) => r.userId === userId)?.presente ?? null,
    motivoAnnullamento: e.motivoAnnullamento,
  }));
}

/** Elenco compatto per le tendine di selezione. */
export async function elencoOperatori(soloSquadra = true) {
  return prisma.user.findMany({
    where: soloSquadra
      ? { stato: { in: ['SQUADRA', 'SOSPESO'] } }
      : { stato: { not: 'DISABILITATO' } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, cognome: true, callsign: true, stato: true, email: true },
  });
}
