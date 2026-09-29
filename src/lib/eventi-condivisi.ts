import { revalidatePath } from 'next/cache';
import type { CollegamentoSquadra, Prisma } from '@prisma/client';
import { prisma } from './db';
import { accoda } from './federazione-coda';
import { profiloDi } from './federazione';
import { marchio } from './mia-squadra';
import { stagioneAttiva } from './stagioni';

/**
 * Le attività condivise fra gestionali collegati (docs/COLLEGAMENTO-SQUADRE.md,
 * fase 3).
 *
 * L'attività vera sta da chi la organizza. Le squadre collegate che invita ne
 * ricevono una copia, che nasce nello stato INVITATA — come una bozza, la vede
 * solo chi gestisce il calendario — e si aggiorna da sola a ogni modifica
 * dell'organizzatore. Accettata, diventa una bozza normale, e da lì in poi
 * adesioni, formazioni, quote e polizze sono affari di ognuno.
 *
 * Quello che passa è solo l'attività: date, luoghi, descrizione, i referenti
 * **col callsign**. Nomi, adesioni e quote non escono mai.
 */

/** Le date viaggiano come testo ISO. */
type Data = string | null;

export type EventoCondiviso = {
  id: string;
  titolo: string;
  descrizione: string | null;
  tipo: string | null;
  inizio: string;
  fine: Data;
  durataOre: number | null;
  ritrovo: string | null;
  ritrovoLat: number | null;
  ritrovoLng: number | null;
  oraRitrovo: Data;
  luogo: string | null;
  luogoLat: number | null;
  luogoLng: number | null;
  campo: { nome: string; indirizzo: string | null; citta: string | null } | null;
  linkRiunione: string | null;
  annullata: boolean;
  motivoAnnullamento: string | null;
  referenti: { callsign: string | null; telefono: string | null }[];
  /** Quanto chiediamo alle squadre ospiti: a operatore o per squadra. */
  costo: { importo: number; per: 'OPERATORE' | 'SQUADRA' } | null;
  /** Come ci si paga: i nostri metodi di pagamento. */
  metodi: { nome: string; istruzioni: string | null }[];
};

/** Una riga del riepilogo «chi viene»: una squadra e i suoi numeri. */
export type NumeriSquadra = {
  nome: string;
  presenti: number | null;
  forse: number | null;
  /** Chi organizza. */
  organizzatore?: boolean;
  /** La squadra che riceve il riepilogo: il suo numero lo sa già meglio lei. */
  voi?: boolean;
};

/** Quello che si manda di una nostra attività. */
export async function eventoDaCondividere(eventId: string): Promise<EventoCondiviso | null> {
  const e = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      tipo: { select: { nome: true } },
      field: { select: { nome: true, indirizzo: true, citta: true, lat: true, lng: true } },
      referenti: { include: { utente: { select: { callsign: true, telefono: true } } } },
    },
  });
  if (!e) return null;
  // i metodi di pagamento del club: sono quelli con cui ci pagano gli ospiti
  const metodi = e.costoOspiti
    ? await prisma.metodoPagamento.findMany({
        where: { attivo: true, cassaId: null },
        orderBy: { ordine: 'asc' },
        select: { nome: true, istruzioni: true },
      })
    : [];
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return {
    id: e.id,
    titolo: e.titolo,
    descrizione: e.descrizione,
    tipo: e.tipo?.nome ?? null,
    inizio: e.inizio.toISOString(),
    fine: iso(e.fine),
    durataOre: e.durataOre,
    ritrovo: e.ritrovo,
    ritrovoLat: e.ritrovoLat,
    ritrovoLng: e.ritrovoLng,
    oraRitrovo: iso(e.oraRitrovo),
    // il campo è nostro: di là diventa un luogo scritto, con le sue coordinate
    luogo: e.field
      ? [e.field.nome, e.field.indirizzo, e.field.citta].filter(Boolean).join(', ')
      : e.luogo,
    luogoLat: e.field?.lat ?? e.luogoLat,
    luogoLng: e.field?.lng ?? e.luogoLng,
    campo: e.field ? { nome: e.field.nome, indirizzo: e.field.indirizzo, citta: e.field.citta } : null,
    linkRiunione: e.linkRiunione,
    annullata: e.status === 'ANNULLATA',
    motivoAnnullamento: e.motivoAnnullamento,
    referenti: e.referenti.map((r) => ({ callsign: r.utente.callsign, telefono: r.utente.telefono })),
    costo:
      e.costoOspiti && Number(e.costoOspiti) > 0
        ? { importo: Number(e.costoOspiti), per: e.costoOspitiPer ?? 'OPERATORE' }
        : null,
    metodi,
  };
}

