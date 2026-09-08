'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { NaturaVoce, StatoVoce } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { eMio, manigliaUnica, puoFareUfficiale, puoVendere } from '@/lib/mercatino';
import { eliminaAllegato, salvaAllegato } from '@/lib/storage';
import { bool, enumVal, num, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Il mercatino: annunci, voci, foto.
 *
 * Un annuncio è di chi l'ha scritto e nessun altro lo tocca — l'admin può solo
 * ritirarlo, perché una bacheca senza nessuno che possa togliere una cosa fuori
 * posto prima o poi ne ospita una.
 */

const NATURE = ['PEZZO_UNICO', 'RIORDINABILE'] as const;
const STATI_VOCE = ['DISPONIBILE', 'PRENOTATA', 'VENDUTA'] as const;

/** Quante foto per annuncio: il volume degli allegati è lo stesso dei certificati. */
const MAX_FOTO = 8;

function aggiorna(id?: string) {
  revalidatePath('/mercatino');
  revalidatePath('/merchandising');
  // l'annuncio si apre da due porte, e la pagina è la stessa: senza il secondo
  // giro una delle due resterebbe indietro
  if (id) {
    revalidatePath(`/mercatino/${id}`);
    revalidatePath(`/merchandising/${id}`);
  }
}

/** L'annuncio, ma solo se è di chi sta chiedendo. */
async function mioAnnuncio(id: string, userId: string) {
  const a = await prisma.annuncio.findUnique({ where: { id }, include: { foto: true } });
  if (!a || !eMio(a, userId)) return null;
  return a;
}

// ------------------------------------------------------------------ annuncio

export async function creaAnnuncio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!(await puoVendere(me))) {
    return {
      errore:
        'Per ora nel mercatino possono pubblicare solo i membri della squadra. Vedere lo puoi comunque.',
    };
  }

  const titolo = str(fd, 'titolo');
  if (!titolo) return { errore: 'Serve un titolo: è quello che si legge in bacheca.' };

  // il bollino di ufficiale decide dove finiscono i soldi, quindi non basta
  // che arrivi dal modulo: si controlla qui chi lo sta mettendo
  const ufficiale = bool(fd, 'ufficiale') && puoFareUfficiale(me.roles);

  const annuncio = await prisma.annuncio.create({
    data: {
      titolo,
      descrizione: strOpt(fd, 'descrizione'),
      ufficiale,
      venditoreId: me.id,
    },
  });

  aggiorna(annuncio.id);
  redirect(`/mercatino/${annuncio.id}`);
}

export async function salvaAnnuncio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const annuncio = await mioAnnuncio(str(fd, 'id'), me.id);
  if (!annuncio) return { errore: 'Annuncio non trovato, o non è tuo.' };

  const titolo = str(fd, 'titolo');
  if (!titolo) return { errore: 'Serve un titolo.' };

  await prisma.annuncio.update({
    where: { id: annuncio.id },
    data: {
      titolo,
      descrizione: strOpt(fd, 'descrizione'),
      // il bollino resta quello che era se chi modifica non può cambiarlo
      ufficiale: puoFareUfficiale(me.roles) ? bool(fd, 'ufficiale') : annuncio.ufficiale,
    },
  });

  aggiorna(annuncio.id);
  return { ok: 'Annuncio aggiornato.' };
}

/**
 * Pubblica, ritira, rimette in bozza.
 *
 * Pubblicare vuol dire farlo vedere a tutta la squadra, quindi prima si guarda
 * che ci sia qualcosa da vedere: senza voci un annuncio non dice il prezzo, e
 * in bacheca sarebbe una card muta.
 */
