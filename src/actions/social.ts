'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser, type SessionUser } from '@/lib/auth';
import { isAdmin, puoGestireEventi } from '@/lib/domain';
import { filtroVisibilita } from '@/lib/query';
import { str, type StatoForm } from '@/lib/form';

/**
 * Commenti e "mi piace" sulle attività.
 *
 * L'opposto delle note: qui si parla, e lo legge chiunque veda l'attività. Il
 * permesso non è un ruolo ma la visibilità dell'attività stessa — se la vedi
 * puoi dire la tua, ed è la regola più semplice da spiegare e da ricordare.
 */

const aggiorna = (eventId: string) => {
  revalidatePath(`/calendario/${eventId}`);
  revalidatePath('/calendario');
};

/** L'attività, ma solo se chi chiede la può vedere davvero. */
async function attivitaVisibile(eventId: string, me: SessionUser) {
  return prisma.event.findFirst({
    where: {
      AND: [filtroVisibilita(me.stato, puoGestireEventi(me.roles)), { id: eventId }],
    },
    select: { id: true },
  });
}

export async function commentaEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const eventId = str(fd, 'eventId');

  const testo = str(fd, 'testo');
  if (!testo) return { errore: 'Il commento è vuoto.' };
  if (testo.length > 2000) return { errore: 'Commento troppo lungo: stai sotto i 2000 caratteri.' };

  const evento = await attivitaVisibile(eventId, me);
  if (!evento) return { errore: 'Attività non trovata.' };

  await prisma.commentoEvento.create({ data: { eventId, userId: me.id, testo } });
  aggiorna(eventId);
  // nessun messaggio di conferma: il commento compare qui sotto, ed è già la
  // risposta. Un riquadro verde che dice "pubblicato" sopra una cosa che si
  // vede pubblicata è rumore
  return {};
}

export async function eliminaCommento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const commento = await prisma.commentoEvento.findUnique({ where: { id: str(fd, 'id') } });
  if (!commento) return { errore: 'Commento non trovato.' };

  // il proprio sempre, quello altrui solo l'admin: serve a togliere una frase
  // fuori posto, non a rileggere quello che scrive la squadra
  if (commento.userId !== me.id && !isAdmin(me.roles)) {
    return { errore: 'Puoi eliminare solo i tuoi commenti.' };
  }

  await prisma.commentoEvento.delete({ where: { id: commento.id } });
  aggiorna(commento.eventId);
  return { ok: 'Commento eliminato.' };
}

/**
 * Mette o toglie il "mi piace": un pulsante solo, come ovunque.
 *
 * La coppia (attività, persona) è la chiave della tabella, quindi metterlo due
 * volte è impossibile per costruzione — non c'è nessun controllo da ricordarsi
 * di fare, nemmeno se due dita premono insieme.
 */
export async function miPiaceEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const eventId = str(fd, 'eventId');

  const evento = await attivitaVisibile(eventId, me);
  if (!evento) return { errore: 'Attività non trovata.' };

  const chiave = { eventId_userId: { eventId, userId: me.id } };
  const gia = await prisma.miPiaceEvento.findUnique({ where: chiave });

  if (gia) await prisma.miPiaceEvento.delete({ where: chiave });
  else await prisma.miPiaceEvento.create({ data: { eventId, userId: me.id } });

  aggiorna(eventId);
  // il pulsante cambia da solo: dirlo anche a parole sarebbe di troppo
  return {};
}