/**
 * Chi viene, squadra per squadra: noi, e tutti gli ospiti (collegati o col
 * link). È il riepilogo che vedono tutte le squadre collegate invitate.
 */
async function riepilogoNumeri(eventId: string) {
  const [e, m] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: {
        rsvps: { select: { status: true, presente: true } },
        ospiti: {
          orderBy: { creatoIl: 'asc' },
          select: {
            id: true,
            nome: true,
            operatori: true,
            operatoriForse: true,
            risposta: true,
          },
        },
      },
    }),
    marchio(),
  ]);
  if (!e) return null;
  const nostri = contaPresenti(e.rsvps);
  return {
    noi: { nome: m.nome, presenti: nostri.presenti, forse: nostri.forse, organizzatore: true },
    ospiti: e.ospiti.filter((o) => o.risposta !== 'RIFIUTATA'),
  };
}

/**
 * Quanti ne portiamo. Dopo l'appello contano quelli che c'erano davvero;
 * prima, chi ha detto di esserci.
 */
export function contaPresenti(rsvps: { status: string; presente: boolean | null }[]) {
  const appello = rsvps.some((r) => r.presente !== null);
  return {
    presenti: appello
      ? rsvps.filter((r) => r.presente === true).length
      : rsvps.filter((r) => r.status === 'PRESENTE').length,
    forse: appello ? 0 : rsvps.filter((r) => r.status === 'FORSE').length,
  };
}

/**
 * Manda l'attività, com'è adesso, a tutte le squadre collegate invitate che
 * non hanno detto di no. Si chiama dopo ogni modifica: la coda tiene solo
 * l'ultima versione di ogni attività ancora da mandare.
 */
export async function diffondiEvento(eventId: string) {
  const inviti = await prisma.squadraOspite.findMany({
    where: {
      eventId,
      collegamentoId: { not: null },
      risposta: { not: 'RIFIUTATA' },
      collegamento: { stato: 'ATTIVO' },
    },
  });
  if (inviti.length === 0) return;
  const [evento, riepilogo] = await Promise.all([
    eventoDaCondividere(eventId),
    riepilogoNumeri(eventId),
  ]);
  if (!evento || !riepilogo) return;
  for (const o of inviti) {
    // lo stesso riepilogo per tutti, con segnata la riga di chi lo riceve
    const numeri: NumeriSquadra[] = [
      riepilogo.noi,
      ...riepilogo.ospiti.map((x) => ({
        nome: x.nome,
        presenti: x.operatori,
        forse: x.operatoriForse,
        ...(x.id === o.id ? { voi: true } : {}),
      })),
    ];
    await accoda(
      o.collegamentoId!,
      'evento',
      {
        id: eventId,
        evento,
        numeri,
        accesso: o.accesso ?? 'VISUALIZZAZIONE',
        invitaAltri: o.invitaAltri,
      } as unknown as Prisma.InputJsonValue,
      { chiave: eventId },
    );
  }
  await prisma.event.update({
    where: { id: eventId },
    data: { numeriCondivisi: firmaNumeri(riepilogo) },
  });
}

const firmaNumeri = (r: NonNullable<Awaited<ReturnType<typeof riepilogoNumeri>>>) =>
  JSON.stringify([
    r.noi.presenti,
    r.noi.forse,
    ...r.ospiti.map((o) => [o.id, o.operatori, o.operatoriForse]),
  ]);

