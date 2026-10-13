import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { readFile, unlink, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import sharp from 'sharp';
import { prisma } from './db';

const esegui = promisify(execFile);

/**
 * L'alleggerimento dei file che si caricano: lo scopo è tenere il disco
 * piccolo.
 *
 * - **PDF**: Ghostscript li riscrive con le immagini a 150 punti per pollice
 *   (le impostazioni «ebook»): un certificato scansionato a 600 dpi da 4 MB
 *   diventa poche centinaia di KB e si legge uguale, a schermo e stampato.
 * - **Foto** (JPG, PNG, WebP): raddrizzate secondo l'EXIF, rimpicciolite a
 *   2400 pixel sul lato lungo se più grandi, ricompresse. I dati EXIF (posizione
 *   GPS compresa) se ne vanno: sono peso, e non sono affar nostro.
 *
 * **Si tiene il risultato solo se è più piccolo davvero** (almeno il 5%): un
 * PDF già ottimizzato ripassato da Ghostscript a volte cresce, e allora resta
 * com'era. Se qualcosa va storto — un PDF protetto, un file rovinato — resta
 * l'originale: alleggerire è un di più, non deve mai far perdere un file.
 */

export const ALLEGGERIBILI = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

/** Lato lungo massimo di una foto, in pixel. */
const LATO_MAX = 2400;

let versioneGs: string | null | undefined;

/** La versione di Ghostscript, o nullo se sul server non c'è. */
export async function ghostscript(): Promise<string | null> {
  if (versioneGs !== undefined) return versioneGs;
  try {
    const { stdout } = await esegui('gs', ['--version'], { timeout: 5000 });
    versioneGs = stdout.trim() || null;
  } catch {
    versioneGs = null;
  }
  return versioneGs;
}

async function pdf(buffer: Buffer): Promise<Buffer | null> {
  if (!(await ghostscript())) return null;
  const base = path.join(os.tmpdir(), `alleggerisci-${randomUUID()}`);
  const dentro = `${base}-in.pdf`;
  const fuori = `${base}-out.pdf`;
  try {
    await writeFile(dentro, buffer);
    await esegui(
      'gs',
      [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.5',
        '-dPDFSETTINGS=/ebook',
        '-dDetectDuplicateImages=true',
        '-dCompressFonts=true',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        '-dSAFER',
        `-sOutputFile=${fuori}`,
        dentro,
      ],
      { timeout: 90_000 },
    );
    const nuovo = await readFile(fuori);
    // un PDF vero comincia così: tutto il resto è un errore travestito
    return nuovo.subarray(0, 5).toString() === '%PDF-' ? nuovo : null;
  } catch {
    return null;
  } finally {
    await unlink(dentro).catch(() => null);
    await unlink(fuori).catch(() => null);
  }
}

async function foto(buffer: Buffer, tipo: string): Promise<Buffer | null> {
  try {
    const immagine = sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: LATO_MAX, height: LATO_MAX, fit: 'inside', withoutEnlargement: true });
    if (tipo === 'image/jpeg')
      return await immagine.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    if (tipo === 'image/png') {
      return await immagine
        .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 90 })
        .toBuffer();
    }
    if (tipo === 'image/webp') return await immagine.webp({ quality: 80 }).toBuffer();
    return null;
  } catch {
    return null;
  }
}

/** Il file alleggerito, se ne vale la pena; se no quello di prima. */
export async function alleggerisci(
  buffer: Buffer,
  tipo: string,
): Promise<{ buffer: Buffer; risparmiati: number }> {
  if (!ALLEGGERIBILI.has(tipo)) return { buffer, risparmiati: 0 };
  const nuovo = tipo === 'application/pdf' ? await pdf(buffer) : await foto(buffer, tipo);
  if (!nuovo || nuovo.length > buffer.length * 0.95) return { buffer, risparmiati: 0 };
  return { buffer: nuovo, risparmiati: buffer.length - nuovo.length };
}

/** Il risparmio messo nel conto, per la pagina Sistema. */
export async function contaRisparmio(byte: number, file = 1) {
  if (byte <= 0) return;
  await prisma.statoSistema
    .upsert({
      where: { id: 'unico' },
      create: { id: 'unico', byteRisparmiati: BigInt(byte), fileAlleggeriti: file },
      update: {
        byteRisparmiati: { increment: BigInt(byte) },
        fileAlleggeriti: { increment: file },
      },
    })
    .catch(() => null);
}
