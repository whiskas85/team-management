'use client';

/**
 * Installare il gestionale come app sul telefono.
 *
 * Due mondi diversi, e vanno trattati per quello che sono:
 * - **Android** (Chrome, Edge, Samsung Internet): il browser offre
 *   l'installazione con l'evento `beforeinstallprompt`; lo si tiene da parte e
 *   lo si usa quando la persona preme il pulsante. Se l'evento non arriva
 *   (Firefox, o il browser ha deciso di non offrirlo), restano i passaggi a
 *   mano dal menu ⋮.
 * - **iPhone e iPad**: Apple non permette a un sito di installarsi con un
 *   tocco. Si può solo spiegare il gesto: Condividi → «Aggiungi alla schermata
 *   Home». Ed è il gesto che conta di più, perché **su iPhone le notifiche
 *   arrivano solo all'app installata**: senza, nessun avviso.
 *
 * L'evento di Android arriva presto, spesso prima che la pagina abbia finito
 * di caricare: per questo lo si ascolta da subito (RegistraApp, nel layout
 * radice) e non dal pulsante, che quando compare l'avrebbe già perso.
 */

type EventoInstallazione = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let offerta: EventoInstallazione | null = null;
const CAMBIO = 'zd-installazione';

/** Da chiamare una volta, il prima possibile: tiene da parte l'offerta di Android. */
export function ascoltaInstallazione() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // niente barra automatica del browser: lo proponiamo noi, col nostro pulsante
    e.preventDefault();
    offerta = e as EventoInstallazione;
    window.dispatchEvent(new Event(CAMBIO));
  });
  window.addEventListener('appinstalled', () => {
    offerta = null;
    window.dispatchEvent(new Event(CAMBIO));
  });
}

/** Avvisa quando l'offerta arriva o l'app viene installata. */
export function suCambio(f: () => void) {
  window.addEventListener(CAMBIO, f);
  return () => window.removeEventListener(CAMBIO, f);
}

/** Si sta già usando l'app installata (aperta dall'icona)? */
export function installata() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export type Telefono = 'iphone' | 'android' | 'altro';

export function telefono(): Telefono {
  const ua = navigator.userAgent;
  // l'iPad recente si presenta come un Mac: lo tradisce lo schermo touch
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'iphone';
  }
  if (/Android/.test(ua)) return 'android';
  return 'altro';
}

/** Su iPhone: Safari, o un altro browser (Chrome, Firefox, Edge) che ha lo stesso menu. */
export const safari = () => !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);

/** Il browser ha un'offerta d'installazione pronta (Android, o computer con Chrome/Edge)? */
export const offertaPronta = () => offerta !== null;

/** Apre la finestra d'installazione del browser. Vero se la persona ha detto sì. */
export async function installa(): Promise<boolean> {
  if (!offerta) return false;
  const e = offerta;
  await e.prompt();
  const { outcome } = await e.userChoice;
  // l'offerta vale una volta sola: se ne arriva un'altra, la riprendiamo
  offerta = null;
  window.dispatchEvent(new Event(CAMBIO));
  return outcome === 'accepted';
}
