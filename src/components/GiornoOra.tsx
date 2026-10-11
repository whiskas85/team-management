'use client';

import { useEffect, useRef, useState } from 'react';
import { limitiCampoData } from '@/lib/giorni';

/** Il giorno di oggi come lo vuole una casella data: aaaa-mm-gg, in ora locale. */
export function oggi() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Una data con l'ora, in due caselle: il giorno e l'ora.
 *
 * Il campo unico del browser (datetime-local) obbliga a passare da giorno,
 * mese, anno, ore e minuti nella stessa casella, e su un telefono è una
 * piccola tortura. Divise, quasi sempre il giorno è già giusto — quello
 * dell'attività — e si sceglie solo l'ora.
 *
 * Al modulo arriva un campo nascosto `name` nel formato di sempre,
 * «aaaa-mm-ggThh:mm», o vuoto se manca l'ora: chi legge il modulo non vede la
 * differenza.
 *
 * Il giorno vuoto si riempie da solo: con `giorno` (il giorno dell'attività,
 * di solito), con un altro campo dello stesso modulo (`giornoDa`, per esempio
 * l'inizio), o con oggi.
 */
export function GiornoOra({
  name,
  valore,
  onChange,
  giorno,
  giornoDa,
  oraPredefinita,
  required = false,
  className = '',
}: {
  name: string;
  /** «aaaa-mm-ggThh:mm». Se cambia da fuori, le caselle lo seguono. */
  valore?: string | null;
  onChange?: (valore: string) => void;
  /** Il giorno già scritto quando non c'è un valore: «aaaa-mm-gg». */
  giorno?: string | null;
  /** Il nome di un altro campo del modulo da cui copiare il giorno, se manca. */
  giornoDa?: string;
  /** L'ora proposta quando si sceglie il giorno e l'ora è vuota. */
  oraPredefinita?: string;
  required?: boolean;
  className?: string;
}) {
  const [g, setG] = useState(valore?.slice(0, 10) || giorno || '');
  const [o, setO] = useState(valore?.slice(11, 16) || '');
  const radice = useRef<HTMLDivElement>(null);

  // un valore che cambia da fuori (la fine che segue l'inizio) si riporta qui
  useEffect(() => {
    if (valore == null) return;
    if (valore === '') {
      setO('');
      return;
    }
    setG(valore.slice(0, 10));
    setO(valore.slice(11, 16));
  }, [valore]);

  const unito = g && o ? `${g}T${o}` : '';
  const cambia = (nuovoG: string, nuovoO: string) => {
    setG(nuovoG);
    setO(nuovoO);
    onChange?.(nuovoG && nuovoO ? `${nuovoG}T${nuovoO}` : '');
  };

  /** Giorno vuoto: dal campo indicato, o oggi. */
  const riempiGiorno = () => {
    if (g) return g;
    let da = '';
    if (giornoDa) {
      const form = radice.current?.closest('form');
      const campo = form?.elements.namedItem(giornoDa);
      if (campo instanceof HTMLInputElement) da = campo.value.slice(0, 10);
    }
    return da || oggi();
  };

  const limiti = limitiCampoData();
  return (
    <div ref={radice} className={`flex gap-2 ${className}`}>
      <input type="hidden" name={name} value={unito} />
      <input
        type="date"
        aria-label="Giorno"
        value={g}
        min={limiti.min.slice(0, 10)}
        max={limiti.max.slice(0, 10)}
        required={required}
        onFocus={() => {
          if (!g) cambia(riempiGiorno(), o);
        }}
        onChange={(e) => cambia(e.target.value, o || oraPredefinita || '')}
        className="input min-w-0 flex-1"
      />
      <input
        type="time"
        aria-label="Ora"
        value={o}
        required={required}
        onFocus={() => {
          if (!g) cambia(riempiGiorno(), o);
        }}
        onChange={(e) => cambia(g || riempiGiorno(), e.target.value)}
        className="input w-[7.5rem] shrink-0"
      />
    </div>
  );
}
