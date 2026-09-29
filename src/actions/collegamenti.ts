'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { str, type StatoForm } from '@/lib/form';
import {
  chiediIdentita,
  identita,
  manda,
  normalizzaIndirizzo,
  profiloDi,
  profiloNostro,
  profiloRicevuto,
  type Profilo,
} from '@/lib/federazione';
import { accoda, scaricaLogo, svuotaCoda } from '@/lib/federazione-coda';

const GIORNI_LINK = 7;

async function soloAdmin() {
  const me = await requireUser();
  return isAdmin(me.roles) ? me : null;
}

function aggiorna() {
  revalidatePath('/admin/collegamenti');
  revalidatePath('/admin/squadre', 'layout');
  // il pallino delle richieste sta nel menu
  revalidatePath('/', 'layout');
}

/** «Collega a una esistente» o «crea nuova»: la squadra dell'anagrafica. */
async function squadraScelta(
  fd: FormData,
  profilo: Profilo,
): Promise<{ id: string } | { errore: string }> {
  if (str(fd, 'scelta') === 'esistente') {
    const id = str(fd, 'squadraId');
    const s = id
      ? await prisma.squadraEsterna.findUnique({ where: { id }, include: { collegamento: true } })
      : null;
    if (!s) return { errore: 'Scegli la squadra dell’anagrafica a cui collegarla.' };
    if (s.collegamento && s.collegamento.stato === 'ATTIVO') {
      return { errore: `${s.nome} è già collegata a un altro gestionale.` };
    }
    return { id: s.id };
  }
  const doppione = await prisma.squadraEsterna.findUnique({ where: { nome: profilo.nome } });
  if (doppione) {
    return {
      errore: `C’è già una squadra che si chiama «${profilo.nome}»: scegli «collega a una esistente».`,
    };
  }
  const nuova = await prisma.squadraEsterna.create({
    data: {
      nome: profilo.nome,
      citta: profilo.citta,
      provincia: profilo.provincia,
      sito: profilo.sito,
      email: profilo.email,
      telefono: profilo.telefono,
      note: profilo.descrizione,
      stato: 'ATTIVA',
    },
  });
  return { id: nuova.id };
}

/** Un collegamento vecchio sulla stessa squadra lascia il posto al nuovo. */
async function liberaSquadra(squadraId: string, tranne: string) {
  await prisma.collegamentoSquadra.updateMany({
    where: { squadraId, id: { not: tranne } },
    data: { squadraId: null },
  });
}

// ------------------------------------------------------------------ link

export async function creaLinkCollegamento(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await soloAdmin();
  if (!me) return { errore: 'Solo l’admin condivide il profilo della squadra.' };
  // prima di dare un link bisogna sapere chi siamo: le chiavi nascono qui
  await identita();
  await prisma.linkCollegamento.create({
    data: {
      token: randomBytes(18).toString('base64url'),
      creatoDaId: me.id,
      scadeIl: new Date(Date.now() + GIORNI_LINK * 86_400_000),
    },
  });
  aggiorna();
  return { ok: `Link pronto: vale ${GIORNI_LINK} giorni. Mandalo, o fai inquadrare il QR.` };
}

export async function revocaLinkCollegamento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  if (!(await soloAdmin())) return { errore: 'Solo l’admin gestisce i link.' };
  await prisma.linkCollegamento.update({
    where: { id: str(fd, 'id') },
    data: { revocatoIl: new Date() },
  });
  aggiorna();
  return { ok: 'Link revocato: chi lo apre adesso non può più chiedere il collegamento.' };
}

