'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { avvisa } from '@/lib/push';
import { iconaBacheca } from '@/lib/icone-bacheca';
import { eliminaAllegato as cancellaDalDisco, salvaAllegato } from '@/lib/storage';
import { bool, enumVal, str, strOpt, type StatoForm } from '@/lib/form';
import {
  MAX_ALLEGATI_BYTES,
  REGOLE_ALLEGATO_SEGNALAZIONE,
  gestisceSegnalazioni,
  gestoriDa,
  puoSegnalareIn,
  vedeSegnalazione,
} from '@/lib/segnalazioni-canali';

/**
 * Le segnalazioni: si racconta una cosa a chi la gestisce, e se ne parla lì.
 *
 * Gli avvisi sono **solo push**: una segnalazione è una cosa riservata, e un
 * messaggio WhatsApp resta nel telefono di chiunque lo prenda in mano. Il
 * testo degli avvisi non porta mai il nome di chi ha segnalato.
 */

const FIRME = ['NOMINALE', 'ANONIMA', 'A_SCELTA'] as const;
const PUBBLICI = ['SQUADRA', 'NUOVI', 'TUTTI'] as const;

function aggiorna(segnalazioneId?: string, canaleId?: string) {
  revalidatePath('/segnalazioni');
  if (canaleId) revalidatePath(`/segnalazioni/canale/${canaleId}`);
  if (segnalazioneId) revalidatePath(`/segnalazioni/${segnalazioneId}`);
  // i pallini del menu stanno nel layout
  revalidatePath('/', 'layout');
}

// ----------------------------------------------------------------- i canali

/** Crea o configura un canale: lo fa l'admin. */
export async function salvaCanale(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'I canali di segnalazione li crea l’admin.' };

  const id = strOpt(fd, 'id');
  const titolo = str(fd, 'titolo');
  if (!titolo) return { errore: 'Dai un titolo al canale: «Tornei», «Comportamenti», «Idee»…' };

  const dati = {
    titolo: titolo.slice(0, 120),
    descrizione: strOpt(fd, 'descrizione'),
    icona: iconaBacheca(strOpt(fd, 'icona')),
    firma: enumVal(fd, 'firma', FIRME, 'A_SCELTA'),
    pubblico: enumVal(fd, 'pubblico', PUBBLICI, 'TUTTI'),
    conAllegati: bool(fd, 'conAllegati'),
    ...(id ? { attivo: bool(fd, 'attivo') } : {}),
  };

  const canale = id
    ? await prisma.canaleSegnalazioni.update({ where: { id }, data: dati })
    : await prisma.canaleSegnalazioni.create({ data: { ...dati, creatoDaId: me.id } });

  aggiorna(undefined, canale.id);
  if (!id) redirect(`/segnalazioni/canale/${canale.id}`);
  return { ok: 'Canale aggiornato.' };
}

/**
 * Toglie un canale. Se dentro ci sono segnalazioni si spegne soltanto: sono
 * cose che qualcuno ha raccontato, e buttarle via insieme al canale vorrebbe
 * dire perderle.
 */
export async function eliminaCanale(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'I canali li toglie l’admin.' };

  const id = str(fd, 'id');
  const quante = await prisma.segnalazioneCanale.count({ where: { canaleId: id } });
  if (quante > 0) {
    await prisma.canaleSegnalazioni.update({ where: { id }, data: { attivo: false } });
    aggiorna(undefined, id);
    return {
      ok: 'Dentro ci sono segnalazioni: il canale è stato spento, non tolto. Non ne accetta di nuove e sparisce dal menu.',
    };
  }
  await prisma.canaleSegnalazioni.delete({ where: { id } });
  aggiorna();
  redirect('/segnalazioni');
}

// ----------------------------------------------------------- le segnalazioni

/** Una segnalazione nuova, con i suoi allegati. */
export async function inviaSegnalazione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const canale = await prisma.canaleSegnalazioni.findUnique({ where: { id: str(fd, 'canaleId') } });
  if (!canale) return { errore: 'Canale non trovato.' };
  if (!puoSegnalareIn(canale, me)) {
    return { errore: 'In questo canale non si segnala più, o non è rivolto a te.' };
  }

  const titolo = str(fd, 'titolo');
  const testo = str(fd, 'testo');
  if (!titolo) return { errore: 'Dai un titolo alla segnalazione: è la prima cosa che si legge.' };
  if (!testo) return { errore: 'Racconta cosa vuoi segnalare.' };

  // la firma la decide il canale; chi segnala sceglie solo dove il canale lo lascia fare
  const anonima =
    canale.firma === 'ANONIMA' ? true : canale.firma === 'NOMINALE' ? false : bool(fd, 'anonima');

  const file = canale.conAllegati
    ? fd.getAll('allegati').filter((f): f is File => f instanceof File && f.size > 0)
    : [];
  if (file.reduce((t, f) => t + f.size, 0) > MAX_ALLEGATI_BYTES) {
    return { errore: 'Gli allegati insieme pesano troppo: al massimo 20 MB in tutto.' };
  }
  const salvati = [];
  for (const f of file) {
    try {
      salvati.push(await salvaAllegato(f, 'segnalazioni', REGOLE_ALLEGATO_SEGNALAZIONE));
    } catch (e) {
      for (const s of salvati) await cancellaDalDisco(s.filePath);
      return { errore: e instanceof Error ? e.message : 'Allegato non caricato.' };
    }
  }

  const s = await prisma.segnalazioneCanale.create({
    data: {
      canaleId: canale.id,
      autoreId: me.id,
      anonima,
      titolo: titolo.slice(0, 200),
      testo,
      allegati: { create: salvati },
    },
  });

  await avvisa(await gestoriDa(me.id), {
    titolo: `Nuova segnalazione · ${canale.titolo}`,
    testo: `${anonima ? 'Anonima: ' : ''}${s.titolo}`,
    url: `/segnalazioni/${s.id}`,
    tag: `segnalazione-${s.id}`,
  });

  aggiorna(s.id, canale.id);
  redirect(`/segnalazioni/${s.id}`);
}

