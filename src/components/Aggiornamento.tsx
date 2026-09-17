'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Le pagine si aggiornano da sole, senza premere niente.
 *
 * Il gestionale disegna le pagine sul server: quello che si vede è una
 * fotografia del momento in cui è stata aperta. Bastava che qualcuno si
 * segnasse a un'attività, o che la segreteria spuntasse un incasso, perché
 * quella fotografia diventasse vecchia — e chi guardava non aveva modo di
 * saperlo se non ricaricando a mano.
 *
 * Qui si richiede al server la stessa pagina ogni tanto e si sostituisce
 * quello che è cambiato. Non è una connessione sempre aperta — per una
 * squadra di trenta persone sarebbe artiglieria per un passero — ma il
 * risultato per chi guarda è lo stesso: i numeri si muovono da soli.
 *
 * **Quando non si aggiorna**, ed è la parte che conta:
 * - a scheda nascosta, perché aggiornare una pagina che nessuno guarda è solo
 *   traffico;
 * - mentre si sta scrivendo in un campo, che è il modo più sicuro per far
 *   perdere a qualcuno quello che stava digitando;
 * - con una finestra aperta sopra, perché si sta decidendo qualcosa.
 *
 * E si aggiorna **subito** tornando sulla scheda: è il momento in cui uno
 * riguarda, ed è lì che i dati vecchi danno più fastidio.
 */
export function Aggiornamento({ ogni = 25_000 }: { ogni?: number }) {
  const router = useRouter();

  useEffect(() => {
    const visibile = () => document.visibilityState === 'visible';

    const occupato = () => {
      const dove = document.activeElement;
      const sceglie =
        dove instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(dove.tagName);
      return sceglie || document.querySelector('[role="dialog"]') !== null;
    };

    const guarda = () => {
      if (visibile() && !occupato()) router.refresh();
    };

    const orologio = setInterval(guarda, ogni);
    const alRitorno = () => {
      if (visibile()) guarda();
    };
    document.addEventListener('visibilitychange', alRitorno);

    return () => {
      clearInterval(orologio);
      document.removeEventListener('visibilitychange', alRitorno);
    };
  }, [ogni, router]);

  return null;
}
