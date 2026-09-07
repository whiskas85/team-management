/** Helper di lettura dei FormData: tutto arriva come stringa, qui normalizziamo. */

export type StatoForm = {
  errore?: string;
  ok?: string;
  /**
   * Credenziali appena generate, da consegnare a voce. Viaggiano a parte e non
   * dentro il messaggio perché il modulo le mostri in un riquadro da copiare:
   * ricopiare a mano una password di dodici caratteri è il modo più sicuro per
   * sbagliarla e far tornare la persona a chiedere.
   */
  credenziali?: { utente: string; password: string };
  /**
   * Chiave appena creata per un assistente. Come le credenziali viaggia a
   * parte, e per lo stesso motivo: si vede una volta sola e va copiata, non
   * ricopiata a mano — sono trentadue caratteri casuali.
   */
  chiave?: { nome: string; token: string };
};

export const str = (fd: FormData, k: string): string => (fd.get(k)?.toString() ?? '').trim();

export const strOpt = (fd: FormData, k: string): string | null => str(fd, k) || null;

export const num = (fd: FormData, k: string): number | null => {
  const v = str(fd, k).replace(',', '.');
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const intOpt = (fd: FormData, k: string): number | null => {
  const n = num(fd, k);
  return n === null ? null : Math.trunc(n);
};

export const data = (fd: FormData, k: string): Date | null => {
  const v = str(fd, k);
  if (!v) return null;

  // Una data senza orario ("2026-09-04") viene letta da JS come mezzanotte UTC:
  // a est di Greenwich diventa mezzanotte+2 locali, cioè un istante ancora nel
  // futuro. Va costruita sulle parti locali.
  const soloData = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = soloData
    ? new Date(Number(soloData[1]), Number(soloData[2]) - 1, Number(soloData[3]))
    : new Date(v);

  return Number.isNaN(d.getTime()) ? null : d;
};

export const bool = (fd: FormData, k: string): boolean => {
  const v = str(fd, k);
  return v === 'on' || v === 'true' || v === '1';
};

/** Legge un valore solo se appartiene all'enum, altrimenti usa il default. */
export function enumVal<T extends string>(
  fd: FormData,
  k: string,
  ammessi: readonly T[],
  fallback: T,
): T {
  const v = str(fd, k) as T;
  return ammessi.includes(v) ? v : fallback;
}

export function enumOpt<T extends string>(
  fd: FormData,
  k: string,
  ammessi: readonly T[],
): T | null {
  const v = str(fd, k) as T;
  return ammessi.includes(v) ? v : null;
}