export async function cambiaStatoAnnuncio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');
  const verso = str(fd, 'stato');

  const annuncio = await prisma.annuncio.findUnique({
    where: { id },
    include: { _count: { select: { voci: true } } },
  });
  if (!annuncio) return { errore: 'Annuncio non trovato.' };

  // l'admin può ritirare un annuncio altrui, ma non pubblicarlo né riscriverlo
  const mio = eMio(annuncio, me.id);
  if (!mio && !(verso === 'RITIRATO' && isAdmin(me.roles))) {
    return { errore: 'Puoi cambiare stato solo ai tuoi annunci.' };
  }

  if (verso === 'PUBBLICATO' && annuncio._count.voci === 0) {
    return { errore: 'Aggiungi almeno una voce con il prezzo: senza, in bacheca non si vede nulla.' };
  }

  const stato = enumVal(fd, 'stato', ['BOZZA', 'PUBBLICATO', 'RITIRATO'] as const, 'BOZZA');
  await prisma.annuncio.update({
    where: { id },
    data: {
      stato,
      // la data di pubblicazione è quella della prima volta: un annuncio
      // ritirato e ripubblicato non deve sembrare nuovo di zecca
      pubblicatoIl: stato === 'PUBBLICATO' ? (annuncio.pubblicatoIl ?? new Date()) : annuncio.pubblicatoIl,
    },
  });

  aggiorna(id);
  const detto: Record<string, string> = {
    PUBBLICATO: 'Pubblicato: adesso lo vede la squadra.',
    RITIRATO: mio ? 'Ritirato.' : 'Annuncio ritirato.',
    BOZZA: 'Rimesso in bozza: non lo vede più nessuno.',
  };
  return { ok: detto[stato] };
}

export async function eliminaAnnuncio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const annuncio = await mioAnnuncio(str(fd, 'id'), me.id);
  if (!annuncio) return { errore: 'Annuncio non trovato, o non è tuo.' };

  // con degli ordini dentro non si cancella: porterebbe via le quote di altre
  // persone. Per toglierlo di mezzo c'è "ritira", che lo lascia leggibile
  // l'ordine non punta più all'annuncio ma alle sue voci: il carrello
  // attraversa il catalogo, e la domanda giusta è se qualcuno ha ordinato
  // qualcosa di qui dentro
  const ordini = await prisma.rigaOrdine.count({
    where: { voce: { annuncioId: annuncio.id }, ordine: { stato: { not: 'ANNULLATO' } } },
  });
  if (ordini > 0) {
    return {
      errore:
        ordini === 1
          ? 'C’è un ordine su questo articolo: ritiralo invece di cancellarlo.'
          : `Ci sono ${ordini} ordini su questo articolo: ritiralo invece di cancellarlo.`,
    };
  }

  // i file vivono su disco e il database non li porta via: senza questo giro
  // restano nel volume per sempre, orfani e irriconoscibili
  for (const f of annuncio.foto) {
    await eliminaAllegato(f.file);
    await eliminaAllegato(f.miniatura);
  }
  await prisma.annuncio.delete({ where: { id: annuncio.id } });

  aggiorna();
  redirect('/mercatino');
}

// ------------------------------------------------------------------ voci

export async function salvaVoce(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const annuncio = await mioAnnuncio(str(fd, 'annuncioId'), me.id);
  if (!annuncio) return { errore: 'Annuncio non trovato, o non è tuo.' };

  const titolo = str(fd, 'titolo');
  if (!titolo) return { errore: 'Serve un titolo per la voce.' };

  const prezzo = num(fd, 'prezzo');
  if (prezzo === null || prezzo < 0) return { errore: 'Scrivi il prezzo: è sempre obbligatorio.' };

  const dati = {
    titolo,
    prezzo,
    trattabile: bool(fd, 'trattabile'),
    descrizione: strOpt(fd, 'descrizione'),
    natura: enumVal(fd, 'natura', NATURE, 'PEZZO_UNICO') as NaturaVoce,
    // spenta resta scritta ma non è in vendita: cancellarla porterebbe via
    // anche i commenti che la nominano, che sono di altre persone
    attiva: bool(fd, 'attiva'),
    // tenuta in casa: non entra nel giro di raccolta, ma ha una giacenza che
    // scende e finita è finita
    aMagazzino: bool(fd, 'aMagazzino'),
  };

  const id = strOpt(fd, 'id');
  if (id) {
    await prisma.voceAnnuncio.update({ where: { id }, data: dati });
    aggiorna(annuncio.id);
    return { ok: 'Voce aggiornata.' };
  }

  const gia = await prisma.voceAnnuncio.findMany({
    where: { annuncioId: annuncio.id },
    select: { maniglia: true },
  });
  const maniglia = manigliaUnica(gia.map((v) => v.maniglia), titolo);

  await prisma.voceAnnuncio.create({
    data: { ...dati, annuncioId: annuncio.id, maniglia, ordine: gia.length },
  });

  aggiorna(annuncio.id);
  return { ok: `Voce aggiunta: la nomini con @${maniglia}.` };
}

