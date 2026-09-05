'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Icona, type NomeIcona } from './Icona';

/**
 * Permette a un form annidato di chiudere la finestra che lo contiene: senza,
 * dopo il salvataggio la modale resterebbe aperta sopra i dati già aggiornati.
 */
const ContestoModale = createContext<{ chiudi: () => void } | null>(null);

export const useModale = () => useContext(ContestoModale);

/**
 * Pulsante che apre una finestra: il testo dice cosa succede ("Crea operatore"),
 * non è un semplice "+". Su telefono la finestra occupa tutta la larghezza.
 */
export function BottoneModale({
  etichetta,
  icona,
  titolo,
  children,
  className = 'btn-primary',
  larga = false,
}: {
  etichetta: string;
  icona?: NomeIcona;
  titolo?: string;
  children: ReactNode | ((chiudi: () => void) => ReactNode);
  className?: string;
  larga?: boolean;
}) {
  const [aperto, setAperto] = useState(false);
  const chiudi = () => setAperto(false);

  useEffect(() => {
    if (!aperto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAperto(false);
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [aperto]);

  return (
    <>
      <button type="button" onClick={() => setAperto(true)} className={className}>
        {icona && <Icona nome={icona} size={15} />}
        {etichetta}
      </button>

      {aperto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={chiudi} />
          <div
            role="dialog"
            aria-modal="true"
            /* whitespace-normal: la finestra spesso si apre da una cella con
               white-space: nowrap, che verrebbe ereditato impedendo al testo di
               andare a capo */
            className={`relative max-h-[92vh] w-full overflow-y-auto overflow-x-hidden whitespace-normal rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl ${
              larga ? 'sm:max-w-3xl' : 'sm:max-w-xl'
            }`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4">
              <h2 className="min-w-0 truncate text-base font-semibold">{titolo ?? etichetta}</h2>
              <button
                type="button"
                onClick={chiudi}
                className="shrink-0 rounded-md border border-line p-1.5 text-muted hover:text-ink"
                aria-label="Chiudi"
              >
                <Icona nome="chiudi" size={16} />
              </button>
            </div>

            <ContestoModale.Provider value={{ chiudi }}>
              <div className="min-w-0 max-w-full p-5">
                {typeof children === 'function' ? children(chiudi) : children}
              </div>
            </ContestoModale.Provider>
          </div>
        </div>
      )}
    </>
  );
}
