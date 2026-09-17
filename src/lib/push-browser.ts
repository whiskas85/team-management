'use client';

/**
 * L'iscrizione di **questo** dispositivo alle notifiche.
 *
 * Sta in un posto solo perché la usano in due: il riquadro nel profilo, dove
 * si accendono e si spengono, e l'invito che compare a chi non le ha ancora.
 * Due copie della stessa procedura sarebbero due modi diversi di sbagliarla.
 */

export type EsitoIscrizione = 'ok' | 'negato' | 'non-supportato' | 'errore';

export const supportate = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

/** Questo dispositivo è già iscritto? */
export async function giaIscritto(): Promise<boolean> {
  if (!supportate()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription()) !== null;
  } catch {
    return false;
  }
}

/**
 * Chiede il permesso, si iscrive e lo dice al gestionale.
 *
 * **Va chiamata da un gesto** — un pulsante premuto — e non all'apertura della
 * pagina: un permesso chiesto da solo viene negato per riflesso, e negato una
 * volta non si può più richiedere se non dalle impostazioni del browser.
 *
 * Fa eccezione il caso in cui il permesso ci sia già: allora non si chiede
 * niente a nessuno, ci si iscrive e basta.
 */
export async function iscriviDispositivo(): Promise<EsitoIscrizione> {
  if (!supportate()) return 'non-supportato';

  try {
    const permesso =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permesso !== 'granted') return 'negato';

    const risposta = await fetch('/api/push/chiave');
    if (!risposta.ok) return 'errore';
    const { chiave } = await risposta.json();

    const reg = await navigator.serviceWorker.ready;
    const iscrizione =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: daBase64(chiave),
      }));

    const salvata = await fetch('/api/push/iscrivi', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(iscrizione),
    });
    return salvata.ok ? 'ok' : 'errore';
  } catch {
    return 'errore';
  }
}

/** Toglie questo dispositivo, qui e sul server. */
export async function disiscriviDispositivo(): Promise<void> {
  if (!supportate()) return;
  const reg = await navigator.serviceWorker.ready;
  const iscrizione = await reg.pushManager.getSubscription();
  if (!iscrizione) return;

  await fetch('/api/push/iscrivi', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint: iscrizione.endpoint }),
  });
  await iscrizione.unsubscribe();
}

/** La chiave viaggia in base64url, il browser la vuole in byte. */
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
