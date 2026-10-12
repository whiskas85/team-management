'use client';

import { useActionState } from 'react';
import { confermaEmail } from '@/actions/verifica-email';
import { Invia } from './Bottone';

const DETTO = {
  fatta: { ok: true, testo: 'Email confermata. Grazie!' },
  gia: { ok: true, testo: 'Questa email era già confermata.' },
  scaduto: {
    ok: false,
    testo: 'Il link è scaduto: dal tuo profilo puoi fartene mandare uno nuovo.',
  },
  'non-valido': {
    ok: false,
    testo:
      'Il link non è valido: forse l’email dell’account è cambiata. Dal tuo profilo puoi fartene mandare uno nuovo.',
  },
} as const;

export function ConfermaEmail({ u, s, f }: { u: string; s: string; f: string }) {
  const [esito, azione] = useActionState(confermaEmail, null);
  if (esito) {
    const d = DETTO[esito];
    return (
      <div
        className={`rounded-md border px-3 py-2 text-sm ${d.ok ? 'border-nvg/40 bg-nvg/10 text-nvg' : 'border-danger/40 bg-danger/10 text-danger'}`}
      >
        {d.testo}
      </div>
    );
  }
  return (
    <form action={azione} className="space-y-4">
      <input type="hidden" name="u" value={u} />
      <input type="hidden" name="s" value={s} />
      <input type="hidden" name="f" value={f} />
      <p className="text-sm text-muted">
        Premi il pulsante per confermare che questa email è tua: gli avvisi importanti ti
        arriveranno anche qui, se non hai le notifiche né WhatsApp.
      </p>
      <Invia icona="email">Confermo, è la mia email</Invia>
    </form>
  );
}
