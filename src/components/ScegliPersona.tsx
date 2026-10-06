'use client';

import { useMemo, useState } from 'react';

export type PersonaScelta = { id: string; nome: string; sotto?: string | null };

/**
 * Scegliere una persona: la barra di ricerca in cima e l'elenco sotto, si
 * tocca un nome e resta scelto. Un menu a tendina con cento nomi su un
 * telefono non si usa; qui si scrivono tre lettere e si tocca.
 *
 * Il nome scelto va nel modulo come campo nascosto (`name`).
 */
export function ScegliPersona({
  persone,
  name = 'aUserId',
  segnaposto = 'Cerca per nome o nome di battaglia',
}: {
  persone: PersonaScelta[];
  name?: string;
  segnaposto?: string;
}) {
  const [cerca, setCerca] = useState('');
  const [scelta, setScelta] = useState('');
  const visibili = useMemo(() => {
    const t = cerca.trim().toLowerCase();
    return t ? persone.filter((p) => p.nome.toLowerCase().includes(t)) : persone;
  }, [persone, cerca]);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={scelta} />
      <input
        type="search"
        value={cerca}
        onChange={(e) => setCerca(e.target.value)}
        placeholder={segnaposto}
        className="input"
        aria-label="Cerca una persona"
      />
      <ul
        className="max-h-64 divide-y divide-line overflow-y-auto rounded-md border border-line"
        data-scorre
        role="listbox"
      >
        {visibili.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted">Nessuno con questo nome.</li>
        )}
        {visibili.map((p) => {
          const sua = p.id === scelta;
          return (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={sua}
                onClick={() => setScelta(p.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  sua ? 'bg-nvg/15 text-nvg' : 'hover:bg-surface2'
                }`}
              >
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                    sua ? 'border-nvg bg-nvg' : 'border-muted'
                  }`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 break-words">
                  {p.nome}
                  {p.sotto && <span className="block text-[11px] text-muted">{p.sotto}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
