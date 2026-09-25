import type {
  DestinatariSondaggio,
  FirmaSegnalazione,
  Prisma,
  Role,
  StatoOperatore,
  StatoSegnalazioneCanale,
} from '@prisma/client';
import { prisma } from './db';
import { puoModerareChat, inSquadra, type Tono } from './domain';
import { nomeCompleto } from './format';
import { maniglia } from './note';
import { paginaPersona } from './pagina-persona';
import { REGOLE_ALLEGATO_BACHECA } from './bacheche';
import type { RegoleFile } from './storage';
import type { Menzioni } from '@/components/Markdown';
import type { VoceSegnalazione } from '@/components/ElencoSegnalazioni';

/**
 * I canali di segnalazione: un posto per raccontare una cosa a chi la gestisce.
 *
 * **Le segnalazioni le leggono solo l'admin e i moderatori**, e chi le ha
 * scritte vede solo le sue. Non è una bacheca: nessun altro sa che ci sono.
 *
 * **Anonima vuol dire che il nome non si vede, non che non c'è.** Chi ha
 * scritto resta legato alla segnalazione — è l'unico modo per fargli arrivare
 * la risposta — ma il gestionale non lo mostra a nessuno, admin compreso.
 */

/** Chi gestisce le segnalazioni: l'admin e chi modera. */
export const gestisceSegnalazioni = (roles: Role[]) => puoModerareChat(roles);

/** I pubblici di cui fa parte chi ha questo stato. */
export const pubbliciPer = (stato: StatoOperatore): DestinatariSondaggio[] =>
  inSquadra(stato) ? ['SQUADRA', 'TUTTI'] : ['NUOVI', 'TUTTI'];

/**
 * I canali che questa persona vede: quelli attivi rivolti a lei. Chi gestisce
 * li vede tutti, e l'admin anche quelli spenti — per riaccenderli.
 */
export function filtroCanali(u: {
  stato: StatoOperatore;
  roles: Role[];
}): Prisma.CanaleSegnalazioniWhereInput {
  if (u.roles.includes('ADMIN')) return {};
  if (gestisceSegnalazioni(u.roles)) return { attivo: true };
  return { attivo: true, pubblico: { in: pubbliciPer(u.stato) } };
}

/** Si può segnalare in questo canale. */
export const puoSegnalareIn = (
  c: { attivo: boolean; pubblico: DestinatariSondaggio },
  u: { stato: StatoOperatore; roles: Role[] },
) =>
  c.attivo && (pubbliciPer(u.stato).includes(c.pubblico) || gestisceSegnalazioni(u.roles));

/** Chi può aprire una segnalazione: chi l'ha scritta e chi gestisce. */
export const vedeSegnalazione = (
  s: { autoreId: string },
  u: { id: string; roles: Role[] },
) => s.autoreId === u.id || gestisceSegnalazioni(u.roles);

export const etichettaStatoSegnalazione: Record<StatoSegnalazioneCanale, string> = {
  APERTA: 'Aperta',
  LETTA: 'Letta',
  RISPOSTA: 'Risposta',
  CHIUSA: 'Chiusa',
};

export const tonoStatoSegnalazione: Record<StatoSegnalazioneCanale, Tono> = {
  APERTA: 'warn',
  LETTA: 'info',
  RISPOSTA: 'ok',
  CHIUSA: 'neutro',
};

export const etichettaFirma: Record<FirmaSegnalazione, string> = {
  NOMINALE: 'Col nome',
  ANONIMA: 'Anonime',
  A_SCELTA: 'Col nome o anonime',
};

/**
 * Foto e documenti: gli stessi formati della bacheca, ma più leggeri — ne
 * partono diversi insieme, e tutti nella stessa richiesta.
 */
export const REGOLE_ALLEGATO_SEGNALAZIONE: RegoleFile = {
  ...REGOLE_ALLEGATO_BACHECA,
  maxBytes: 10 * 1024 * 1024,
};
/** Il peso di tutti gli allegati di una segnalazione insieme. */
export const MAX_ALLEGATI_BYTES = 20 * 1024 * 1024;

export const indirizzoAllegatoSegnalazione = (id: string) => `/api/segnalazioni/allegati/${id}`;

/**
 * Le persone da richiamare con la chiocciola, e come si mostrano.
 *
 * Si possono nominare tutti: una segnalazione parla spesso di qualcuno. Ma
 * **nominare qui non avvisa nessuno** — chi è nominato in una segnalazione
 * non deve saperlo da una notifica.
 */
export async function personeCitabili(me: {
  id: string;
  stato: StatoOperatore;
  roles: Role[];
}): Promise<{
  persone: { id: string; maniglia: string; nome: string }[];
  menzioni: Menzioni;
}> {
  const tutte = await prisma.user.findMany({
    where: { stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, cognome: true, callsign: true, stato: true },
  });
  const persone = tutte.map((p) => ({
    id: p.id,
    maniglia: maniglia(p),
    nome: nomeCompleto(p),
    href: paginaPersona(me, p),
  }));
  const menzioni: Menzioni = Object.fromEntries(
    persone.map((p) => [
      p.maniglia,
      p.href ? { nome: p.nome, href: p.href, persona: true } : p.nome,
    ]),
  );
  return { persone: persone.map(({ id, maniglia, nome }) => ({ id, maniglia, nome })), menzioni };
}

/** Chi riceve gli avvisi di una segnalazione: chi gestisce, tranne chi l'ha scritta. */
export async function gestoriDa(tranne: string): Promise<string[]> {
  const gestori = await prisma.user.findMany({
    where: {
      id: { not: tranne },
      stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] },
      roles: { hasSome: ['ADMIN', 'MODERATORE'] },
    },
    select: { id: true },
  });
  return gestori.map((g) => g.id);
}

/** Quello che serve per mostrare una segnalazione in elenco. */
export const includiVoce = {
  canale: { select: { titolo: true } },
  autore: { select: { nome: true, cognome: true, callsign: true } },
  _count: { select: { risposte: true } },
} satisfies Prisma.SegnalazioneCanaleInclude;

type RigaVoce = Prisma.SegnalazioneCanaleGetPayload<{ include: typeof includiVoce }>;

/**
 * Una segnalazione come la vede chi guarda: il nome di chi l'ha scritta solo
 * se non è anonima e non è la sua, il pallino su quello che è nuovo per lui.
 */
export function inVoce(s: RigaVoce, me: { id: string }): VoceSegnalazione {
  const mia = s.autoreId === me.id;
  return {
    id: s.id,
    titolo: s.titolo,
    stato: s.stato,
    anonima: s.anonima,
    aggiornataIl: s.aggiornataIl,
    canale: s.canale.titolo,
    chi: s.anonima || mia ? null : nomeCompleto(s.autore),
    nuova: mia ? s.nuovaPerAutore : s.nuovaPerGestori,
    risposte: s._count.risposte,
  };
}
