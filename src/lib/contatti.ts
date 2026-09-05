/**
 * Collegamenti di contatto. Sono semplici URL: sul telefono aprono il
 * dialer, WhatsApp o il client di posta, sia su Android sia su iOS.
 */

const PREFISSO_ITALIA = '39';

/** Numero in formato internazionale senza simboli, come lo vuole wa.me. */
export function numeroInternazionale(telefono?: string | null): string | null {
  if (!telefono) return null;

  let cifre = telefono.replace(/[^\d+]/g, '');
  if (cifre.startsWith('+')) cifre = cifre.slice(1);
  else if (cifre.startsWith('00')) cifre = cifre.slice(2);
  else if (cifre.startsWith('3') && cifre.length >= 9) cifre = PREFISSO_ITALIA + cifre;

  // sotto le 11 cifre non è un numero internazionale plausibile
  return cifre.length >= 11 ? cifre : null;
}

export const urlTelefono = (telefono?: string | null) =>
  telefono ? `tel:${telefono.replace(/[^\d+]/g, '')}` : null;

export function urlWhatsapp(telefono?: string | null, testo?: string) {
  const numero = numeroInternazionale(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}${testo ? `?text=${encodeURIComponent(testo)}` : ''}`;
}

export const urlEmail = (email?: string | null, oggetto?: string) =>
  email ? `mailto:${email}${oggetto ? `?subject=${encodeURIComponent(oggetto)}` : ''}` : null;
