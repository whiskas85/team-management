'use client';

import { useState } from 'react';

/**
 * Nel modulo di un metodo di pagamento: se chi paga così deve allegare un
 * file, e come si chiama. Il titolo compare solo quando serve.
 */
export function AllegatoObbligatorioCampi({
  obbligatorio,
  titolo,
}: {
  obbligatorio: boolean;
  titolo: string;
}) {
  const [si, setSi] = useState(obbligatorio);
  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="flex min-w-0 items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="allegatoObbligatorio"
          checked={si}
          onChange={(e) => setSi(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          Allegato obbligatorio
          <span className="block text-[11px] text-muted">
            Chi segnala di aver pagato così deve allegare un file, per esempio la ricevuta del
            bonifico. Chi conferma lo trova accanto al pagamento.
          </span>
        </span>
      </label>
      {si && (
        <label className="block pl-6">
          <span className="label">Titolo dell’allegato</span>
          <input
            name="titoloAllegato"
            defaultValue={titolo || 'Ricevuta'}
            maxLength={60}
            className="input"
            placeholder="Ricevuta"
          />
        </label>
      )}
    </div>
  );
}
