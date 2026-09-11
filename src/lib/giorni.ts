/**
 * I giorni di un'attività, senza database.
 *
 * Stanno qui e non accanto alle polizze perché li usano due mondi: il server,
 * che assicura un giorno alla volta, e il modulo delle quote nel browser, che
 * conta le voci «al giorno». Un file che si porta dietro Prisma nel browser non
 * ci arriva.
 */

/** Oltre questo, un'attività non è di più giorni: è una data di fine sbagliata. */
const MAX_GIORNI = 7;

/** «2026-09-12»: il giorno letto sull'ora di qui, come lo vuole il portale nel modulo. */
export const chiaveGiorno = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Da una colonna DATE, che arriva a mezzanotte UTC: qui si leggono i campi UTC. */
export const chiaveDaColonna = (d: Date) => d.toISOString().slice(0, 10);

/** Il giorno come lo vuole una colonna DATE: mezzanotte UTC, nessuna ora che lo faccia scivolare. */
export const giornoDaChiave = (chiave: string): Date | null => {
  const m = chiave.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
};

/** La mezzanotte di qui di quel giorno: per il portale, per le tessere, per l'età. */
export const dataLocale = (chiave: string) => {
  const [a, m, g] = chiave.split('-').map(Number);
  return new Date(a, m - 1, g);
};

const giornoCorto = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** «sab 12 set»: abbastanza per distinguere due giorni della stessa attività. */
export const etichettaGiorno = (chiave: string) => giornoCorto.format(dataLocale(chiave));

/**
 * I giorni che un'attività occupa, uno per polizza.
 *
 * La giornaliera vale fino alle 24:00 del giorno della prova: una 24 ore che
 * parte sabato pomeriggio e finisce domenica ne vuole due. Una fine a
 * mezzanotte esatta non apre un giorno nuovo — chi smette alle 00:00 ha giocato
 * il giorno prima.
 */
/**
 * Quando un'attività è «in corso»: dal ritrovo, o dall'inizio se un ritrovo non
 * c'è, fino alla fine. Senza una fine scritta vale fino alla mezzanotte del
 * giorno in cui comincia: una domenica al campo non dura fino a lunedì.
 *
 * Un ritrovo più lontano di un giorno dall'inizio non conta: è una data
 * sbagliata, e aprirebbe l'appello e i dati sanitari giorni prima.
 */
export function finestraAttivita(inizio: Date, fine: Date | null, oraRitrovo: Date | null) {
  const da =
    oraRitrovo && oraRitrovo < inizio && inizio.getTime() - oraRitrovo.getTime() < 24 * 3600_000
      ? oraRitrovo
      : inizio;
  const a =
    fine && fine > inizio
      ? fine
      : new Date(inizio.getFullYear(), inizio.getMonth(), inizio.getDate(), 23, 59, 59, 999);
  return { da, a };
}

export function giorniDi(inizio: Date, fine: Date | null): string[] {
  let ultimo = fine && fine > inizio ? fine : inizio;
  if (ultimo > inizio && ultimo.getHours() === 0 && ultimo.getMinutes() === 0) {
    ultimo = new Date(ultimo.getTime() - 1);
  }
  const giorni: string[] = [];
  const d = new Date(inizio.getFullYear(), inizio.getMonth(), inizio.getDate());
  const fino = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate());
  while (d <= fino && giorni.length < MAX_GIORNI) {
    giorni.push(chiaveGiorno(d));
    d.setDate(d.getDate() + 1);
  }
  return giorni;
}
