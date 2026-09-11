import type { Role } from '@prisma/client';
import { prisma } from './db';
import { puoGestirePagamenti } from './domain';

/**
 * Le casse: quella del club e le altre.
 *
 * Non tutti i soldi delle attività sono del club. Un corso lo tiene Mario, e i
 * soldi del corso sono suoi: farli passare dalla segreteria per poi girarglieli
 * è lavoro doppio, e mescola conti che non sono della squadra. Per questo un
 * pagamento può stare in un'altra cassa, che ha i suoi metodi di pagamento e le
 * sue persone abilitate.
 *
 * La cassa del club non è una riga del database: è un pagamento *senza* cassa.
 * Tutto quello che c'era prima resta del club senza toccarlo, e ogni vista del
 * club — Cassa, Pagamenti, statistiche, pallini — si scrive «dove la cassa è
 * vuota».
 */

/** Le casse che questa persona gestisce: le trova nel menu, e vede solo quelle. */
export function casseGestite(userId: string) {
  return prisma.cassa.findMany({
    where: { gestori: { some: { id: userId } } },
    orderBy: [{ attiva: 'desc' }, { nome: 'asc' }],
    select: { id: true, nome: true, attiva: true },
  });
}

/**
 * Può mettere mano ai pagamenti di questa cassa?
 *
 * Quelli del club li gestiscono admin e segreteria, come sempre. Quelli di
 * un'altra cassa solo chi ne è gestore — nemmeno l'admin, per ora: sono i soldi
 * di un altro. La lista dei gestori è il posto dove un giorno aggiungerlo, se
 * servirà, senza toccare questa regola.
 */
export async function puoGestireCassa(
  me: { id: string; roles: Role[] },
  cassaId: string | null,
): Promise<boolean> {
  if (!cassaId) return puoGestirePagamenti(me.roles);
  const gestita = await prisma.cassa.count({
    where: { id: cassaId, gestori: { some: { id: me.id } } },
  });
  return gestita > 0;
}
