'use client';

import { useEffect } from 'react';

/**
 * Il numerino sull'icona dell'app installata: quante cose aspettano, le
 * stesse dei pallini del menu principale. Ogni volta che il gestionale si
 * ridisegna (anche da solo, ogni tanto) il numero si rimette in pari; a zero
 * sparisce. Dove il telefono non lo sa fare, semplicemente non c'è.
 */
export function BadgeApp({ n }: { n: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge) return;
    (n > 0 ? nav.setAppBadge(n) : nav.clearAppBadge?.())?.catch(() => null);
  }, [n]);
  return null;
}
