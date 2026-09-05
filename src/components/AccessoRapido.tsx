'use client';

import { useActionState } from 'react';
import { accessoDebug, type StatoForm } from '@/actions/auth';

export type Figura = { etichetta: string; email: string; descrizione: string };

/**
 * Scorciatoie di sviluppo: un pulsante per figura, entra senza digitare nulla.
 * Il pannello viene renderizzato solo se DEBUG_LOGIN=1 lato server.
 */
export function AccessoRapido({ figure }: { figure: Figura[] }) {
  const [stato, azione] = useActionState(accessoDebug, {} as StatoForm);

  return (
    <div className="rounded-lg border border-dashed border-warn/40 bg-warn/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-warn">
        Accesso rapido · solo sviluppo
      </p>
      <p className="mt-1 text-xs text-muted">
        Entra come una delle figure senza digitare le credenziali.
      </p>

      {stato.errore && <p className="mt-2 text-xs text-danger">{stato.errore}</p>}

      <form action={azione} className="mt-3 grid gap-2">
        {figure.map((f) => (
          <button
            key={f.email}
            type="submit"
            name="email"
            value={f.email}
            className="flex items-center justify-between rounded-md border border-line bg-surface2 px-3 py-2 text-left transition-colors hover:border-nvgdim"
          >
            <span>
              <span className="block text-sm font-medium text-ink">{f.etichetta}</span>
              <span className="block text-[11px] text-muted">{f.descrizione}</span>
            </span>
            <span className="text-xs text-nvg">entra →</span>
          </button>
        ))}
      </form>
    </div>
  );
}
