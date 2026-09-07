'use client';

import { useEffect, useState } from 'react';

/**
 * Cosa si vede quando una pagina si rompe sotto le mani.
 *
 * Il caso di gran lunga più frequente non è un difetto: è il gestionale
 * aggiornato mentre qualcuno aveva le pagine aperte. La scheda continua a
 * chiedere i pezzi della versione precedente, che nella nuova non ci sono più,
 * e senza questo confine Next mostra una frase in inglese e un vicolo cieco.
 *
 * Quel caso si riconosce e si cura da solo ricaricando; per tutto il resto si
 * dice cosa è successo e si lascia il pulsante, senza far sparire la pagina.
 */
export default function Errore({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [ricarico, setRicarico] = useState(false);

  const daAggiornamento =
    /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported|Importing a module script failed/i.test(
      `${error.name} ${error.message}`,
    );

  useEffect(() => {
    if (!daAggiornamento) return;
    // una volta sola: se anche dopo il ricaricamento si rompe, è un difetto
    // vero e continuare a ricaricare nasconderebbe il problema
    if (sessionStorage.getItem('zd-ricaricato') === '1') return;
    sessionStorage.setItem('zd-ricaricato', '1');
    setRicarico(true);
    location.reload();
  }, [daAggiornamento]);

  useEffect(() => {
    if (!daAggiornamento) sessionStorage.removeItem('zd-ricaricato');
  }, [daAggiornamento]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-xl font-semibold">
        {daAggiornamento ? 'Il gestionale è stato aggiornato' : 'Qualcosa si è rotto'}
      </h1>

      <p className="mt-3 text-sm text-muted">
        {daAggiornamento
          ? ricarico
            ? 'Sto ricaricando la pagina con la versione nuova…'
            : 'Questa pagina è della versione precedente: ricaricala per continuare.'
          : 'La pagina non è riuscita a caricarsi. Riprova; se succede ancora, segnalalo con quello che stavi facendo.'}
      </p>

      {error.digest && !daAggiornamento && (
        <p className="num mt-2 text-[11px] text-muted">riferimento {error.digest}</p>
      )}

      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={() => location.reload()} className="btn-primary">
          Ricarica la pagina
        </button>
        {!daAggiornamento && (
          <button type="button" onClick={reset} className="btn-ghost">
            Riprova
          </button>
        )}
      </div>
    </div>
  );
}
