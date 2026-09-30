/**
 * Lo stesso indirizzo di un'immagine del gestionale, chiedendo la miniatura
 * (vedi miniature.ts). Sta a parte perché lo usa anche il browser.
 */
export const conMiniatura = (src: string) =>
  src.startsWith('/api/') ? `${src}${src.includes('?') ? '&' : '?'}mini=1` : src;
