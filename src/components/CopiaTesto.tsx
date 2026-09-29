'use client';

import { useState } from 'react';
import { Icona } from './Icona';

/** Un pulsante che copia un testo negli appunti, e lo dice. */
export function CopiaTesto({ testo, etichetta = 'Copia' }: { testo: string; etichetta?: string }) {
  const [fatto, setFatto] = useState<'ok' | 'no' | null>(null);
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(testo);
          setFatto('ok');
        } catch {
          setFatto('no');
        }
        setTimeout(() => setFatto(null), 2000);
      }}
    >
      <Icona nome="condividi" size={14} />
      {fatto === 'ok' ? 'Copiato' : fatto === 'no' ? 'Non riesco' : etichetta}
    </button>
  );
}
