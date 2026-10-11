'use client';

import { useRef, useState } from 'react';
import { Campo } from './ui';
import { GiornoOra } from './GiornoOra';

// oggi() sta con GiornoOra; resta esportata anche da qui per chi la cercava qui
export { oggi } from './GiornoOra';

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
 *
 * Giorno e ora stanno in due caselle (GiornoOra): la fine nasce già sul giorno
 * dell'inizio, e di solito si sceglie solo l'ora.
 */
export function InizioFine({
  inizio,
  fine,
  etichettaInizio = 'Inizio *',
}: {
  /** Valori di partenza, nel formato «aaaa-mm-ggThh:mm». */
  inizio?: string;
  fine?: string;
  etichettaInizio?: string;
}) {
  const [valFine, setValFine] = useState(fine ?? '');
  // l'inizio com'era prima di questa modifica: serve a sapere di quanti
  // giorni spostare la fine
  const prima = useRef(inizio ?? '');
  const [giornoInizio, setGiornoInizio] = useState((inizio ?? '').slice(0, 10));

  const seguiInizio = (nuovo: string) => {
    const vecchio = prima.current;
    // a metà scrittura il valore è vuoto: si aspetta che la data sia intera
    if (!nuovo) return;
    prima.current = nuovo;
    setGiornoInizio(nuovo.slice(0, 10));

    const giornoNuovo = nuovo.slice(0, 10);
    let valore: string;
    if (!valFine) {
      // nessuna fine ancora: lo stesso giorno, a un'ora che venga dopo l'inizio
      valore = `${giornoNuovo}T${nuovo.slice(11, 16) < '18:00' ? '18:00' : '23:59'}`;
    } else {
      const scarto = vecchio ? giorniFra(vecchio.slice(0, 10), valFine.slice(0, 10)) : 0;
      valore = `${spostaGiorno(giornoNuovo, Math.max(scarto, 0))}T${valFine.slice(11, 16)}`;
    }
    // una fine prima dell'inizio il salvataggio la rifiuterebbe: meglio
    // mettere le due uguali e lasciar correggere l'ora
    setValFine(valore < nuovo ? nuovo : valore);
  };

  return (
    <>
      <Campo label={etichettaInizio}>
        <GiornoOra
          name="inizio"
          valore={inizio}
          required
          oraPredefinita="09:00"
          onChange={seguiInizio}
        />
      </Campo>

      <Campo label="Fine">
        <GiornoOra
          name="fine"
          valore={valFine}
          giorno={giornoInizio}
          giornoDa="inizio"
          onChange={setValFine}
        />
      </Campo>
    </>
  );
}