/**
 * Una risposta: di chi gestisce, o di chi ha segnalato.
 *
 * Chi gestisce risponde a una segnalazione anonima senza sapere a chi: il
 * gestionale la recapita, e il nome resta dov'è.
 */
export async function rispondiSegnalazione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const s = await prisma.segnalazioneCanale.findUnique({
    where: { id: str(fd, 'id') },
    include: { canale: { select: { titolo: true } } },
  });
  if (!s || !vedeSegnalazione(s, me)) return { errore: 'Segnalazione non trovata.' };
  if (s.stato === 'CHIUSA') return { errore: 'La segnalazione è chiusa: per scriverci va riaperta.' };

  const testo = str(fd, 'testo');
  if (!testo) return { errore: 'La risposta è vuota.' };

  // chi ha scritto la segnalazione risponde sempre come autore, anche se modera
  const daGestore = s.autoreId !== me.id;
  const adesso = new Date();

  await prisma.$transaction([
    prisma.rispostaSegnalazione.create({
      data: { segnalazioneId: s.id, autoreId: me.id, daGestore, testo },
    }),
    prisma.segnalazioneCanale.update({
      where: { id: s.id },
      data: daGestore
        ? {
            stato: 'RISPOSTA',
            nuovaPerAutore: true,
            aggiornataIl: adesso,
            lettaIl: s.lettaIl ?? adesso,
          }
        : { nuovaPerGestori: true, aggiornataIl: adesso },
    }),
  ]);

  if (daGestore) {
    await avvisa([s.autoreId], {
      titolo: 'Risposta alla tua segnalazione',
      testo: s.titolo,
      url: `/segnalazioni/${s.id}`,
      tag: `segnalazione-${s.id}`,
    });
  } else {
    await avvisa(await gestoriDa(me.id), {
      titolo: `Segnalazione · ${s.canale.titolo}`,
      testo: `Nuova risposta: ${s.titolo}`,
      url: `/segnalazioni/${s.id}`,
      tag: `segnalazione-${s.id}`,
    });
  }

  aggiorna(s.id, s.canaleId);
  return { ok: 'Risposta inviata.' };
}

/** Chiude o riapre una segnalazione: lo fa chi gestisce. */
export async function chiudiSegnalazione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!gestisceSegnalazioni(me.roles)) return { errore: 'Le segnalazioni le chiude chi le gestisce.' };

  const s = await prisma.segnalazioneCanale.findUnique({
    where: { id: str(fd, 'id') },
    include: { risposte: { where: { daGestore: true }, select: { id: true }, take: 1 } },
  });
  if (!s) return { errore: 'Segnalazione non trovata.' };

  const chiudi = str(fd, 'chiudi') === '1';
  await prisma.segnalazioneCanale.update({
    where: { id: s.id },
    data: chiudi
      ? { stato: 'CHIUSA', chiusaIl: new Date(), nuovaPerGestori: false, nuovaPerAutore: true }
      : // riaperta torna dov'era prima di chiuderla
        { stato: s.risposte.length > 0 ? 'RISPOSTA' : 'LETTA', chiusaIl: null },
  });

  if (chiudi && s.autoreId !== me.id) {
    await avvisa([s.autoreId], {
      titolo: 'Segnalazione chiusa',
      testo: s.titolo,
      url: `/segnalazioni/${s.id}`,
      tag: `segnalazione-${s.id}`,
    });
  }

  aggiorna(s.id, s.canaleId);
  return { ok: chiudi ? 'Segnalazione chiusa.' : 'Segnalazione riaperta.' };
}

/**
 * La segnalazione è davanti agli occhi: si spegne il pallino di chi guarda.
 *
 * Chi gestisce la apre per la prima volta e diventa **letta**: chi l'ha
 * scritta lo vede, e sa che qualcuno l'ha presa in mano. La chiama un
 * componente quando la pagina è davvero sullo schermo, non il render.
 */
export async function segnaSegnalazioneVista(id: string): Promise<void> {
  const me = await requireUser();
  const s = await prisma.segnalazioneCanale.findUnique({ where: { id } });
  if (!s || !vedeSegnalazione(s, me)) return;

  if (s.autoreId === me.id) {
    if (!s.nuovaPerAutore) return;
    await prisma.segnalazioneCanale.update({ where: { id }, data: { nuovaPerAutore: false } });
  } else {
    if (!s.nuovaPerGestori && s.stato !== 'APERTA') return;
    await prisma.segnalazioneCanale.update({
      where: { id },
      data: {
        nuovaPerGestori: false,
        ...(s.stato === 'APERTA' ? { stato: 'LETTA', lettaIl: new Date() } : {}),
      },
    });
  }
  aggiorna(id, s.canaleId);
}
