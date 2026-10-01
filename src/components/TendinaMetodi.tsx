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
    <details open={aperta} className="group rounded-md border border-line bg-surface2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5">
          <Icona nome="pagamenti" size={14} />
          {metodi.length === 0
            ? `${nome} non ha indicato come essere pagato`
            : `Come pagare ${nome} · ${metodi.length} ${metodi.length === 1 ? 'metodo' : 'metodi'}`}
        </span>
        <span className="text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-line p-2">
        {metodi.length === 0 ? (
          <p className="px-1 py-1 text-xs text-muted">
            Li aggiunge dal suo profilo, in «Come essere pagato».
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
      {chi && <TendinaMetodi nome={chi.nome} metodi={chi.metodi} />}
    </div>
  );
}
