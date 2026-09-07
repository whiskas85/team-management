'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { filtroBacheca, puoVedereMerchandising, vociCitate } from '@/lib/mercatino';
import { str, type StatoForm } from '@/lib/form';

/**
 * Commenti e "mi piace" sotto un annuncio.
 *
 * Li legge chiunque veda l'annuncio, ed è la regola più semplice da spiegare:
 * se lo vedi, puoi dire la tua. Sotto un annuncio con cinque voci si nomina
 * quella che interessa con la chiocciola — `@radio-m` — altrimenti *«quanto per
 * quella grande?»* non vuol dire niente a nessuno.
 */

const aggiorna = (annuncioId: string) => {
  revalidatePath(`/mercatino/${annuncioId}`);
  revalidatePath('/mercatino');
  revalidatePath('/merchandising');
};

/** L'annuncio, ma solo se chi chiede lo può davvero vedere. */
async function annuncioVisibile(id: string, me: { id: string; stato: string; roles: string[] }) {
  const a = await prisma.annuncio.findFirst({
    where: { AND: [filtroBacheca(me.id), { id }] },
    include: { voci: { select: { id: true, maniglia: true } } },
  });
  if (!a) return null;
  // il catalogo del club non si commenta da fuori: non lo si vede nemmeno
  if (a.ufficiale && !puoVedereMerchandising(me.stato as never)) return null;
  return a;
}

export async function commentaAnnuncio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const annuncioId = str(fd, 'annuncioId');

  const testo = str(fd, 'testo');
  if (!testo) return { errore: 'Il commento è vuoto.' };
  if (testo.length > 2000) return { errore: 'Commento troppo lungo: stai sotto i 2000 caratteri.' };

  const annuncio = await annuncioVisibile(annuncioId, me as never);
  if (!annuncio) return { errore: 'Annuncio non trovato.' };

  // le voci nominate si ricavano dal testo, come le chiocciole delle note: il
  // testo è la verità, questo è solo l'indice per ritrovarle
  const citate = vociCitate(testo, annuncio.voci);

  await prisma.commentoAnnuncio.create({
    data: {
      annuncioId,
      userId: me.id,
      testo,
      citate: { create: citate.map((voceId) => ({ voceId })) },
    },
  });

  aggiorna(annuncioId);
  // niente messaggio: il commento compare qui sotto, ed è già la risposta
  return {};
}

export async function eliminaCommentoAnnuncio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const commento = await prisma.commentoAnnuncio.findUnique({
    where: { id: str(fd, 'id') },
    include: { annuncio: { select: { venditoreId: true } } },
  });
  if (!commento) return { errore: 'Commento non trovato.' };

  // il proprio sempre; quello altrui lo tolgono chi vende — è casa sua — e
  // l'admin, per le cose fuori posto
  const mio = commento.userId === me.id;
  const eSuo = commento.annuncio.venditoreId === me.id;
  if (!mio && !eSuo && !isAdmin(me.roles)) {
    return { errore: 'Puoi eliminare solo i tuoi commenti.' };
  }

  await prisma.commentoAnnuncio.delete({ where: { id: commento.id } });
  aggiorna(commento.annuncioId);
  return { ok: 'Commento eliminato.' };
}

/**
 * Mette o toglie il "mi piace".
 *
 * La coppia (annuncio, persona) è la chiave della tabella, quindi metterlo due
 * volte è impossibile per costruzione, non per controllo.
 */
export async function miPiaceAnnuncio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const annuncioId = str(fd, 'annuncioId');

  const annuncio = await annuncioVisibile(annuncioId, me as never);
  if (!annuncio) return { errore: 'Annuncio non trovato.' };

  const chiave = { annuncioId_userId: { annuncioId, userId: me.id } };
  const gia = await prisma.miPiaceAnnuncio.findUnique({ where: chiave });

  if (gia) await prisma.miPiaceAnnuncio.delete({ where: chiave });
  else await prisma.miPiaceAnnuncio.create({ data: { annuncioId, userId: me.id } });

  aggiorna(annuncioId);
  // il pulsante cambia da solo: dirlo anche a parole sarebbe di troppo
  return {};
}
