'use client';

import { useEffect, useState } from 'react';

/**
 * Il riquadro isolato in cui si legge un allegato HTML.
 *
 * Finché il file non è arrivato tutto resta coperto. Un book esportato ha
 * spesso i pulsanti in cima e lo script che li fa funzionare in fondo, dopo
 * immagini incorporate da un mega e più: si vedeva il pulsante «Stampa» molto
 * prima che esistesse quello che doveva fare, e premerlo dava «printAll is not
 * defined». Coperto fino al caricamento, lo si preme solo quando funziona.
 */
export function RiquadroHtml({ src, titolo }: { src: string; titolo: string }) {
  const [pronto, setPronto] = useState(false);
  // il riquadro nasce solo nel browser: se cominciasse a caricare prima che la
  // pagina sia attiva, la fine del caricamento non la sentirebbe nessuno e la
  // copertura resterebbe su
  const [montato, setMontato] = useState(false);
  useEffect(() => setMontato(true), []);
  return (
    <div className="relative">
      {/* solo script e finestre di sistema (la stampa del book, i suoi
          avvisi): niente stessa origine (quindi niente sessione), niente
          moduli, niente finestre nuove, niente mani sulla pagina intorno. La
          rotta che lo serve gli dà anche un'origine sua, così i due lucchetti
          stanno sulla stessa porta. */}
      {montato ? (
        <iframe
          src={src}
          title={titolo}
          sandbox="allow-scripts allow-modals"
          referrerPolicy="no-referrer"
          onLoad={() => setPronto(true)}
          className="h-[70vh] w-full rounded-md border border-line bg-white"
        />
      ) : (
        <div className="h-[70vh] w-full rounded-md border border-line" />
      )}
      {!pronto && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-surface/95 text-sm text-muted">
          Caricamento del documento…
        </div>
      )}
    </div>
  );
}
