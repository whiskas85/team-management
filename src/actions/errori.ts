'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { str, type StatoForm } from '@/lib/form';
import { VERSIONE } from '@/lib/versione';

/**
 * Il registro dei guasti visti dai browser della squadra.
 *
 * Chi segnala non ha bisogno di permessi, e non è una svista: **l'errore
 * arriva proprio quando qualcosa non funziona**, e pretendere che la sessione
 * sia in ordine per poterlo raccontare vorrebbe dire perdere esattamente i casi
 * peggiori. Se la persona è riconosciuta si scrive chi è; se no la riga si
 * scrive lo stesso, senza nome.
 *
 * Leggerli invece è dell'admin: dentro ci sono indirizzi visitati e pile di
 * chiamate, che non riguardano nessun altro.
 */

/** Tagli di sicurezza: una riga di registro non deve poter diventare un libro. */
const LIMITI = { messaggio: 500, stack: 8000, diario: 8000, indirizzo: 300, agente: 300 };

const taglia = (v: unknown, quanto: number) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, quanto) : null;

export type SegnalazioneErrore = {
  messaggio: string;
  nome?: string;
  digest?: string;
  stack?: string;
  indirizzo?: string;
  diario?: string;
  origine?: string;
};

/**
 * Registra un errore capitato nel browser.
 *
 * Torna il riferimento della riga scritta, che la pagina rotta mostra a chi
 * l'ha incontrata: serve a poterselo dire a voce — *«ho l'errore 3f9a»* — e a
 * ritrovare la riga giusta senza cercarla per orario.
 *
 * Lo stesso guasto in un momento solo arriva più volte: React monta il confine
 * d'errore, il `window.onerror` scatta e magari la promessa rifiutata pure. Si
 * scrive una riga sola per minuto a parità di messaggio e persona, o dopo una
 * giornata storta il registro sarebbe illeggibile proprio quando serve.
 */
export async function registraErrore(dati: SegnalazioneErrore): Promise<{ riferimento?: string }> {
  const messaggio = taglia(dati.messaggio, LIMITI.messaggio);
  if (!messaggio) return {};

  // niente requireUser: se la sessione è saltata, l'errore va raccolto lo stesso
  const me = await getCurrentUser().catch(() => null);
  const agente = taglia((await headers()).get('user-agent'), LIMITI.agente);

  const unMinutoFa = new Date(Date.now() - 60_000);
  const gia = await prisma.erroreClient.findFirst({
    where: { messaggio, userId: me?.id ?? null, quando: { gte: unMinutoFa } },
    select: { id: true },
  });
  if (gia) return { riferimento: gia.id.slice(-6) };

  const riga = await prisma.erroreClient.create({
    data: {
      userId: me?.id ?? null,
      messaggio,
      nome: taglia(dati.nome, 80),
      digest: taglia(dati.digest, 80),
      stack: taglia(dati.stack, LIMITI.stack),
      indirizzo: taglia(dati.indirizzo, LIMITI.indirizzo),
      agente,
      versione: VERSIONE,
      diario: taglia(dati.diario, LIMITI.diario),
      origine: taglia(dati.origine, 40),
    },
    select: { id: true },
  });

  revalidatePath('/admin/errori');
  // le ultime sei cifre bastano a ritrovarla e si dettano al telefono
  return { riferimento: riga.id.slice(-6) };
}

export async function segnaErroreVisto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Il registro dei guasti lo legge l’admin.' };

  await prisma.erroreClient.update({
    where: { id: str(fd, 'id') },
    data: { visto: str(fd, 'verso') !== 'no' },
  });
  revalidatePath('/admin/errori');
  return { ok: 'Segnato.' };
}

export async function eliminaErrore(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Il registro dei guasti lo legge l’admin.' };

  await prisma.erroreClient.delete({ where: { id: str(fd, 'id') } });
  revalidatePath('/admin/errori');
  return { ok: 'Riga eliminata.' };
}

/**
 * Svuota quello che è già stato guardato.
 *
 * Solo i visti: un registro che si azzera tutto insieme cancella anche le
 * righe arrivate mentre lo si stava leggendo.
 */
export async function pulisciErroriVisti(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Il registro dei guasti lo legge l’admin.' };

  const { count } = await prisma.erroreClient.deleteMany({ where: { visto: true } });
  revalidatePath('/admin/errori');
  return { ok: count === 0 ? 'Non c’era niente di già guardato.' : `Eliminate ${count} righe.` };
}
