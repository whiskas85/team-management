import type { StatoAssicurazione, StatoOperatore } from '@prisma/client';
import type { Tono } from './domain';

/**
 * Chi gioca da ospite va coperto con una giornaliera.
 *
 * Due condizioni insieme: non essere della squadra — i soci hanno la loro
 * tessera annuale, e segnalarli qui riempirebbe ogni attività di allarmi che
 * riguardano un'altra pagina — e non avere comunque un'annuale valida nel
 * giorno dell'attività, perché capita l'ospite già tesserato altrove.
 */
export function serveGiornaliera(
  diSquadra: boolean,
  stato: StatoOperatore,
  tessere: { status: string; scadeIl: Date | null }[],
  quando: Date,
): boolean {
  if (diSquadra) return false;
  if (stato === 'DISABILITATO' || stato === 'RIFIUTATO') return false;

  const coperto = tessere.some(
    (t) => t.status === 'ATTIVA' && (!t.scadeIl || t.scadeIl >= quando),
  );
  return !coperto;
}

export const ETICHETTA_ASSICURAZIONE: Record<StatoAssicurazione, string> = {
  NON_ASSICURATO: 'non assicurato',
  RICHIESTA: 'richiesta inviata',
  ASSICURATO: 'assicurato',
  ERRORE: 'assicurazione fallita',
};

export const TONO_ASSICURAZIONE: Record<StatoAssicurazione, Tono> = {
  NON_ASSICURATO: 'danger',
  RICHIESTA: 'warn',
  ASSICURATO: 'ok',
  ERRORE: 'danger',
};
