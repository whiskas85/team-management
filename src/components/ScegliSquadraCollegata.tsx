'use client';

import { useState } from 'react';

type Squadra = { id: string; nome: string; collegata: boolean };

/**
 * A quale squadra dell'anagrafica corrisponde il gestionale che si collega:
 * una che c'è già (proposta quella con lo stesso nome) o una nuova, riempita
 * col loro profilo.
 */
export function ScegliSquadraCollegata({
  squadre,
  nome,
}: {
  squadre: Squadra[];
  /** Il nome con cui si presentano: serve a proporre quella giusta. */
  nome: string;
}) {
  const uguale = (a: string, b: string) => a.localeCompare(b, 'it', { sensitivity: 'base' }) === 0;
  const proposta = squadre.find((s) => !s.collegata && uguale(s.nome, nome));
  const [scelta, setScelta] = useState<'esistente' | 'nuova'>(proposta ? 'esistente' : 'nuova');
  const libere = squadre.filter((s) => !s.collegata);

  return (
    <div className="space-y-2">
      <input type="hidden" name="scelta" value={scelta} />
      <label className="flex items-start gap-2 text-sm">
        <input
          type="radio"
          checked={scelta === 'nuova'}
          onChange={() => setScelta('nuova')}
          className="mt-1"
        />
        <span>
          <strong>Crea una squadra nuova</strong>
          <span className="block text-xs text-muted">
            Nell’anagrafica squadre, con il loro profilo: «{nome}».
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="radio"
          checked={scelta === 'esistente'}
          onChange={() => setScelta('esistente')}
          disabled={libere.length === 0}
          className="mt-1"
        />
        <span className="min-w-0 flex-1">
          <strong>Collega a una squadra che c’è già</strong>
          <select
            name="squadraId"
            defaultValue={proposta?.id ?? ''}
            disabled={scelta !== 'esistente'}
            className="input mt-1"
            aria-label="Squadra dell'anagrafica"
          >
            <option value="">— scegli —</option>
            {libere.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </span>
      </label>
    </div>
  );
}
