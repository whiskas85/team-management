'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { accedi, type StatoForm } from '@/actions/auth';

/** Una riga da terminale sotto il modulo. Dice una cosa vera, non fa solo scena. */
export type RigaTerminale = { testo: string; esito: string; tono?: 'ok' | 'warn' };

/**
 * Il modulo di accesso, con la faccia da terminale.
 *
 * Si entra con l'email o con il callsign, come sempre: le etichette sono
 * cambiate, i campi no. «Ricordami» resta spuntato di partenza, perché chi
 * apre il gestionale dal telefono della squadra non vuole riscrivere la
 * password ogni sabato.
 */
export function FormLogin({ righe }: { righe: RigaTerminale[] }) {
  const [stato, azione] = useActionState(accedi, {} as StatoForm);

  return (
    <div className="login-card px-6 py-8 sm:px-12 sm:py-10">
      <div className="mb-8 text-center">
        <h2 className="login-display text-[clamp(1.15rem,4vw,1.9rem)] font-bold tracking-[0.12em] text-nvg [text-shadow:0_0_12px_rgba(76,255,0,.6)]">
          ACCESSO PROTETTO
        </h2>
        <p className="login-terminale mt-2 text-[clamp(0.8rem,2.4vw,1.1rem)] tracking-[0.18em] text-nvg/45">
          INSERIRE CREDENZIALI OPERATIVE
        </p>
      </div>

      <form action={azione} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="login-terminale mb-2 block text-[1.05rem] tracking-[0.16em] text-nvg/80"
          >
            » IDENTIFICATIVO OPERATIVO
          </label>
          {/* type="text": con type="email" il browser rifiuterebbe il callsign
              prima ancora di provare a mandarlo */}
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="login-campo"
            placeholder="email o callsign"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="login-terminale mb-2 block text-[1.05rem] tracking-[0.16em] text-nvg/80"
          >
            » CODICE DI ACCESSO
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="login-campo"
            placeholder="••••••••••••"
          />
        </div>

        <label className="login-terminale flex cursor-pointer items-center gap-2.5 text-sm tracking-[0.12em] text-nvg/60">
          <input
            type="checkbox"
            name="ricordami"
            defaultChecked
            className="h-4 w-4 accent-[color:var(--nvg)]"
          />
          RICORDAMI SU QUESTO DISPOSITIVO
        </label>

        <Autentica />

        {/* sotto il pulsante, dove si guarda subito dopo averlo premuto */}
        {stato.errore && (
          <div
            role="alert"
            className="login-terminale flex items-center justify-center gap-2 border border-danger/60 bg-danger/10 px-4 py-3 text-center text-[1.02rem] uppercase tracking-[0.1em] text-danger"
          >
            <span aria-hidden>⚠</span>
            {stato.errore}
          </div>
        )}
      </form>

      {/* si accendono una alla volta, come un terminale che si collega; chi ha
          chiesto meno animazioni le trova già accese */}
      <div className="login-terminale mt-8 space-y-2 text-center text-[clamp(0.78rem,2.3vw,1.02rem)] tracking-[0.12em] text-nvg/45">
        {righe.map((r, i) => (
          <p key={r.testo} className="login-riga" style={{ animationDelay: `${300 + i * 350}ms` }}>
            &gt; {r.testo} ...{' '}
            <span
              className={
                r.tono === 'warn'
                  ? 'text-warn'
                  : 'text-nvg [text-shadow:0_0_8px_rgba(76,255,0,.6)]'
              }
            >
              {r.esito}
            </span>
          </p>
        ))}
        <p
          className="login-riga login-cursore"
          style={{ animationDelay: `${300 + righe.length * 350}ms` }}
        >
          &gt; NUOVO OPERATORE?{' '}
          <Link href="/register" className="text-nvg underline-offset-4 hover:underline">
            REGISTRATI
          </Link>
        </p>
      </div>
    </div>
  );
}

function Autentica() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="login-pulsante w-full">
      {pending ? '[ VERIFICA IN CORSO… ]' : '[ AUTENTICAZIONE ]'}
    </button>
  );
}
