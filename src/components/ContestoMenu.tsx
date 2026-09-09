'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { VoceMenu } from './Nav';

/**
 * Il menu, a disposizione di chi sta più in basso nella pagina.
 *
 * Serve alla stellina, che ha preso posto **nella riga del titolo** e non più
 * in una striscia sua: da lì dentro non arriva niente: il titolo lo disegna
 * ogni pagina, e nessuna di loro sa cosa sia il menu né quale voce si stia
 * guardando.
 *
 * Passa da un contesto e non da una proprietà su ogni intestazione perché le
 * pagine sono quaranta: farsi passare il menu da tutte vorrebbe dire toccarle
 * tutte e quaranta oggi, e ricordarsene su ognuna che nascerà domani.
 */
const Contesto = createContext<{ voci: VoceMenu[] } | null>(null);

export function ContestoMenu({ voci, children }: { voci: VoceMenu[]; children: ReactNode }) {
  return <Contesto.Provider value={{ voci }}>{children}</Contesto.Provider>;
}

/**
 * La voce di menu della pagina che si sta guardando, se è una voce di menu.
 *
 * Vince la corrispondenza più lunga, come nel menu: `/mercatino/carrello` sta
 * sotto `/mercatino`, ma la voce giusta è il carrello. `null` vuol dire che
 * questa pagina non è una destinazione del menu — la scheda di un'attività, di
 * un annuncio — e lì la stellina non ha niente da mettere da parte.
 */
export function useVoceCorrente(): VoceMenu | null {
  const contesto = useContext(Contesto);
  const pathname = usePathname();
  if (!contesto) return null;

  return (
    contesto.voci
      .filter((v) =>
        v.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname === v.href || pathname.startsWith(v.href + '/'),
      )
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null
  );
}
