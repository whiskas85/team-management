'use client';

import { useEffect } from 'react';
import { segnaPagamentiVisti } from '@/actions/letture';

/**
 * Segna Miei pagamenti come vista quando la si lascia, non quando la si apre:
 * le righe nuove — una quota appena addebitata, un credito ricevuto — restano
 * in evidenza per tutto il tempo che la si guarda, e alla prossima visita
 * sono righe come le altre. Il pallino nel menu si spegne uscendo.
 */
export function SegnaPagamentiVisti() {
  useEffect(() => {
    let fatto = false;
    const segna = () => {
      if (fatto) return;
      fatto = true;
      segnaPagamentiVisti().catch(() => null);
    };
    const nascosta = () => document.visibilityState === 'hidden' && segna();
    document.addEventListener('visibilitychange', nascosta);
    window.addEventListener('pagehide', segna);
    return () => {
      document.removeEventListener('visibilitychange', nascosta);
      window.removeEventListener('pagehide', segna);
      segna();
    };
  }, []);

  return null;
}
