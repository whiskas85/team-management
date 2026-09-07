'use client';

import { useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Icona, type NomeIcona } from './Icona';
import type { StatoForm } from '@/lib/form';
import { rispondiEvento } from '@/actions/eventi';

const SCELTE = [
  {
    valore: 'PRESENTE',
    testo: 'Ci sono',
    icona: 'presente' as NomeIcona,
    attivo: 'border-nvg bg-nvg/15 text-nvg',
  },
  {
    valore: 'FORSE',
    testo: 'Forse',
    icona: 'forse' as NomeIcona,
    attivo: 'border-warn bg-warn/15 text-warn',
  },
  {
    valore: 'ASSENTE',
    testo: 'Non ci sono',
    icona: 'assente' as NomeIcona,
    attivo: 'border-danger bg-danger/15 text-danger',
  },
] as const;

/**
 * Adesione all'attività. La scelta finisce in un campo nascosto invece che nel
 * `value` del pulsante: con `useActionState` il submitter non arriva al server,
 * e la nota va comunque inviata insieme alla risposta.
 */
export function AdesioneEvento({
  eventId,
  scelta,
  nota,
  pieno,
  compatta = false,
}: {
  eventId: string;
  scelta: string | null;
  nota: string | null;
  pieno: boolean;
  /** Nella card serve solo la fila di pulsanti, senza campo nota. */
  compatta?: boolean;
}) {
  const [stato, azione] = useActionState(rispondiEvento, {} as StatoForm);
  const campoScelta = useRef<HTMLInputElement>(null);

  return (
    <form action={azione} className={compatta ? 'flex items-center gap-2' : 'space-y-3'}>
      <input type="hidden" name="eventId" value={eventId} />
      {/* scritto a mano al click: lo stato di React arriverebbe dopo l'invio */}
      <input type="hidden" name="status" defaultValue={scelta ?? ''} ref={campoScelta} />
      {/* in versione compatta la nota non è modificabile: la conserviamo */}
      {compatta && <input type="hidden" name="note" defaultValue={nota ?? ''} />}

      {stato.errore && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {stato.errore}
        </div>
      )}
      {stato.ok && (
        <div className="rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-xs text-nvg">
          {stato.ok}
        </div>
      )}

      <div className={compatta ? 'flex gap-1.5' : 'grid grid-cols-3 gap-2'}>
        {SCELTE.map((s) => (
          <Scelta
            key={s.valore}
            testo={s.testo}
            icona={s.icona}
            attiva={scelta === s.valore}
            classeAttiva={s.attivo}
            compatta={compatta}
            onScegli={() => {
              if (campoScelta.current) campoScelta.current.value = s.valore;
            }}
          />
        ))}
      </div>

      {!compatta && (
        <input
          name="note"
          defaultValue={nota ?? ''}
          className="input"
          placeholder="Nota (es. arrivo tardi)"
        />
      )}

      {/* I posti non chiudono la porta: la disponibilità la dà chiunque, e chi
          avanza va in riserva. Dirlo prima evita la delusione dopo. */}
      {!compatta && pieno && scelta !== 'PRESENTE' && (
        <p className="text-xs text-warn">
          I disponibili hanno già coperto i posti: puoi segnarti lo stesso, ma potresti finire in
          riserva.
        </p>
      )}
    </form>
  );
}

function Scelta({
  testo,
  icona,
  attiva,
  classeAttiva,
  compatta,
  onScegli,
}: {
  testo: string;
  icona: NomeIcona;
  attiva: boolean;
  classeAttiva: string;
  compatta: boolean;
  onScegli: () => void;
}) {
  const { pending } = useFormStatus();
  const base = attiva ? classeAttiva : 'border-line bg-surface2 text-muted hover:border-nvgdim';

  // nella card resta solo l'icona, con il testo come suggerimento
  if (compatta) {
    return (
      <button
        type="submit"
        disabled={pending}
        onClick={onScegli}
        title={testo}
        aria-label={testo}
        className={`rounded-md border p-1.5 transition-colors disabled:opacity-40 ${base}`}
      >
        <Icona nome={icona} size={16} />
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={onScegli}
      className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-xs transition-colors disabled:opacity-40 ${base}`}
    >
      <Icona nome={icona} size={18} />
      {testo}
    </button>
  );
}
