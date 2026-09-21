/**
 * Il sito pubblico e il gestionale sono la stessa applicazione, su due
 * indirizzi: `www` mostra il sito, `ops` il gestionale. Quale dei due lo decide
 * l'indirizzo con cui si arriva, e le regole stanno qui perché le usano sia lo
 * smistamento delle richieste sia le pagine per comporre i propri link.
 *
 * Niente database e niente server qui dentro: lo legge anche il browser.
 */

/** Gli indirizzi del sito. Il gestionale è tutto il resto. */
const HOST_SITO = ['www.zerodarkteam.it', 'zerodarkteam.it'];

/** Dove sta il gestionale, per mandarci chi cerca il login dal sito. */
export const INDIRIZZO_GESTIONALE = 'https://ops.zerodarkteam.it';

export const eHostSito = (host: string | null | undefined) =>
  !!host && HOST_SITO.includes(host.toLowerCase().split(':')[0]);

/**
 * Il percorso di una pagina del sito, visto dall'indirizzo con cui si arriva.
 *
 * Su `www` le pagine sono `/` e `/contatti`. Dal gestionale — per vederlo prima
 * che il dominio punti qui, o nel test — le stesse pagine stanno sotto
 * `/sito`, e i link devono seguirle.
 */
export const percorsoSito = (host: string | null | undefined, pagina: string) =>
  eHostSito(host) ? pagina : `/sito${pagina === '/' ? '' : pagina}`;
