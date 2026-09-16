/**
 * I numeri di telefono come li vuole WhatsApp: solo cifre, col prefisso
 * internazionale davanti.
 *
 * In rubrica lo stesso numero è scritto in cinque modi — `333 1234567`,
 * `+39 333 1234567`, `0039...`, con i trattini — e in `wa.me` invece ci va
 * `393331234567` e basta. Qui si normalizza, con una sola scorciatoia: un
 * numero italiano senza prefisso si riconosce dalla lunghezza e dal fatto che
 * comincia per 3, e gli si mette davanti il 39. Un numero straniero scritto
 * senza prefisso non si può indovinare, e infatti non ci si prova.
 */
export function perWhatsapp(numero: string | null | undefined): string | null {
  if (!numero) return null;

  let cifre = numero.replace(/\D/g, '');
  if (!cifre) return null;

  // 00 davanti è il vecchio modo di scrivere il +
  if (cifre.startsWith('00')) cifre = cifre.slice(2);

  // cellulare italiano senza prefisso: 3xx xxx xxxx
  if (cifre.length >= 9 && cifre.length <= 10 && cifre.startsWith('3')) cifre = `39${cifre}`;

  // troppo corto per essere un numero vero: meglio non offrire un pulsante
  // che aprirebbe una chat con nessuno
  if (cifre.length < 11) return null;

  return cifre;
}
