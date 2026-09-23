'use client';

import { useEffect } from 'react';

/**
 * Chiede al service worker chi è, e lo dice al gestionale.
 *
 * La versione del gestionale la sa già il server — la scrive accanto
 * all'ultima attività — ma quella del service worker no: lui vive sul
 * dispositivo, si aggiorna quando decide il browser e può restare indietro di
 * settimane. È il pezzo che manca quando una notifica non arriva e non si
 * capisce perché.
 *
 * Si chiede **una volta per sessione del browser**: la risposta cambia solo
 * quando il service worker si aggiorna, e per allora la scheda è stata
 * riaperta. Se non risponde entro due secondi è un service worker precedente
 * a quello che sa rispondere, e si scrive «vecchia».
 */
const CHIAVE = 'zd-versione-sw-detta';
const ATTESA = 2000;

async function chiediAlServiceWorker(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  const attivo = reg?.active;
  if (!attivo) return null;

  return new Promise((risolvi) => {
    const canale = new MessageChannel();
    const orologio = setTimeout(() => risolvi('vecchia'), ATTESA);
    canale.port1.onmessage = (e) => {
      clearTimeout(orologio);
      const v = (e.data as { versione?: unknown } | null)?.versione;
      risolvi(typeof v === 'string' ? v : 'vecchia');
    };
    try {
      attivo.postMessage({ tipo: 'versione' }, [canale.port2]);
    } catch {
      clearTimeout(orologio);
      risolvi('vecchia');
    }
  });
}

export function SegnaVersione() {
  useEffect(() => {
    let vivo = true;

    const dillo = async () => {
      const versione = await chiediAlServiceWorker();
      if (!vivo || !versione) return;
      // già detta in questa sessione del browser: non si ripete a ogni pagina
      try {
        if (sessionStorage.getItem(CHIAVE) === versione) return;
      } catch {
        /* navigazione privata o memoria negata: si dice comunque */
      }
      const risposta = await fetch('/api/versione', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sw: versione }),
        keepalive: true,
      }).catch(() => null);
      if (!risposta?.ok) return;
      try {
        sessionStorage.setItem(CHIAVE, versione);
      } catch {
        /* vedi sopra */
      }
    };

    void dillo();
    return () => {
      vivo = false;
    };
  }, []);

  return null;
}
