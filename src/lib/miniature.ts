import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { percorsoAssoluto, UPLOAD_DIR } from './storage';

/**
 * Le miniature di foto profilo e loghi.
 *
 * Un avatar è grande 32 pixel, e si caricava la foto intera: centinaia di
 * kilobyte per ogni faccia di un elenco, e su una connessione da campo si
 * vedeva. Accanto a ogni immagine si tiene una copia piccola (192 pixel di
 * lato al massimo, WebP), ed è quella che serve dove l'immagine è piccola.
 *
 * Si crea quando l'immagine arriva; per quelle caricate prima, la prima volta
 * che qualcuno la chiede — poi resta lì. La trasparenza dei loghi si tiene.
 */

const LATO = 192;

/** Dove sta la miniatura di un file caricato: accanto a lui. */
const percorsoMini = (relativo: string) => `${relativo}.mini.webp`;

async function rimpicciolisci(originale: Buffer) {
  return sharp(originale)
    .rotate()
    .resize(LATO, LATO, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

/** La crea adesso: da chiamare dopo aver salvato un'immagine. Un errore non ferma niente. */
export async function creaMiniatura(relativo: string) {
  try {
    const mini = await rimpicciolisci(await readFile(percorsoAssoluto(relativo)));
    await writeFile(percorsoAssoluto(percorsoMini(relativo)), mini);
  } catch {
    /* senza miniatura si serve l'originale: più lento, ma funziona */
  }
}

/** La miniatura di un file caricato: quella salvata, o fatta adesso e salvata. */
export async function leggiMiniatura(relativo: string): Promise<Buffer | null> {
  try {
    return await readFile(percorsoAssoluto(percorsoMini(relativo)));
  } catch {
    try {
      const mini = await rimpicciolisci(await readFile(percorsoAssoluto(relativo)));
      await writeFile(percorsoAssoluto(percorsoMini(relativo)), mini).catch(() => null);
      return mini;
    } catch {
      return null;
    }
  }
}

/** La miniatura di un'immagine di public/ (il logo di partenza), tenuta fra i caricati. */
export async function miniaturaPubblica(indirizzo: string): Promise<Buffer | null> {
  const nome = `partenza-${indirizzo.replace(/[^a-z0-9]+/gi, '-')}.mini.webp`;
  const dove = path.join(UPLOAD_DIR, 'miniature', nome);
  try {
    return await readFile(dove);
  } catch {
    try {
      const mini = await rimpicciolisci(
        await readFile(path.join(process.cwd(), 'public', indirizzo.replace(/^\//, ''))),
      );
      await mkdir(path.dirname(dove), { recursive: true });
      await writeFile(dove, mini).catch(() => null);
      return mini;
    } catch {
      return null;
    }
  }
}

/**
 * La risposta con la miniatura. Si tiene a lungo e si riconvalida dietro le
 * quinte: la faccia compare subito, e se è cambiata si aggiorna al giro dopo.
 */
export function rispostaMiniatura(dati: Buffer, pubblica = false) {
  return new NextResponse(new Uint8Array(dati), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': `${pubblica ? 'public' : 'private'}, max-age=300, stale-while-revalidate=604800`,
    },
  });
}
