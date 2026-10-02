import { revalidatePath } from 'next/cache';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CollegamentoSquadra, Prisma } from '@prisma/client';
import { prisma } from './db';
import { UPLOAD_DIR, eliminaAllegato } from './storage';
import { creaMiniatura } from './miniature';
import { identita, manda, profiloNostro, profiloRicevuto, type Profilo } from './federazione';

/**
 * La coda di quello che si manda ai gestionali collegati.
 *
 * Si prova subito; se l'altro non risponde il messaggio resta qui e si ritenta
 * con attese sempre più lunghe. Per ogni collegamento si va in ordine: se il
 * primo non passa, gli altri aspettano, così un «scollega» non arriva prima
 * dell'«accettata» che lo precede.
 */

/** Minuti di attesa dopo il primo, il secondo… tentativo fallito. */
const ATTESE = [1, 5, 15, 60, 180, 360];

/** Messaggi che hanno ancora senso anche a collegamento chiuso. */
const SEMPRE = new Set(['scollega', 'rifiutata']);

export async function accoda(
  collegamentoId: string,
  tipo: string,
  corpo: Prisma.InputJsonValue,
  {
    sostituisci = false,
    chiave,
  }: {
    sostituisci?: boolean;
    /** Sostituisce solo i messaggi dello stesso tipo con questo «id» nel corpo. */
    chiave?: string;
  } = {},
) {
  // un profilo nuovo rende inutile quello vecchio ancora in coda; per le
  // attività, la versione nuova di quella attività
  if (sostituisci || chiave) {
    await prisma.messaggioFederazione.deleteMany({
      where: {
        collegamentoId,
        tipo,
        // solo quelli non ancora tentati: uno che sta fallendo tiene il suo posto nella fila
        ...(chiave ? { corpo: { path: ['id'], equals: chiave }, tentativi: 0 } : {}),
      },
    });
  }
  await prisma.messaggioFederazione.create({ data: { collegamentoId, tipo, corpo } });
  await svuotaCoda(collegamentoId).catch(() => null);
}

let inCorso = false;
let ancora = false;

/** Manda quello che è in coda ed è ora di mandare. */
export async function svuotaCoda(soloCollegamento?: string) {
  // un giro è già in corso: quando finisce ne rifà un altro, così un messaggio
  // appena accodato non aspetta il minuto dopo
  if (inCorso) {
    ancora = true;
    return;
  }
  inCorso = true;
  try {
    let filtro = soloCollegamento;
    do {
      ancora = false;
      await unGiro(filtro);
      // il giro in più è per chi è arrivato nel frattempo: tutti i collegamenti
      filtro = undefined;
    } while (ancora);
  } finally {
    inCorso = false;
  }
}

async function unGiro(soloCollegamento?: string) {
  // tutti quelli in coda, anche quelli che aspettano: il primo di ogni
  // collegamento decide se si può andare avanti
  const inCoda = await prisma.messaggioFederazione.findMany({
    where: soloCollegamento ? { collegamentoId: soloCollegamento } : {},
    orderBy: { creatoIl: 'asc' },
    include: { collegamento: true },
    take: 500,
  });
  const adesso = new Date();
  const bloccati = new Set<string>();
  for (const m of inCoda) {
    if (bloccati.has(m.collegamentoId)) continue;
    if (m.prossimoIl > adesso) {
      // non è ancora ora di ritentarlo, e quelli dopo di lui aspettano
      bloccati.add(m.collegamentoId);
      continue;
    }
    const c = m.collegamento;
    const chiuso = c.stato === 'SCOLLEGATO' || c.stato === 'RIFIUTATO';
    if (chiuso && !SEMPRE.has(m.tipo)) {
      await prisma.messaggioFederazione.delete({ where: { id: m.id } });
      continue;
    }
    const esito = await manda(c.indirizzo, m.tipo, m.corpo);
    if (esito.ok) {
      await prisma.messaggioFederazione.delete({ where: { id: m.id } });
      continue;
    }
    bloccati.add(m.collegamentoId);
    const minuti = ATTESE[Math.min(m.tentativi, ATTESE.length - 1)];
    await prisma.messaggioFederazione.update({
      where: { id: m.id },
      data: {
        tentativi: { increment: 1 },
        prossimoIl: new Date(Date.now() + minuti * 60_000),
        ultimoErrore: esito.errore.slice(0, 500),
      },
    });
  }
}

let avviata = false;

/** Il giro della coda, una volta al minuto, finché il server è acceso. */
export function avviaCodaFederazione() {
  if (avviata || !process.env.DATABASE_URL) return;
  avviata = true;
  // all'avvio: se il dominio è cambiato (INDIRIZZO_PUBBLICO nuovo), leggere
  // la nostra identità la aggiorna e mette in coda il «trasloco» per chi è
  // collegato. Solo se un'identità c'è già: chi non si è mai collegato non ha
  // niente da annunciare, e le chiavi nascono quando servono
  setTimeout(() => {
    prisma.identitaGestionale
      .findUnique({ where: { id: 'io' }, select: { id: true } })
      .then((c) => (c ? identita() : null))
      .then(() => svuotaCoda())
      .catch((e) => console.error('[federazione] avvio:', e));
  }, 15_000).unref();
  setInterval(() => {
    svuotaCoda().catch((e) => console.error('[federazione] coda:', e));
  }, 60_000).unref();
}

