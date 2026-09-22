import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from './db';
import { avvisa, chiSegueINuovi } from './push';
import { numeroInternazionale } from './contatti';

/**
 * La porta da cui entrano i contatti che arrivano da fuori.
 *
 * Il gestionale non ha un sito suo: ha dei siti collegati, ognuno con la sua
 * chiave, che gli consegnano i moduli «vuoi provare?» compilati da chi li
 * visita. Le regole — cosa serve, cosa si rifiuta, quanti moduli al massimo —
 * stanno qui, una volta sola, qualunque sia il sito che bussa.
 */

// ------------------------------------------------------------------ chiavi

const SIGLA = 'zds';

/** SHA-256 e non bcrypt: la chiave è casuale e lunga, non una parola da indovinare. */
const impronta = (testo: string) => createHash('sha256').update(testo).digest('hex');

/**
 * Una chiave nuova per un sito. Torna in chiaro solo qui: nel database ne resta
 * l'impronta, e chi la perde scollega il sito e ne fa un'altra.
 */
export function nuovaChiaveSito() {
  const id = randomBytes(8).toString('hex');
  const chiave = `${SIGLA}_${id}_${randomBytes(24).toString('base64url')}`;
  return { id, chiave, hash: impronta(chiave), prefisso: `${SIGLA}_${id}` };
}

/**
 * Da una chiave al sito che la usa, oppure niente.
 *
 * Chiave inventata, sito scollegato, forma sbagliata: a chi bussa si risponde
 * sempre allo stesso modo, perché non deve poter capire quanto era vicino.
 */
export async function sitoDaChiave(chiave: string | null) {
  const forma = chiave?.match(new RegExp(`^${SIGLA}_([0-9a-f]{16})_(.+)$`));
  if (!forma) return null;
  const sito = await prisma.sitoCollegato.findUnique({ where: { id: forma[1] } });
  if (!sito) return null;
  const attesa = Buffer.from(sito.hash, 'hex');
  const data = Buffer.from(impronta(chiave!), 'hex');
  return attesa.length === data.length && timingSafeEqual(attesa, data) ? sito : null;
}

// ------------------------------------------------------------------ contatti

export type ContattoInArrivo = {
  nome?: unknown;
  cognome?: unknown;
  telefono?: unknown;
  email?: unknown;
  dataNascita?: unknown;
  zona?: unknown;
  come?: unknown;
  messaggio?: unknown;
  consenso?: unknown;
};

export type EsitoAccoglienza =
  | { ok: true; scartato?: boolean }
  | { ok: false; errore: string };

const testo = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

/** «1998-03-15» a mezzanotte di qui, come tutte le date del gestionale. */
function soloData(v: unknown): Date | null {
  const m = typeof v === 'string' ? v.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Una data di nascita credibile, o niente: un anno nel futuro o un centenario
 * sono una svista, e meglio dirlo subito che scoprirlo al momento della polizza.
 */
export function nascitaCredibile(d: Date | null): boolean {
  if (!d) return false;
  const anni = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return anni >= 5 && anni <= 100;
}

/** L'impronta di un indirizzo: basta a contare i moduli, non a risalire a chi li ha mandati. */
export const improntaIndirizzo = (ip: string | null) =>
  ip ? impronta(`${process.env.SESSION_SECRET ?? ''}:${ip}`).slice(0, 32) : null;

/**
 * Accoglie un contatto arrivato da fuori.
 *
 * Gli errori di chi scrive — il nome mancante, il telefono sbagliato, la data
 * impossibile — tornano indietro con parole sue, perché li correggerà. Il
 * **tetto** invece no: tre moduli all'ora dallo stesso indirizzo, trenta in
 * tutto; oltre si risponde come se fosse andata, e chi manda spam non capisce
 * dove si è fermato.
 */
export async function accogliContatto(
  dati: ContattoInArrivo,
  { ip, sitoId }: { ip: string | null; sitoId: string | null },
): Promise<EsitoAccoglienza> {
  const nome = testo(dati.nome, 80);
  const telefono = testo(dati.telefono, 30);
  const dataNascita = soloData(dati.dataNascita);

  if (!nome) return { ok: false, errore: 'Scrivi come ti chiami.' };
  if (!numeroInternazionale(telefono)) {
    return { ok: false, errore: 'Serve un numero di telefono valido: è lì che ti chiamiamo.' };
  }
  if (!nascitaCredibile(dataNascita)) {
    return { ok: false, errore: 'Controlla la data di nascita: ci serve per la polizza della prima giornata.' };
  }
  if (dati.consenso !== true && dati.consenso !== 'on' && dati.consenso !== 'true') {
    return { ok: false, errore: 'Per poterti richiamare ci serve il tuo consenso all’informativa.' };
  }

  const traccia = improntaIndirizzo(ip);
  const unOraFa = new Date(Date.now() - 60 * 60 * 1000);
  const [daQui, inTutto] = await Promise.all([
    traccia ? prisma.contatto.count({ where: { impronta: traccia, creatoIl: { gte: unOraFa } } }) : 0,
    prisma.contatto.count({ where: { origine: 'SITO', creatoIl: { gte: unOraFa } } }),
  ]);
  if (daQui >= 3 || inTutto >= 30) return { ok: true, scartato: true };

  const contatto = await prisma.contatto.create({
    data: {
      nome,
      cognome: testo(dati.cognome, 80),
      telefono: telefono!,
      email: testo(dati.email, 120)?.toLowerCase() ?? null,
      dataNascita,
      zona: testo(dati.zona, 80),
      comeCiHaConosciuto: testo(dati.come, 80),
      messaggio: testo(dati.messaggio, 1000),
      origine: 'SITO',
      consensoIl: new Date(),
      impronta: traccia,
      sitoId,
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

  return { ok: true };
}
