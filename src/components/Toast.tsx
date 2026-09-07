'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icona } from './Icona';

/**
 * Gli avvisi che compaiono in basso a destra e se ne vanno da soli.
 *
 * Nascono da un problema pratico: l'esito di un pulsante scritto **dentro la
 * riga** allargava la riga, e per far posto al testo si accorciava il nome
 * della persona — *«Marc…»*. Il messaggio ha bisogno di spazio che la riga non
 * ha, e la riga non deve cambiare forma per un avviso che dura cinque secondi.
 *
 * **Sono impilabili.** Se ne partono due di fila si mettono in colonna invece
 * di sovrapporsi: un elenco dove si preme tre volte di seguito è il caso
 * normale, non l'eccezione. Per questo la pila è una sola per tutta
 * l'applicazione — se ogni pulsante disegnasse il suo, finirebbero uno sopra
 * l'altro nello stesso punto.
 */

export type TonoToast = 'ok' | 'warn' | 'errore' | 'info';

type Avviso = { id: number; testo: string; tono: TonoToast };

let prossimo = 1;
let avvisi: Avviso[] = [];
const ascoltatori = new Set<(a: Avviso[]) => void>();

const propaga = () => ascoltatori.forEach((f) => f(avvisi));

/** Mostra un avviso. Si chiama da qualsiasi punto, anche fuori da un componente. */
export function mostraToast(testo: string, tono: TonoToast = 'info') {
  const id = prossimo++;
  avvisi = [...avvisi, { id, testo, tono }];
  propaga();

  // gli errori restano più a lungo: c'è da leggerli, non solo da vederli
  setTimeout(() => chiudiToast(id), tono === 'errore' ? 7000 : 4000);
}

export function chiudiToast(id: number) {
  avvisi = avvisi.filter((a) => a.id !== id);
  propaga();
}

const COLORI: Record<TonoToast, string> = {
  ok: 'border-nvg/50 bg-nvg/15 text-nvg',
  warn: 'border-warn/50 bg-warn/15 text-warn',
  errore: 'border-danger/50 bg-danger/15 text-danger',
  info: 'border-sky-400/50 bg-sky-400/15 text-sky-300',
};

/**
 * La pila. Va montata una volta sola, nel guscio dell'applicazione.
 *
 * Vive in un portale attaccato al `body`: così non eredita larghezze,
 * `overflow` o posizionamenti di dove è stata scritta, e resta al suo posto
 * anche quando l'avviso nasce dentro una tabella o una finestra.
 */
export function ContenitoreToast() {
  const [lista, setLista] = useState<Avviso[]>([]);
  const [montato, setMontato] = useState(false);

  useEffect(() => {
    setMontato(true);
    const ascolta = (a: Avviso[]) => setLista(a);
    ascoltatori.add(ascolta);
    setLista(avvisi);
    return () => {
      ascoltatori.delete(ascolta);
    };
  }, []);

  if (!montato || lista.length === 0) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      /* in basso a destra; su telefono sopra la barra di navigazione, che
         altrimenti coprirebbe l'avviso proprio mentre lo si legge */
      className="pointer-events-none fixed inset-x-3 bottom-20 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm"
    >
      {lista.map((a) => (
        <div
          key={a.id}
          className={`pointer-events-auto flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg backdrop-blur ${COLORI[a.tono]}`}
        >
          <span className="min-w-0 flex-1">{a.testo}</span>
          <button
            type="button"
            onClick={() => chiudiToast(a.id)}
            aria-label="Chiudi"
            className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
          >
            <Icona nome="chiudi" size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
