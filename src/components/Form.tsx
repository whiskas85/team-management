'use client';

import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { Icona, type NomeIcona } from './Icona';
import { useModale } from './Modale';
import type { StatoForm } from '@/lib/form';

type Azione = (prev: StatoForm, fd: FormData) => Promise<StatoForm>;

/**
 * Form collegato a una server action, con esito mostrato in linea.
 * Evita di duplicare la gestione di errore/conferma in ogni pagina.
 */
export function FormAzione({
  azione,
  children,
  className = 'space-y-4',
  restaAperto = false,
}: {
  azione: Azione;
  children: ReactNode;
  className?: string;
  /** Nelle finestre dove si fanno più inserimenti di fila. */
  restaAperto?: boolean;
}) {
  const [stato, action] = useActionState(azione, {} as StatoForm);
  const modale = useModale();

  // salvato: la finestra si chiude da sola sui dati ormai aggiornati
  useEffect(() => {
    if (stato.ok && modale && !restaAperto) modale.chiudi();
  }, [stato.ok, modale, restaAperto]);

  return (
    <form action={action} className={className}>
      {stato.errore && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {stato.errore}
        </div>
      )}
      {stato.ok && (
        <div className="rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-sm text-nvg">
          {stato.ok}
        </div>
      )}
      {children}
    </form>
  );
}

/** Blocco richiudibile: su telefono i form lunghi restano chiusi finché servono. */
export function Fisarmonica({
  titolo,
  children,
  apertoIniziale = false,
}: {
  titolo: string;
  children: ReactNode;
  apertoIniziale?: boolean;
}) {
  const [aperto, setAperto] = useState(apertoIniziale);
  return (
    <div className="mb-6 rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="num text-[11px] uppercase tracking-[0.2em] text-nvg">{titolo}</span>
        <span className="text-lg leading-none text-muted">{aperto ? '−' : '+'}</span>
      </button>
      {aperto && <div className="border-t border-line p-4">{children}</div>}
    </div>
  );
}

/** Bottone che chiede conferma prima di inviare (eliminazioni, revoche…). */
export function Conferma({
  messaggio,
  children,
  className = 'btn-danger btn-sm',
  icona,
}: {
  messaggio: string;
  children: ReactNode;
  className?: string;
  icona?: NomeIcona;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(messaggio)) e.preventDefault();
      }}
    >
      {icona && <Icona nome={icona} size={15} />}
      {children}
    </button>
  );
}
