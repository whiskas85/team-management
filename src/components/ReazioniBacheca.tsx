'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reagisci } from '@/actions/bacheche';
import { mostraToast } from './Toast';

export type ReazioneRaggruppata = { emoji: string; chi: string[]; mia: boolean };

/**
 * Le reazioni sotto un messaggio, come su WhatsApp.
 *
 * Le emoji già messe stanno in fila con il loro numero, e al passaggio del
 * mouse dicono chi. La faccina in fondo apre le sei possibili: se ne sceglie
 * una, toccando la propria la si toglie. Una sola a testa — su WhatsApp è
 * così, e una fila di sei reazioni della stessa persona non direbbe niente.
 */
export function ReazioniBacheca({
  messaggioId,
  reazioni,
  emoji,
}: {
  messaggioId: string;
  reazioni: ReazioneRaggruppata[];
  emoji: readonly string[];
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [inCorso, avvia] = useTransition();

  const tocca = (e: string) => {
    setAperto(false);
    avvia(async () => {
      const esito = await reagisci(messaggioId, e);
      if (esito.errore) mostraToast(esito.errore, 'errore');
      router.refresh();
    });
  };

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {reazioni.map((r) => (
        <button
          key={r.emoji}
          type="button"
          disabled={inCorso}
          onClick={() => tocca(r.emoji)}
          title={r.chi.join(', ')}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-colors ${
            r.mia ? 'border-nvg bg-nvg/15' : 'border-line bg-surface2 hover:border-nvgdim'
          }`}
        >
          <span>{r.emoji}</span>
          <span className="num text-xs text-muted">{r.chi.length}</span>
        </button>
      ))}

      <button
        type="button"
        disabled={inCorso}
        onClick={() => setAperto((v) => !v)}
        className="rounded-full border border-line px-2 py-0.5 text-sm text-muted hover:border-nvgdim hover:text-ink"
        title="Reagisci"
        aria-label="Reagisci"
      >
        {aperto ? '×' : '☺︎+'}
      </button>

      {aperto && (
        <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-1 rounded-full border border-line bg-surface px-2 py-1 shadow-lg">
          {emoji.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => tocca(e)}
              className="rounded-full px-1 text-xl transition-transform hover:scale-125"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