/**
 * Le adesioni sono cambiate: i numeri vanno a chi li deve sapere.
 *
 * - Su un'attività **di un'altra squadra** che abbiamo accettato: i nostri
 *   presenti (e i «forse», se abbiamo scelto di mandarli) vanno a chi organizza.
 * - Su una **nostra** attività con squadre collegate invitate: il riepilogo
 *   aggiornato va a tutte loro.
 *
 * Si manda solo se qualcosa è cambiato davvero.
 */
export async function segnalaNumeri(eventId: string) {
  const e = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      status: true,
      origineIdRemoto: true,
      origineMandaForse: true,
      origineUltimiNumeri: true,
      numeriCondivisi: true,
      origineCollegamento: { select: { id: true, stato: true } },
      rsvps: { select: { status: true, presente: true } },
      _count: { select: { ospiti: { where: { collegamentoId: { not: null } } } } },
    },
  });
  if (!e) return;

  if (e.origineCollegamento && e.origineIdRemoto) {
    if (e.status === 'INVITATA' || e.origineCollegamento.stato !== 'ATTIVO') return;
    const { presenti, forse } = contaPresenti(e.rsvps);
    const corpo = { id: e.origineIdRemoto, presenti, forse: e.origineMandaForse ? forse : null };
    const firma = `${corpo.presenti}|${corpo.forse}`;
    if (firma === e.origineUltimiNumeri) return;
    await prisma.event.update({ where: { id: eventId }, data: { origineUltimiNumeri: firma } });
    await accoda(e.origineCollegamento.id, 'evento-numeri', corpo, { chiave: e.origineIdRemoto });
    return;
  }

  if (e._count.ospiti > 0) {
    const r = await riepilogoNumeri(eventId);
    if (r && firmaNumeri(r) !== e.numeriCondivisi) await diffondiEvento(eventId);
  }
}

/** L'invito a una squadra collegata è stato tolto, o l'attività eliminata. */
export async function ritiraEvento(collegamentoId: string, eventId: string) {
  await accoda(collegamentoId, 'evento-ritirato', { id: eventId }, { chiave: eventId });
}

// ------------------------------------------------------------ chi riceve

