import Link from 'next/link';
import { redirect } from 'next/navigation';
import { leggiAttesaMfa } from '@/lib/auth';
import { marchio } from '@/lib/mia-squadra';
import { Logo } from '@/components/Logo';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { confermaCodiceAccesso } from '@/actions/auth';

export const dynamic = 'force-dynamic';

/**
 * Il secondo passaggio dell'accesso: la password era giusta, ora il codice
 * dell'app del telefono. Senza un accesso a metà in corso non c'è niente da
 * fare qui, e si torna al login.
 */
export default async function CodicePage() {
  if (!(await leggiAttesaMfa())) redirect('/login');
  const m = await marchio();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={64} src={m.logoUrl} />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">{m.nomeGestionale}</p>
          <h1 className="mt-1 text-xl font-semibold">Verifica in due passaggi</h1>
        </div>
        <div className="card">
          <FormAzione azione={confermaCodiceAccesso}>
            <p className="text-sm text-muted">
              Apri l’app di autenticazione (Google Authenticator o simile) e scrivi il codice di sei
              cifre che vedi per {m.nomeGestionale}.
            </p>
            <input
              name="codice"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={11}
              placeholder="123456"
              aria-label="Codice"
              className="input num text-center text-2xl tracking-[0.3em]"
            />
            <Invia icona="chiave" className="btn-primary w-full">
              Entra
            </Invia>
            <p className="text-xs text-muted">
              Hai perso il telefono? Scrivi qui uno dei <strong>codici di recupero</strong> che hai
              salvato quando l’hai attivata (es. <span className="num">AB12C-3D45E</span>). Senza
              neanche quelli, chiedi all’admin di spegnerla.
            </p>
          </FormAzione>
        </div>
        <p className="mt-4 text-center text-xs">
          <Link href="/login" className="text-muted hover:text-nvg">
            ← Torna all’accesso
          </Link>
        </p>
      </div>
    </main>
  );
}
