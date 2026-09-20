'use server';

import type { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoGestireAllegati, REGOLE_ALLEGATO } from '@/lib/allegati';
import { eliminaAllegato as cancellaDalDisco, salvaAllegato } from '@/lib/storage';
import { bool, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Il book di missione e quello che gli sta intorno.
 *
 * Lo carica chi tiene in mano l'attività — admin, team leader, referenti — e
 * chi lo carica lo può anche sostituire: **un book si aggiorna**, il venerdì
 * cambia il campo e il sabato cambiano gli orari. Sostituire vuol dire che il
 * file nuovo prende il posto del vecchio *sulla stessa riga*: il titolo resta,
 * il link resta, e chi l'aveva aperto ieri lo ritrova dov'era. Caricare un
 * secondo allegato «book v2» accanto al primo è il modo migliore perché
 * qualcuno la domenica mattina apra quello sbagliato.
 */

/** Le pagine che cambiano: la scheda, il calendario e gli inviti mandati fuori. */
async function aggiorna(eventId: string) {
  revalidatePath(`/calendario/${eventId}`);
  revalidatePath('/calendario');

  // Gli inviti delle squadre ospiti sono pagine loro, con il loro indirizzo:
  // se un allegato diventa pubblico — o smette di esserlo — quelle vanno
  // rifatte, altrimenti di là si continua a vedere com'era.
  const ospiti = await prisma.squadraOspite.findMany({
    where: { eventId },
    select: { token: true },
  });
  for (const o of ospiti) revalidatePath(`/invito/${o.token}`);
}

/** L'attività con i suoi referenti, e il permesso di toccarne gli allegati. */
async function attivitaSeGestibile(eventId: string, me: { id: string; roles: Role[] }) {
  const evento = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, referenti: { select: { userId: true } } },
  });
  if (!evento) return null;
  return puoGestireAllegati(me, evento.referenti) ? evento : undefined;
}

const NEGATO =
  'Gli allegati di questa attività li gestiscono l’admin, i team leader e i suoi referenti.';

export async function caricaAllegato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const eventId = str(fd, 'eventId');

  const evento = await attivitaSeGestibile(eventId, me);
  if (evento === null) return { errore: 'Attività non trovata.' };
  if (!evento) return { errore: NEGATO };

  const titolo = strOpt(fd, 'titolo');
  if (!titolo) return { errore: 'Dai un nome all’allegato: «Book di missione», non il nome del file.' };

  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { errore: 'Scegli il file da allegare: PDF, Markdown o HTML.' };
  }

  let salvato;
  try {
    salvato = await salvaAllegato(file, 'allegati', REGOLE_ALLEGATO);
  } catch (e) {
    return { errore: e instanceof Error ? e.message : 'Caricamento non riuscito.' };
  }

  // in fondo all'elenco: chi carica decide dopo dove metterlo, trascinando
  const ultimi = await prisma.allegatoEvento.aggregate({
    where: { eventId },
    _max: { ordine: true },
  });

  await prisma.allegatoEvento.create({
    data: {
      eventId,
      titolo,
      pubblico: bool(fd, 'pubblico'),
      ordine: (ultimi._max.ordine ?? -1) + 1,
      caricatoDaId: me.id,
      ...salvato,
    },
  });

  await aggiorna(eventId);
  return { ok: `«${titolo}» è allegato all’attività.` };
}

/**
 * Cambia il nome, la visibilità, e — se ne arriva uno — il file.
 *
 * Il file vecchio se ne va dal disco solo dopo che il nuovo è scritto e la
 * riga aggiornata: se qualcosa va storto a metà, meglio un file orfano nel
 * volume che una riga che punta al nulla.
 */
export async function aggiornaAllegato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');

  const allegato = await prisma.allegatoEvento.findUnique({ where: { id } });
  if (!allegato) return { errore: 'Allegato non trovato.' };

  const evento = await attivitaSeGestibile(allegato.eventId, me);
  if (!evento) return { errore: NEGATO };

  const titolo = strOpt(fd, 'titolo');
  if (!titolo) return { errore: 'Il nome non può restare vuoto.' };

  const file = fd.get('file');
  const sostituisce = file instanceof File && file.size > 0;

  let salvato;
  if (sostituisce) {
    try {
      salvato = await salvaAllegato(file, 'allegati', REGOLE_ALLEGATO);
    } catch (e) {
      return { errore: e instanceof Error ? e.message : 'Caricamento non riuscito.' };
    }
  }

  await prisma.allegatoEvento.update({
    where: { id },
    data: {
      titolo,
      pubblico: bool(fd, 'pubblico'),
      ...(salvato ?? {}),
      ...(sostituisce ? { caricatoDaId: me.id } : {}),
    },
  });

  if (salvato) await cancellaDalDisco(allegato.filePath);

  await aggiorna(allegato.eventId);
  return {
    ok: sostituisce
      ? `«${titolo}» è stato sostituito: chi apre il link legge la versione nuova.`
      : `«${titolo}» aggiornato.`,
  };
}

export async function togliAllegato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');

  const allegato = await prisma.allegatoEvento.findUnique({ where: { id } });
  if (!allegato) return { errore: 'Allegato non trovato.' };

  const evento = await attivitaSeGestibile(allegato.eventId, me);
  if (!evento) return { errore: NEGATO };

  await prisma.allegatoEvento.delete({ where: { id } });
  await cancellaDalDisco(allegato.filePath);

  await aggiorna(allegato.eventId);
  return { ok: `«${allegato.titolo}» non è più allegato.` };
}

