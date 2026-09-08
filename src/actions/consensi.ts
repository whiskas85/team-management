'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { VERSIONE_PRIVACY } from '@/lib/gdpr';
import { mancanze } from '@/lib/consensi';
import { bool, type StatoForm } from '@/lib/form';

/**
 * Le risposte alle tre domande che si fanno prima di entrare.
 *
 * Di ognuna resta scritto **cosa** è stato accettato e **quando**: un consenso
 * senza data e senza versione non è un consenso, è un'opinione. Se il testo
 * cambia si torna a chiedere, perché aver accettato altro non è aver accettato
 * questo.
 */

function aggiorna() {
  revalidatePath('/consensi');
  revalidatePath('/profilo');
  revalidatePath('/privacy');
}

export async function accettaPrivacy(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  await prisma.user.update({
    where: { id: me.id },
    data: { privacyAccettataIl: new Date(), privacyVersione: VERSIONE_PRIVACY },
  });

  aggiorna();
  return { ok: 'Informativa accettata.' };
}

/**
 * «Ho letto statuto e regolamenti.»
 *
 * Si accettano tutti insieme e non uno per volta: sono le regole del club, e
 * leggerne metà non è averle lette. Di ciascuno resta la versione, così quando
 * uno cambia si ripassa solo da quello che è cambiato.
 */
export async function accettaRegole(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const { documenti } = await mancanze(me.id);
  if (documenti.length === 0) return { errore: 'Non c’è ancora niente da leggere.' };

  await prisma.$transaction(
    documenti.map((d) =>
      prisma.accettazioneDocumento.upsert({
        where: { userId_documentoId: { userId: me.id, documentoId: d.id } },
        create: { userId: me.id, documentoId: d.id, versione: d.aggiornatoIl },
        update: { versione: d.aggiornatoIl, accettatoIl: new Date() },
      }),
    ),
  );

  aggiorna();
  return { ok: 'Statuto e regolamenti: presa visione registrata.' };
}

/**
 * Le foto: sì o no, e vanno bene tutte e due.
 *
 * Si registra anche il no, con la sua data: sapere che la domanda è stata
 * fatta e la risposta è stata negativa è quello che serve a chi pubblica: un
 * consenso mancante perché nessuno l'ha chiesto è un'altra cosa.
 */
export async function scegliConsensoFoto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const si = bool(fd, 'consenso');

  await prisma.user.update({
    where: { id: me.id },
    data: { consensoImmagini: si, consensoImmaginiIl: new Date() },
  });

  aggiorna();
  return {
    ok: si
      ? 'Grazie: le tue foto possono comparire sui canali del team.'
      : 'Va bene: non pubblicheremo tue foto. Puoi cambiare idea dal profilo.',
  };
}
