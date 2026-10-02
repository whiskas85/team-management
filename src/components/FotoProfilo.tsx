'use client';

import { useState } from 'react';
import { Avatar } from './ui';
import { Icona } from './Icona';
import { RitagliaFoto } from './RitagliaFoto';
import { Foglio } from './Foglio';

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
        <Foglio
          onChiuso={() => setAperto(false)}
          etichetta="Foto del profilo"
          foglio="sm:max-w-xl"
          contenuto="p-5"
          testata={(chiudi) => (
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3 sm:pt-4">
              <h2 className="text-base font-semibold">Foto del profilo</h2>
              <button
                type="button"
                onClick={chiudi}
                className="-mr-1.5 rounded-md p-1.5 text-muted hover:text-ink"
                aria-label="Chiudi"
              >
                <Icona nome="chiudi" size={16} />
              </button>
            </div>
          )}
        >
          {() => <RitagliaFoto fotoAttuale={haFoto ? `/api/foto/${utenteId}` : null} />}
        </Foglio>
      )}
    </>
  );
}
