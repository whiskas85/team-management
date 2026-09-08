'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin, puoGestirePagamenti } from '@/lib/domain';
import { data, enumVal, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';

const TIPI = ['ENTRATA', 'USCITA'] as const;

function aggiorna() {
  revalidatePath('/admin/cassa');
  revalidatePath('/admin/statistiche');
  revalidatePath('/admin/inventario');
}

/**
 * Una spesa può essere un acquisto: si dice quale merce e quanti pezzi, e la
 * giacenza sale da sola.
 *
 * Il costo del pezzo si ricava dividendo l'importo per i pezzi, invece di
 * chiederlo di nuovo: sono gli stessi soldi, e farli scrivere due volte è il
 * modo più sicuro perché un giorno non tornino.
 */
async function allineaMagazzino(
  movimentoId: string,
  tipo: string,
  importo: number,
  fd: FormData,
) {
  const gia = await prisma.caricoMagazzino.findUnique({ where: { movimentoId } });

  const voceId = strOpt(fd, 'voceId');
  const pezzi = intOpt(fd, 'quantita');
  const voce = voceId
    ? await prisma.voceAnnuncio.findUnique({ where: { id: voceId }, select: { id: true, aMagazzino: true } })
    : null;

  const buona = tipo === 'USCITA' && voce?.aMagazzino && pezzi !== null && pezzi > 0;

  // tolta la merce dal movimento, se ne va anche il carico: la spesa resta,
  // ma non dice più che è entrato qualcosa
  if (!buona) {
    if (gia) await prisma.caricoMagazzino.delete({ where: { id: gia.id } });
    return;
  }

  const dati = {
    voceId: voce!.id,
    quantita: pezzi!,
    costoUnitario: importo / pezzi!,
    note: 'Comprata con un’uscita di cassa',
  };

  if (gia) await prisma.caricoMagazzino.update({ where: { id: gia.id }, data: dati });
  else await prisma.caricoMagazzino.create({ data: { ...dati, movimentoId } });
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
    await allineaMagazzino(id, valori.tipo, importo, fd);
    aggiorna();
    return { ok: 'Movimento aggiornato.' };
  }

  const movimento = await prisma.movimentoCassa.create({
    data: { ...valori, registratoById: me.id },
  });
  await allineaMagazzino(movimento.id, valori.tipo, importo, fd);

  const pezzi = intOpt(fd, 'quantita');
  const inMagazzino = valori.tipo === 'USCITA' && strOpt(fd, 'voceId') && pezzi && pezzi > 0;

  aggiorna();
  return {
    ok: inMagazzino
      ? `Uscita registrata, e ${pezzi} pezzi sono entrati in magazzino.`
      : valori.tipo === 'ENTRATA'
        ? 'Entrata registrata.'
        : 'Uscita registrata.',
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
