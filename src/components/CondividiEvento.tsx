'use client';

import { useState } from 'react';
import { Icona } from './Icona';
import { mostraToast } from './Toast';

/**
 * Manda via il link: il simbolo della condivisione, e basta.
 *
 * Sul telefono apre **il foglio di condivisione del sistema** — quello da cui
 * si sceglie WhatsApp, Telegram, un messaggio — che è il gesto che uno ha in
 * mente quando vuole mandare un link a qualcuno. Dove quel foglio non c'è (il
 * computer, i browser che non lo supportano) si ripiega sul copiare negli
 * appunti, che è la stessa cosa fatta a mano.
 *
 * **Non si manda su WhatsApp da qui.** Aprire direttamente una chat vorrebbe
 * dire decidere per chi condivide: il link a volte va nel gruppo, a volte a una
 * persona sola, a volte in un promemoria. Il foglio di sistema lascia la scelta
 * a chi preme.
 *
 * Va il **link della pagina**, non un riassunto: chi lo riceve entra e trova
 * adesioni, quote e mappa aggiornate, mentre un riassunto incollato in chat
 * invecchia il giorno dopo.
 */
export function CondividiEvento({
  indirizzo,
  etichetta = 'Condividi il link',
}: {
  indirizzo: string;
  /** Cosa legge chi naviga con lo schermo spento: il pulsante è una sola icona. */
  etichetta?: string;
}) {
  const [fatto, setFatto] = useState(false);

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(indirizzo);
    } catch {
      // sui browser che non danno gli appunti — o senza HTTPS — si ripiega
      // sul vecchio modo, che è brutto ma funziona ovunque
      const casella = document.createElement('textarea');
      casella.value = indirizzo;
      casella.style.position = 'fixed';
      casella.style.opacity = '0';
      document.body.appendChild(casella);
      casella.select();
      try {
        document.execCommand('copy');
      } catch {
        mostraToast('Non riesco a copiare: il link è nella barra dell’indirizzo.', 'warn');
        document.body.removeChild(casella);
        return;
      }
      document.body.removeChild(casella);
    }

    setFatto(true);
    mostraToast('Link copiato: incollalo dove vuoi.', 'ok');
    setTimeout(() => setFatto(false), 2500);
  };

  const condividi = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url: indirizzo });
        return;
      } catch (e) {
        // Chiudere il foglio senza scegliere niente non è un errore: è uno che
        // ci ha ripensato, e non va né avvisato né trattato come un guasto.
        if (e instanceof DOMException && e.name === 'AbortError') return;
        // qualsiasi altro intoppo: si ripiega sugli appunti invece di lasciare
        // chi preme senza il link
      }
    }
    await copia();
  };

  return (
    <button
      type="button"
      onClick={condividi}
      className="btn-ghost btn-sm px-2"
      aria-label={etichetta}
      title={etichetta}
    >
      <Icona nome={fatto ? 'presente' : 'condividi'} size={16} />
    </button>
  );
}