export async function eliminaVoce(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const voce = await prisma.voceAnnuncio.findUnique({
    where: { id: str(fd, 'id') },
    include: { annuncio: true },
  });
  if (!voce || !eMio(voce.annuncio, me.id)) return { errore: 'Voce non trovata, o non è tua.' };

  // se qualcuno l'ha ordinata non si cancella, o il suo ordine resterebbe a
  // parlare di una cosa che non esiste più. L'interruttore serve a questo:
  // spenta resta scritta e non è più in vendita
  const ordinata = await prisma.rigaOrdine.count({ where: { voceId: voce.id } });
  if (ordinata > 0) {
    return {
      errore: 'Qualcuno l’ha già ordinata: toglile la spunta "In vendita" invece di cancellarla.',
    };
  }

  await prisma.voceAnnuncio.delete({ where: { id: voce.id } });
  aggiorna(voce.annuncioId);
  return { ok: 'Voce eliminata.' };
}

/**
 * Rimette le voci nell'ordine deciso trascinandole.
 *
 * Arriva l'elenco intero e non «questa sale di uno»: chi trascina può
 * spostare una voce di quattro posti in un gesto solo, e mandare il risultato
 * invece dei passaggi è l'unico modo perché quello che si vede sotto le dita e
 * quello che finisce nel database siano la stessa cosa.
 *
 * Si rinumera da zero tutte le volte, così i buchi lasciati dalle voci
 * cancellate non si accumulano.
 */
export async function ordinaVoci(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const annuncio = await mioAnnuncio(str(fd, 'annuncioId'), me.id);
  if (!annuncio) return { errore: 'Annuncio non trovato, o non è tuo.' };

  const voci = await prisma.voceAnnuncio.findMany({
    where: { annuncioId: annuncio.id },
    select: { id: true },
  });

  // l'elenco che arriva dalla pagina si accetta solo se parla esattamente
  // delle voci di questo annuncio: né una in meno (resterebbe senza posto) né
  // una di un altro annuncio
  const sue = new Set(voci.map((v) => v.id));
  const nuovo = str(fd, 'ids').split(',').filter((id) => sue.has(id));
  if (nuovo.length !== voci.length || new Set(nuovo).size !== voci.length) {
    return { errore: 'L’elenco è cambiato mentre lo spostavi: ricarica la pagina.' };
  }

  await prisma.$transaction(
    nuovo.map((id, i) => prisma.voceAnnuncio.update({ where: { id }, data: { ordine: i } })),
  );

  aggiorna(annuncio.id);
  return {};
}

/**
 * Prenota, vende, libera.
 *
 * Una prenotazione porta con sé chi l'ha fatta e da quando: *prenotata* e
 * basta, dopo due giorni, non dice più niente a nessuno.
 */
export async function statoVoce(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const voce = await prisma.voceAnnuncio.findUnique({
    where: { id: str(fd, 'id') },
    include: { annuncio: true },
  });
  if (!voce || !eMio(voce.annuncio, me.id)) return { errore: 'Voce non trovata, o non è tua.' };

  if (voce.natura === 'RIORDINABILE') {
    return { errore: 'Questa voce è riordinabile: non c’è niente da esaurire.' };
  }

  const stato = enumVal(fd, 'stato', STATI_VOCE, 'DISPONIBILE') as StatoVoce;
  const perChi = strOpt(fd, 'prenotataDaId');

  await prisma.voceAnnuncio.update({
    where: { id: voce.id },
    data: {
      stato,
      prenotataDaId: stato === 'PRENOTATA' ? perChi : null,
      prenotataIl: stato === 'PRENOTATA' ? new Date() : null,
    },
  });

  aggiorna(voce.annuncioId);
  const detto: Record<string, string> = {
    DISPONIBILE: 'Di nuovo disponibile.',
    PRENOTATA: 'Prenotata.',
    VENDUTA: 'Segnata come venduta.',
  };
  return { ok: detto[stato] };
}

