'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Icona, type NomeIcona } from './Icona';
import { Foglio } from './Foglio';

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
  compatto = false,
  soloIcona = false,
}: {
  etichetta: string;
  icona?: NomeIcona;
  titolo?: string;
  children: ReactNode | ((chiudi: () => void) => ReactNode);
  className?: string;
  larga?: boolean;
  /**
   * Sul telefono solo l'icona, la scritta dal tablet in su.
   *
   * Per i pulsanti che stanno accanto a un titolo in una riga che resta in
   * cima: su uno schermo stretto «Scrivi» e «Configura» per intero mangerebbero
   * il titolo, e il titolo è la cosa che quella riga esiste per mostrare.
   */
  compatto?: boolean;
  /**
   * Solo l'icona, sempre: per le righe strette dove accanto ci sono già
   * altre icone (la matita vicino al cestino). Il nome resta per chi passa
   * sopra col mouse e per chi legge lo schermo con la voce.
   */
  soloIcona?: boolean;
}) {
  const [aperto, setAperto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        className={className}
        {...(compatto || soloIcona ? { 'aria-label': etichetta, title: etichetta } : {})}
      >
        {icona && <Icona nome={icona} size={15} />}
        {soloIcona ? null : compatto ? (
          <span className="hidden sm:inline">{etichetta}</span>
        ) : (
          etichetta
        )}
      </button>

      {/* Sale dal fondo e ci riscende, si tira giù col dito, e scorre solo
          sotto il titolo: lo stesso foglio del menu (components/Foglio). */}
      {aperto && (
        <Foglio
          onChiuso={() => setAperto(false)}
          etichetta={titolo ?? etichetta}
          foglio={larga ? 'sm:max-w-3xl' : 'sm:max-w-xl'}
          contenuto="p-5"
          testata={(chiudi) => (
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 pb-4 pt-3 sm:pt-4">
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
          )}
        >
          {(chiudi) => (
            <ContestoModale.Provider value={{ chiudi }}>
              <div className="min-w-0 max-w-full">
                {typeof children === 'function' ? children(chiudi) : children}
              </div>
            </ContestoModale.Provider>
          )}
        </Foglio>
      )}
    </>
  );
}
