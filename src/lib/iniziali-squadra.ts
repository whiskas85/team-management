/**
 * Il logo di chi non ne ha ancora uno: le iniziali della squadra in un cerchio.
 *
 * Un gestionale nuovo non deve presentarsi col logo di qualcun altro: finché la
 * squadra non carica il suo, al suo posto ci sono le sue iniziali — «BKArmy»
 * diventa BK, «Lupi Grigi Softair» LG. Senza database e senza browser: lo
 * usano la rotta del logo, l'icona dell'app e il profilo per le altre squadre.
 */

/** Due lettere, al massimo, dal nome della squadra. */
export function inizialiSquadra(nome: string): string {
  const parole = nome.trim().split(/[\s\-_.]+/).filter(Boolean);
  if (parole.length >= 2) return (parole[0][0] + parole[1][0]).toUpperCase();
  const una = parole[0] ?? '';
  // una parola sola: le maiuscole dicono dove comincia ognuna («BKArmy» → BK)
  const maiuscole = una.replace(/[^A-ZÀ-Ý0-9]/g, '');
  if (maiuscole.length >= 2) return maiuscole.slice(0, 2);
  return una.slice(0, 2).toUpperCase() || '?';
}

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Il cerchio con le iniziali, come SVG: fondo e testo coi colori del tema. */
export function svgIniziali(nome: string, fondo: string, testo: string, lato = 512): string {
  const lettere = inizialiSquadra(nome);
  const corpo = lettere.length > 1 ? lato * 0.4 : lato * 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lato}" height="${lato}" viewBox="0 0 ${lato} ${lato}">
<circle cx="${lato / 2}" cy="${lato / 2}" r="${lato / 2}" fill="${xml(fondo)}"/>
<circle cx="${lato / 2}" cy="${lato / 2}" r="${lato / 2 - lato * 0.03}" fill="none" stroke="${xml(testo)}" stroke-opacity="0.45" stroke-width="${lato * 0.02}"/>
<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${xml(testo)}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="700" font-size="${corpo}" letter-spacing="${lato * 0.01}">${xml(lettere)}</text>
</svg>`;
}
