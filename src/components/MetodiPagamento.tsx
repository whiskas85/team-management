'use client';

import { useState } from 'react';
import { Icona } from './Icona';

export type MetodoDaMostrare = {
  id: string;
  nome: string;
  istruzioni: string | null;
  /** Il link pescato dalle istruzioni, se c'è: diventa «Paga con …». */
  link: string | null;
  /** L'IBAN pescato dalle istruzioni, se c'è: diventa «Copia IBAN». */
  iban: string | null;
};

/**
 * Come si paga: un metodo per scheda, con quello che serve per farlo.
 *
 * Prima stavano tutti in un riquadro grigio, una riga ciascuno, dentro la
 * finestra «Ho pagato» — cioè dove arriva chi ha già pagato. Chi doveva
 * ancora farlo non ci entrava, e se ci entrava trovava da ricopiare a mano un
 * IBAN o un indirizzo PayPal. Adesso ogni metodo ha il suo pulsante: il link
 * si apre, l'IBAN si copia.
 *
 * **Il pulsante premuto dice anche come si è pagato.** Chi preme «Paga con
 * PayPal», o copia l'IBAN del bonifico, ha appena scelto il metodo: se gli si
 * chiede di sceglierlo di nuovo nel modulo qui sotto, lo si fa lavorare due
 * volte — e chi ha fretta lascia il primo della lista. Allora il menu del
 * modulo si mette da solo su quel metodo. Solo quello: non si paga niente e
 * non si invia niente, e il menu resta da cambiare a mano se serve.
 */
export function MetodiPagamento({
  metodi,
  campoMetodo,
}: {
  metodi: MetodoDaMostrare[];
  /** L'id del menu «Con quale metodo» del modulo da compilare, se c'è. */
  campoMetodo?: string;
}) {
  const [copiato, setCopiato] = useState<string | null>(null);

  // Il menu è del modulo, che non è di questo componente: lo si cerca per id
  // e gli si cambia il valore, come farebbe chi lo sceglie a mano. È un menu
  // non controllato, quindi al momento di inviare vale quello che c'è scritto.
  const scegli = (id: string) => {
    if (!campoMetodo) return;
    const menu = document.getElementById(campoMetodo);
    if (!(menu instanceof HTMLSelectElement)) return;
    if (![...menu.options].some((o) => o.value === id)) return;
    menu.value = id;
    menu.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const copia = async (id: string, iban: string) => {
    scegli(id);
    try {
      await navigator.clipboard.writeText(iban);
      setCopiato(id);
      setTimeout(() => setCopiato((c) => (c === id ? null : c)), 2000);
    } catch {
      /* il browser non lascia copiare: l'IBAN resta scritto, si seleziona a mano */
    }
  };

  return (
    <div className="space-y-2">
      {/* Sul telefono una colonna: il nome, le istruzioni, il pulsante largo
          sotto. Dal tablet in su una riga: a sinistra cosa è, a destra cosa
          si preme — come si legge una riga di un conto. */}
      {metodi.map((m) => (
        <div
          key={m.id}
          className="rounded-lg border border-line bg-surface2 p-3 text-left sm:flex sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="min-w-0">
            <p className="font-medium text-ink">{m.nome}</p>
            {m.istruzioni && (
              <p className="mt-0.5 whitespace-pre-line break-words text-xs text-muted [overflow-wrap:anywhere]">
                {m.istruzioni}
              </p>
            )}
          </div>
          {(m.link || m.iban) && (
            <div className="mt-2.5 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0 sm:flex-col sm:items-stretch">
              {m.link && (
                <a
                  href={m.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => scegli(m.id)}
                  className="btn-primary btn-sm flex-1 justify-center sm:flex-none"
                >
                  <Icona nome="apri" size={15} />
                  Paga con {m.nome}
                </a>
              )}
              {m.iban && (
                <button
                  type="button"
                  onClick={() => copia(m.id, m.iban!)}
                  className="btn-ghost btn-sm flex-1 justify-center sm:flex-none"
                >
                  {copiato === m.id ? 'IBAN copiato' : 'Copia IBAN'}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
