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

/** Salva un allegato dentro UPLOAD_DIR/<cartella> con nome casuale. */
export async function salvaAllegato(file: File, cartella: string): Promise<FileSalvato> {
  if (!file || file.size === 0) throw new Error('Nessun file selezionato.');
  if (file.size > MAX_FILE_BYTES) throw new Error('File troppo grande: massimo 10 MB.');
  if (!TIPI_AMMESSI.has(file.type)) {
    throw new Error('Formato non ammesso. Usa PDF, JPG, PNG o WEBP.');
  }

  const dir = path.join(UPLOAD_DIR, cartella);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name).toLowerCase().slice(0, 10) || '.bin';
  const nomeSuDisco = `${randomUUID()}${ext}`;
  const assoluto = path.join(dir, nomeSuDisco);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(assoluto, buffer);

  return {
    // memorizziamo il percorso relativo: il volume può cambiare mount point
    filePath: path.posix.join(cartella, nomeSuDisco),
    fileName: file.name.slice(0, 200),
    mimeType: file.type,
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
