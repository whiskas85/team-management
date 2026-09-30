'use client';

import { useEffect, useState } from 'react';
import { Campo } from './ui';

/**
 * L'allegato chiesto dal metodo scelto: con un bonifico, la ricevuta.
 *
 * Il menu del metodo sta nel modulo e non in questo componente: lo si ascolta
 * per id, come fa l'elenco dei metodi. Quando il metodo scelto chiede un
 * allegato compare la casella del file, col titolo giusto, ed è obbligatoria —
 * a meno che la segnalazione non ne abbia già uno.
 */
export function AllegatoMetodo({
  campoMetodo,
  metodi,
  esistente,
}: {
  campoMetodo: string;
  metodi: { id: string; obbligatorio: boolean; titolo: string | null }[];
  /** Quello già allegato, se si sta correggendo la segnalazione. */
  esistente?: { titolo: string; url: string } | null;
}) {
  const [scelto, setScelto] = useState<string>('');
  useEffect(() => {
    const menu = document.getElementById(campoMetodo);
    if (!(menu instanceof HTMLSelectElement)) return;
    const leggi = () => setScelto(menu.value);
    leggi();
    menu.addEventListener('change', leggi);
    return () => menu.removeEventListener('change', leggi);
  }, [campoMetodo]);

  const metodo = metodi.find((m) => m.id === scelto);
  if (!metodo?.obbligatorio) return null;
  const titolo = metodo.titolo ?? 'Ricevuta';
  return (
    <Campo label={`${titolo}${esistente ? '' : ' *'}`} span>
      <input
        type="file"
        name="allegato"
        required={!esistente}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="input file:mr-3 file:rounded file:border-0 file:bg-surface file:px-2 file:py-1 file:text-xs file:text-ink"
      />
      <span className="mt-1 block text-[11px] text-muted">
        {esistente ? (
          <>
            Già allegata:{' '}
            <a href={esistente.url} target="_blank" rel="noreferrer" className="text-nvg hover:underline">
              {esistente.titolo}
            </a>
            . Scegline un’altra solo per sostituirla.
          </>
        ) : (
          <>Con questo metodo va allegata: foto o PDF, fino a 10 MB.</>
        )}
      </span>
    </Campo>
  );
}
