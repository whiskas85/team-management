'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { str, strOpt, type StatoForm } from '@/lib/form';

/**
 * I metodi con cui una persona si fa pagare. Li scrive lei dal suo profilo;
 * l'admin può correggerli per lei. Nessun altro: è il suo conto.
 */
async function puoToccare(me: { id: string; roles: Parameters<typeof isAdmin>[0] }, userId: string) {
  return me.id === userId || isAdmin(me.roles);
}

function aggiorna() {
  revalidatePath('/profilo');
  revalidatePath('/admin/cassa');
}

export async function salvaMetodoPersonale(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');
  const esistente = id ? await prisma.metodoPersonale.findUnique({ where: { id } }) : null;
  if (id && !esistente) return { errore: 'Metodo non trovato.' };
  const userId = esistente?.userId ?? (strOpt(fd, 'userId') || me.id);
  if (!(await puoToccare(me, userId))) return { errore: 'Puoi cambiare solo i tuoi metodi.' };

  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Scrivi il nome del metodo (es. Bonifico, PayPal, Satispay).' };
  const istruzioni = strOpt(fd, 'istruzioni');
  if (!istruzioni) {
    return { errore: 'Scrivi come pagarti: l’IBAN, il link PayPal o Satispay, il numero…' };
  }

  if (esistente) {
    await prisma.metodoPersonale.update({ where: { id }, data: { nome, istruzioni } });
    aggiorna();
    return { ok: 'Metodo aggiornato.' };
  }
  const ultimo = await prisma.metodoPersonale.aggregate({
    where: { userId },
    _max: { ordine: true },
  });
  await prisma.metodoPersonale.create({
    data: { userId, nome, istruzioni, ordine: (ultimo._max.ordine ?? -1) + 1 },
  });
  aggiorna();
  return { ok: 'Metodo aggiunto: chi ti paga dalla cassa lo trova già pronto.' };
}

export async function eliminaMetodoPersonale(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const m = await prisma.metodoPersonale.findUnique({ where: { id: str(fd, 'id') } });
  if (!m) return { errore: 'Metodo non trovato.' };
  if (!(await puoToccare(me, m.userId))) return { errore: 'Puoi togliere solo i tuoi metodi.' };
  await prisma.metodoPersonale.delete({ where: { id: m.id } });
  aggiorna();
  return { ok: 'Metodo tolto.' };
}
