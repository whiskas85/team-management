import type { DestinatariSondaggio, Role, StatoOperatore } from '@prisma/client';
import { inSquadra, isAdmin, puoSchierare } from './domain';
import { prisma } from './db';

/**
 * I sondaggi: chi li fa, chi li vede, quando si vota.
 *
 * La regola di chi vede cosa sta qui e non nelle pagine, perché sono tre le
 * porte da cui si arriva a un sondaggio — l'elenco, la pagina sua, e la
 * notifica che ci porta — e tre controlli scritti a mano diventano prima o poi
 * tre controlli diversi.
 */

/**
 * Chi può fare una domanda alla squadra.
 *
 * L'admin e chi schiera: sono gli stessi che mettono in piedi una giocata, e
 * un sondaggio quasi sempre è il passo prima. Aprirlo a tutti vorrebbe dire
 * una bacheca di domande, e la bacheca è un'altra cosa.
 */
export const puoFareSondaggi = (roles: Role[]) => isAdmin(roles) || puoSchierare(roles);

/**
 * Se questo sondaggio riguarda questa persona.
 *
 * Un sondaggio per la squadra non lo vede un contatto, e uno per i nuovi non
 * intasa la pagina di chi è dentro da tre anni. «Tutti» esiste per le domande
 * che riguardano il campo — quando si gioca, dove si mangia — a cui ha senso
 * rispondere anche chi viene alle aperte.
 */
export function loRiguarda(
  destinatari: DestinatariSondaggio,
  stato: StatoOperatore,
): boolean {
  if (destinatari === 'TUTTI') return true;
  return destinatari === 'SQUADRA' ? inSquadra(stato) : !inSquadra(stato);
}

export const etichettaDestinatari: Record<DestinatariSondaggio, string> = {
  SQUADRA: 'La squadra',
  NUOVI: 'I nuovi',
  TUTTI: 'Tutti',
};

/**
 * Un sondaggio è aperto finché non lo si chiude e finché non scade.
 *
 * La scadenza chiude da sola, ed è voluto: chi lo apre il martedì per sapere
 * chi viene domenica non deve ricordarsi di tornare a chiuderlo — e una
 * domanda che resta aperta per sempre smette di essere una domanda.
 */
export const eAperto = (s: { chiusoIl: Date | null; scadeIl: Date | null }, adesso = new Date()) =>
  s.chiusoIl === null && (s.scadeIl === null || s.scadeIl > adesso);

/** Com'è finito, detto a chi guarda lo storico. */
export function comeEFinito(s: { chiusoIl: Date | null; scadeIl: Date | null }) {
  if (s.chiusoIl) return 'chiuso';
  if (s.scadeIl && s.scadeIl <= new Date()) return 'scaduto';
  return 'aperto';
}

/**
 * Il conto dei voti, opzione per opzione, con chi ha vinto.
 *
 * Il vincitore serve a chi deve decidere, e si dice solo quando è uno solo:
 * due opzioni a pari merito non hanno un vincitore, e scriverne uno a caso
 * vorrebbe dire decidere al posto di chi doveva decidere.
 */
export function risultato<T extends { id: string; voti: unknown[] }>(opzioni: T[]) {
  const conti = opzioni.map((o) => ({ id: o.id, voti: o.voti.length }));
  const massimo = Math.max(0, ...conti.map((c) => c.voti));
  const primi = conti.filter((c) => c.voti === massimo && massimo > 0);
  return {
    conti: new Map(conti.map((c) => [c.id, c.voti])),
    massimo,
    /** L'opzione che ha vinto, se ce n'è una sola. */
    vincitrice: primi.length === 1 ? primi[0].id : null,
    pari: primi.length > 1,
  };
}

/**
 * Quanto manca, in parole: «3 giorni», «4 ore», «21 minuti».
 *
 * Serve nella notifica, dove il conto alla rovescia non può correre: quello
 * che si manda è una fotografia del momento in cui è partita. Dentro il
 * gestionale invece il tempo scorre davvero, ed è un altro componente.
 */
export function quantoManca(scadeIl: Date | null, adesso = new Date()): string | null {
  if (!scadeIl) return null;
  const minuti = Math.round((scadeIl.getTime() - adesso.getTime()) / 60_000);
  if (minuti <= 0) return null;
  if (minuti < 60) return `${minuti} ${minuti === 1 ? 'minuto' : 'minuti'}`;
  const ore = Math.round(minuti / 60);
  if (ore < 48) return `${ore} ${ore === 1 ? 'ora' : 'ore'}`;
  const giorni = Math.round(ore / 24);
  return `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`;
}

/**
 * Registra il voto di una persona, da qualunque porta arrivi.
 *
 * Le porte sono due e stanno per diventare tre: il form dentro il gestionale e
 * i pulsanti sotto la notifica. Le regole — riguarda questa persona? e' ancora
 * aperto? si puo' spuntarne piu' d'una? — sono le stesse, e scritte due volte
 * diventerebbero due regole diverse il giorno in cui una cambia.
 *
 * **Si riscrive tutto ogni volta.** Votare di nuovo cancella le scelte di
 * prima: cambiare idea e' normale, e la differenza fra «ha cambiato idea» e
 * «ha votato due volte» non la deve fare chi legge il risultato.
 */
export type EsitoVoto = { ok: true } | { ok: false; errore: string };

export async function registraVoto(
  persona: { id: string; stato: StatoOperatore },
  sondaggioId: string,
  scelte: string[],
): Promise<EsitoVoto> {
  const s = await prisma.sondaggio.findUnique({
    where: { id: sondaggioId },
    include: { opzioni: { select: { id: true } } },
  });
  if (!s) return { ok: false, errore: 'Sondaggio non trovato.' };
  if (!loRiguarda(s.destinatari, persona.stato)) {
    return { ok: false, errore: 'Questo sondaggio non è per te.' };
  }
  if (!eAperto(s)) {
    return { ok: false, errore: 'Il sondaggio è chiuso: le risposte non si cambiano più.' };
  }

  // Le opzioni che non appartengono a questo sondaggio si buttano via qui: chi
  // arriva dalla notifica manda un identificativo che non e' passato da nessun
  // form, e fidarsene vorrebbe dire lasciar votare un'altra domanda.
  const valide = scelte.filter((id) => s.opzioni.some((o) => o.id === id));

  if (valide.length === 0) return { ok: false, errore: 'Scegli almeno una risposta.' };
  if (!s.sceltaMultipla && valide.length > 1) {
    return { ok: false, errore: 'Su questa domanda si sceglie una risposta sola.' };
  }

  await prisma.$transaction([
    prisma.votoSondaggio.deleteMany({ where: { sondaggioId, userId: persona.id } }),
    prisma.votoSondaggio.createMany({
      data: valide.map((opzioneId) => ({ sondaggioId, opzioneId, userId: persona.id })),
    }),
  ]);

  return { ok: true };
}
