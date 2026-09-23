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
 */
export function MetodiPagamento({ metodi }: { metodi: MetodoDaMostrare[] }) {
  const [copiato, setCopiato] = useState<string | null>(null);

  const copia = async (id: string, iban: string) => {
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
