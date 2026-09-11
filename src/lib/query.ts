import type { Prisma, StatoOperatore } from '@prisma/client';
import { prisma } from './db';
import { vedeAttivitaSquadra } from './domain';
import { quotaPer } from './quote';
import type { EventoLista } from '@/components/CardEvento';

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
    status: { not: 'CREATA' },
    OR: [aperte, ...(userId ? [{ rsvps: { some: { userId } } }] : [])],
  };
};

type Opzioni = {
  stato: StatoOperatore;
  userId: string;
  vedeBozze?: boolean;
  dove?: Prisma.EventWhereInput;
  ordine?: 'asc' | 'desc';
  limite?: number;
};

/** Eventi già appiattiti per le liste: include il conteggio presenti e la mia risposta. */
export async function eventiPerLista({
  stato,
  userId,
  vedeBozze = false,
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
      tipo: { select: { nome: true, colore: true, riserve: true } },
      field: { select: { nome: true, citta: true, indirizzo: true, lat: true, lng: true } },
      // tutte le risposte: servono i tre conteggi, non solo i presenti
      rsvps: {
        select: { status: true, userId: true, note: true, assegnazione: true, presente: true },
      },
      payments: {
        where: { userId, cassaId: null },
        select: { importo: true, pagato: true, status: true },
      },
      // se c'è la riga, quest'attività l'ho già aperta
      letture: { where: { userId }, select: { userId: true } },
    },
  });

  const ora = new Date();
  // la giornata conta intera: un'attività cominciata stamattina è ancora di oggi
  const inizioDiOggi = new Date(ora);
  inizioDiOggi.setHours(0, 0, 0, 0);

  // ognuno legge la quota che riguarda lui: chi è in squadra la sua, chi viene
  // da fuori quella degli esterni
  const quotaDi = (e: (typeof eventi)[number]) => {
    const q = quotaPer(e, stato).importo;
    return q > 0 ? q : null;
  };

  return eventi.map((e) => ({
    id: e.id,
    titolo: e.titolo,
    tipo: e.tipo?.nome ?? 'Senza tipologia',
    colore: e.tipo?.colore ?? 'grigio',
    status: e.status,
    visibilita: e.visibilita,
    inizio: e.inizio,
    costo: quotaDi(e),
    maxPartecipanti: e.maxPartecipanti,
    campo: e.field ? `${e.field.nome}${e.field.citta ? ` · ${e.field.citta}` : ''}` : null,
    // per il pulsante "Naviga": si parte dalle coordinate, l'indirizzo è la riserva
    lat: e.field?.lat ?? null,
    lng: e.field?.lng ?? null,
    indirizzo: e.field
      ? [e.field.indirizzo, e.field.citta].filter(Boolean).join(', ') || e.field.nome
      : null,
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
    // la mia quota per questa attività, se prevista
    quotaDovuta: e.payments[0] ? Number(e.payments[0].importo) : null,
    quotaSaldata: e.payments[0] ? e.payments[0].status === 'PAGATO' : false,
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
