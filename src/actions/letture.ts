'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoVedereOperatori } from '@/lib/domain';

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
