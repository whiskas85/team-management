import { randomUUID } from 'crypto';
import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const TIPI_AMMESSI = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export type FileSalvato = {
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

/**
 * Regole diverse da quelle di sempre, per chi carica altro.
 *
 * Il tipo dichiarato dal browser non basta a riconoscere un `.md`: Windows non
 * sa cos'è e lo consegna con il tipo vuoto, o con `application/octet-stream`.
 * Chiedere il tipo giusto vorrebbe dire rifiutare un file corretto per un
 * difetto del computer di chi lo manda, quindi qui si guarda **l'estensione**
 * e il tipo lo decidiamo noi: è anche l'unico modo perché il `Content-Type`
 * con cui poi lo serviamo sia una nostra scelta e non una stringa arrivata da
 * fuori.
 */
export type RegoleFile = {
  /** Estensioni ammesse, punto compreso, minuscole. */
  estensioni: string[];
  /** Il tipo con cui salvarlo, deciso da noi a partire dall'estensione. */
  tipoDa: (estensione: string) => string;
  maxBytes?: number;
  /** Cosa si dice a chi sbaglia formato, con parole sue. */
  spiegazione: string;
};

/** Salva un allegato dentro UPLOAD_DIR/<cartella> con nome casuale. */
export async function salvaAllegato(
  file: File,
  cartella: string,
  regole?: RegoleFile,
): Promise<FileSalvato> {
  if (!file || file.size === 0) throw new Error('Nessun file selezionato.');

  const tetto = regole?.maxBytes ?? MAX_FILE_BYTES;
  if (file.size > tetto) {
    throw new Error(`File troppo grande: massimo ${Math.round(tetto / 1024 / 1024)} MB.`);
  }

  const estensione = path.extname(file.name).toLowerCase();
  if (regole) {
    if (!regole.estensioni.includes(estensione)) throw new Error(regole.spiegazione);
  } else if (!TIPI_AMMESSI.has(file.type)) {
    throw new Error('Formato non ammesso. Usa PDF, JPG, PNG o WEBP.');
  }

  const dir = path.join(UPLOAD_DIR, cartella);
  await mkdir(dir, { recursive: true });

  const ext = estensione.slice(0, 10) || '.bin';
  const nomeSuDisco = `${randomUUID()}${ext}`;
  const assoluto = path.join(dir, nomeSuDisco);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(assoluto, buffer);

  return {
    // memorizziamo il percorso relativo: il volume può cambiare mount point
    filePath: path.posix.join(cartella, nomeSuDisco),
    fileName: file.name.slice(0, 200),
    mimeType: regole ? regole.tipoDa(estensione) : file.type,
    fileSize: file.size,
  };
}

/** Percorso assoluto a partire da quello memorizzato, con guardia contro il path traversal. */
export function percorsoAssoluto(relativo: string) {
  const assoluto = path.resolve(UPLOAD_DIR, relativo);
  if (!assoluto.startsWith(path.resolve(UPLOAD_DIR))) {
    throw new Error('Percorso file non valido.');
  }
  return assoluto;
}

export async function eliminaAllegato(relativo: string) {
  try {
    await unlink(percorsoAssoluto(relativo));
  } catch {
    /* file già assente: non è un errore bloccante */
  }
}
