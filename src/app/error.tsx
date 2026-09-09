'use client';

import { useEffect, useRef, useState } from 'react';
import { leggiDiario } from '@/lib/diario';
import { registraErrore } from '@/actions/errori';

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
  const [riferimento, setRiferimento] = useState<string | null>(null);
  const spedito = useRef(false);

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

  /**
   * La segnalazione parte da sola, prima che qualcuno prema Ricarica.
   *
   * È tutto il punto: chi trova la pagina rotta ricarica e va avanti — fa bene
   * — ma con lui se ne andava anche l'unica occasione di sapere cos'era
   * successo. Adesso quello che la scheda sa parte prima, e a chi guarda resta
   * un riferimento da dire a voce.
   *
   * Non si spedisce quando è solo un aggiornamento: quello non è un difetto,
   * è il gestionale che è cambiato sotto una scheda rimasta aperta, e
   * riempirne il registro coprirebbe i guasti veri.
   */
  useEffect(() => {
    if (daAggiornamento || spedito.current) return;
    spedito.current = true;
    registraErrore({
      messaggio: error.message || 'errore senza messaggio',
      nome: error.name,
      digest: error.digest,
      stack: error.stack,
      origine: 'confine React',
      indirizzo: window.location.pathname + window.location.search,
      diario: leggiDiario(),
    })
      .then((r) => setRiferimento(r.riferimento ?? null))
      .catch(() => {
        // niente rete, o server giù: chi guarda ha già i suoi problemi, non
        // gli si aggiunge un secondo messaggio d'errore sopra al primo
      });
  }, [daAggiornamento, error]);

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

      {!daAggiornamento && (
        <p className="num mt-2 text-[11px] text-muted">
          {riferimento ? (
            <>
              Segnalazione inviata · riferimento{' '}
              <strong className="text-nvg">{riferimento}</strong>
            </>
          ) : error.digest ? (
            `riferimento ${error.digest}`
          ) : (
            'Sto spedendo la segnalazione…'
          )}
        </p>
      )}

      {!daAggiornamento && (
        <p className="mt-1 text-[11px] text-muted">
          Cosa stavi facendo è già stato registrato: non serve che te lo ricordi.
        </p>
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
