import path from 'node:path';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { leggiMiaSquadra, PARTENZA } from './mia-squadra';
import { percorsoAssoluto } from './storage';
import { tavolozza } from './tema';
import { temaSquadra } from './tema-server';

/**
 * L'icona dell'app installata, fatta dal logo della squadra.
 *
 * Prima l'icona era un file fisso in public/, quello di Zero Dark: un'altra
 * squadra installava il suo gestionale e si ritrovava il nostro teschio sulla
 * schermata iniziale. Ora si disegna dal logo — quello caricato in «La mia
 * squadra», o quello di partenza — su un quadrato del colore di fondo del tema.
 *
 * Tre forme:
 * - «any»: il logo con un margine piccolo, per il browser e per Android;
 * - «maskable»: con un margine largo, perché Android ritaglia l'icona a
 *   cerchio o a goccia e deve restare dentro la zona sicura (l'80% centrale);
 * - Apple: pieno, senza trasparenze, che iOS riempirebbe di nero.
 */

/** Cambia quando cambia il logo: va nell'indirizzo, così il telefono la riscarica. */
export async function versioneIcona(): Promise<string> {
  const s = await leggiMiaSquadra();
  return s?.logoPath ? String(s.aggiornatoIl.getTime()) : `p-${PARTENZA.logo}`.replace(/\W/g, '');
}

async function sorgente(): Promise<Buffer | null> {
  const s = await leggiMiaSquadra();
  if (s?.logoPath) {
    try {
      return await readFile(percorsoAssoluto(s.logoPath));
    } catch {
      // file sparito: si torna al logo di partenza
    }
  }
  try {
    return await readFile(path.join(process.cwd(), 'public', PARTENZA.logo.replace(/^\//, '')));
  } catch {
    return null;
  }
}

const giaFatte = new Map<string, Buffer>();

export async function iconaApp(lato: number, forma: 'any' | 'maskable' | 'apple'): Promise<Buffer | null> {
  const chiave = `${await versioneIcona()}|${lato}|${forma}`;
  const pronta = giaFatte.get(chiave);
  if (pronta) return pronta;

  const logo = await sorgente();
  if (!logo) return null;
  const fondo = tavolozza(await temaSquadra()).colori.bg;
  // quanto spazio intorno al logo, per parte
  const margine = Math.round(lato * (forma === 'maskable' ? 0.2 : forma === 'apple' ? 0.12 : 0.06));
  const dentro = lato - margine * 2;
  const disegnato = await sharp(logo)
    .resize(dentro, dentro, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const icona = await sharp({
    create: { width: lato, height: lato, channels: 4, background: fondo },
  })
    .composite([{ input: disegnato, top: margine, left: margine }])
    .png()
    .toBuffer();
  // poche e piccole: si tengono in memoria finché il logo non cambia
  if (giaFatte.size > 30) giaFatte.clear();
  giaFatte.set(chiave, icona);
  return icona;
}
