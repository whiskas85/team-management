'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { annota, leggiDiario } from '@/lib/diario';
import { registraErrore } from '@/actions/errori';

/**
 * Tiene il diario di bordo e raccoglie i guasti che il confine di React non
 * vede.
 *
 * Ci sono due modi di rompersi, e finora ne raccontavamo zero. Uno è quello
 * che fa comparire *«qualcosa si è rotto»*: lì interviene `error.tsx`. L'altro
 * non si vede — una promessa rifiutata, un errore dentro un gestore di eventi
 * — e non rompe la pagina, la lascia **storta**: un pulsante che non risponde,
 * un elenco che resta vuoto. Sono i più fastidiosi da farsi raccontare, perché
 * chi li subisce non ha niente da riferire se non «non andava».
 *
 * Questo componente sta nel guscio dell'applicazione, non ha nulla da
 * disegnare, e fa tre cose: annota dove si va, annota cosa si rompe, e spedisce
 * quando si rompe qualcosa che nessun altro raccoglierebbe.
 */
/**
 * Quello che non è un guasto, e va lasciato fuori dal registro.
 *
 * Due famiglie, entrambe rumore puro:
 *
 * - **la rete che non c'è.** «NetworkError», «Failed to fetch», «Load
 *   failed»: il telefono è passato sotto un ponte, il wifi è caduto, oppure
 *   il gestionale si stava riavviando per un rilascio. Non c'è niente da
 *   correggere nel codice, e queste righe seppelliscono quelle vere.
 * - **«Script error.» senza altro.** È quello che il browser dice quando
 *   l'errore arriva da uno script di un'altra origine — quasi sempre
 *   un'estensione del browser di chi naviga. Non ha stack, non ha riga, non
 *   ha niente: non è raccontabile nemmeno volendo.
 *
 * Restano nel diario di bordo, che è il posto giusto: se poi si rompe
 * qualcosa davvero, lì si legge che quel momento la rete non c'era.
 */
const rumore = (messaggio: string) => {
  const m = messaggio.toLowerCase();
  return (
    m.includes('networkerror') ||
    m.includes('failed to fetch') ||
    m.includes('load failed') ||
    m.includes('fetch failed') ||
    m.includes('network request failed') ||
    m === 'script error.' ||
    m === 'script error'
  );
};

export function Diario() {
  const pathname = usePathname();
  // spedito in questa vita della pagina: si manda il primo, non i venti che
  // seguono a valanga quando qualcosa va davvero storto
  const spedito = useRef(false);

  useEffect(() => {
    annota('pagina', pathname);
  }, [pathname]);

  useEffect(() => {
    const manda = (messaggio: string, origine: string, stack?: string, nome?: string) => {
      annota('errore', messaggio);
      if (rumore(messaggio)) return;
      if (spedito.current) return;
      spedito.current = true;
      // non si aspetta la risposta e non si mostra niente: qui la pagina è
      // ancora viva e chi la sta usando non deve essere interrotto da un
      // guasto che magari non ha nemmeno notato
      registraErrore({
        messaggio,
        nome,
        stack,
        origine,
        indirizzo: window.location.pathname + window.location.search,
        diario: leggiDiario(),
      }).catch(() => {
        // se non parte, pazienza: un registro dei guasti che rompe la pagina
        // sarebbe la barzelletta peggiore
      });
    };

    const suErrore = (e: ErrorEvent) => {
      manda(e.message || 'errore senza messaggio', 'window.onerror', e.error?.stack, e.error?.name);
    };

    const suPromessa = (e: PromiseRejectionEvent) => {
      const motivo = e.reason;
      manda(
        motivo instanceof Error ? motivo.message : String(motivo),
        'promessa rifiutata',
        motivo instanceof Error ? motivo.stack : undefined,
        motivo instanceof Error ? motivo.name : undefined,
      );
    };

    // console.error non si spedisce: ci finiscono anche gli avvisi di React e
    // il registro diventerebbe rumore. Nel diario però ci va, perché quando poi
    // qualcosa si rompe davvero, spesso la spiegazione è due righe più su.
    const vero = console.error;
    console.error = (...args: unknown[]) => {
      annota('console', args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
      vero(...args);
    };

    window.addEventListener('error', suErrore);
    window.addEventListener('unhandledrejection', suPromessa);
    return () => {
      window.removeEventListener('error', suErrore);
      window.removeEventListener('unhandledrejection', suPromessa);
      console.error = vero;
    };
  }, []);

  return null;
}