// ------------------------------------------------------------------ foto

/**
 * Carica una foto già rimpicciolita dal browser, con la sua miniatura.
 *
 * Il ridimensionamento sta nel browser e non qui per una ragione pratica: una
 * foto da telefono pesa otto mega, e mandarla intera per poi ridurla vuol dire
 * aspettare il caricamento due volte — una sulla rete di casa, una su ZeroTier.
 */
export async function caricaFoto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const annuncio = await mioAnnuncio(str(fd, 'annuncioId'), me.id);
  if (!annuncio) return { errore: 'Annuncio non trovato, o non è tuo.' };

  if (annuncio.foto.length >= MAX_FOTO) {
    return { errore: `Massimo ${MAX_FOTO} foto per annuncio.` };
  }

  const grande = fd.get('file');
  const piccola = fd.get('miniatura');
  if (!(grande instanceof File) || !(piccola instanceof File)) {
    return { errore: 'Foto mancante.' };
  }

  try {
    const [f, m] = await Promise.all([
      salvaAllegato(grande, 'mercatino'),
      salvaAllegato(piccola, 'mercatino'),
    ]);

    const foto = await prisma.fotoAnnuncio.create({
      data: {
        annuncioId: annuncio.id,
        file: f.filePath,
        miniatura: m.filePath,
        ordine: annuncio.foto.length,
      },
    });

    // la prima foto diventa la copertina da sola: chiedere di sceglierla quando
    // ce n'è una sola sarebbe una domanda con una risposta sola
    if (!annuncio.copertinaId) {
      await prisma.annuncio.update({
        where: { id: annuncio.id },
        data: { copertinaId: foto.id },
      });
    }
  } catch (e) {
    return { errore: e instanceof Error ? e.message : 'Caricamento non riuscito.' };
  }

  aggiorna(annuncio.id);
  return { ok: 'Foto caricata.' };
}

export async function scegliCopertina(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const foto = await prisma.fotoAnnuncio.findUnique({
    where: { id: str(fd, 'id') },
    include: { annuncio: true },
  });
  if (!foto || !eMio(foto.annuncio, me.id)) return { errore: 'Foto non trovata, o non è tua.' };

  await prisma.annuncio.update({
    where: { id: foto.annuncioId },
    data: { copertinaId: foto.id },
  });

  aggiorna(foto.annuncioId);
  return { ok: 'Copertina scelta: è quella che si vede in bacheca.' };
}

export async function eliminaFoto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const foto = await prisma.fotoAnnuncio.findUnique({
    where: { id: str(fd, 'id') },
    include: { annuncio: { include: { foto: { orderBy: { ordine: 'asc' } } } } },
  });
  if (!foto || !eMio(foto.annuncio, me.id)) return { errore: 'Foto non trovata, o non è tua.' };

  await eliminaAllegato(foto.file);
  await eliminaAllegato(foto.miniatura);
  await prisma.fotoAnnuncio.delete({ where: { id: foto.id } });

  // se se n'è andata la copertina ne prende il posto un'altra, invece di
  // lasciare la card in bacheca senza niente da mostrare
  if (foto.annuncio.copertinaId === foto.id) {
    const rimasta = foto.annuncio.foto.find((f) => f.id !== foto.id);
    await prisma.annuncio.update({
      where: { id: foto.annuncioId },
      data: { copertinaId: rimasta?.id ?? null },
    });
  }

  aggiorna(foto.annuncioId);
  return { ok: 'Foto eliminata.' };
}

// ------------------------------------------------------------------ impostazioni

export async function chiPuoVendere(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin cambia questa impostazione.' };

  const acceso = bool(fd, 'nuoviPossonoVendere');
  await prisma.impostazioni.upsert({
    where: { id: 'app' },
    create: { id: 'app', nuoviPossonoVendere: acceso },
    update: { nuoviPossonoVendere: acceso },
  });

  aggiorna();
  return {
    ok: acceso
      ? 'Da adesso anche chi non è ancora in squadra può pubblicare.'
      : 'Da adesso pubblica solo chi è in squadra.',
  };
}
