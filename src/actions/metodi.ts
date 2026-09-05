'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { bool, data, intOpt, str, strOpt, type StatoForm } from '@/lib/form';

function aggiorna() {
  revalidatePath('/admin/metodi');
  revalidatePath('/dashboard');
  revalidatePath('/admin/pagamenti');
  revalidatePath('/pagamenti');
}

export async function salvaMetodo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Il nome del metodo è obbligatorio.' };

  const doppione = await prisma.metodoPagamento.findUnique({ where: { nome } });
  if (doppione && doppione.id !== id) {
    return { errore: `Esiste già un metodo chiamato "${nome}".` };
  }

  const valori = {
    nome,
    descrizione: strOpt(fd, 'descrizione'),
    istruzioni: strOpt(fd, 'istruzioni'),
    selfService: bool(fd, 'selfService'),
    ordine: intOpt(fd, 'ordine') ?? 0,
    attivo: bool(fd, 'attivo'),
  };

  if (id) {
    await prisma.metodoPagamento.update({ where: { id }, data: valori });
    aggiorna();
    return { ok: 'Metodo aggiornato.' };
  }

  await prisma.metodoPagamento.create({ data: valori });
  aggiorna();
  return { ok: 'Metodo aggiunto.' };
}

export async function eliminaMetodo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const usato = await prisma.payment.count({ where: { metodoId: id } });

  if (usato > 0) {
    // resta agganciato ai movimenti già registrati: lo disattiviamo soltanto
    await prisma.metodoPagamento.update({ where: { id }, data: { attivo: false } });
    aggiorna();
    return { ok: `Metodo usato in ${usato} movimenti: disattivato anziché eliminato.` };
  }

  await prisma.metodoPagamento.delete({ where: { id } });
  aggiorna();
  return { ok: 'Metodo eliminato.' };
}

/**
 * Saldo dichiarato dal diretto interessato: sceglie con quale metodo ha pagato.
 * Resta da confermare, così la segreteria verifica prima di chiudere.
 */
export async function dichiaraPagamento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');
  const metodoId = str(fd, 'metodoId');

  const pagamento = await prisma.payment.findUnique({ where: { id } });
  if (!pagamento || pagamento.userId !== me.id) return { errore: 'Pagamento non trovato.' };
  if (pagamento.status === 'PAGATO') return { errore: 'Questa quota risulta già saldata.' };

  const metodo = await prisma.metodoPagamento.findUnique({ where: { id: metodoId } });
  if (!metodo || !metodo.selfService) {
    return { errore: 'Scegli un metodo con cui puoi pagare da solo.' };
  }

  const quando = data(fd, 'quando') ?? new Date();
  if (quando > new Date()) return { errore: 'La data del pagamento non può essere nel futuro.' };

  await prisma.payment.update({
    where: { id },
    data: {
      metodoId,
      dichiaratoIl: quando,
      note: strOpt(fd, 'note') ?? pagamento.note,
    },
  });

  aggiorna();
  return {
    ok: `Pagamento segnalato con ${metodo.nome}. Resta da confermare dalla segreteria.`,
  };
}
