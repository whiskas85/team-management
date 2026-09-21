import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Cifratura reversibile per i pochi segreti che devono tornare in chiaro,
 * come la password del portale federale: per fare il login serve la password
 * vera, quindi un hash non basta.
 *
 * La chiave nasce dal segreto di sessione: chi ha accesso all'ambiente ha già
 * le chiavi del regno, ma un dump del solo database non basta a leggerle.
 */
function chiave(): Buffer {
  const seme = process.env.SESSION_SECRET;
  if (!seme || seme.length < 16) {
    throw new Error('SESSION_SECRET mancante o troppo corto: non posso cifrare le credenziali.');
  }
  return scryptSync(seme, 'zero-dark-segreti', 32);
}

/** Restituisce "iv:tag:cifrato", tutto in base64. */
export function cifra(testo: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chiave(), iv);
  const dati = Buffer.concat([c.update(testo, 'utf8'), c.final()]);
  return [iv.toString('base64'), c.getAuthTag().toString('base64'), dati.toString('base64')].join(
    ':',
  );
}

export function decifra(pacchetto: string): string {
  const [iv, tag, dati] = pacchetto.split(':');
  if (!iv || !tag || !dati) throw new Error('Segreto illeggibile: formato non riconosciuto.');

  const d = createDecipheriv('aes-256-gcm', chiave(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(dati, 'base64')), d.final()]).toString('utf8');
}

/**
 * Una firma corta per un fatto preciso, come «questa ricevuta è di Mario per
 * questo messaggio».
 *
 * Serve dove non c'è una sessione a garantire chi parla: il telefono che
 * riceve una notifica può avere la sessione scaduta, ma la firma viaggia
 * dentro la notifica stessa, che è cifrata per quel telefono e nessun altro.
 * Chi non l'ha ricevuta non la conosce, e non può inventarla.
 */
export function firma(testo: string): string {
  return createHmac('sha256', chiave()).update(testo).digest('base64url').slice(0, 32);
}

export function firmaValida(testo: string, data: string): boolean {
  const attesa = Buffer.from(firma(testo));
  const arrivata = Buffer.from(data);
  return attesa.length === arrivata.length && timingSafeEqual(attesa, arrivata);
}
