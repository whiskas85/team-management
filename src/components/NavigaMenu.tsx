'use client';

import { useEffect, useRef, useState } from 'react';
import { Icona } from './Icona';

export type MetaNaviga = {
  /** Cosa c'è scritto nel menu: «Ritrovo → campo», «Dritto al campo». */
  etichetta: string;
  /** La riga piccola sotto: il posto, o cosa vuol dire. */
  sotto?: string | null;
  href: string;
};

/**
 * Il pulsante Naviga della card, con le mete a scelta.
 *
 * Il tocco sul pulsante apre la meta che serve quasi sempre — la prima: il
 * giro intero dal ritrovo al campo, l'itinerario di chi guida, il punto dove
 * si sale. La freccina accanto apre le altre, per chi vuole andare dritto al
 * campo o solo al ritrovo.
 *
 * Il menu **galleggia sopra a tutto**: aprirlo non deve spostare la card né
 * spingere giù i pulsanti di risposta, che un attimo dopo si premerebbero per
 * sbaglio. Si chiude toccando fuori, con Esc, o scegliendo.
 */
export function NavigaMenu({ etichetta, mete }: { etichetta: string; mete: MetaNaviga[] }) {
  const [aperto, setAperto] = useState(false);
  // verso l'alto quando sotto non c'è posto (la barra in fondo al telefono)
  const [inSu, setInSu] = useState(false);
  const radice = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aperto) return;
    const fuori = (ev: PointerEvent) => {
      if (!radice.current?.contains(ev.target as Node)) setAperto(false);
    };
    const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && setAperto(false);
    document.addEventListener('pointerdown', fuori);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fuori);
      document.removeEventListener('keydown', esc);
    };
  }, [aperto]);

  if (mete.length === 0) return null;
  const [prima] = mete;
  const altre = mete.length > 1;

  return (
    <div ref={radice} className="relative shrink-0">
      <div className="flex h-[34px] overflow-hidden rounded-md border border-nvg/40 bg-nvg/10 text-nvg">
        <a
          href={prima.href}
          target="_blank"
          rel="noreferrer"
          title={prima.sotto ? `${prima.etichetta}: ${prima.sotto}` : prima.etichetta}
          className="inline-flex items-center gap-1.5 px-3 text-xs font-medium transition-colors hover:bg-nvg/20"
        >
          <Icona nome="naviga" size={14} />
          {etichetta}
        </a>
        {altre && (
          <button
            type="button"
            aria-label="Altre mete"
            aria-expanded={aperto}
            aria-haspopup="menu"
            onClick={() => {
              const r = radice.current?.getBoundingClientRect();
              // circa 64px a meta, più la barra in basso del telefono
              if (r) setInSu(window.innerHeight - r.bottom < mete.length * 64 + 90);
              setAperto((v) => !v);
            }}
            className={`grid w-8 place-items-center border-l border-nvg/40 transition-colors hover:bg-nvg/20 ${
              aperto ? 'bg-nvg/20' : ''
            }`}
          >
            <span className={`text-[10px] transition-transform ${aperto ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        )}
      </div>

      {aperto && (
        <div
          role="menu"
          className={`absolute right-0 z-50 w-60 ${inSu ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} overflow-hidden rounded-lg border border-line bg-surface shadow-2xl shadow-black/60`}
        >
          {mete.map((m) => (
            <a
              key={m.etichetta}
              role="menuitem"
              href={m.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setAperto(false)}
              className="block border-t border-line px-3 py-2.5 text-sm first:border-t-0 hover:bg-surface2"
            >
              <span className="flex items-center gap-2 text-ink">
                <Icona nome="naviga" size={13} />
                {m.etichetta}
              </span>
              {m.sotto && (
                <span className="mt-0.5 block truncate text-xs text-muted">{m.sotto}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
