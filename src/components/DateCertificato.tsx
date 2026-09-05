'use client';

import { useState } from 'react';
import { Campo } from './ui';
import { GIORNI_VALIDITA_CERTIFICATO, scadenzaDaInput } from '@/lib/domain';
import { fmtDate } from '@/lib/format';

/**
 * Il certificato vale sempre 364 giorni: si digita solo il rilascio e la
 * scadenza si calcola da sé, così non può essere sbagliata.
 */
export function DateCertificato({
  rilascioIniziale = '',
  compatto = false,
}: {
  rilascioIniziale?: string;
  /** Versione in linea, per le righe di approvazione. */
  compatto?: boolean;
}) {
  const [rilascio, setRilascio] = useState(rilascioIniziale);
  const scadenza = scadenzaDaInput(rilascio);

  if (compatto) {
    return (
      <>
        <div>
          <label className="label">Rilascio *</label>
          <input
            type="date"
            name="rilasciatoIl"
            required
            value={rilascio}
            onChange={(e) => setRilascio(e.target.value)}
            className="input w-36"
          />
        </div>
        <div>
          <label className="label">Scade il</label>
          <p className="flex h-[38px] items-center whitespace-nowrap rounded-md border border-dashed border-line bg-surface2 px-3 text-sm num">
            {scadenza ? fmtDate(scadenza) : '—'}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Campo label="Data di rilascio *">
        <input
          type="date"
          name="rilasciatoIl"
          required
          value={rilascio}
          onChange={(e) => setRilascio(e.target.value)}
          className="input"
        />
      </Campo>

      <Campo label="Scadenza">
        <p className="flex h-[38px] items-center rounded-md border border-dashed border-line bg-surface2 px-3 text-sm num">
          {scadenza ? (
            <span className="text-ink">{fmtDate(scadenza)}</span>
          ) : (
            <span className="text-muted">indica il rilascio</span>
          )}
        </p>
        <p className="mt-1 text-[11px] text-muted">
          Calcolata da sola: {GIORNI_VALIDITA_CERTIFICATO} giorni dal rilascio.
        </p>
      </Campo>
    </>
  );
}
