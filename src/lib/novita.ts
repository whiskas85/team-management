import { readFile } from 'fs/promises';
import path from 'path';

/** Una versione del registro delle modifiche: numero, data e cosa è cambiato. */
export type Versione = { numero: string; data: string; testo: string };

/**
 * Le novità, versione per versione, lette da CHANGELOG.md: lo stesso file che
 * scrive chi rilascia, quindi la pagina non va mai tenuta in pari a mano.
 * Ogni versione comincia con «## 3.33.0 — 7 ottobre 2026»; quello che sta
 * prima della prima (la spiegazione del file) non è una novità.
 */
export async function leggiNovita(): Promise<Versione[]> {
  const file = await readFile(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8').catch(() => '');
  const versioni: Versione[] = [];
  let attuale: Versione | null = null;
  for (const riga of file.split('\n')) {
    const titolo = riga.match(/^## (\d+\.\d+\.\d+)\s*[—–-]\s*(.+?)\s*$/);
    if (titolo) {
      attuale = { numero: titolo[1], data: titolo[2], testo: '' };
      versioni.push(attuale);
      continue;
    }
    if (attuale) attuale.testo += `${riga}\n`;
  }
  return versioni.map((v) => ({ ...v, testo: ricuci(v.testo).trim() }));
}

/**
 * Nel registro le voci lunghe vanno a capo con un rientro, per stare in
 * ottanta colonne: per il Markdown sarebbero paragrafi nuovi. Una riga
 * rientrata che non apre una voce (- o 1.) continua quella di prima.
 */
function ricuci(testo: string): string {
  const righe: string[] = [];
  for (const riga of testo.split('\n')) {
    const precedente = righe[righe.length - 1];
    const continua =
      /^\s{2,}\S/.test(riga) &&
      !/^\s*([-*+]|\d+\.)\s/.test(riga) &&
      precedente !== undefined &&
      precedente.trim() !== '' &&
      !precedente.trimStart().startsWith('```');
    if (continua) righe[righe.length - 1] = `${precedente.trimEnd()} ${riga.trim()}`;
    else righe.push(riga);
  }
  return righe.join('\n');
}
