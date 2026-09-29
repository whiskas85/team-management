'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { str, strOpt, type StatoForm } from '@/lib/form';
import { accoda } from '@/lib/federazione-coda';
import { profiloDi } from '@/lib/federazione';

/**
 * Gli inviti delle squadre collegate alle loro attività
 * (docs/COLLEGAMENTO-SQUADRE.md). Si accettano o si rifiutano; lasciati lì
 * restano fra gli inviti, visibili solo a chi gestisce il calendario.
 */

async function invito(fd: FormData) {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo chi gestisce il calendario risponde agli inviti.' };
  const e = await prisma.event.findUnique({
    where: { id: str(fd, 'id') },
    include: { origineCollegamento: true },
  });
  if (!e || !e.origineCollegamento || !e.origineIdRemoto) return { errore: 'Invito non trovato.' };
  if (e.status !== 'INVITATA') return { errore: 'A questo invito si è già risposto.' };
  return { e, c: e.origineCollegamento, idRemoto: e.origineIdRemoto };
}

function aggiorna(id?: string) {
  revalidatePath('/calendario');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/calendario/${id}`);
}

/** Accettato: diventa una bozza nostra, e l'organizzatore lo sa. */
export async function accettaInvitoEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await invito(fd);
  if ('errore' in r) return { errore: r.errore };
  // la tipologia è nostra: le loro possono chiamarsi in un altro modo
  const tipo = await prisma.tipoAttivita.findFirst({
    where: { id: str(fd, 'tipoId'), attivo: true },
    select: { id: true },
  });
  if (!tipo) return { errore: 'Scegli la tipologia fra le nostre.' };
  await prisma.event.update({
    where: { id: r.e.id },
    data: { status: 'CREATA', tipoId: tipo.id },
  });
  if (r.c.stato === 'ATTIVO') {
    await accoda(r.c.id, 'evento-risposta', { id: r.idRemoto, risposta: 'ACCETTATA' }).catch(
      () => null,
    );
  }
  aggiorna(r.e.id);
  return {
    ok: `Accettato: ora è una bozza. Sistema quote e posti, poi rilasciala alla squadra.`,
  };
}

/**
 * Rifiutato: l'invito sparisce, e l'organizzatore sa che non veniamo — e
 * perché, se lo si scrive.
 */
export async function rifiutaInvitoEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await invito(fd);
  if ('errore' in r) return { errore: r.errore };
  const motivo = strOpt(fd, 'motivo')?.slice(0, 500) ?? null;
  await prisma.event.delete({ where: { id: r.e.id } });
  if (r.c.stato === 'ATTIVO') {
    await accoda(r.c.id, 'evento-risposta', {
      id: r.idRemoto,
      risposta: 'RIFIUTATA',
      motivo,
    }).catch(() => null);
  }
  aggiorna();
  const ritorno = str(fd, 'ritorno');
  if (ritorno.startsWith('/calendario')) redirect(ritorno);
  return { ok: `Invito rifiutato: ${profiloDi(r.c).nome} lo sa.` };
}

/**
 * Cancella: l'invito sparisce dalla nostra vista, **senza dirlo** a chi l'ha
 * mandato — per loro resta «invitato». Non lo si elimina: se lo si facesse, il
 * primo aggiornamento dell'organizzatore lo farebbe rinascere fra gli inviti.
 */
export async function nascondiInvitoEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await invito(fd);
  if ('errore' in r) return { errore: r.errore };
  await prisma.event.update({ where: { id: r.e.id }, data: { origineNascosta: true } });
  aggiorna(r.e.id);
  const ritorno = str(fd, 'ritorno');
  if (ritorno.startsWith('/calendario')) redirect(ritorno);
  return { ok: 'Invito tolto dalla vista. L’altra squadra non ne sa niente.' };
}
