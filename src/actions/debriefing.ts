'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoSchierare } from '@/lib/domain';
import { bool, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Il debriefing di un'attività.
 *
 * Lo scrive chi la squadra la porta in campo — team leader e admin — perché è
 * il resoconto di come è andata, non un commento: i commenti li scrivono
 * tutti, e stanno sotto.
 *
 * Nasce in **bozza**: un resoconto a metà non si legge, e chi lo scrive lo fa
 * a pezzi, la sera, ricordandosi le cose. Quando è pronto lo si pubblica e da
 * quel momento lo trova anche chi quel giorno non c'era.
 */

function aggiorna(eventId: string) {
  revalidatePath(`/calendario/${eventId}`);
  revalidatePath('/debriefing');
}

export async function salvaDebriefing(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const eventId = str(fd, 'eventId');
  const evento = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!evento) return { errore: 'Attività non trovata.' };

  // Lo scrive chi porta la squadra in campo, e lo corregge anche chi l’ha
  // scritto: se domani non fa più il team leader, il racconto di quella
  // giornata resta suo.
  const gia = await prisma.debriefing.findUnique({
    where: { eventId },
    select: { autoreId: true },
  });
  if (!puoSchierare(me.roles) && gia?.autoreId !== me.id) {
    return { errore: 'Il debriefing lo scrive chi porta la squadra in campo.' };
  }

  const testo = str(fd, 'testo');
  if (!testo) return { errore: 'Scrivi qualcosa: un debriefing vuoto non racconta niente.' };

  const titolo = strOpt(fd, 'titolo');
  const pubblicato = bool(fd, 'pubblicato');

  await prisma.debriefing.upsert({
    where: { eventId },
    create: { eventId, titolo, testo, pubblicato, autoreId: me.id },
    // l'autore resta il primo che l'ha scritto: se lo ritocca un altro TL non
    // gli si intesta il racconto di qualcun altro
    update: { titolo, testo, pubblicato },
  });

  aggiorna(eventId);
  return {
    ok: pubblicato ? 'Debriefing pubblicato: adesso lo legge la squadra.' : 'Debriefing salvato in bozza.',
  };
}

export async function eliminaDebriefing(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const eventId = str(fd, 'eventId');
  const gia = await prisma.debriefing.findUnique({
    where: { eventId },
    select: { autoreId: true },
  });
  if (!puoSchierare(me.roles) && gia?.autoreId !== me.id) {
    return { errore: 'Non è roba tua.' };
  }
  await prisma.debriefing.delete({ where: { eventId } }).catch(() => null);

  aggiorna(eventId);
  return { ok: 'Debriefing eliminato.' };
}