/** Da un link di collegamento: l'indirizzo del gestionale e il gettone. */
export async function leggiLink(link: string) {
  try {
    const url = new URL(link.trim());
    const indirizzo = normalizzaIndirizzo(url.origin);
    const m = url.pathname.match(/^\/collega\/([A-Za-z0-9_-]{10,})\/?$/);
    if (!indirizzo || !m) return null;
    return { indirizzo, token: m[1] };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- richieste

/** Dal link di un'altra squadra: si manda la richiesta di collegamento. */
export async function mandaRichiestaCollegamento(
  _prev: StatoForm,
  fd: FormData,
): Promise<StatoForm> {
  const me = await soloAdmin();
  if (!me) return { errore: 'Solo l’admin collega la squadra ad altri gestionali.' };
  const link = await leggiLink(str(fd, 'link'));
  if (!link) return { errore: 'Il link non è un link di collegamento.' };

  const io = await identita();
  if (link.indirizzo === io.indirizzo) {
    return { errore: 'Questo link è del nostro gestionale: va mandato all’altra squadra.' };
  }
  const loro = await chiediIdentita(link.indirizzo);
  if (!loro.ok) return { errore: `Il loro gestionale ${loro.errore}.` };

  const squadra = await squadraScelta(fd, loro.dati.profilo);
  if ('errore' in squadra) return squadra;

  const esito = await manda<{ stato?: string; profilo?: unknown }>(link.indirizzo, 'richiesta', {
    token: link.token,
    chiavePubblica: io.chiavePubblica,
    profilo: await profiloNostro(),
  });
  if (!esito.ok) return { errore: `Richiesta non arrivata: ${esito.errore}.` };

  const attivo = esito.dati.stato === 'ATTIVO';
  const profilo = profiloRicevuto(esito.dati.profilo) ?? loro.dati.profilo;
  const dati = {
    chiavePubblica: loro.dati.chiavePubblica,
    stato: attivo ? ('ATTIVO' as const) : ('RICHIESTO' as const),
    squadraId: squadra.id,
    profilo: profilo as unknown as Prisma.InputJsonValue,
    richiestoIl: new Date(),
    attivoDal: attivo ? new Date() : null,
    chiusoIl: null,
    decisoDa: me.id,
  };
  const c = await prisma.collegamentoSquadra.upsert({
    where: { indirizzo: link.indirizzo },
    create: { indirizzo: link.indirizzo, ...dati },
    update: dati,
  });
  await liberaSquadra(squadra.id, c.id);
  await scaricaLogo(c, profilo).catch(() => null);
  aggiorna();
  redirect('/admin/collegamenti?inviata=1');
}

/** Una richiesta arrivata: si sceglie la squadra dell'anagrafica e si accetta. */
export async function accettaRichiesta(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await soloAdmin();
  if (!me) return { errore: 'Solo l’admin accetta i collegamenti.' };
  const c = await prisma.collegamentoSquadra.findUnique({ where: { id: str(fd, 'id') } });
  if (!c || c.stato !== 'DA_ACCETTARE') return { errore: 'La richiesta non c’è più.' };

  const profilo = profiloDi(c);
  const squadra = await squadraScelta(fd, profilo);
  if ('errore' in squadra) return squadra;

  const aggiornato = await prisma.collegamentoSquadra.update({
    where: { id: c.id },
    data: {
      stato: 'ATTIVO',
      squadraId: squadra.id,
      attivoDal: new Date(),
      chiusoIl: null,
      decisoDa: me.id,
    },
  });
  await liberaSquadra(squadra.id, c.id);
  await scaricaLogo(aggiornato, profilo).catch(() => null);
  await accoda(c.id, 'accettata', { profilo: await profiloNostro() } as Prisma.InputJsonValue);
  aggiorna();
  return { ok: `Collegati con ${profilo.nome}.` };
}

export async function rifiutaRichiesta(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await soloAdmin();
  if (!me) return { errore: 'Solo l’admin decide sui collegamenti.' };
  const c = await prisma.collegamentoSquadra.findUnique({ where: { id: str(fd, 'id') } });
  if (!c || c.stato !== 'DA_ACCETTARE') return { errore: 'La richiesta non c’è più.' };
  await prisma.collegamentoSquadra.update({
    where: { id: c.id },
    data: { stato: 'RIFIUTATO', chiusoIl: new Date(), decisoDa: me.id },
  });
  await accoda(c.id, 'rifiutata', {});
  aggiorna();
  return { ok: 'Richiesta rifiutata.' };
}

/**
 * Scollega (o ritira una richiesta mandata): da qui non passa più niente.
 * La squadra resta nell'anagrafica con tutto quello che aveva.
 */
export async function scollegaSquadra(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await soloAdmin();
  if (!me) return { errore: 'Solo l’admin toglie i collegamenti.' };
  const c = await prisma.collegamentoSquadra.findUnique({ where: { id: str(fd, 'id') } });
  if (!c || (c.stato !== 'ATTIVO' && c.stato !== 'RICHIESTO')) {
    return { errore: 'Il collegamento non è attivo.' };
  }
  await prisma.$transaction([
    prisma.messaggioFederazione.deleteMany({ where: { collegamentoId: c.id } }),
    prisma.collegamentoSquadra.update({
      where: { id: c.id },
      data: { stato: 'SCOLLEGATO', chiusoIl: new Date(), decisoDa: me.id },
    }),
  ]);
  await accoda(c.id, 'scollega', {});
  aggiorna();
  return {
    ok: c.stato === 'RICHIESTO' ? 'Richiesta ritirata.' : `Scollegati da ${profiloDi(c).nome}.`,
  };
}

/** Quello che non è arrivato si riprova subito, senza aspettare il prossimo giro. */
export async function riprovaInvio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  if (!(await soloAdmin())) return { errore: 'Solo l’admin gestisce i collegamenti.' };
  const collegamentoId = str(fd, 'id');
  await prisma.messaggioFederazione.updateMany({
    where: { collegamentoId },
    data: { prossimoIl: new Date() },
  });
  await svuotaCoda(collegamentoId);
  const resta = await prisma.messaggioFederazione.findFirst({
    where: { collegamentoId },
    orderBy: { creatoIl: 'asc' },
  });
  aggiorna();
  return resta
    ? { errore: `Ancora niente: ${resta.ultimoErrore ?? 'non risponde'}.` }
    : { ok: 'Arrivato.' };
}
