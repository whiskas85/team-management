/**
 * Open Location Code (i "Plus Code" di Google).
 *
 * Serve perché parecchi link condivisi da Maps non portano le coordinate ma
 * solo un codice tipo `8X55+42 Villareggia TO`. Il codice corto va ricostruito
 * a partire da un punto di riferimento — la località citata nel link.
 */

const ALFABETO = '23456789CFGHJMPQRVWX';
const SEPARATORE = '+';
const POSIZIONE_SEPARATORE = 8;
const BASE = 20;

export type Riquadro = { lat: number; lng: number };

/** Riconosce un plus code, corto (`8X55+42`) o completo (`8FQ98X55+42`). */
export const REGEX_PLUS_CODE = /\b([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})\b/i;

export function estraiPlusCode(testo: string): string | null {
  return testo.match(REGEX_PLUS_CODE)?.[1].toUpperCase() ?? null;
}

export const eCompleto = (codice: string) =>
  codice.indexOf(SEPARATORE) === POSIZIONE_SEPARATORE;

/** Codice completo del punto indicato, alla lunghezza richiesta. */
export function codifica(lat: number, lng: number, lunghezza = 10): string {
  let vLat = Math.min(90, Math.max(-90, lat)) + 90;
  let vLng = (((lng + 180) % 360) + 360) % 360;
  if (vLat >= 180) vLat = 180 - 1e-10;

  let risoluzione = BASE;
  let codice = '';

  for (let i = 0; i < lunghezza / 2; i++) {
    const cifraLat = Math.floor(vLat / risoluzione);
    const cifraLng = Math.floor(vLng / risoluzione);
    codice += ALFABETO[cifraLat] + ALFABETO[cifraLng];
    vLat -= cifraLat * risoluzione;
    vLng -= cifraLng * risoluzione;
    risoluzione /= BASE;
  }

  return codice.slice(0, POSIZIONE_SEPARATORE) + SEPARATORE + codice.slice(POSIZIONE_SEPARATORE);
}

/** Centro del riquadro descritto da un codice completo. */
export function decodifica(codice: string): Riquadro | null {
  const pulito = codice.replace(SEPARATORE, '').replace(/0+$/, '').toUpperCase();
  if (pulito.length < 2 || [...pulito].some((c) => !ALFABETO.includes(c))) return null;

  let lat = -90;
  let lng = -180;
  let passoLat = BASE;
  let passoLng = BASE;

  // prime dieci cifre: coppie latitudine/longitudine
  const coppie = Math.min(pulito.length, 10);
  for (let i = 0; i + 1 < coppie; i += 2) {
    lat += ALFABETO.indexOf(pulito[i]) * passoLat;
    lng += ALFABETO.indexOf(pulito[i + 1]) * passoLng;
    if (i + 2 < coppie) {
      passoLat /= BASE;
      passoLng /= BASE;
    }
  }

  // cifre successive: griglia 5 righe x 4 colonne per volta
  for (let i = 10; i < Math.min(pulito.length, 15); i++) {
    passoLat /= 5;
    passoLng /= 4;
    const valore = ALFABETO.indexOf(pulito[i]);
    lat += Math.floor(valore / 4) * passoLat;
    lng += (valore % 4) * passoLng;
  }

  return { lat: lat + passoLat / 2, lng: lng + passoLng / 2 };
}

/**
 * Ricostruisce un codice corto usando un punto di riferimento vicino: sceglie
 * l'occorrenza più prossima, che è quella che Google intendeva.
 */
export function ricostruisci(
  corto: string,
  latRif: number,
  lngRif: number,
): Riquadro | null {
  const codice = corto.toUpperCase();
  if (eCompleto(codice)) return decodifica(codice);

  const mancanti = POSIZIONE_SEPARATORE - codice.indexOf(SEPARATORE);
  if (mancanti <= 0 || mancanti % 2 !== 0) return null;

  const risoluzione = Math.pow(BASE, 2 - mancanti / 2);
  const meta = risoluzione / 2;

  const prefisso = codifica(latRif, lngRif, 10).replace(SEPARATORE, '').slice(0, mancanti);
  const punto = decodifica(prefisso + codice);
  if (!punto) return null;

  // il prefisso può cadere nel riquadro sbagliato: si sposta di una tacca
  let { lat, lng } = punto;
  if (latRif - lat > meta) lat += risoluzione;
  else if (lat - latRif > meta) lat -= risoluzione;
  if (lngRif - lng > meta) lng += risoluzione;
  else if (lng - lngRif > meta) lng -= risoluzione;

  return { lat, lng };
}
