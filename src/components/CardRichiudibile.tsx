'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Una card che mostra solo la sua intestazione finché non la si tocca.
 *
 * Serve per le cose che si configurano di rado ma si vogliono in vista: in
 * cima alla pagina ci sta la riga che riassume — il titolo e cosa c'è dentro —
 * e il resto si apre toccando la card. Si richiude toccando fuori, così non
 * resta aperta a spingere giù quello che si è venuti a guardare.
 *
 * Le azioni dell'intestazione (un «Aggiungi») restano sempre a portata. Quando
 * il numero di cose dentro cresce — se ne è appena aggiunta una — la card si
 * apre da sola, per far vedere dove è finita.
 *
 * Le finestre che si aprono da qui (modifica, aggiungi) stanno dentro la card
 * anche nel DOM: usarle non conta come «toccare fuori».
 */
export function CardRichiudibile({
  id,
  intestazione,
  azioni,
  conteggio,
  children,
}: {
  id?: string;
  intestazione: ReactNode;
  azioni?: ReactNode;
  /** Quante cose ci sono dentro: se cresce, la card si apre. */
  conteggio: number;
  /** Il contenuto da aprire. Senza, la card è solo la sua intestazione. */
  children?: ReactNode;
}) {
  // niente da aprire: non si apre, e non finge di poterlo fare
  const apribile = children != null && children !== false;
  const [aperta, setAperta] = useState(false);
  const card = useRef<HTMLElement>(null);
  const prima = useRef(conteggio);

  useEffect(() => {
    if (conteggio > prima.current) setAperta(true);
    prima.current = conteggio;
  }, [conteggio]);

  useEffect(() => {
    if (!aperta) return;
    const fuori = (e: PointerEvent) => {
      if (card.current && !card.current.contains(e.target as Node)) setAperta(false);
    };
    document.addEventListener('pointerdown', fuori);
    return () => document.removeEventListener('pointerdown', fuori);
  }, [aperta]);

  return (
    <section
      ref={card}
      id={id}
      onClick={() => apribile && setAperta(true)}
      className={`card mb-6 transition-colors ${
        aperta || !apribile ? '' : 'cursor-pointer hover:border-nvgdim'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">{intestazione}</div>
        {azioni && <div className="shrink-0">{azioni}</div>}
        {apribile && (
          <button
            type="button"
            aria-expanded={aperta}
            aria-label={aperta ? 'Chiudi' : 'Apri'}
            onClick={(e) => {
              // la freccia apre e chiude; senza fermarlo, il clic salirebbe alla
              // card e la riaprirebbe subito
              e.stopPropagation();
              setAperta((a) => !a);
            }}
            className="shrink-0 rounded-md p-1 text-muted hover:text-ink"
          >
            {aperta ? '▴' : '▾'}
          </button>
        )}
      </div>
      {aperta && apribile && <div className="mt-3 border-t border-line pt-3">{children}</div>}
    </section>
  );
}
