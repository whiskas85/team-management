'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Una mappa che non si prende la pagina.
 *
 * La mappa incorporata, appena il dito o la rotellina ci passano sopra, si
 * sposta e si ingrandisce lei, e la pagina smette di scorrere: chi voleva solo
 * andare più giù si ritrova a zoomare su un bosco. Qui sopra c'è un velo
 * trasparente che lascia scorrere la pagina; toccando (o cliccando) la mappa
 * il velo se ne va, e da lì in poi si sposta e si ingrandisce. Torna a posto
 * appena si tocca altrove, o il mouse esce dalla mappa.
 */
export function MappaFerma({ children }: { children: ReactNode }) {
  const [attiva, setAttiva] = useState(false);
  const dentro = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!attiva) return;
    const fuori = (e: PointerEvent) => {
      if (!dentro.current?.contains(e.target as Node)) setAttiva(false);
    };
    document.addEventListener('pointerdown', fuori);
    return () => document.removeEventListener('pointerdown', fuori);
  }, [attiva]);

  return (
    <div ref={dentro} className="relative" onMouseLeave={() => setAttiva(false)}>
      {children}
      {!attiva && (
        <button
          type="button"
          onClick={() => setAttiva(true)}
          className="group absolute inset-0 flex items-end justify-center bg-transparent pb-2"
          aria-label="Usa la mappa: spostala e ingrandiscila"
        >
          <span className="rounded-full bg-bg/80 px-2.5 py-1 text-[11px] text-ink opacity-80 shadow group-hover:opacity-100">
            Tocca per muovere la mappa
          </span>
        </button>
      )}
    </div>
  );
}
