'use client';

import { useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Icona } from './Icona';

/**
 * La scheda «Rilascio» nella modifica di una bozza: si salva e si rilascia in
 * un colpo solo.
 *
 * I pulsanti sono quelli del modulo, non moduli loro: un modulo dentro l'altro
 * non si può. Quello premuto scrive a chi rilasciarla in un campo nascosto, e
 * il salvataggio, finite le modifiche, la rilascia. Così le modifiche appena
 * fatte non si perdono per strada.
 */
export function RilascioNelModulo({ soloInterno = false }: { soloInterno?: boolean }) {
  const campo = useRef<HTMLInputElement>(null);
  const { pending } = useFormStatus();

  // A ogni invio il campo dice chi l'ha fatto partire: uno di questi pulsanti,
  // o «Salva modifiche» (e allora resta vuoto, e la bozza resta bozza). Si
  // legge dal pulsante premuto e non da un click di prima, che il browser
  // potrebbe aver fermato per un campo obbligatorio vuoto.
  useEffect(() => {
    const form = campo.current?.form;
    if (!form) return;
    const segna = (e: SubmitEvent) => {
      const chi = (e.submitter as HTMLElement | null)?.dataset.rilascia ?? '';
      if (campo.current) campo.current.value = chi;
    };
    form.addEventListener('submit', segna);
    return () => form.removeEventListener('submit', segna);
  }, []);
  const scelte: {
    valore: string;
    etichetta: string;
    icona: 'squadra' | 'invita' | 'rilascia';
    primario: boolean;
  }[] = [
    {
      valore: 'TEAM',
      etichetta: 'Salva e rilascia alla squadra',
      icona: 'squadra',
      primario: soloInterno,
    },
    { valore: 'INVITO', etichetta: 'Salva e rilascia su invito', icona: 'invita', primario: false },
    ...(soloInterno
      ? []
      : [
          {
            valore: 'TUTTI',
            etichetta: 'Salva e rilascia a tutti',
            icona: 'rilascia' as const,
            primario: true,
          },
        ]),
  ];

  return (
    <div className="space-y-3">
      <input ref={campo} type="hidden" name="rilascia" defaultValue="" />
      <p className="text-sm text-muted">
        È ancora una bozza: non la vede nessuno. Rilasciandola diventa visibile e accetta adesioni.{' '}
        {soloInterno
          ? 'La tipologia è riservata alla squadra: a tutti non si può.'
          : 'Su invito la vede solo chi aggiungi fra i partecipanti.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {scelte.map((s) => (
          <button
            key={s.valore}
            type="submit"
            disabled={pending}
            data-rilascia={s.valore}
            className={`${s.primario ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          >
            <Icona nome={s.icona} size={14} />
            {s.etichetta}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        «Salva modifiche», qui sotto, salva e la lascia in bozza.
      </p>
    </div>
  );
}
