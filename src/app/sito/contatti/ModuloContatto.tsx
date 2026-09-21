'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { inviaContatto } from '@/actions/contatti';
import type { StatoForm } from '@/lib/form';

const COME = ['Instagram', 'YouTube', 'Un amico', 'Un campo di gioco', 'Ricerca su internet', 'Altro'];

function Invia() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-nvg px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-bg shadow-nvg transition-opacity disabled:opacity-60 sm:w-auto"
    >
      {pending ? 'Invio…' : 'Voglio provare'}
    </button>
  );
}

const campo =
  'w-full rounded-md border border-line bg-surface2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-nvg focus:outline-none';

/**
 * Il modulo «Vuoi provare?».
 *
 * Chiede lo stretto necessario per richiamare: nome e telefono sono
 * obbligatori, il resto aiuta a proporre la giornata giusta. Andato a buon
 * fine, il modulo lascia il posto al grazie: restare lì pieno farebbe pensare
 * di doverlo mandare di nuovo.
 */
export function ModuloContatto() {
  const [stato, azione] = useActionState(inviaContatto, {} as StatoForm);
  // l'ora in cui la pagina si è aperta: chi manda il modulo in meno di tre
  // secondi non l'ha scritto a mano
  const [aperto] = useState(() => String(Date.now()));

  if (stato.ok) {
    return (
      <div className="rounded-lg border border-nvg/50 bg-nvg/10 p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-nvg">Messaggio ricevuto</p>
        <p className="mt-2 text-lg">{stato.ok}</p>
      </div>
    );
  }

  return (
    <form action={azione} className="space-y-4">
      {stato.errore && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{stato.errore}</p>
      )}
      <input type="hidden" name="aperto" value={aperto} />
      {/* la trappola: una persona non la vede, un programma la compila */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Sito web
          <input name="sito_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs uppercase tracking-[0.15em] text-muted">
          Nome *
          <input name="nome" required autoComplete="given-name" className={`${campo} mt-1.5 normal-case tracking-normal`} />
        </label>
        <label className="block text-xs uppercase tracking-[0.15em] text-muted">
          Cognome
          <input name="cognome" autoComplete="family-name" className={`${campo} mt-1.5 normal-case tracking-normal`} />
        </label>
        <label className="block text-xs uppercase tracking-[0.15em] text-muted">
          Telefono *
          <input
            name="telefono"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={`${campo} mt-1.5 normal-case tracking-normal`}
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.15em] text-muted">
          Email
          <input name="email" type="email" autoComplete="email" className={`${campo} mt-1.5 normal-case tracking-normal`} />
        </label>
        <label className="block text-xs uppercase tracking-[0.15em] text-muted">
          Da dove vieni
          <input
            name="zona"
            placeholder="Città o zona"
            className={`${campo} mt-1.5 normal-case tracking-normal`}
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.15em] text-muted">
          Come ci hai conosciuto
          <select name="come" defaultValue="" className={`${campo} mt-1.5 normal-case tracking-normal`}>
            <option value="">—</option>
            {COME.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs uppercase tracking-[0.15em] text-muted">
        Raccontaci qualcosa
        <textarea
          name="messaggio"
          rows={4}
          placeholder="Hai già giocato? Hai attrezzatura? Cosa ti incuriosisce?"
          className={`${campo} mt-1.5 normal-case tracking-normal`}
        />
      </label>

      <label className="flex items-start gap-3 text-sm text-ink/80">
        <input type="checkbox" name="consenso" required className="mt-1" />
        <span>
          Ho letto l’informativa qui sotto e acconsento a essere ricontattato da Zero Dark Team
          (SAT &amp; Gaming ASD) per organizzare una giornata di prova.
        </span>
      </label>

      <Invia />
    </form>
  );
}
