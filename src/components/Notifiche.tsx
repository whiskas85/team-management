'use client';

import { useEffect, useState } from 'react';
import { mostraToast } from './Toast';

/**
 * «Avvisami sul telefono.»
 *
 * Il permesso lo chiede il browser, e lo chiede **solo dopo un gesto**: un
 * avviso che spunta da solo appena si apre una pagina viene negato per
 * riflesso, e negato una volta non si può più richiedere — tocca andare nelle
 * impostazioni del telefono. Per questo qui c'è un pulsante e non un popup al
 * caricamento.
 *
 * Su iPhone funziona solo se il gestionale è stato **installato** dalla
 * schermata iniziale: è una regola di Apple, non nostra, e va detta invece di
 * lasciare la gente a chiedersi perché non succede niente.
 */
export function Notifiche() {
  const [stato, setStato] = useState<'ignoto' | 'non-supportate' | 'spente' | 'accese' | 'negate'>(
    'ignoto',
  );
  const [attesa, setAttesa] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStato('non-supportate');
      return;
    }
    if (Notification.permission === 'denied') {
      setStato('negate');
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((iscr) => setStato(iscr ? 'accese' : 'spente'))
      .catch(() => setStato('non-supportate'));
  }, []);

  async function accendi() {
    setAttesa(true);
    try {
      const permesso = await Notification.requestPermission();
      if (permesso !== 'granted') {
        setStato(permesso === 'denied' ? 'negate' : 'spente');
        return;
      }

      const risposta = await fetch('/api/push/chiave');
      if (!risposta.ok) throw new Error('chiave non disponibile');
      const { chiave } = await risposta.json();

      const reg = await navigator.serviceWorker.ready;
      const iscrizione = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: daBase64(chiave),
      });

      const salvata = await fetch('/api/push/iscrivi', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(iscrizione),
      });
      if (!salvata.ok) throw new Error('iscrizione non salvata');

      setStato('accese');
      mostraToast('Notifiche attive su questo dispositivo.', 'ok');
    } catch {
      mostraToast('Non sono riuscito ad attivare le notifiche qui.', 'errore');
    } finally {
      setAttesa(false);
    }
  }

  async function spegni() {
    setAttesa(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const iscrizione = await reg.pushManager.getSubscription();
      if (iscrizione) {
        await fetch('/api/push/iscrivi', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint: iscrizione.endpoint }),
        });
        await iscrizione.unsubscribe();
      }
      setStato('spente');
      mostraToast('Niente più notifiche su questo dispositivo.', 'ok');
    } finally {
      setAttesa(false);
    }
  }

  if (stato === 'ignoto') return null;

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-medium">Notifiche sul dispositivo</h2>
        <p className="mt-1 text-sm text-muted">
          Arrivano anche col gestionale chiuso: una registrazione da approvare, e col tempo il
          resto. Valgono per <em>questo</em> dispositivo: telefono e computer si accendono
          separatamente.
        </p>
      </div>

      {stato === 'non-supportate' && (
        <p className="text-sm text-muted">
          Questo browser non le gestisce. Su iPhone bisogna prima installare il gestionale dalla
          schermata iniziale: Condividi → Aggiungi a Home.
        </p>
      )}

      {stato === 'negate' && (
        <p className="text-sm text-warn">
          Le hai bloccate per questo sito. Si riattivano dalle impostazioni del browser, alla voce
          notifiche: da qui non si può più chiedere.
        </p>
      )}

      {stato === 'spente' && (
        <button type="button" onClick={accendi} disabled={attesa} className="btn-primary btn-sm">
          {attesa ? 'Attivo…' : 'Attiva le notifiche qui'}
        </button>
      )}

      {stato === 'accese' && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-nvg">Attive su questo dispositivo.</span>
          <button type="button" onClick={spegni} disabled={attesa} className="btn-ghost btn-sm">
            Disattiva
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * La chiave viaggia in base64url, il browser la vuole in byte.
 *
 * Il buffer si crea esplicitamente e non con `new Uint8Array(lunghezza)`:
 * quello, per i tipi, potrebbe stare su memoria condivisa, che qui non è
 * ammessa.
 */
function daBase64(base64url: string): ArrayBuffer {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const grezzo = atob(base64);
  const buffer = new ArrayBuffer(grezzo.length);
  const byte = new Uint8Array(buffer);
  for (let i = 0; i < grezzo.length; i++) byte[i] = grezzo.charCodeAt(i);
  return buffer;
}
