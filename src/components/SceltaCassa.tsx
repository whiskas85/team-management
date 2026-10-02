'use client';

import { useState, type ReactNode } from 'react';
import { Campo } from './ui';

/**
 * Prima la cassa, poi tutto il resto: il versamento a credito va in una cassa
 * precisa, e i metodi per pagare sono i suoi. Ogni cassa ha il suo modulo,
 * già pronto dal server; qui si mostra solo quello scelto.
 *
 * Con una cassa sola la scelta non c'è: si vede direttamente il modulo.
 */
export function SceltaCassa({ casse }: { casse: { id: string; nome: string; contenuto: ReactNode }[] }) {
  const [scelta, setScelta] = useState(casse[0]?.id ?? '');
  const attiva = casse.find((c) => c.id === scelta) ?? casse[0];

  return (
    <div className="space-y-5">
      {casse.length > 1 && (
        <Campo label="In quale cassa versi *">
          <select value={scelta} onChange={(e) => setScelta(e.target.value)} className="input">
            {casse.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}
      {/* la chiave rifà il modulo da capo: cambiando cassa non resta scelto
          un metodo dell'altra */}
      <div key={attiva?.id}>{attiva?.contenuto}</div>
    </div>
  );
}
