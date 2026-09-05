'use client';

import { useState } from 'react';
import { Avatar } from './ui';
import { Icona } from './Icona';
import { RitagliaFoto } from './RitagliaFoto';

/**
 * L'avatar con la matita nell'angolo. La foto si cambia da dove la si vede,
 * non da una casella a parte in fondo alla pagina: il gesto naturale è toccare
 * la propria immagine.
 */
export function FotoProfilo({
  utenteId,
  iniziali,
  haFoto,
}: {
  utenteId: string;
  iniziali: string;
  haFoto: boolean;
}) {
  const [aperto, setAperto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="group relative shrink-0 rounded-full"
        aria-label={haFoto ? 'Cambia la foto del profilo' : 'Aggiungi una foto del profilo'}
        title={haFoto ? 'Cambia foto' : 'Aggiungi foto'}
      >
        <Avatar iniziali={iniziali} size="lg" fotoDi={haFoto ? utenteId : null} />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-nvg/50 bg-surface text-nvg transition-colors group-hover:bg-nvg group-hover:text-bg">
          <Icona nome="modifica" size={12} />
        </span>
      </button>

      {aperto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setAperto(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[92vh] w-full overflow-y-auto overflow-x-hidden whitespace-normal rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-w-xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4">
              <h2 className="text-base font-semibold">Foto del profilo</h2>
              <button
                type="button"
                onClick={() => setAperto(false)}
                className="rounded-md border border-line p-1.5 text-muted hover:text-ink"
                aria-label="Chiudi"
              >
                <Icona nome="chiudi" size={16} />
              </button>
            </div>
            <div className="p-5">
              <RitagliaFoto fotoAttuale={haFoto ? `/api/foto/${utenteId}` : null} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
