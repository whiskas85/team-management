'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoVedereNuovi } from '@/lib/domain';
import { avvisa, chiSegueINuovi } from '@/lib/push';
import { numeroInternazionale } from '@/lib/contatti';
import { bool, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * I contatti: le persone da chiamare prima che diventino nuovi.
 *
 * Arrivano dal modulo del sito o da chi li scrive a mano dopo una telefonata.
 * Li segue chi segue i nuovi — admin, amministrazione, segreteria — perché sono
 * la stessa persona in un momento prima.
 */

function aggiorna() {
  revalidatePath('/admin/contatti');
  // il pallino nel menu
  revalidatePath('/', 'layout');
}

const pulito = (v: string | null, max: number) => (v ? v.slice(0, max) : null);

// ------------------------------------------------------------- dal sito

/**
 * Il modulo «Vuoi provare?» del sito: la prima porta del server aperta a
 * chiunque, senza accesso.
 *
 * Per questo si difende da sola, in tre modi che una persona vera non vede:
 *
 * - **un campo trappola** nascosto: una persona non lo vede e lo lascia vuoto,
 *   un programma che riempie tutti i campi lo compila e si tradisce;
 * - **il tempo**: sotto i tre secondi dall'apertura della pagina nessuno ha
 *   scritto nome e telefono, chi lo fa è un programma;
 * - **un tetto**: tre moduli all'ora dallo stesso indirizzo, trenta all'ora in
 *   tutto. Oltre, si risponde come se fosse andata — chi manda spam non deve
 *   capire dove si è fermato.
 *
 * L'indirizzo non si salva: se ne tiene un'impronta, che basta a contare i
 * moduli e non permette di risalire a chi li ha mandati.
 */
export async function inviaContatto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const grazie: StatoForm = {
    ok: 'Ricevuto! Ti chiamiamo noi nei prossimi giorni per conoscerci e proporti la prima giornata.',
  };

  // la trappola e il tempo: si risponde «grazie» e non si salva niente
  if (str(fd, 'sito_web')) return grazie;
  const aperto = Number(str(fd, 'aperto'));
  if (!aperto || Date.now() - aperto < 3000) return grazie;

  const nome = str(fd, 'nome');
  const telefono = str(fd, 'telefono');
  if (!nome) return { errore: 'Scrivi come ti chiami.' };
  if (!numeroInternazionale(telefono)) {
    return { errore: 'Serve un numero di telefono valido: è lì che ti chiamiamo.' };
  }
  if (!bool(fd, 'consenso')) {
    return { errore: 'Per poterti richiamare ci serve il tuo consenso all’informativa qui sotto.' };
  }

  const h = await headers();
  const ip = (h.get('x-real-ip') ?? h.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const impronta = ip
    ? createHash('sha256').update(`${process.env.SESSION_SECRET ?? ''}:${ip}`).digest('hex').slice(0, 32)
    : null;

  const unOraFa = new Date(Date.now() - 60 * 60 * 1000);
  const [daQui, inTutto] = await Promise.all([
    impronta ? prisma.contatto.count({ where: { impronta, creatoIl: { gte: unOraFa } } }) : 0,
    prisma.contatto.count({ where: { origine: 'SITO', creatoIl: { gte: unOraFa } } }),
  ]);
  if (daQui >= 3 || inTutto >= 30) return grazie;

  const contatto = await prisma.contatto.create({
    data: {
      nome: nome.slice(0, 80),
      cognome: pulito(strOpt(fd, 'cognome'), 80),
      telefono: telefono.slice(0, 30),
      email: pulito(strOpt(fd, 'email')?.toLowerCase() ?? null, 120),
      zona: pulito(strOpt(fd, 'zona'), 80),
      comeCiHaConosciuto: pulito(strOpt(fd, 'come'), 80),
      messaggio: pulito(strOpt(fd, 'messaggio'), 1000),
      origine: 'SITO',
      consensoIl: new Date(),
      impronta,
    },
  });

  // chi segue i nuovi lo sa subito: un contatto richiamato il giorno stesso
  // è un contatto che viene alla prima giornata
  await avvisa(await chiSegueINuovi(), {
    titolo: 'Un nuovo contatto dal sito',
    testo: `${contatto.nome}${contatto.zona ? ` · ${contatto.zona}` : ''}: da chiamare`,
    url: '/admin/contatti',
    tag: `contatto-${contatto.id}`,
  }).catch(() => {});

  aggiorna();
  return grazie;
}

// ------------------------------------------------------------ dal gestionale

async function chiSegue() {
  const me = await requireUser();
  return puoVedereNuovi(me.roles) ? me : null;
}

/** Un contatto scritto a mano: il passaparola, la telefonata ricevuta. */
export async function aggiungiContatto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await chiSegue();
  if (!me) return { errore: 'I contatti li segue chi segue i nuovi.' };

  const nome = str(fd, 'nome');
  const telefono = str(fd, 'telefono');
  if (!nome || !telefono) return { errore: 'Servono almeno nome e telefono.' };

  await prisma.contatto.create({
    data: {
      nome,
      cognome: strOpt(fd, 'cognome'),
      telefono,
      email: strOpt(fd, 'email')?.toLowerCase() ?? null,
      zona: strOpt(fd, 'zona'),
      comeCiHaConosciuto: strOpt(fd, 'come'),
      nota: strOpt(fd, 'nota'),
      origine: 'MANO',
      creatoDaId: me.id,
    },
  });
  aggiorna();
  return { ok: `${nome} è fra i contatti da chiamare.` };
}

/**
 * La nota della telefonata, e il segno «l'ho chiamato».
 *
 * Il segno serve a non chiamarlo in due: chi apre la pagina vede che qualcuno
 * ci ha già parlato ieri, e cosa si sono detti.
 */
export async function salvaNotaContatto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await chiSegue();
  if (!me) return { errore: 'I contatti li segue chi segue i nuovi.' };

  await prisma.contatto.update({
    where: { id: str(fd, 'id') },
    data: {
      nota: strOpt(fd, 'nota'),
      ...(bool(fd, 'chiamato') ? { chiamatoIl: new Date() } : {}),
    },
  });
  aggiorna();
  return { ok: 'Salvato.' };
}

/**
 * Scarta: la riga sparisce del tutto.
 *
 * Di chi non è mai entrato non si tengono i dati «nel caso»: ce li ha dati per
 * essere richiamato, e se non se ne fa niente non c'è motivo di conservarli.
 */
export async function scartaContatto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await chiSegue();
  if (!me) return { errore: 'I contatti li segue chi segue i nuovi.' };

  await prisma.contatto.delete({ where: { id: str(fd, 'id') } }).catch(() => null);
  aggiorna();
  return { ok: 'Contatto scartato: i suoi dati sono stati cancellati.' };
}
