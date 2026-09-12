'use client';

import { useRef } from 'react';
import { Campo } from './ui';

/** Il giorno di oggi come lo vuole un datetime-local: aaaa-mm-gg, in ora locale. */
function oggi() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Quanti giorni di calendario separano due date aaaa-mm-gg. In UTC apposta:
 *  il giorno del cambio d'ora dura 23 o 25 ore, e non deve contare mezzo. */
function giorniFra(da: string, a: string) {
  const utc = (g: string) => {
    const [anno, mese, giorno] = g.split('-').map(Number);
    return Date.UTC(anno, mese - 1, giorno);
  };
  return Math.round((utc(a) - utc(da)) / 86_400_000);
}

function spostaGiorno(g: string, n: number) {
  const [anno, mese, giorno] = g.split('-').map(Number);
  return new Date(Date.UTC(anno, mese - 1, giorno + n)).toISOString().slice(0, 10);
}

/**
 * Inizio e fine di un'attività, che si tengono per mano.
 *
 * Due fastidi che si ripetevano a ogni attività nuova. Il primo: la casella
 * vuota parte da gg/mm/aaaa e l'anno va scritto ogni volta, anche se nove
 * volte su dieci è quello in corso. Toccandola vuota si riempie con oggi, così
 * si scrivono sopra giorno e mese e l'anno è già giusto. Il secondo: finito di
 * scrivere l'inizio si doveva riscrivere tutto da capo nella fine, che quasi
 * sempre è lo stesso giorno. Adesso la fine segue l'inizio da sé.
 *
 * Seguire non vuol dire schiacciare: se la fine era già su un altro giorno —
 * la 24 ore dal venerdì alla domenica — spostando l'inizio si sposta anche lei
 * degli stessi giorni, e l'ora scritta resta quella. Una fine riportata allo
 * stesso giorno senza dirlo accorcerebbe l'attività di nascosto.
 */
export function InizioFine({
  inizio,
  fine,
  etichettaInizio = 'Inizio *',
}: {
  /** Valori di partenza, già nel formato del datetime-local. */
  inizio?: string;
  fine?: string;
  etichettaInizio?: string;
}) {
  const campoFine = useRef<HTMLInputElement>(null);
  // l'inizio com'era prima di questa modifica: serve a sapere di quanti
  // giorni spostare la fine
  const prima = useRef(inizio ?? '');

  const seguiInizio = (nuovo: string) => {
    const vecchio = prima.current;
    prima.current = nuovo;
    const f = campoFine.current;
    // a metà scrittura il valore è vuoto: si aspetta che la data sia intera
    if (!f || !nuovo) return;

    const giornoNuovo = nuovo.slice(0, 10);
    let valore: string;
    if (!f.value) {
      // nessuna fine ancora: lo stesso giorno, a un'ora che venga dopo l'inizio
      valore = `${giornoNuovo}T${nuovo.slice(11, 16) < '18:00' ? '18:00' : '23:59'}`;
    } else {
      const scarto = vecchio ? giorniFra(vecchio.slice(0, 10), f.value.slice(0, 10)) : 0;
      valore = `${spostaGiorno(giornoNuovo, Math.max(scarto, 0))}T${f.value.slice(11, 16)}`;
    }
    // una fine prima dell'inizio il salvataggio la rifiuterebbe: meglio
    // mettere le due uguali e lasciar correggere l'ora
    f.value = valore < nuovo ? nuovo : valore;
  };

  return (
    <>
      <Campo label={etichettaInizio}>
        <input
          type="datetime-local"
          name="inizio"
          required
          defaultValue={inizio}
          className="input"
          onFocus={(e) => {
            if (!e.currentTarget.value) e.currentTarget.value = `${oggi()}T09:00`;
          }}
          onChange={(e) => seguiInizio(e.currentTarget.value)}
        />
      </Campo>

      <Campo label="Fine">
        <input
          ref={campoFine}
          type="datetime-local"
          name="fine"
          defaultValue={fine}
          className="input"
          onFocus={(e) => {
            // vuota, parte dal giorno dell'inizio invece che da gg/mm/aaaa
            const da = prima.current;
            if (!e.currentTarget.value && da) e.currentTarget.value = da;
          }}
        />
      </Campo>
    </>
  );
}
