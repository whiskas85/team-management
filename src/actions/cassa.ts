'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin, puoGestirePagamenti } from '@/lib/domain';
import { data, enumVal, num, str, strOpt, type StatoForm } from '@/lib/form';

const TIPI = ['ENTRATA', 'USCITA'] as const;

function aggiorna() {
  revalidatePath('/admin/cassa');
  revalidatePath('/admin/statistiche');
}

/**
 * Movimento di cassa inserito a mano: tutto ciò che non nasce dalle quote
 * delle attività (contributi, acquisti di materiale, affitto campo…).
 */
export async function salvaMovimento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Solo admin e segreteria possono muovere la cassa.' };
  }

  const id = str(fd, 'id');
  const descrizione = str(fd, 'descrizione');
  const importo = num(fd, 'importo');

  if (!descrizione) return { errore: 'La descrizione è obbligatoria.' };
  if (importo === null || importo <= 0) return { errore: 'Indica un importo maggiore di zero.' };

  const valori = {
    tipo: enumVal(fd, 'tipo', TIPI, 'USCITA'),
    descrizione,
    importo,
    data: data(fd, 'data') ?? new Date(),
    categoria: strOpt(fd, 'categoria'),
    metodoId: strOpt(fd, 'metodoId'),
    note: strOpt(fd, 'note'),
  };

  if (id) {
    await prisma.movimentoCassa.update({ where: { id }, data: valori });
    aggiorna();
    return { ok: 'Movimento aggiornato.' };
  }

  await prisma.movimentoCassa.create({ data: { ...valori, registratoById: me.id } });
  aggiorna();
  return {
    ok: valori.tipo === 'ENTRATA' ? 'Entrata registrata.' : 'Uscita registrata.',
  };
}

export async function eliminaMovimento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) {
    return { errore: 'Solo l’admin può eliminare un movimento di cassa.' };
  }

  await prisma.movimentoCassa.delete({ where: { id: str(fd, 'id') } });
  aggiorna();
  return { ok: 'Movimento eliminato.' };
}
