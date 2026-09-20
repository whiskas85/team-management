import type { Role } from '@prisma/client';
import { tieneInMano } from './domain';
import type { RegoleFile } from './storage';

/**
 * Gli allegati di un'attività: il book di missione, prima di tutto.
 *
 * **Tre formati, e nessuno di più.** Il PDF di chi impagina, il Markdown di
 * chi scrive a mano, l'HTML di chi esporta da un altro programma: sono i modi
 * in cui un book arriva davvero. Aperto a tutto, questo riquadro diventerebbe
 * il posto dove si butta qualsiasi cosa — foto, archivi, il foglio dei conti —
 * e il book smetterebbe di essere la cosa che si trova aprendo l'attività.
 */

export type GenereAllegato = 'pdf' | 'md' | 'html';

const FORMATI: Record<string, { genere: GenereAllegato; tipo: string; etichetta: string }> = {
  '.pdf': { genere: 'pdf', tipo: 'application/pdf', etichetta: 'PDF' },
  '.md': { genere: 'md', tipo: 'text/markdown; charset=utf-8', etichetta: 'Markdown' },
  '.markdown': { genere: 'md', tipo: 'text/markdown; charset=utf-8', etichetta: 'Markdown' },
  '.html': { genere: 'html', tipo: 'text/html; charset=utf-8', etichetta: 'HTML' },
  '.htm': { genere: 'html', tipo: 'text/html; charset=utf-8', etichetta: 'HTML' },
};

export const ESTENSIONI_ALLEGATO = Object.keys(FORMATI);

/**
 * Venti mega.
 *
 * Un book di missione non è un foglio: mappe, planimetrie, foto del campo —
 * venti mega li fa senza fare niente di strano, e farlo rimbalzare vorrebbe
 * dire mandarlo per WhatsApp, che è esattamente il posto dove si perde. È lo
 * stesso tetto del certificato medico (`lib/certificato.ts`), arrivato lì per
 * la strada opposta: la scansione dello studio pesa quanto un book.
 */
export const MAX_ALLEGATO_BYTES = 20 * 1024 * 1024;

export const REGOLE_ALLEGATO: RegoleFile = {
  estensioni: ESTENSIONI_ALLEGATO,
  tipoDa: (estensione) => FORMATI[estensione]?.tipo ?? 'application/octet-stream',
  maxBytes: MAX_ALLEGATO_BYTES,
  spiegazione: 'Formato non ammesso: si allegano PDF, Markdown (.md) o HTML.',
};

/**
 * Di che genere è, guardando il tipo che gli abbiamo dato noi al caricamento.
 *
 * Non si torna a leggere l'estensione del nome originale: quello l'ha scritto
 * il computer di qualcun altro, il tipo salvato è una nostra decisione presa
 * una volta sola.
 */
export function genereAllegato(mimeType: string): GenereAllegato {
  if (mimeType.startsWith('text/markdown')) return 'md';
  if (mimeType.startsWith('text/html')) return 'html';
  return 'pdf';
}

export const etichettaGenere: Record<GenereAllegato, string> = {
  pdf: 'PDF',
  md: 'Markdown',
  html: 'HTML',
};

/**
 * Chi carica, sostituisce e toglie gli allegati di un'attività.
 *
 * L'admin e i team leader perché è il loro mestiere ovunque, **e i referenti di
 * quella attività**: il book lo scrive chi la tiene in mano, e spesso lo
 * finisce la sera prima. Farglielo caricare da qualcun altro vorrebbe dire che
 * arriva su WhatsApp e il riquadro resta vuoto.
 *
 * È un permesso che vale per una attività sola: fuori di lì un referente non
 * può niente di più degli altri.
 */
export const puoGestireAllegati = (
  me: { id: string; roles: Role[] },
  referenti: { userId: string }[],
) => tieneInMano(me, referenti);

/** «1,4 MB»: a chi guarda serve sapere se è un foglio o una cartella intera. */
export function peso(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
