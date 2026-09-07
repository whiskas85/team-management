'use client';

import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Icona, type NomeIcona } from './Icona';
import { Toast } from './Toast';
import type { StatoForm } from '@/lib/form';

type Azione = (prev: StatoForm, fd: FormData) => Promise<StatoForm>;

/**
 * Pulsante che esegue una server action portandosi dietro i propri valori.
 *
 * I valori viaggiano in campi nascosti e non come `name`/`value` del bottone:
 * con `useActionState` il submitter non finisce nel FormData, quindi un gruppo
 * di bottoni nello stesso form perderebbe la scelta fatta.
 */
export function AzioneBottone({
  azione,
  valori,
  children,
  icona,
  className = 'btn-ghost',
  conferma,
  disabilitato = false,
  attesa,
}: {
  azione: Azione;
  valori: Record<string, string>;
  children: ReactNode;
  icona?: NomeIcona;
  className?: string;
  /** Se valorizzato, chiede conferma prima di procedere. */
  conferma?: string;
  disabilitato?: boolean;
  attesa?: string;
}) {
  const [stato, action] = useActionState(azione, {} as StatoForm);

  // L'esito non si scrive dentro la riga: il testo la allargherebbe, e per far
  // posto si accorcerebbe il nome della persona. Va in un avviso in basso, che
  // ha lo spazio per essere letto e non deforma niente.
  const [avviso, setAvviso] = useState<{ testo: string; tono: 'ok' | 'danger' } | null>(null);
  useEffect(() => {
    if (stato.errore) setAvviso({ testo: stato.errore, tono: 'danger' });
    else if (stato.ok) setAvviso({ testo: stato.ok, tono: 'ok' });
  }, [stato]);

  return (
    <form action={action} className="contents">
      {Object.entries(valori).map(([nome, valore]) => (
        <input key={nome} type="hidden" name={nome} value={valore} />
      ))}
      <Bottone
        className={className}
        conferma={conferma}
        disabilitato={disabilitato}
        attesa={attesa}
        icona={icona}
      >
        {children}
      </Bottone>
      {avviso && (
        <Toast messaggio={avviso.testo} tono={avviso.tono} onChiudi={() => setAvviso(null)} />
      )}
    </form>
  );
}

function Bottone({
  className,
  conferma,
  disabilitato,
  attesa,
  icona,
  children,
}: {
  className: string;
  conferma?: string;
  disabilitato: boolean;
  attesa?: string;
  icona?: NomeIcona;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabilitato || pending}
      className={className}
      onClick={(e) => {
        if (conferma && !window.confirm(conferma)) e.preventDefault();
      }}
    >
      {icona && <Icona nome={icona} size={15} />}
      {pending && attesa ? attesa : children}
    </button>
  );
}
