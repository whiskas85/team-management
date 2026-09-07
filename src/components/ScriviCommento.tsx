'use client';

import { useRef, useState } from 'react';
import { Icona } from './Icona';

type Voce = { id: string; titolo: string; maniglia: string };

/**
 * La casella per commentare un annuncio, con le chiocciole delle voci.
 *
 * Sotto un lotto di cinque cose, *«quanto per quella grande?»* non vuol dire
 * niente. Qui si nomina la voce precisa in due modi, perché le persone
 * scrivono in due modi: chi digita `@` si vede comparire l'elenco, chi
 * preferisce premere trova i pulsanti sopra la casella. Il risultato è lo
 * stesso testo.
 */
export function ScriviCommento({ voci }: { voci: Voce[] }) {
  const [testo, setTesto] = useState('');
  const [cerca, setCerca] = useState<{ da: number; testo: string } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const inserisci = (v: Voce) => {
    const el = area.current;
    const attuale = testo;

    if (cerca) {
      const fine = cerca.da + 1 + cerca.testo.length;
      const nuovo = `${attuale.slice(0, cerca.da)}@${v.maniglia} ${attuale.slice(fine)}`;
      setTesto(nuovo);
      setCerca(null);
      const dove = cerca.da + v.maniglia.length + 2;
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(dove, dove);
      });
      return;
    }

    // dal pulsante: si aggiunge in coda, con lo spazio giusto davanti
    const separatore = attuale && !attuale.endsWith(' ') ? ' ' : '';
    setTesto(`${attuale}${separatore}@${v.maniglia} `);
    requestAnimationFrame(() => el?.focus());
  };

  const forseUnaChiocciola = (valore: string, cursore: number) => {
    const scritto = valore.slice(0, cursore);
    const m = scritto.match(/@([a-zA-Z0-9._-]*)$/);
    setCerca(m ? { da: cursore - m[0].length, testo: m[1].toLowerCase() } : null);
  };

  const proposte = cerca
    ? voci
        .filter(
          (v) =>
            v.maniglia.includes(cerca.testo) || v.titolo.toLowerCase().includes(cerca.testo),
        )
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-2">
      {voci.length > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-muted">Parli di:</span>
          {voci.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => inserisci(v)}
              className="rounded border border-line px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-nvgdim hover:text-nvg"
            >
              @{v.maniglia}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <textarea
          ref={area}
          name="testo"
          rows={2}
          maxLength={2000}
          value={testo}
          onChange={(e) => {
            setTesto(e.target.value);
            forseUnaChiocciola(e.target.value, e.target.selectionStart);
          }}
          onClick={(e) => forseUnaChiocciola(testo, e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && cerca) {
              e.preventDefault();
              setCerca(null);
            }
          }}
          onBlur={() => setTimeout(() => setCerca(null), 150)}
          className="input"
          placeholder={voci.length > 1 ? 'Chiedi, offri, nomina una voce con @…' : 'Chiedi o offri…'}
        />

        {proposte.length > 0 && (
          <div className="absolute left-2 right-2 top-full z-20 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-lg sm:w-72">
            {proposte.map((v) => (
              <button
                key={v.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => inserisci(v)}
                className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface2"
              >
                <span className="num text-nvg">@{v.maniglia}</span>
                <span className="min-w-0 truncate text-xs text-muted">{v.titolo}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className="btn-ghost btn-sm">
        <Icona nome="commento" size={14} />
        Commenta
      </button>
    </div>
  );
}
