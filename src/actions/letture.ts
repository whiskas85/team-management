'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoVedereOperatori } from '@/lib/domain';

/**
 * Registra che questa persona ha aperto quell'attività.
 *
 * Da qui si spegne il pallino delle novità: un'attività è nuova finché non la
 * si è aperta, e "aperta" vuol dire da te — se la guarda un altro, a te resta
 * segnalata.
 */
export async function segnaEventoLetto(eventId: string): Promise<void> {
  const me = await requireUser();

  const esiste = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!esiste) return;

  await prisma.letturaEvento.upsert({
    where: { eventId_userId: { eventId, userId: me.id } },
    create: { eventId, userId: me.id },
    update: { lettoIl: new Date() },
  });

  // il contatore vive nel menu, che è disegnato dal guscio: senza questo il
  // pallino resterebbe acceso fino al primo cambio pagina
  revalidatePath('/calendario', 'layout');
  revalidatePath('/dashboard');
}

/**
 * Registra che questo lettore ha aperto quella scheda.
 *
 * La lettura è per persona, non globale: se una registrazione la apre un
 * admin, gli altri devono comunque vedersela ancora segnalata.
 */
export async function segnaProfiloLetto(profiloId: string): Promise<void> {
  const me = await requireUser();
  if (!puoVedereOperatori(me.roles) || profiloId === me.id) return;

  const esiste = await prisma.user.findUnique({ where: { id: profiloId }, select: { id: true } });
  if (!esiste) return;

  await prisma.letturaProfilo.upsert({
    where: { profiloId_lettoreId: { profiloId, lettoreId: me.id } },
    create: { profiloId, lettoreId: me.id },
    update: { lettoIl: new Date() },
  });

  revalidatePath('/admin/nuovi');
  revalidatePath('/dashboard');
}
