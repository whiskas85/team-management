'use server';

import { revalidatePath } from 'next/cache';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin, puoGestirePagamenti } from '@/lib/domain';
import { puoGestireCassa } from '@/lib/casse';
import { bool, data, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Chi può toccare i metodi di questa cassa.
 *
 * Quelli del club sono dati di base dell'admin. Quelli di un'altra cassa li
 * configura la segreteria — e **chi gestisce quella cassa**: l'IBAN su cui
 * arrivano i soldi del corso è di Mario, e deve poterlo cambiare lui senza
 * chiederlo a nessuno. Solo della sua, però: le casse degli altri no.
 */
async function puoGestireMetodi(me: { id: string; roles: Role[] }, cassaId: string | null) {
  if (!cassaId) return isAdmin(me.roles);
  return puoGestirePagamenti(me.roles) || (await puoGestireCassa(me, cassaId));
}

function aggiorna() {
  revalidatePath('/admin/metodi');
  revalidatePath('/admin/casse');
  revalidatePath('/cassa');
  revalidatePath('/dashboard');
  revalidatePath('/admin/pagamenti');
  revalidatePath('/pagamenti');
}

export async function salvaMetodo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const id = str(fd, 'id');
  // Un metodo non cambia cassa: quella di uno esistente si legge dal
  // database, non dal modulo — altrimenti il gestore di una cassa potrebbe
  // spostare un metodo nella sua, o nella cassa del club
  const esistente = id ? await prisma.metodoPagamento.findUnique({ where: { id } }) : null;
  if (id && !esistente) return { errore: 'Metodo non trovato.' };
  const cassaId = esistente ? esistente.cassaId : strOpt(fd, 'cassaId');
  if (!(await puoGestireMetodi(me, cassaId))) {
    return {
      errore: cassaId
        ? 'I metodi di questa cassa li configurano chi la gestisce e la segreteria.'
        : 'Solo l’admin gestisce i dati di base.',
    };
  }

  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Il nome del metodo è obbligatorio.' };

  // lo stesso nome può stare in due casse — «Contanti» del club e quelli del
  // corso — ma non due volte nella stessa
  const doppione = await prisma.metodoPagamento.findFirst({ where: { nome, cassaId } });
  if (doppione && doppione.id !== id) {
    return { errore: `Esiste già un metodo chiamato "${nome}" in questa cassa.` };
  }

  // l'ordine non passa dal modulo: si dà trascinando (ordinaMetodi)
  const valori = {
    nome,
    descrizione: strOpt(fd, 'descrizione'),
    istruzioni: strOpt(fd, 'istruzioni'),
    selfService: bool(fd, 'selfService'),
    attivo: bool(fd, 'attivo'),
  };

  if (id) {
    await prisma.metodoPagamento.update({ where: { id }, data: valori });
    aggiorna();
    return { ok: 'Metodo aggiornato.' };
  }

  // un metodo nuovo va in fondo: in cima scavalcherebbe l'ordine già scelto
  const ultimo = await prisma.metodoPagamento.aggregate({
    where: { cassaId },
    _max: { ordine: true },
  });
  await prisma.metodoPagamento.create({
    data: { ...valori, cassaId, ordine: (ultimo._max.ordine ?? -1) + 1 },
  });
  aggiorna();
  return { ok: 'Metodo aggiunto.' };
}

/**
 * Il nuovo ordine dei metodi di una cassa, come sono stati trascinati.
 *
 * È l'ordine in cui chi paga li trova nella finestra «Paga» e nella tendina.
 * L'elenco si accetta solo se parla esattamente dei metodi di quella cassa —
 * né uno in meno né uno di un'altra — e lo può dare chi può modificarli.
 */
export async function ordinaMetodi(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const cassaId = strOpt(fd, 'cassaId');
  if (!(await puoGestireMetodi(me, cassaId))) return { errore: 'Non puoi riordinare questi metodi.' };

  const suoi = await prisma.metodoPagamento.findMany({ where: { cassaId }, select: { id: true } });
  const sue = new Set(suoi.map((m) => m.id));
  const nuovo = str(fd, 'ids').split(',').filter((id) => sue.has(id));
  if (nuovo.length !== suoi.length || new Set(nuovo).size !== suoi.length) {
    return { errore: 'L’elenco è cambiato mentre lo spostavi: ricarica la pagina.' };
  }

  await prisma.$transaction(
    nuovo.map((id, i) => prisma.metodoPagamento.update({ where: { id }, data: { ordine: i } })),
  );

  aggiorna();
  return {};
}

export async function eliminaMetodo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const id = str(fd, 'id');
  const metodo = await prisma.metodoPagamento.findUnique({
    where: { id },
    select: { cassaId: true },
  });
  if (!metodo) return { errore: 'Metodo non trovato.' };
  if (!(await puoGestireMetodi(me, metodo.cassaId))) {
    return { errore: 'Non puoi gestire questo metodo.' };
  }

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
  if (pagamento.status === 'NON_GESTITO') {
    return { errore: 'Questa quota si paga fuori dal gestionale: qui non c’è niente da segnalare.' };
  }

  const metodo = await prisma.metodoPagamento.findUnique({ where: { id: metodoId } });
  // e dev'essere della cassa di questa quota: il bonifico al club non salda
  // il corso di Mario
  if (!metodo || !metodo.selfService || metodo.cassaId !== pagamento.cassaId) {
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
    ok: `Pagamento segnalato con ${metodo.nome}. Resta da confermare ${
      pagamento.cassaId ? 'da chi incassa' : 'dalla segreteria'
    }.`,
  };
}
