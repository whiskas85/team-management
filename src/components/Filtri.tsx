'use client';

import { useMemo, useState, type ReactNode } from 'react';

export type Filtro = {
  nome: string;
  etichetta: string;
  opzioni: { valore: string; testo: string }[];
};

/**
 * Ricerca e filtri applicati mentre si digita: nessun invio, nessun ricaricamento.
 * I dati arrivano già dal server, qui si filtra la lista in memoria — su un
 * organico di squadra è istantaneo.
 */
export function ListaFiltrata<T>({
  elementi,
  cerca,
  filtri = [],
  valoreFiltro,
  segnaposto = 'Cerca…',
  azioni,
  children,
}: {
  elementi: T[];
  /** Testo su cui applicare la ricerca libera. */
  cerca: (e: T) => string;
  filtri?: Filtro[];
  /** Valore dell'elemento per un dato filtro, confrontato con l'opzione scelta. */
  valoreFiltro?: (e: T, nomeFiltro: string) => string | string[];
  segnaposto?: string;
  /** Comandi che vivono in fondo alla riga dei filtri, allineati a destra. */
  azioni?: ReactNode;
  children: (filtrati: T[], totale: number) => ReactNode;
}) {
  const [q, setQ] = useState('');
  const [scelte, setScelte] = useState<Record<string, string>>({});

  const filtrati = useMemo(() => {
    const testo = q.trim().toLowerCase();
    return elementi.filter((e) => {
      if (testo && !cerca(e).toLowerCase().includes(testo)) return false;
      for (const [nome, valore] of Object.entries(scelte)) {
        if (!valore || !valoreFiltro) continue;
        const v = valoreFiltro(e, nome);
        const ok = Array.isArray(v) ? v.includes(valore) : v === valore;
        if (!ok) return false;
      }
      return true;
    });
  }, [elementi, q, scelte, cerca, valoreFiltro]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="label">Cerca</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input"
            placeholder={segnaposto}
            autoComplete="off"
          />
        </div>

        {filtri.map((f) => (
          <div key={f.nome}>
            <label className="label">{f.etichetta}</label>
            <select
              value={scelte[f.nome] ?? ''}
              onChange={(e) => setScelte((s) => ({ ...s, [f.nome]: e.target.value }))}
              className="input w-44"
            >
              <option value="">Tutti</option>
              {f.opzioni.map((o) => (
                <option key={o.valore} value={o.valore}>
                  {o.testo}
                </option>
              ))}
            </select>
          </div>
        ))}

        {(q || Object.values(scelte).some(Boolean)) && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              setScelte({});
            }}
            className="btn-ghost btn-sm"
          >
            Azzera
          </button>
        )}

        {azioni && <div className="ml-auto">{azioni}</div>}
      </div>

      {filtrati.length !== elementi.length && (
        <p className="mb-3 text-xs text-muted">
          {filtrati.length} di {elementi.length}
        </p>
      )}

      {children(filtrati, elementi.length)}
    </>
  );
}
