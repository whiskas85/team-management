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

/**
 * Il primo IBAN dentro un testo, senza spazi, se è un IBAN vero.
 *
 * Dal telefono un IBAN si sbaglia ricopiandolo: diventa un pulsante «Copia».
 * Si controlla la cifra di controllo (il modulo 97 dello standard): una
 * sigla qualunque che per caso comincia con due lettere e due numeri non
 * deve diventare un IBAN da incollare in banca.
 */
export function primoIban(testo: string | null | undefined): string | null {
  if (!testo) return null;
  for (const trovato of testo.toUpperCase().matchAll(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/g)) {
    // scritto a gruppi di quattro, l'IBAN si porta dietro la parola che
    // segue se è corta («... 456 A SAT»): si prova dal più lungo al più
    // corto, e vince il primo che torna
    const compatto = trovato[0].replace(/\s/g, '');
    for (let n = Math.min(34, compatto.length); n >= 15; n--) {
      if (ibanValido(compatto.slice(0, n))) return compatto.slice(0, n);
    }
  }
  return null;
}

function ibanValido(iban: string) {
  const girato = iban.slice(4) + iban.slice(0, 4);
  const cifre = girato.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let resto = 0;
  for (const c of cifre) resto = (resto * 10 + Number(c)) % 97;
  return resto === 1;
}

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
