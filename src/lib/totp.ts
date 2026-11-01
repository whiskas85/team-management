import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Codici a tempo (TOTP, RFC 6238): quelli di Google Authenticator, Microsoft
 * Authenticator, 1Password, Aegis e simili.
 *
 * Le impostazioni sono quelle che tutte le app capiscono senza chiedere:
 * SHA-1, sei cifre, trenta secondi. Si accetta il passo prima e quello dopo,
 * perché l'orologio di un telefono può essere avanti o indietro di qualche
 * secondo; e mai due volte lo stesso passo, così un codice letto da sopra la
 * spalla non serve a niente un attimo dopo.
 */

const PASSO = 30;
const CIFRE = 6;
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(buf: Buffer): string {
  let bit = 0;
  let valore = 0;
  let out = '';
  for (const b of buf) {
    valore = (valore << 8) | b;
    bit += 8;
    while (bit >= 5) {
      out += ALFABETO[(valore >>> (bit - 5)) & 31];
      bit -= 5;
    }
  }
  if (bit > 0) out += ALFABETO[(valore << (5 - bit)) & 31];
  return out;
}

function daBase32(testo: string): Buffer {
  const pulito = testo.replace(/[\s=]/g, '').toUpperCase();
  let bit = 0;
  let valore = 0;
  const out: number[] = [];
  for (const c of pulito) {
    const i = ALFABETO.indexOf(c);
    if (i < 0) throw new Error('Segreto non valido.');
    valore = (valore << 5) | i;
    bit += 5;
    if (bit >= 8) {
      out.push((valore >>> (bit - 8)) & 255);
      bit -= 8;
    }
  }
  return Buffer.from(out);
}

/** Un segreto nuovo: 20 byte, come raccomanda la RFC per SHA-1. */
export const nuovoSegreto = () => base32(randomBytes(20));

/** Il passo di 30 secondi di un istante. */
export const passoDi = (ms = Date.now()) => Math.floor(ms / 1000 / PASSO);

export function codiceAl(segreto: string, passo: number): string {
  const contatore = Buffer.alloc(8);
  contatore.writeBigUInt64BE(BigInt(passo));
  const h = createHmac('sha1', daBase32(segreto)).update(contatore).digest();
  const o = h[h.length - 1] & 15;
  const n = (h.readUInt32BE(o) & 0x7fffffff) % 10 ** CIFRE;
  return n.toString().padStart(CIFRE, '0');
}

/**
 * Il codice è giusto? Se sì, il passo a cui corrisponde (da ricordare, perché
 * non valga una seconda volta); se no, nullo.
 */
export function verificaCodice(
  segreto: string,
  codice: string,
  ultimoPasso: number | null,
  adesso = Date.now(),
): number | null {
  const pulito = codice.replace(/\s/g, '');
  if (!/^\d{6}$/.test(pulito)) return null;
  const qui = passoDi(adesso);
  for (const p of [qui, qui - 1, qui + 1]) {
    if (ultimoPasso !== null && p <= ultimoPasso) continue;
    const a = Buffer.from(codiceAl(segreto, p));
    const b = Buffer.from(pulito);
    if (timingSafeEqual(a, b)) return p;
  }
  return null;
}

/** L'indirizzo che il QR consegna all'app: nome del gestionale e account. */
export function indirizzoOtpauth(segreto: string, account: string, emittente: string) {
  const etichetta = encodeURIComponent(`${emittente}:${account}`);
  const q = new URLSearchParams({
    secret: segreto,
    issuer: emittente,
    algorithm: 'SHA1',
    digits: String(CIFRE),
    period: String(PASSO),
  });
  return `otpauth://totp/${etichetta}?${q}`;
}

/** Il segreto a gruppi di quattro, per chi lo scrive a mano nell'app. */
export const segretoLeggibile = (s: string) => s.match(/.{1,4}/g)?.join(' ') ?? s;
