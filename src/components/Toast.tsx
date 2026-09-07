'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icona } from './Icona';

/**
 * Un avviso che compare in basso e se ne va da solo.
 *
 * Nasce da un problema pratico: l'esito di un pulsante scritto **dentro la
 * riga** allargava la riga, e per far posto al testo si accorciava il nome
 * della persona — *«Marc…»*. Il messaggio ha bisogno di spazio che la riga non
 * ha, e la riga non deve cambiare forma per un avviso che dura cinque secondi.
 *
 * Viaggia in un portale attaccato al `body`: così non eredita larghezze,
 * `overflow` o posizionamenti di dove è stato scritto, e resta al suo posto
 * anche quando esce da una tabella o da una finestra.
 */
export function Toast({
  messaggio,
  tono = 'danger',
  onChiudi,
}: {
  messaggio: string;
  tono?: 'ok' | 'danger';
  onChiudi: () => void;
}) {
  const [montato, setMontato] = useState(false);

  useEffect(() => setMontato(true), []);

  useEffect(() => {
    // gli errori restano più a lungo: c'è da leggerli, non solo da vederli
    const t = setTimeout(onChiudi, tono === 'danger' ? 7000 : 3500);
    return () => clearTimeout(t);
  }, [messaggio, tono, onChiudi]);

  if (!montato) return null;

  return createPortal(
    <div
      role="status"
      className="fixed inset-x-3 bottom-20 z-[100] mx-auto max-w-md md:bottom-6"
    >
      <div
        className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg backdrop-blur ${
          tono === 'danger'
            ? 'border-danger/50 bg-danger/15 text-danger'
            : 'border-nvg/50 bg-nvg/15 text-nvg'
        }`}
      >
        <span className="min-w-0 flex-1">{messaggio}</span>
        <button
          type="button"
          onClick={onChiudi}
          aria-label="Chiudi"
          className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
        >
          <Icona nome="chiudi" size={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
