'use client';

import { Campo } from './ui';
import { GiornoOra } from './GiornoOra';

/**
 * L'ora del ritrovo, che parte dal giorno dell'attività.
 *
 * Il ritrovo è quasi sempre lo stesso giorno e poco prima dell'inizio: il
 * giorno arriva già scritto — quello dell'inizio, preso dal modulo — e si
 * sceglie solo l'ora. Un ritrovo già scelto non si tocca.
 */
export function OraRitrovo({ valore, giorno }: { valore?: string; giorno?: string }) {
  return (
    <Campo label="Ora del ritrovo">
      <GiornoOra name="oraRitrovo" valore={valore} giorno={giorno} giornoDa="inizio" />
    </Campo>
  );
}
