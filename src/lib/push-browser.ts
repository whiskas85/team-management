'use client';

/**
 * L'iscrizione di **questo** dispositivo alle notifiche.
 *
 * Sta in un posto solo perché la usano in due: il riquadro nel profilo, dove
 * si accendono e si spengono, e l'invito che compare a chi non le ha ancora.
 * Due copie della stessa procedura sarebbero due modi diversi di sbagliarla.
 */

import { registraErrore } from '@/actions/errori';

export type EsitoIscrizione = 'ok' | 'negato' | 'non-supportato' | 'errore';

/**
 * Perché l'ultima attivazione non è andata, detto a chi la sta facendo.
 *
 * «Non sono riuscito» non aiuta nessuno: né chi ci prova, né chi deve capire
 * cosa è successo sul telefono di un altro. Il motivo vero finisce anche nel
 * registro dei guasti, con il browser che l'ha dato.
 */
let ultimoMotivo: string | null = null;
export const motivoUltimoErrore = () => ultimoMotivo;

/** Da un errore tecnico a una frase per chi ha in mano il telefono. */
function spiega(passo: string, e: unknown, stato?: number): string {
  const testo = e instanceof Error ? `${e.name}: ${e.message}` : String(e ?? '');
  if (stato === 401) return 'La sessione è scaduta: esci, rientra e riprova.';
  if (passo === 'chiave' && stato === 503) {
    return 'Le notifiche non sono configurate sul server: avvisa l’admin.';
  }
  if (/push service not available|push service error|Registration failed/i.test(testo)) {
    return 'Il telefono non riesce a parlare col servizio di notifiche. Succede con alcuni browser (Brave, o Chrome su telefoni senza servizi Google come i Huawei): prova con Chrome o Firefox, o apri il gestionale installato.';
  }
  if (/NotAllowedError|permission/i.test(testo)) {
    return 'Il permesso è stato negato: si riattiva dalle impostazioni del browser, alla voce Notifiche.';
  }
  return 'Non sono riuscito ad attivarle qui. Il motivo è stato registrato: l’admin lo trova fra i guasti.';
}

/** Scrive il motivo vero fra i guasti, senza mai far fallire niente. */
function registra(passo: string, e: unknown, stato?: number) {
  const testo = e instanceof Error ? `${e.name}: ${e.message}` : String(e ?? '');
  ultimoMotivo = spiega(passo, e, stato);
  void registraErrore({
    messaggio: `Notifiche, passo «${passo}»: ${stato ? `HTTP ${stato} ` : ''}${testo}`.trim(),
    nome: e instanceof Error ? e.name : undefined,
    stack: e instanceof Error ? e.stack : undefined,
    indirizzo: typeof location !== 'undefined' ? location.pathname : undefined,
    origine: 'notifiche',
  }).catch(() => {});
}

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
  ultimoMotivo = null;
  if (!supportate()) return 'non-supportato';

  // il passo in cui siamo: se qualcosa salta, si sa dove
  let passo = 'permesso';
  try {
    const permesso =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permesso !== 'granted') return 'negato';

    passo = 'chiave';
    const risposta = await fetch('/api/push/chiave');
    if (!risposta.ok) {
      registra(passo, new Error('chiave non ricevuta'), risposta.status);
      return 'errore';
    }
    const { chiave } = await risposta.json();

    // il service worker può non essere mai pronto (registrazione fallita):
    // meglio dirlo dopo qualche secondo che restare appesi per sempre
    passo = 'service-worker';
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, no) =>
        setTimeout(() => no(new Error('service worker non pronto dopo 10 secondi')), 10_000),
      ),
    ]);

    passo = 'iscrizione';
    const iscrizione =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: daBase64(chiave),
      }));

    passo = 'salvataggio';
    const salvata = await fetch('/api/push/iscrivi', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(iscrizione),
    });
    if (!salvata.ok) {
      registra(passo, new Error('iscrizione non salvata'), salvata.status);
      return 'errore';
    }
    return 'ok';
  } catch (e) {
    registra(passo, e);
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
