/**
 * Il primo link dentro un testo scritto a mano.
 *
 * Le istruzioni di un metodo di pagamento sono testo libero — «PayPal:
 * paypal.me/zerodark, scrivi nome e attività nella causale» — e dentro può
 * esserci un indirizzo a cui chi paga deve arrivare. Qui lo si pesca, perché
 * diventi un pulsante invece di una stringa da copiare a mano dal telefono.
 *
 * Si riconoscono tre forme: con `http(s)://`, con `www.`, e un dominio seguito
 * da un percorso (`paypal.me/zerodark`, `satispay.com/app/...`). Un dominio
 * da solo non basta: «info@zerodarkteam.it» è una mail, non un link, e un
 * punto in mezzo a una frase non deve diventare un pulsante.
 *
 * Il testo intorno non si tocca: togliendo il link restavano frasi zoppe —
 * «Vai su per pagare» — e chi le ha scritte le ha scritte per essere lette
 * così.
 */
const LINK =
  /(?:https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?<![@\w.-])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/[^\s<>"']*)/i;

export function primoLink(testo: string | null | undefined): string | null {
  if (!testo) return null;
  const trovato = testo.match(LINK);
  if (!trovato) return null;

  // la punteggiatura in coda è della frase, non dell'indirizzo
  const grezzo = trovato[0].replace(/[.,;:!?)\]]+$/, '');
  try {
    const url = new URL(/^https?:\/\//i.test(grezzo) ? grezzo : `https://${grezzo}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
