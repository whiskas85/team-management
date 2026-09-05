'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { accedi, type StatoForm } from '@/actions/auth';
import { Invia } from '@/components/Bottone';

export function FormLogin() {
  const [stato, azione] = useActionState(accedi, {} as StatoForm);

  return (
    <>
      <form action={azione} className="card space-y-4">
        {stato.errore && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {stato.errore}
          </div>
        )}

        <div>
          <label className="label" htmlFor="email">
            Email o callsign
          </label>
          {/* type="text": con type="email" il browser rifiuterebbe il callsign
              prima ancora di provare a mandarlo */}
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            required
            className="input"
            placeholder="operatore@zerodark.team oppure Ghost"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            placeholder="••••••••"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            name="ricordami"
            defaultChecked
            className="h-4 w-4 accent-[color:var(--nvg)]"
          />
          Ricordami su questo dispositivo
        </label>

        <Invia className="btn-primary w-full" attesa="Verifica…">
          Entra
        </Invia>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Non hai ancora un account?{' '}
        <Link href="/register" className="text-nvg hover:underline">
          Registrati
        </Link>
      </p>
    </>
  );
}
