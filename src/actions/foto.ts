'use server';

import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { UPLOAD_DIR, eliminaAllegato } from '@/lib/storage';

const MAX_BYTE = 1_500_000; // il ritaglio arriva già ridotto: 1,5 MB bastano

/**
 * Salva la foto profilo. Arriva già ritagliata quadrata dal browser come JPEG
 * in base64: qui si controlla soltanto che sia davvero un'immagine e si scrive
 * nel volume degli allegati, fuori da `public/`.
 */
export async function salvaFotoProfilo(dati: string | null): Promise<{ errore?: string }> {
  const me = await requireUser();

  const utente = await prisma.user.findUniqueOrThrow({
    where: { id: me.id },
    select: { fotoPath: true },
  });

  // niente dati = rimozione della foto
  if (dati === null) {
    if (utente.fotoPath) await eliminaAllegato(utente.fotoPath);
    await prisma.user.update({ where: { id: me.id }, data: { fotoPath: null } });
    revalidatePath('/profilo');
    return {};
  }

  const intestazione = dati.match(/^data:image\/(jpeg|png|webp);base64,/);
  if (!intestazione) return { errore: 'Formato non riconosciuto: serve un’immagine.' };

  const buffer = Buffer.from(dati.slice(intestazione[0].length), 'base64');
  if (buffer.length === 0) return { errore: 'Immagine vuota.' };
  if (buffer.length > MAX_BYTE) return { errore: 'Immagine troppo grande: riprova con meno zoom.' };

  const cartella = path.join(UPLOAD_DIR, 'foto');
  await mkdir(cartella, { recursive: true });

  const nome = `${randomUUID()}.jpg`;
  await writeFile(path.join(cartella, nome), buffer);

  // la vecchia foto non serve più: la togliamo per non riempire il disco
  if (utente.fotoPath) await eliminaAllegato(utente.fotoPath);

  await prisma.user.update({
    where: { id: me.id },
    data: { fotoPath: path.posix.join('foto', nome) },
  });

  revalidatePath('/profilo');
  revalidatePath('/admin/operatori');
  return {};
}