/**
 * L'ordine in cui si leggono, deciso trascinando.
 *
 * Arriva l'elenco intero e non «questo sale di uno»: si può spostare una riga
 * di quattro posti in un gesto solo, e mandare il risultato è l'unico modo
 * perché quello che si vede sotto le dita e quello che finisce nel database
 * siano la stessa cosa. Si rinumera da zero tutte le volte, così i buchi
 * lasciati dagli allegati tolti non si accumulano.
 */
export async function ordinaAllegati(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const eventId = str(fd, 'eventId');

  const evento = await attivitaSeGestibile(eventId, me);
  if (evento === null) return { errore: 'Attività non trovata.' };
  if (!evento) return { errore: NEGATO };

  const suoi = await prisma.allegatoEvento.findMany({
    where: { eventId },
    select: { id: true },
  });

  // l'elenco che arriva dalla pagina si accetta solo se parla esattamente
  // degli allegati di questa attività: né uno in meno né uno di un'altra
  const sue = new Set(suoi.map((a) => a.id));
  const nuovo = str(fd, 'ids').split(',').filter((id) => sue.has(id));
  if (nuovo.length !== suoi.length || new Set(nuovo).size !== suoi.length) {
    return { errore: 'L’elenco è cambiato mentre lo spostavi: ricarica la pagina.' };
  }

  await prisma.$transaction(
    nuovo.map((id, i) => prisma.allegatoEvento.update({ where: { id }, data: { ordine: i } })),
  );

  await aggiorna(eventId);
  return {};
}

/**
 * Un allegato scritto qui dentro, invece che caricato.
 *
 * Il book di missione lo scrive chi tiene in mano l'attività, e spesso lo
 * finisce la sera prima. Farglielo scrivere altrove — un documento sul
 * computer, un messaggio in chat — vuol dire che la versione buona sta da
 * un'altra parte e qui arriva un file vecchio di tre giorni, se arriva.
 *
 * **È un allegato come gli altri.** Finisce nello stesso posto, con la stessa
 * riga, lo stesso ordine e lo stesso link: chi lo legge non sa — e non deve
 * sapere — se è stato scritto qui o caricato da fuori. Si scrive un file
 * `.md` vero, e passa dalle regole di sempre: cosa può essere, quanto può
 * pesare, come viene chiamato sul disco.
 *
 * Con un `id` riscrive quello che c'è: scrivere un documento e non poterlo
 * più correggere sarebbe un blocco per appunti, non un book.
 */
export async function salvaAllegatoScritto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const id = strOpt(fd, 'id');
  const esistente = id
    ? await prisma.allegatoEvento.findUnique({ where: { id } })
    : null;
  if (id && !esistente) return { errore: 'Allegato non trovato.' };

  const eventId = esistente?.eventId ?? str(fd, 'eventId');
  const evento = await attivitaSeGestibile(eventId, me);
  if (evento === null) return { errore: 'Attività non trovata.' };
  if (!evento) return { errore: NEGATO };

  const titolo = strOpt(fd, 'titolo');
  if (!titolo) return { errore: 'Dai un nome al documento: «Book di missione», non «documento 1».' };

  const testo = str(fd, 'testo');
  if (!testo.trim()) return { errore: 'Il documento è vuoto: scrivi qualcosa prima di salvarlo.' };

  /*
   * Il nome del file lo fa il titolo, non chi scrive.
   *
   * Sul disco il nome è comunque casuale — lo decide `salvaAllegato` — ma
   * quello che si scarica è questo, e «book-di-missione.md» in una cartella di
   * scaricati dice qualcosa, «documento.md» no.
   */
  const nomeFile = `${titolo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'documento'}.md`;

  let salvato;
  try {
    salvato = await salvaAllegato(
      new File([testo], nomeFile, { type: 'text/markdown; charset=utf-8' }),
      'allegati',
      REGOLE_ALLEGATO,
    );
  } catch (e) {
    return { errore: e instanceof Error ? e.message : 'Salvataggio non riuscito.' };
  }

  if (esistente) {
    await prisma.allegatoEvento.update({
      where: { id: esistente.id },
      data: { titolo, pubblico: bool(fd, 'pubblico'), caricatoDaId: me.id, ...salvato },
    });
    // il file vecchio se ne va solo dopo che il nuovo è scritto e la riga è
    // aggiornata: meglio un file orfano che una riga che punta al nulla
    await cancellaDalDisco(esistente.filePath);
    await aggiorna(eventId);
    return { ok: `«${titolo}» aggiornato: chi apre il link legge la versione nuova.` };
  }

  const ultimi = await prisma.allegatoEvento.aggregate({
    where: { eventId },
    _max: { ordine: true },
  });

  await prisma.allegatoEvento.create({
    data: {
      eventId,
      titolo,
      pubblico: bool(fd, 'pubblico'),
      ordine: (ultimi._max.ordine ?? -1) + 1,
      caricatoDaId: me.id,
      ...salvato,
    },
  });

  await aggiorna(eventId);
  return { ok: `«${titolo}» è allegato all’attività.` };
}

/** Il testo di un allegato scritto qui, per riaprirlo nell'editore. */
export async function leggiAllegatoScritto(id: string): Promise<string | null> {
  const me = await requireUser();
  const allegato = await prisma.allegatoEvento.findUnique({ where: { id } });
  if (!allegato) return null;
  if (!(await attivitaSeGestibile(allegato.eventId, me))) return null;
  if (!allegato.mimeType.startsWith('text/markdown')) return null;

  const { readFile } = await import('node:fs/promises');
  const { percorsoAssoluto } = await import('@/lib/storage');
  return readFile(percorsoAssoluto(allegato.filePath), 'utf8').catch(() => null);
}
