'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { inSquadra } from '@/lib/domain';
import { data, enumVal, str, strOpt, bool, type StatoForm } from '@/lib/form';
import { eAperto, loRiguarda, puoFareSondaggi, quantoManca, risultato } from '@/lib/sondaggi';
import { avvisaPersona } from '@/lib/avvisi';

const TIPI = ['TESTO', 'DATA', 'PRESENZE'] as const;
const DESTINATARI = ['SQUADRA', 'NUOVI', 'TUTTI'] as const;

function aggiorna(id?: string) {
  revalidatePath('/sondaggi');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/sondaggi/${id}`);
}

/**
 * Crea un sondaggio e lo annuncia a chi riguarda.
 *
 * Le opzioni arrivano come righe del modulo: il testo di ognuna e, per le
 * domande sulle date, il giorno e l'ora. Le righe vuote si buttano — chi
 * compila lascia sempre un paio di caselle in bianco in fondo, e trasformarle
 * in opzioni «senza nome» renderebbe il sondaggio illeggibile.
 */
export async function creaSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) {
    return { errore: 'Solo l’admin e chi schiera la squadra possono aprire un sondaggio.' };
  }

  const domanda = str(fd, 'domanda');
  if (!domanda) return { errore: 'Scrivi la domanda: è quello che la gente legge nella notifica.' };

  const tipo = enumVal(fd, 'tipo', TIPI, 'TESTO');
  const scadeIl = data(fd, 'scadeIl');
  if (scadeIl && scadeIl <= new Date()) {
    return { errore: 'La scadenza è già passata: mettila più avanti, o lasciala vuota.' };
  }

  const testi = fd.getAll('opzioneTesto').map((v) => v.toString().trim());
  const quandi = fd.getAll('opzioneQuando').map((v) => v.toString().trim());

  const opzioni = testi
    .map((testo, i) => ({
      testo,
      quando: quandi[i] ? new Date(quandi[i]) : null,
      ordine: i,
    }))
    // una riga conta se ha un testo o una data: sulle domande di data il testo
    // si scrive da sé, e chiederlo due volte sarebbe una pignoleria
    .filter((o) => o.testo !== '' || o.quando !== null)
    .map((o) => ({
      ...o,
      testo: o.testo || (o.quando ? o.quando.toLocaleString('it-IT') : ''),
    }));

  if (opzioni.length < 2) {
    return { errore: 'Servono almeno due risposte possibili: con una sola non c’è niente da scegliere.' };
  }

  const sondaggio = await prisma.sondaggio.create({
    data: {
      domanda,
      dettaglio: strOpt(fd, 'dettaglio'),
      tipo,
      destinatari: enumVal(fd, 'destinatari', DESTINATARI, 'SQUADRA'),
      sceltaMultipla: bool(fd, 'sceltaMultipla'),
      scadeIl,
      creatoDaId: me.id,
      opzioni: { create: opzioni },
    },
  });

  await annuncia(sondaggio.id);

  aggiorna(sondaggio.id);
  redirect(`/sondaggi/${sondaggio.id}`);
}

/**
 * L'annuncio a chi riguarda, con dentro quanto manca.
 *
 * Il conto alla rovescia nella notifica è una fotografia: dice «mancano 3
 * giorni» nel momento in cui parte, e non si aggiorna più. È il motivo per cui
 * dentro il gestionale il tempo scorre davvero — lì la notifica ci porta.
 *
 * Non si avvisa chi l'ha scritto: sa già cosa ha chiesto.
 */
async function annuncia(id: string) {
  const s = await prisma.sondaggio.findUnique({ where: { id } });
  if (!s) return;

  const persone = await prisma.user.findMany({
    where: { stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] } },
    select: { id: true, stato: true },
  });

  const manca = quantoManca(s.scadeIl);
  const dove = `/sondaggi/${s.id}`;

  await Promise.all(
    persone
      .filter((p) => p.id !== s.creatoDaId && loRiguarda(s.destinatari, p.stato))
      .map((p) =>
        avvisaPersona(p.id, {
          titolo: 'C’è una domanda per te',
          testo: manca ? `${s.domanda} · mancano ${manca}` : s.domanda,
          url: dove,
          tag: `sondaggio-${s.id}`,
          whatsapp: `Zero Dark Ops — c’è una domanda per te

${s.domanda}${s.dettaglio ? `\n${s.dettaglio}` : ''}
${manca ? `\nSi vota entro ${manca}.` : ''}
Rispondi dal gestionale, in «Sondaggi».`,
        }),
      ),
  );
}

/**
 * Il voto di una persona.
 *
 * **Si riscrive tutto ogni volta.** Votare di nuovo cancella le scelte di
 * prima e mette quelle nuove: cambiare idea è normale — uno scopre di essere
 * libero anche sabato — e la differenza fra «ha cambiato idea» e «ha votato
 * due volte» non la deve fare chi legge il risultato.
 */
export async function vota(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const sondaggioId = str(fd, 'sondaggioId');

  const s = await prisma.sondaggio.findUnique({
    where: { id: sondaggioId },
    include: { opzioni: { select: { id: true } } },
  });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (!loRiguarda(s.destinatari, me.stato)) return { errore: 'Questo sondaggio non è per te.' };
  if (!eAperto(s)) return { errore: 'Il sondaggio è chiuso: le risposte non si cambiano più.' };

  const scelte = fd
    .getAll('opzione')
    .map((v) => v.toString())
    .filter((id) => s.opzioni.some((o) => o.id === id));

  if (scelte.length === 0) return { errore: 'Scegli almeno una risposta.' };
  if (!s.sceltaMultipla && scelte.length > 1) {
    return { errore: 'Su questa domanda si sceglie una risposta sola.' };
  }

  await prisma.$transaction([
    prisma.votoSondaggio.deleteMany({ where: { sondaggioId, userId: me.id } }),
    prisma.votoSondaggio.createMany({
      data: scelte.map((opzioneId) => ({ sondaggioId, opzioneId, userId: me.id })),
    }),
  ]);

  aggiorna(sondaggioId);
  return { ok: 'Risposta registrata. Puoi cambiarla finché il sondaggio è aperto.' };
}

/** Chiude un sondaggio prima della scadenza: la decisione è già presa. */
export async function chiudiSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) return { errore: 'Non puoi chiudere i sondaggi.' };

  const id = str(fd, 'id');
  const s = await prisma.sondaggio.findUnique({ where: { id } });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (s.chiusoIl) return { errore: 'Era già chiuso.' };

  await prisma.sondaggio.update({ where: { id }, data: { chiusoIl: new Date() } });

  aggiorna(id);
  return { ok: 'Sondaggio chiuso: resta nello storico con il suo risultato.' };
}

/** Riapre un sondaggio chiuso per sbaglio, se la scadenza non è passata. */
export async function riapriSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) return { errore: 'Non puoi riaprire i sondaggi.' };

  const id = str(fd, 'id');
  const s = await prisma.sondaggio.findUnique({ where: { id } });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (s.scadeIl && s.scadeIl <= new Date()) {
    return { errore: 'La scadenza è passata: per riaprirlo spostala più avanti.' };
  }

  await prisma.sondaggio.update({ where: { id }, data: { chiusoIl: null } });
  aggiorna(id);
  return { ok: 'Sondaggio riaperto.' };
}

export async function eliminaSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) return { errore: 'Non puoi eliminare i sondaggi.' };

  const id = str(fd, 'id');
  const s = await prisma.sondaggio.findUnique({ where: { id } });
  if (!s) return { errore: 'Sondaggio non trovato.' };

  await prisma.sondaggio.delete({ where: { id } });
  revalidatePath('/sondaggi');
  revalidatePath('/dashboard');
  redirect('/sondaggi');
}

/**
 * Dal sondaggio nasce l'attività.
 *
 * È il punto di tutto: la domanda serviva a decidere, e quello che si decide
 * finisce nel calendario senza ricopiarlo a mano. Dalla data che ha vinto
 * nasce l'attività; da un sondaggio sulle presenze nasce con dentro **chi ha
 * detto di esserci**, già segnato.
 *
 * L'attività nasce in bozza, sempre: le manca tutto il resto — il campo, la
 * quota, chi ne risponde — e rilasciarla senza guardarla vorrebbe dire
 * mandare alla squadra una giornata a metà.
 */
export async function creaEventoDaSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) return { errore: 'Non puoi creare attività da un sondaggio.' };

  const id = str(fd, 'id');
  const s = await prisma.sondaggio.findUnique({
    where: { id },
    include: {
      opzioni: { include: { voti: { select: { userId: true } } }, orderBy: { ordine: 'asc' } },
    },
  });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (s.eventoId) return { errore: 'Da questo sondaggio è già nata un’attività.' };

  const esito = risultato(s.opzioni);
  // si può forzare quale opzione vale, e serve: a pari merito decide una
  // persona, non il gestionale
  const sceltaId = strOpt(fd, 'opzioneId') ?? esito.vincitrice;
  const scelta = s.opzioni.find((o) => o.id === sceltaId);
  if (!scelta) {
    return {
      errore: esito.pari
        ? 'Due risposte sono a pari merito: scegli tu quale vale.'
        : 'Nessuno ha ancora votato: non c’è una risposta da cui partire.',
    };
  }

  const inizio = scelta.quando ?? s.scadeIl ?? new Date();

  const evento = await prisma.event.create({
    data: {
      titolo: str(fd, 'titolo') || s.domanda,
      descrizione: s.dettaglio,
      inizio,
      fine: scelta.fino,
      status: 'CREATA',
      createdById: me.id,
      stagioneId: (await prisma.stagione.findFirst({ where: { corrente: true } }))?.id ?? null,
    },
  });

  /*
   * Chi ha detto di esserci entra già segnato.
   *
   * Solo sui sondaggi di presenza, e solo chi ha votato l'opzione scelta: su
   * una domanda di data, aver detto «posso sabato» non vuol dire essersi
   * iscritti — vuol dire che quel giorno era libero.
   */
  if (s.tipo === 'PRESENZE') {
    const chi = scelta.voti.map((v) => v.userId);
    if (chi.length > 0) {
      await prisma.eventRsvp.createMany({
        data: chi.map((userId) => ({ eventId: evento.id, userId, status: 'PRESENTE' as const })),
        skipDuplicates: true,
      });
    }
  }

  await prisma.sondaggio.update({
    where: { id },
    data: { eventoId: evento.id, chiusoIl: s.chiusoIl ?? new Date() },
  });

  aggiorna(id);
  revalidatePath('/calendario');
  redirect(`/calendario/${evento.id}`);
}

/** Chi ha votato cosa: lo vede chi ha fatto la domanda. */
export async function chiHaVotato(sondaggioId: string) {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) return null;

  const voti = await prisma.votoSondaggio.findMany({
    where: { sondaggioId },
    select: {
      opzioneId: true,
      utente: { select: { id: true, nome: true, cognome: true, callsign: true, stato: true } },
    },
  });

  return voti.map((v) => ({
    opzioneId: v.opzioneId,
    nome: v.utente.callsign ?? `${v.utente.nome} ${v.utente.cognome}`,
    diSquadra: inSquadra(v.utente.stato),
  }));
}
