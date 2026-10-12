'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { chiediRecupero, type StatoRecupero } from '@/actions/recupero';
import { Logo } from '@/components/Logo';
import { Invia } from '@/components/Bottone';

const iniziale: StatoRecupero = {};

/**
 * Password dimenticata: si scrive con cosa si entra di solito, e arriva
 * un'email con un link che vale un'ora.
 */
export default function RecuperaPage() {
  const [stato, azione] = useActionState(chiediRecupero, iniziale);
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-4 text-xl font-semibold">Password dimenticata</h1>
          <p className="mt-2 text-sm text-muted">
            Scrivi la tua email, il callsign o il telefono: ti mandiamo un’email con un link per
            entrare, e lì scegli una password nuova.
          </p>
        </div>

        <form action={azione} className="card space-y-4">
          {stato.errore && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {stato.errore}
            </div>
          )}
          {stato.ok ? (
            <div className="rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-sm text-nvg">
              {stato.ok}
            </div>
          ) : (
            <>
              <div>
                <label className="label" htmlFor="identita">
                  Email, callsign o telefono
                </label>
                <input
                  id="identita"
                  name="identita"
                  required
                  autoComplete="username"
                  className="input"
                />
              </div>
              <Invia icona="email">Mandami il link</Invia>
            </>
          )}
          <p className="text-center text-sm">
            <Link href="/login" className="text-nvg hover:underline">
              ← Torna all’accesso
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
