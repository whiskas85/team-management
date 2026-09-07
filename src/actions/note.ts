'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { haIncarichi } from '@/lib/domain';
import { citabili, citatiIn } from '@/lib/note';
import { str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Note private.
 *
 * Chi le scrive: chi ha un incarico — comando, amministrazione, segreteria,
 * team leader. Chi le legge: **solo chi le ha scritte**, admin compreso. Non è
 * una svista: una nota su una lite o su un comportamento la si scrive com'è
 * andata solo se non finisce sotto gli occhi di altri. Chi vuole condividere
 * un'osservazione ha la chat della squadra.
 */

function aggiorna(nota?: { userId: string | null; eventId: string | null }) {
  revalidatePath('/note');
  if (nota?.userId) revalidatePath(`/admin/operatori/${nota.userId}`);
  if (nota?.eventId) revalidatePath(`/calendario/${nota.eventId}`);
  // una nota citando qualcuno compare anche sulla sua scheda: le schede toccate
  // non si sanno in anticipo, e ricalcolarle tutte costerebbe più di riaprirle
  revalidatePath('/admin/operatori', 'layout');
}

export async function salvaNota(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!haIncarichi(me.roles)) return { errore: 'Le note le scrive chi ha un incarico.' };

  const titolo = str(fd, 'titolo');
  const testo = str(fd, 'testo');
  if (!titolo) return { errore: 'Dai un titolo alla nota: serve a ritrovarla.' };
  if (!testo) return { errore: 'La nota è vuota.' };

  const id = strOpt(fd, 'id');
  const userId = strOpt(fd, 'userId');
  const eventId = strOpt(fd, 'eventId');

  // le citazioni si ricavano dal testo a ogni salvataggio: così non restano
  // appesi collegamenti a persone che dalla nota sono state tolte
  const persone = await citabili();
  const citati = citatiIn(testo, persone);

  if (id) {
    const esistente = await prisma.nota.findUnique({ where: { id } });
    if (!esistente) return { errore: 'Nota non trovata.' };
    if (esistente.autoreId !== me.id) return { errore: 'Puoi modificare solo le tue note.' };

    await prisma.$transaction([
      prisma.nota.update({ where: { id }, data: { titolo, testo } }),
      prisma.notaCitazione.deleteMany({ where: { notaId: id } }),
      prisma.notaCitazione.createMany({
        data: citati.map((userId) => ({ notaId: id, userId })),
      }),
    ]);

    aggiorna(esistente);
    return { ok: 'Nota aggiornata.' };
  }

  const nota = await prisma.nota.create({
    data: {
      autoreId: me.id,
      titolo,
      testo,
      userId,
      eventId,
      citate: { create: citati.map((userId) => ({ userId })) },
    },
  });

  aggiorna(nota);
  return {
    ok: citati.length
      ? `Nota salvata: compare anche sulla scheda di chi hai nominato (${citati.length}).`
      : 'Nota salvata.',
  };
}

export async function eliminaNota(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const nota = await prisma.nota.findUnique({ where: { id: str(fd, 'id') } });
  if (!nota) return { errore: 'Nota non trovata.' };
  // nemmeno un admin: se non può leggerla non ha modo di sapere cosa cancella
  if (nota.autoreId !== me.id) return { errore: 'Puoi eliminare solo le tue note.' };

  await prisma.nota.delete({ where: { id: nota.id } });
  aggiorna(nota);
  return { ok: 'Nota eliminata.' };
}
