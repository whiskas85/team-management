'use client';

import { useRef, useState, type ReactNode } from 'react';

/**
 * Un modulo lungo, diviso in schede: cosa e quando, dove, responsabili,
 * partecipanti, pagamenti. Si compila la scheda che serve e si salta il resto.
 *
 * Le schede chiuse restano nel modulo, solo nascoste: salvando partono tutti i
 * campi, anche quelli che non si sono guardati. E se il browser ferma il
 * salvataggio per un campo obbligatorio rimasto vuoto in una scheda chiusa, la
 * scheda si apre da sola: altrimenti il pulsante sembrerebbe non fare niente.
 */
export function SchedeModulo({
  schede,
}: {
  schede: { chiave: string; titolo: string; contenuto: ReactNode }[];
}) {
  const [attiva, setAttiva] = useState(schede[0]?.chiave);
  const pannelli = useRef<Record<string, HTMLDivElement | null>>({});

  return (
    <div
      onInvalidCapture={(e) => {
        const campo = e.target as HTMLElement;
        const dove = schede.find((s) => pannelli.current[s.chiave]?.contains(campo));
        if (dove && dove.chiave !== attiva) setAttiva(dove.chiave);
      }}
    >
      <div
        role="tablist"
        className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-line px-1 [scrollbar-width:none]"
      >
        {schede.map((s) => (
          <button
            key={s.chiave}
            type="button"
            role="tab"
            aria-selected={s.chiave === attiva}
            onClick={() => setAttiva(s.chiave)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              s.chiave === attiva
                ? 'border-nvg font-medium text-nvg'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {s.titolo}
          </button>
        ))}
      </div>
      {/* Scorre solo il contenuto: le schede restano ferme in cima, e la
          barra di scorrimento comincia sotto di loro. L'altezza lascia posto
          al titolo della finestra e ai pulsanti sotto il modulo. */}
      <div className="-mr-2 max-h-[max(16rem,calc(92vh-19rem))] overflow-y-auto pr-2">
        {schede.map((s) => (
          <div
            key={s.chiave}
            role="tabpanel"
            ref={(el) => {
              pannelli.current[s.chiave] = el;
            }}
            hidden={s.chiave !== attiva}
            className="space-y-4"
          >
            {s.contenuto}
          </div>
        ))}
      </div>
    </div>
  );
}
