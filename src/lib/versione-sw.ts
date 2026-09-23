import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * La versione del service worker che il gestionale sta servendo adesso.
 *
 * Si legge da `public/sw.js`, dove è scritta una volta sola: tenerne una
 * copia qui vorrebbe dire due numeri da allineare a mano, e il giorno che si
 * scordano non se ne accorge nessuno — direbbe «vecchio» a chi è aggiornato.
 *
 * Si legge una volta e si tiene: il file non cambia mentre il server gira,
 * cambia quando si rilascia, e allora riparte tutto.
 */
let letta: string | null | undefined;

export function versioneSwServita(): string | null {
  if (letta !== undefined) return letta;
  try {
    const testo = readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
    letta = testo.match(/VERSIONE_SW = '([^']+)'/)?.[1] ?? null;
  } catch {
    // senza il file non si dice niente a nessuno: meglio nessuna versione che
    // una sbagliata
    letta = null;
  }
  return letta;
}
