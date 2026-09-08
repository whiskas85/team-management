'use client';

import { useActionState, useEffect, useState } from 'react';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import { aggiungiAlCarrello } from '@/actions/ordini';
import type { StatoForm } from '@/lib/form';

/**
 * Quanti ne vuoi, e nel carrello.
 *
 * Sta sulla singola voce perché è lì che uno decide: la taglia M sono due, la
 * patch una. Il carrello è uno solo e aspetta altrove, così si gira tutto il
 * catalogo e si ordina alla fine invece di fare un ordine per articolo.
 */
export function AggiungiAlCarrello({ voceId, titolo }: { voceId: string; titolo: string }) {
  const [quanti, setQuanti] = useState(1);
  const [stato, azione, inCorso] = useActionState(aggiungiAlCarrello, {} as StatoForm);

  useEffect(() => {
    if (stato.errore) mostraToast(stato.errore, 'errore');
    else if (stato.ok) {
      mostraToast(stato.ok, 'ok');
      setQuanti(1);
    }
  }, [stato]);

  return (
    <form action={azione} className="ml-auto flex items-center gap-1">
      <input type="hidden" name="voceId" value={voceId} />
      <input type="hidden" name="quantita" value={quanti} />

      <button
        type="button"
        onClick={() => setQuanti((n) => Math.max(1, n - 1))}
        disabled={quanti === 1}
        aria-label={`Un ${titolo} in meno`}
        className="h-7 w-7 rounded border border-line text-muted transition-colors hover:border-nvgdim hover:text-ink disabled:opacity-30"
      >
        −
      </button>
      <span className="num w-5 text-center text-sm">{quanti}</span>
      <button
        type="button"
        onClick={() => setQuanti((n) => Math.min(50, n + 1))}
        aria-label={`Un ${titolo} in più`}
        className="h-7 w-7 rounded border border-line text-muted transition-colors hover:border-nvgdim hover:text-ink"
      >
        +
      </button>

      <button type="submit" disabled={inCorso} className="btn-primary btn-sm ml-1">
        <Icona nome="carrello" size={14} />
        {inCorso ? 'Aggiungo…' : 'Aggiungi'}
      </button>
    </form>
  );
}
