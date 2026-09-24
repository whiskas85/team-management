'use client';

import { Campo } from './ui';
import { limitiCampoData } from '@/lib/giorni';
import { oggi } from './InizioFine';

/**
 * L'ora del ritrovo, che parte dall'inizio dell'attività.
 *
 * Il ritrovo è quasi sempre lo stesso giorno e poco prima dell'inizio: entrando
 * nel campo vuoto lo si trova già con la data e l'ora d'inizio, e basta
 * spostare l'ora indietro. Vuoto, un datetime-local chiede di scrivere tutto
 * da capo — giorno, mese, anno — per una data che è già scritta due righe
 * sopra. Se l'inizio non c'è ancora, parte da oggi, come fa l'inizio stesso.
 * Il valore si mette solo se il campo è vuoto: un ritrovo già scelto non si
 * tocca.
 */
export function OraRitrovo({ valore }: { valore?: string }) {
  const limiti = limitiCampoData();
  return (
    <Campo label="Ora del ritrovo">
      <input
        type="datetime-local"
        name="oraRitrovo"
        min={limiti.min}
        max={limiti.max}
        defaultValue={valore}
        className="input"
        onFocus={(e) => {
          const campo = e.currentTarget;
          if (campo.value) return;
          const inizio = campo.form?.elements.namedItem('inizio');
          const quando = inizio instanceof HTMLInputElement ? inizio.value : '';
          campo.value = quando || `${oggi()}T09:00`;
        }}
      />
    </Campo>
  );
}
