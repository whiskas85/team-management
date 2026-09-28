'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import { rimuoviPartecipante } from '@/actions/eventi';

/**
 * La X accanto a un nome dell'appello: toglie quella persona dall'attività.
 *
 * Non è un modulo — sta dentro il modulo dell'appello, e un modulo dentro un
 * altro il browser non lo accetta — ma un pulsante che chiama l'azione da sé.
 * Serve soprattutto per chi è stato aggiunto dall'appello per sbaglio: entra
 * già spuntato, e togliere la spunta lo segnerebbe assente, non lo toglierebbe.
 */
export function TogliDallAppello({ rsvpId, nome }: { rsvpId: string; nome: string }) {
  const [attesa, avvia] = useTransition();
  const router = useRouter();

  const togli = () => {
    if (!confirm(`Togliere ${nome} dall’attività?`)) return;
    avvia(async () => {
      const fd = new FormData();
      fd.set('rsvpId', rsvpId);
      const esito = await rimuoviPartecipante({}, fd);
      if (esito.errore) mostraToast(esito.errore, 'errore');
      else {
        mostraToast(`${nome} tolto dall’attività.`, 'ok');
        router.refresh();
      }
    });
  };

  return (
    <button
      type="button"
      onClick={togli}
      disabled={attesa}
      className="ml-auto shrink-0 rounded p-1 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40"
      title={`Togli ${nome} dall’attività`}
      aria-label={`Togli ${nome} dall’attività`}
    >
      <Icona nome="chiudi" size={14} />
    </button>
  );
}
