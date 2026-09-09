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
