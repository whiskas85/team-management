'use client';

import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Icona, type NomeIcona } from './Icona';
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
      {stato.errore && <span className="text-xs text-danger">{stato.errore}</span>}
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
