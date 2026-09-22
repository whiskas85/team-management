'use client';

import { useEffect } from 'react';

/**
 * Registra il service worker, che è la condizione perché telefono e computer
 * offrano di installare il gestionale come applicazione.
 *
 * Fallisce di proposito in silenzio: serve un contesto sicuro, e con un
 * certificato firmato da noi il browser lo nega anche dopo che si è accettato
 * l'avviso. In quel caso il gestionale funziona identico dentro il browser —
 * non c'è niente da dire a chi lo sta usando.
 */
export function RegistraApp() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* contesto non sicuro o registrazione rifiutata: si continua senza */
    });
  }, []);

  return null;
}
