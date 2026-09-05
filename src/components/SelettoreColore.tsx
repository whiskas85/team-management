'use client';

import { useEffect, useRef, useState } from 'react';
import { COLORI_TIPOLOGIA, classeColore } from '@/lib/domain';

/**
 * Tendina dei colori con il quadratino dentro. Un `<select>` nativo non può
 * mostrare nulla oltre al testo, quindi qui la lista è costruita a mano e il
 * valore viaggia in un campo nascosto.
 */
export function SelettoreColore({
  nome = 'colore',
  valoreIniziale = 'verde',
}: {
  nome?: string;
  valoreIniziale?: string;
}) {
  const [valore, setValore] = useState(valoreIniziale);
  const [aperto, setAperto] = useState(false);
  const contenitore = useRef<HTMLDivElement>(null);

  // si chiude cliccando fuori o con Esc, come ci si aspetta da una tendina
  useEffect(() => {
    if (!aperto) return;

    const fuori = (e: MouseEvent) => {
      if (!contenitore.current?.contains(e.target as Node)) setAperto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setAperto(false);
      }
    };

    document.addEventListener('mousedown', fuori);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('mousedown', fuori);
      document.removeEventListener('keydown', esc, true);
    };
  }, [aperto]);

  const voci = Object.entries(COLORI_TIPOLOGIA);
  const scelto = COLORI_TIPOLOGIA[valore] ?? COLORI_TIPOLOGIA.verde;

  return (
    <div ref={contenitore} className="relative">
      <input type="hidden" name={nome} value={valore} />

      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aperto}
        className="input flex w-full items-center gap-2 text-left"
      >
        <span className={`h-4 w-4 shrink-0 rounded-sm border ${classeColore(valore)}`} />
        <span className="min-w-0 flex-1 truncate">{scelto.etichetta}</span>
        <span className="shrink-0 text-muted">{aperto ? '▴' : '▾'}</span>
      </button>

      {aperto && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-line bg-surface2 py-1 shadow-xl"
        >
          {voci.map(([chiave, c]) => (
            <li key={chiave}>
              <button
                type="button"
                role="option"
                aria-selected={chiave === valore}
                onClick={() => {
                  setValore(chiave);
                  setAperto(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface ${
                  chiave === valore ? 'text-nvg' : 'text-ink'
                }`}
              >
                <span className={`h-4 w-4 shrink-0 rounded-sm border ${classeColore(chiave)}`} />
                <span className="min-w-0 flex-1 truncate">{c.etichetta}</span>
                {chiave === valore && <span className="shrink-0 text-nvg">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
