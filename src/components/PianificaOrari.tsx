'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import { pianificaOrari } from '@/actions/macchine';
import type { StatoForm } from '@/lib/form';

/**
 * «Pianifica gli orari»: a ritroso dall'arrivo, coi tempi di strada e i
 * minuti di margine per tappa scelti qui accanto. È un suggerimento: gli
 * orari restano da cambiare a mano nell'itinerario.
 */
export function PianificaOrari({
  macchinaId,
  minuti,
  senzaArrivo,
}: {
  macchinaId: string;
  minuti: number;
  /** Manca l'ora d'arrivo: non c'è da dove partire. */
  senzaArrivo: boolean;
}) {
  const [stato, invia] = useActionState(pianificaOrari, {} as StatoForm);
  useEffect(() => {
    if (stato.errore) mostraToast(stato.errore, 'errore');
    else if (stato.ok) mostraToast(stato.ok, 'ok');
  }, [stato]);

  return (
    <form action={invia} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={macchinaId} />
      <label className="flex items-center gap-1.5 text-xs text-muted">
        Margine per tappa
        <input
          type="number"
          name="minutiTappa"
          min={0}
          max={60}
          defaultValue={minuti}
          className="input h-8 w-16 px-2 py-1 text-sm"
        />
        min
      </label>
      <Pulsante disabilitato={senzaArrivo} />
      {senzaArrivo && (
        <span className="text-[11px] text-muted">Serve l’ora d’arrivo: scrivila qui sotto.</span>
      )}
    </form>
  );
}

function Pulsante({ disabilitato }: { disabilitato: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabilitato} className="btn-ghost btn-sm">
      <Icona nome="calendario" size={14} />
      {pending ? 'Calcolo…' : 'Pianifica gli orari'}
    </button>
  );
}
