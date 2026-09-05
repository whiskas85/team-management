'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { registrati, type StatoForm } from '@/actions/auth';
import { Logo } from '@/components/Logo';
import { Invia } from '@/components/Bottone';

const iniziale: StatoForm = {};

export default function RegisterPage() {
  const [stato, azione] = useActionState(registrati, iniziale);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-4 text-xl font-semibold">Richiedi l’accesso</h1>
          <p className="mt-2 text-sm text-muted">
            Creando l’account entri come <span className="text-warn">Nuovo</span>: puoi vedere gli
            eventi aperti e partecipare. Quando il team deciderà di proporti l’ingresso, riceverai
            qui l’invito di iscrizione da compilare.
          </p>
        </div>

        <form action={azione} className="card space-y-4">
          {stato.errore && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {stato.errore}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="nome">
                Nome *
              </label>
              <input id="nome" name="nome" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="cognome">
                Cognome *
              </label>
              <input id="cognome" name="cognome" required className="input" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="callsign">
                Callsign
              </label>
              <input id="callsign" name="callsign" className="input" placeholder="es. Ghost" />
            </div>
            <div>
              <label className="label" htmlFor="telefono">
                Telefono
              </label>
              <input id="telefono" name="telefono" type="tel" className="input" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="email">
              Email *
            </label>
            <input id="email" name="email" type="email" required className="input" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="password">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="conferma">
                Conferma password *
              </label>
              <input
                id="conferma"
                name="conferma"
                type="password"
                required
                minLength={8}
                className="input"
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-line pt-4">
            <label className="flex min-w-0 items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                name="privacy"
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
              />
              <span className="min-w-0">
                Ho letto l’
                <Link href="/privacy" target="_blank" className="text-nvg hover:underline">
                  informativa privacy
                </Link>{' '}
                e acconsento al trattamento dei miei dati per la gestione dell’attività del team.
                <span className="text-danger"> *</span>
              </span>
            </label>

            <label className="flex min-w-0 items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                name="immagini"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
              />
              <span className="min-w-0">
                Acconsento alla pubblicazione di foto e video che mi ritraggono durante le attività
                (facoltativo, revocabile in ogni momento).
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                name="ricordami"
                defaultChecked
                className="h-4 w-4 accent-[color:var(--nvg)]"
              />
              Ricordami su questo dispositivo
            </label>
          </div>

          <Invia className="btn-primary w-full" attesa="Creazione…">
            Crea account
          </Invia>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Hai già un account?{' '}
          <Link href="/login" className="text-nvg hover:underline">
            Accedi
          </Link>
        </p>
      </div>
    </main>
  );
}
