'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { impostaNotte } from '@/actions/operatori';

/**
 * Chiaro o scuro, per sé: un selettore a due posizioni, «Chiaro» a sinistra e
 * «Scuro» a destra, col cursore colorato che scorre sotto quello acceso. Si
 * legge da solo quale dei due è scelto, senza dover capire da che parte sta
 * una levetta.
 *
 * Chi ha un profilo se lo ritrova ovunque; chi apre una pagina pubblica
 * (l'invito di una squadra ospite) lo ritrova su quel telefono.
 */
export function SelettoreChiaroScuro({
  notte,
  tabIndex,
  className = '',
}: {
  notte: boolean;
  /** -1 quando sta in un menu chiuso: non si raggiunge col tasto Tab. */
  tabIndex?: number;
  className?: string;
}) {
  const router = useRouter();
  const [cambiando, avvia] = useTransition();
  // si sposta subito, senza aspettare il server: il tema arriva un attimo dopo
  const [buio, setBuio] = useState(notte);
  useEffect(() => setBuio(notte), [notte]);
  const scegli = (scuro: boolean) => {
    if (scuro === buio) return;
    setBuio(scuro);
    avvia(async () => {
      await impostaNotte(scuro);
      router.refresh();
    });
  };
  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={`relative grid grid-cols-2 rounded-full border border-line bg-surface2 p-0.5 ${className}`}
    >
      <span
        aria-hidden
        className="absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-2px)] rounded-full bg-nvg shadow transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: buio ? 'translateX(100%)' : 'translateX(0)' }}
      />
      {(
        [
          { scuro: false, segno: '☀', nome: 'Chiaro' },
          { scuro: true, segno: '☾', nome: 'Scuro' },
        ] as const
      ).map((o) => {
        const scelto = buio === o.scuro;
        return (
          <button
            key={o.nome}
            type="button"
            role="radio"
            aria-checked={scelto}
            disabled={cambiando}
            tabIndex={tabIndex}
            onClick={() => scegli(o.scuro)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              scelto ? 'text-nvgink' : 'text-muted hover:text-ink'
            }`}
          >
            <span aria-hidden>{o.segno}</span>
            {o.nome}
          </button>
        );
      })}
    </div>
  );
}
