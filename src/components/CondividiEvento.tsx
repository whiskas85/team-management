'use client';

import { useState } from 'react';
import { Icona } from './Icona';
import { mostraToast } from './Toast';

/**
 * Copia il link dell'attività.
 *
 * Copiare e basta, senza scegliere l'applicazione: il link finisce dove serve
 * — la chat della squadra, un messaggio a una persona, un promemoria — e
 * mandarlo su WhatsApp da qui vorrebbe dire decidere per chi condivide.
 *
 * Va il **link della pagina**, non un riassunto: chi lo riceve entra e trova
 * adesioni, quote e mappa aggiornate, mentre un riassunto incollato in chat
 * invecchia il giorno dopo.
 */
export function CondividiEvento({ indirizzo }: { indirizzo: string }) {
  const [copiato, setCopiato] = useState(false);

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

    setCopiato(true);
    mostraToast('Link copiato: incollalo dove vuoi.', 'ok');
    setTimeout(() => setCopiato(false), 2500);
  };

  return (
    <button type="button" onClick={copia} className="btn-ghost btn-sm">
      <Icona nome={copiato ? 'presente' : 'apri'} size={15} />
      {copiato ? 'Copiato' : 'Copia il link'}
    </button>
  );
}
