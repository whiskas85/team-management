import type { Prisma, StatoOperatore } from '@prisma/client';
import { prisma } from './db';
import { vedeAttivitaSquadra } from './domain';
import { quotaPer } from './quote';
import type { EventoLista } from '@/components/CardEvento';

/**
 * Le bozze le vede solo chi gestisce il calendario; chi non è ancora in squadra
 * vede solo le attività rilasciate a tutti.
 */
export const filtroVisibilita = (
  stato: StatoOperatore,
  vedeBozze = false,
): Prisma.EventWhereInput => {
  const pubbliche: Prisma.EventWhereInput = vedeAttivitaSquadra(stato)
    ? { status: { not: 'CREATA' } }
    : { status: { not: 'CREATA' }, visibilita: 'TUTTI' };

  return vedeBozze ? {} : pubbliche;
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
    where: { AND: [filtroVisibilita(stato, vedeBozze), dove] },
    orderBy: { inizio: ordine },
    take: limite,
    include: {
      tipo: { select: { nome: true, colore: true, riserve: true } },
      field: { select: { nome: true, citta: true, indirizzo: true, lat: true, lng: true } },
      // tutte le risposte: servono i tre conteggi, non solo i presenti
      rsvps: { select: { status: true, userId: true, note: true } },
      payments: { where: { userId }, select: { importo: true, pagato: true, status: true } },
    },
  });

  const ora = new Date();

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
