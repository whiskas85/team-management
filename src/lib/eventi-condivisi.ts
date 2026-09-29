import { revalidatePath } from 'next/cache';
import type { CollegamentoSquadra, Prisma } from '@prisma/client';
import { prisma } from './db';
import { accoda } from './federazione-coda';
import { profiloDi } from './federazione';
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
  const evento = await eventoDaCondividere(eventId);
  if (!evento) return;
  for (const o of inviti) {
    await accoda(
      o.collegamentoId!,
      'evento',
      {
        id: eventId,
        evento,
        accesso: o.accesso ?? 'VISUALIZZAZIONE',
        invitaAltri: o.invitaAltri,
      } as unknown as Prisma.InputJsonValue,
      { chiave: eventId },
    );
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
  };
}

/** Quello che resta scritto sulla copia, oltre ai campi dell'attività. */
export type DatiOrigine = {
  campo: EventoCondiviso['campo'];
  referenti: EventoCondiviso['referenti'];
  tipo: string | null;
  /** L'hanno annullata loro: se la riaprono, torna viva anche qui. */
  annullataDaLoro?: boolean;
};

export const datiOrigine = (v: unknown): DatiOrigine =>
  v && typeof v === 'object'
    ? { campo: null, referenti: [], tipo: null, ...(v as object) }
    : { campo: null, referenti: [], tipo: null };

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
