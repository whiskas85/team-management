'use client';

import { useEffect, useState } from 'react';
import { primoIban, primoLink } from '@/lib/link';
import { MetodiPagamento } from './MetodiPagamento';
import { Icona } from './Icona';

export type MetodoPersona = { id: string; nome: string; istruzioni: string | null };

/**
 * I metodi per pagare una persona, in una tendina che si apre e si chiude:
 * chiusa dice solo quanti sono, aperta mostra «Paga» e «Copia IBAN».
 */
export function TendinaMetodi({
  nome,
  metodi,
  aperta = false,
}: {
  nome: string;
  metodi: MetodoPersona[];
  aperta?: boolean;
}) {
  return (
    <details
      open={aperta}
      className="group border-t border-nvg/30 bg-nvg/[0.06] text-nvg"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium">
        <span className="flex min-w-0 items-center gap-2">
          <Icona nome="pagamenti" size={16} />
          Metodi di pagamento
          <span className="truncate text-xs font-normal opacity-80">· {nome}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-normal">
          {metodi.length === 0 ? 'nessuno' : metodi.length}
          <span className="transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="px-3 pb-3 text-ink">
        {metodi.length === 0 ? (
          <p className="px-1 text-xs text-muted">
            {nome} non ha ancora indicato come essere pagato: li aggiunge dal suo profilo, in
            «Come essere pagato».
          </p>
        ) : (
          <MetodiPagamento
            metodi={metodi.map((m) => ({
              id: m.id,
              nome: m.nome,
              istruzioni: m.istruzioni,
              link: primoLink(m.istruzioni),
              iban: primoIban(m.istruzioni),
            }))}
          />
        )}
      </div>
    </details>
  );
}

/**
 * Nel modulo dell'uscita: il menu «A chi» e, sotto, la tendina con i metodi
 * della persona scelta — cambia appena si cambia la persona.
 */
export function SceltaBeneficiario({
  operatori,
  iniziale,
}: {
  operatori: { id: string; nome: string; metodi: MetodoPersona[] }[];
  iniziale: string | null;
}) {
  const [scelto, setScelto] = useState(iniziale ?? '');
  useEffect(() => setScelto(iniziale ?? ''), [iniziale]);
  const chi = operatori.find((o) => o.id === scelto);
  return (
    <div className="space-y-2">
      <select
        name="beneficiarioId"
        value={scelto}
        onChange={(e) => setScelto(e.target.value)}
        className="input"
      >
        <option value="">— a nessuno in particolare —</option>
        {operatori.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
      {chi && (
        <div className="overflow-hidden rounded-md border border-nvg/30 [&>details]:border-t-0">
          <TendinaMetodi nome={chi.nome} metodi={chi.metodi} />
        </div>
      )}
    </div>
  );
}
