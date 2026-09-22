'use client';

import { useState } from 'react';
import { Icona } from './Icona';

/**
 * La chiave di un sito appena collegato, pronta da consegnare a chi lo cura.
 *
 * Si vede una volta sola: nel gestionale ne resta l'impronta. Accanto c'è
 * l'indirizzo a cui il sito deve mandare i moduli, così chi riceve la chiave ha
 * tutto quello che serve in un colpo solo.
 */
export function ChiaveSito({ nome, chiave, indirizzo }: { nome: string; chiave: string; indirizzo: string }) {
  const [copiato, setCopiato] = useState<string | null>(null);
  const [fallito, setFallito] = useState(false);

  const copia = async (cosa: string, che: string) => {
    try {
      await navigator.clipboard.writeText(cosa);
      setCopiato(che);
      setFallito(false);
      setTimeout(() => setCopiato((c) => (c === che ? null : c)), 2000);
    } catch {
      setFallito(true);
    }
  };

  return (
    <div className="rounded-lg border border-nvg/40 bg-nvg/5 p-3">
      <p className="mb-2 text-xs text-nvg">
        <strong>{nome}</strong> è collegato. Copia la chiave adesso: chiusa questa finestra non si
        può più rileggere, si può solo scollegare il sito e farne un’altra.
      </p>

      <p className="mb-1 text-[11px] uppercase tracking-[0.15em] text-muted">Chiave</p>
      <code className="num block select-all break-all rounded bg-surface2 px-2 py-2 text-xs text-ink">
        {chiave}
      </code>
      <p className="mb-1 mt-3 text-[11px] uppercase tracking-[0.15em] text-muted">Indirizzo</p>
      <code className="num block select-all break-all rounded bg-surface2 px-2 py-2 text-xs text-ink">
        POST {indirizzo}
      </code>

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => copia(chiave, 'chiave')} className="btn-ghost btn-sm">
          <Icona nome="carica" size={14} />
          {copiato === 'chiave' ? 'Copiata' : 'Copia la chiave'}
        </button>
        <button type="button" onClick={() => copia(indirizzo, 'indirizzo')} className="btn-ghost btn-sm">
          <Icona nome="carica" size={14} />
          {copiato === 'indirizzo' ? 'Copiato' : 'Copia l’indirizzo'}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        La chiave va messa nella configurazione del sito, sul suo server: mai in una pagina, dove
        chiunque potrebbe leggerla.
      </p>
      {fallito && (
        <p className="mt-2 text-[11px] text-warn">
          Gli appunti non sono disponibili qui: seleziona il testo e copialo a mano.
        </p>
      )}
    </div>
  );
}
