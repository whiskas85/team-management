'use client';

import { useMemo, useState } from 'react';

export type PersonaProposta = {
  id: string;
  nome: string;
  sotto?: string | null;
  /** Non si può scegliere: ha già un posto altrove. Si vede, ma spento. */
  spento?: boolean;
};

/**
 * Scegliere più persone: la ricerca in cima, l'elenco sotto, si spuntano.
 *
 * L'ordine è quello in cui arrivano: chi le propone le mette già nell'ordine
 * giusto (per gli inviti in macchina, prima chi si porta più spesso). Ogni
 * scelta va nel modulo come un campo `name` ripetuto.
 */
export function ScegliPersone({
  persone,
  name = 'userId',
  scelti = [],
  segnaposto = 'Cerca per nome o nome di battaglia',
}: {
  persone: PersonaProposta[];
  name?: string;
  scelti?: string[];
  segnaposto?: string;
}) {
  const [cerca, setCerca] = useState('');
  const [presi, setPresi] = useState<Set<string>>(new Set(scelti));
  const visibili = useMemo(() => {
    const t = cerca.trim().toLowerCase();
    return t ? persone.filter((p) => p.nome.toLowerCase().includes(t)) : persone;
  }, [persone, cerca]);

  const commuta = (id: string) =>
    setPresi((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(id)) dopo.delete(id);
      else dopo.add(id);
      return dopo;
    });

  return (
    <div className="space-y-2">
      {[...presi].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      {persone.length > 6 && (
        <input
          type="search"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder={segnaposto}
          className="input"
          aria-label="Cerca una persona"
        />
      )}
      <ul
        className="max-h-72 divide-y divide-line overflow-y-auto rounded-md border border-line"
        data-scorre
      >
        {visibili.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted">Nessuno con questo nome.</li>
        )}
        {visibili.map((p) => {
          const preso = presi.has(p.id);
          return (
            <li key={p.id}>
              <label
                className={`flex items-center gap-2.5 px-3 py-2 text-sm ${
                  p.spento ? 'opacity-50' : 'cursor-pointer hover:bg-surface2'
                } ${preso ? 'bg-nvg/10' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={preso}
                  disabled={p.spento}
                  onChange={() => commuta(p.id)}
                  className="h-4 w-4 shrink-0 accent-nvg"
                />
                <span className="min-w-0 flex-1 break-words">
                  {p.nome}
                  {p.sotto && <span className="block text-[11px] text-muted">{p.sotto}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted">
        {presi.size === 0
          ? 'Nessuno scelto.'
          : presi.size === 1
            ? '1 scelto.'
            : `${presi.size} scelti.`}
      </p>
    </div>
  );
}
