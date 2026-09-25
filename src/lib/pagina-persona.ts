import type { Role, StatoOperatore } from '@prisma/client';
import { inSquadra, isContatto, puoVedereNuovi } from './domain';

/**
 * La pagina di una persona, se chi guarda la può aprire.
 *
 * La stessa regola del calendario: fra membri della squadra la scheda, i nuovi
 * solo per chi li segue, la propria porta al profilo. Dove non c'è, il nome
 * resta un nome.
 */
export function paginaPersona(
  me: { id: string; stato: StatoOperatore; roles: Role[] },
  p: { id: string; stato: StatoOperatore },
): string | undefined {
  if (p.id === me.id) return '/profilo';
  if (isContatto(p.stato)) {
    return puoVedereNuovi(me.roles) ? `/admin/operatori/${p.id}` : undefined;
  }
  return inSquadra(me.stato) && inSquadra(p.stato) ? `/operatori/${p.id}` : undefined;
}