/** Il nostro profilo, a tutte le squadre collegate: dopo ogni cambio in «La mia squadra». */
export async function diffondiProfilo() {
  const attivi = await prisma.collegamentoSquadra.findMany({
    where: { stato: 'ATTIVO' },
    select: { id: true },
  });
  if (attivi.length === 0) return;
  const profilo = await profiloNostro();
  for (const c of attivi) {
    await accoda(c.id, 'profilo', { profilo }, { sostituisci: true });
  }
}

const MAX_LOGO = 2_000_000;

/**
 * Il profilo arrivato da un gestionale collegato: si salva, e se il logo è
 * cambiato lo si scarica e lo si mette sulla squadra dell'anagrafica.
 */
export async function salvaProfiloRicevuto(c: CollegamentoSquadra, grezzo: unknown) {
  const profilo = profiloRicevuto(grezzo);
  if (!profilo) return;
  await prisma.collegamentoSquadra.update({
    where: { id: c.id },
    data: { profilo: profilo as unknown as Prisma.InputJsonValue },
  });
  if (c.squadraId) await allineaSquadra(c.squadraId, profilo);
  if (c.squadraId && profilo.logo && profilo.logo !== c.logoVersione) {
    await scaricaLogo({ ...c, profilo: profilo as unknown as Prisma.JsonValue }, profilo).catch(
      () => null,
    );
  }
}

/**
 * La squadra dell'anagrafica segue il profilo che ci mandano: se cambiano nome
 * lo cambia anche lei — è quello che si legge ovunque, sul badge
 * dell'organizzatore e fra gli ospiti — e così città e recapiti, quando li
 * danno. Quello che non ci dicono resta com'era scritto qui.
 */
async function allineaSquadra(squadraId: string, profilo: Profilo) {
  const squadra = await prisma.squadraEsterna.findUnique({ where: { id: squadraId } });
  if (!squadra) return;
  const dati: Prisma.SquadraEsternaUpdateInput = {};
  if (profilo.nome !== squadra.nome) {
    // un'altra squadra con quel nome c'è già: meglio il nome vecchio che due uguali
    const doppione = await prisma.squadraEsterna.findUnique({ where: { nome: profilo.nome } });
    if (!doppione) dati.nome = profilo.nome;
  }
  for (const k of ['citta', 'provincia', 'sito', 'email', 'telefono'] as const) {
    if (profilo[k] && profilo[k] !== squadra[k]) dati[k] = profilo[k];
  }
  if (Object.keys(dati).length === 0) return;
  await prisma.squadraEsterna.update({ where: { id: squadraId }, data: dati });
  // gli inviti portano il nome copiato: si rinominano anche loro
  if (dati.nome) {
    await prisma.squadraOspite
      .updateMany({ where: { squadraId }, data: { nome: profilo.nome } })
      .catch(() => null);
  }
  revalidatePath('/admin/squadre', 'layout');
  revalidatePath('/admin/collegamenti');
  revalidatePath('/calendario', 'layout');
}

/** Scarica il logo di una squadra collegata e lo mette sulla sua scheda. */
export async function scaricaLogo(c: CollegamentoSquadra, profilo?: Profilo) {
  if (!c.squadraId) return;
  const r = await fetch(`${c.indirizzo}/api/federazione/logo`, {
    signal: AbortSignal.timeout(15_000),
    redirect: 'error',
    cache: 'no-store',
  });
  if (!r.ok) return;
  const tipo = r.headers.get('content-type') ?? '';
  const est = tipo.includes('png') ? 'png' : tipo.includes('jpeg') ? 'jpg' : null;
  if (!est) return;
  const dati = Buffer.from(await r.arrayBuffer());
  if (dati.length === 0 || dati.length > MAX_LOGO) return;

  const cartella = path.join(UPLOAD_DIR, 'squadre');
  await mkdir(cartella, { recursive: true });
  const nome = `logo-${randomUUID()}.${est}`;
  await writeFile(path.join(cartella, nome), dati);

  const squadra = await prisma.squadraEsterna.findUnique({ where: { id: c.squadraId } });
  if (squadra?.logoPath) await eliminaAllegato(squadra.logoPath).catch(() => null);
  await prisma.$transaction([
    prisma.squadraEsterna.update({
      where: { id: c.squadraId },
      data: { logoPath: path.posix.join('squadre', nome) },
    }),
    prisma.collegamentoSquadra.update({
      where: { id: c.id },
      data: { logoVersione: (profilo ?? profiloRicevuto(c.profilo))?.logo ?? null },
    }),
  ]);
  await creaMiniatura(path.posix.join('squadre', nome));
}