const testo = (v: unknown, max = 500) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const data = (v: unknown) => {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Il corpo arrivato, ripulito: si tiene solo quello che ci si aspetta. */
export function eventoRicevuto(v: unknown): EventoCondiviso | null {
  if (!v || typeof v !== 'object') return null;
  const e = v as Record<string, unknown>;
  const id = testo(e.id, 60);
  const titolo = testo(e.titolo, 200);
  const inizio = data(e.inizio);
  if (!id || !titolo || !inizio) return null;
  const campo = e.campo && typeof e.campo === 'object' ? (e.campo as Record<string, unknown>) : null;
  const referenti = Array.isArray(e.referenti) ? e.referenti.slice(0, 12) : [];
  return {
    id,
    titolo,
    descrizione: testo(e.descrizione, 10_000),
    tipo: testo(e.tipo, 80),
    inizio: inizio.toISOString(),
    fine: data(e.fine)?.toISOString() ?? null,
    durataOre: numero(e.durataOre),
    ritrovo: testo(e.ritrovo, 300),
    ritrovoLat: numero(e.ritrovoLat),
    ritrovoLng: numero(e.ritrovoLng),
    oraRitrovo: data(e.oraRitrovo)?.toISOString() ?? null,
    luogo: testo(e.luogo, 300),
    luogoLat: numero(e.luogoLat),
    luogoLng: numero(e.luogoLng),
    campo: campo && testo(campo.nome, 200)
      ? {
          nome: testo(campo.nome, 200)!,
          indirizzo: testo(campo.indirizzo, 300),
          citta: testo(campo.citta, 120),
        }
      : null,
    linkRiunione: testo(e.linkRiunione, 500)?.match(/^https?:\/\//) ? testo(e.linkRiunione, 500) : null,
    annullata: e.annullata === true,
    motivoAnnullamento: testo(e.motivoAnnullamento, 500),
    referenti: referenti.flatMap((r) => {
      if (!r || typeof r !== 'object') return [];
      const x = r as Record<string, unknown>;
      return [{ callsign: testo(x.callsign, 60), telefono: testo(x.telefono, 40) }];
    }),
    costo: (() => {
      const c = e.costo && typeof e.costo === 'object' ? (e.costo as Record<string, unknown>) : null;
      const importo = c ? numero(c.importo) : null;
      if (!c || importo === null || importo <= 0 || importo > 100_000) return null;
      return { importo, per: c.per === 'SQUADRA' ? ('SQUADRA' as const) : ('OPERATORE' as const) };
    })(),
    metodi: (Array.isArray(e.metodi) ? e.metodi.slice(0, 10) : []).flatMap((m) => {
      if (!m || typeof m !== 'object') return [];
      const x = m as Record<string, unknown>;
      const nome = testo(x.nome, 80);
      return nome ? [{ nome, istruzioni: testo(x.istruzioni, 1000) }] : [];
    }),
  };
}

/** Quello che resta scritto sulla copia, oltre ai campi dell'attività. */
export type DatiOrigine = {
  campo: EventoCondiviso['campo'];
  referenti: EventoCondiviso['referenti'];
  tipo: string | null;
  /** L'hanno annullata loro: se la riaprono, torna viva anche qui. */
  annullataDaLoro?: boolean;
  /** Chi viene, squadra per squadra, come ce lo manda chi organizza. */
  numeri: NumeriSquadra[];
  costo: EventoCondiviso['costo'];
  metodi: EventoCondiviso['metodi'];
};

const VUOTI: DatiOrigine = {
  campo: null,
  referenti: [],
  tipo: null,
  numeri: [],
  costo: null,
  metodi: [],
};

export const datiOrigine = (v: unknown): DatiOrigine =>
  v && typeof v === 'object' ? { ...VUOTI, ...(v as object) } : VUOTI;

/** Il riepilogo arrivato, ripulito. */
export function numeriRicevuti(v: unknown): NumeriSquadra[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 30).flatMap((r) => {
    if (!r || typeof r !== 'object') return [];
    const x = r as Record<string, unknown>;
    const nome = testo(x.nome, 120);
    if (!nome) return [];
    const intero = (n: unknown) =>
      typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 10_000 ? n : null;
    return [
      {
        nome,
        presenti: intero(x.presenti),
        forse: intero(x.forse),
        ...(x.organizzatore === true ? { organizzatore: true } : {}),
        ...(x.voi === true ? { voi: true } : {}),
      },
    ];
  });
}

function aggiornaPagine(id?: string) {
  revalidatePath('/calendario');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/calendario/${id}`);
}

/**
 * Un'attività di una squadra collegata è arrivata (o è cambiata). La prima
 * volta nasce INVITATA; dopo si aggiornano i suoi dati, e lo stato resta
 * quello che abbiamo deciso noi — salvo l'annullamento, che viene da loro.
 */
export async function riceviEvento(
  c: CollegamentoSquadra,
  e: EventoCondiviso,
  accesso: 'VISUALIZZAZIONE' | 'GESTIONE',
  invitaAltri: boolean,
  numeri: NumeriSquadra[] = [],
): Promise<{ id: string; nuovo: boolean }> {
  const esistente = await prisma.event.findUnique({
    where: {
      origineCollegamentoId_origineIdRemoto: { origineCollegamentoId: c.id, origineIdRemoto: e.id },
    },
  });
  const prima = datiOrigine(esistente?.origineDati);
  const organizzatore = profiloDi(c).nome;

  const dati = {
    titolo: e.titolo,
    descrizione: e.descrizione,
    inizio: new Date(e.inizio),
    fine: e.fine ? new Date(e.fine) : null,
    durataOre: e.durataOre,
    ritrovo: e.ritrovo,
    ritrovoLat: e.ritrovoLat,
    ritrovoLng: e.ritrovoLng,
    oraRitrovo: e.oraRitrovo ? new Date(e.oraRitrovo) : null,
    luogo: e.luogo,
    luogoLat: e.luogoLat,
    luogoLng: e.luogoLng,
    linkRiunione: e.linkRiunione,
    origineAccesso: accesso,
    origineInvitaAltri: invitaAltri,
    origineAggiornataIl: new Date(),
  };

  // lo stato: l'annullamento viene da loro, e così la riapertura
  let stato: Prisma.EventUpdateInput = {};
  let annullataDaLoro = prima.annullataDaLoro ?? false;
  if (e.annullata && esistente && esistente.status !== 'ANNULLATA') {
    stato = {
      status: 'ANNULLATA',
      motivoAnnullamento: `Annullata da ${organizzatore}${e.motivoAnnullamento ? `: ${e.motivoAnnullamento}` : ''}`,
    };
    annullataDaLoro = true;
  } else if (!e.annullata && esistente?.status === 'ANNULLATA' && prima.annullataDaLoro) {
    // riaperta da loro: torna in bozza, e il rilascio lo decidiamo di nuovo noi
    stato = { status: 'CREATA', motivoAnnullamento: null };
    annullataDaLoro = false;
  }
  const origineDati = {
    campo: e.campo,
    referenti: e.referenti,
    tipo: e.tipo,
    annullataDaLoro,
    numeri,
    costo: e.costo,
    metodi: e.metodi,
  } as unknown as Prisma.InputJsonValue;

  if (esistente) {
    await prisma.event.update({
      where: { id: esistente.id },
      data: { ...dati, ...stato, origineDati },
    });
    aggiornaPagine(esistente.id);
    return { id: esistente.id, nuovo: false };
  }

  const creato = await prisma.event.create({
    data: {
      ...dati,
      status: e.annullata ? 'ANNULLATA' : 'INVITATA',
      motivoAnnullamento: e.annullata ? `Annullata da ${organizzatore}` : null,
      // la tipologia la sceglie chi accetta, fra le nostre
      tipoId: null,
      stagioneId: (await stagioneAttiva()).id,
      origineCollegamentoId: c.id,
      origineIdRemoto: e.id,
      origineDati,
    },
  });
  aggiornaPagine(creato.id);
  return { id: creato.id, nuovo: true };
}

/** Hanno tolto l'invito (o eliminato l'attività). */
export async function riceviRitiro(c: CollegamentoSquadra, idRemoto: string) {
  const e = await prisma.event.findUnique({
    where: {
      origineCollegamentoId_origineIdRemoto: { origineCollegamentoId: c.id, origineIdRemoto: idRemoto },
    },
  });
  if (!e) return;
  if (e.status === 'INVITATA') {
    // non l'avevamo ancora accettata: non c'è niente di nostro da tenere
    await prisma.event.delete({ where: { id: e.id } });
  } else if (e.status !== 'ANNULLATA') {
    await prisma.event.update({
      where: { id: e.id },
      data: {
        status: 'ANNULLATA',
        motivoAnnullamento: `Invito ritirato da ${profiloDi(c).nome}`,
      },
    });
  }
  aggiornaPagine(e.id);
}

/** Nome e logo di chi organizza, per il badge: la squadra dell'anagrafica, o il loro profilo. */
export function organizzatoreDi(
  c: {
    profilo: Prisma.JsonValue;
    squadra: { id: string; nome: string; logoPath: string | null } | null;
  } | null,
): { nome: string; logo: string | null } | null {
  if (!c) return null;
  return {
    nome: c.squadra?.nome ?? profiloDi(c).nome,
    logo: c.squadra?.logoPath ? `/api/squadre/${c.squadra.id}/logo` : null,
  };
}

/** Quanto si deve a chi organizza: a operatore (sui presenti) o una cifra per squadra. */
export function dovutoAllOrganizzatore(
  costo: NonNullable<EventoCondiviso['costo']>,
  presenti: number,
): number {
  return Math.round((costo.per === 'SQUADRA' ? costo.importo : costo.importo * presenti) * 100) / 100;
}
