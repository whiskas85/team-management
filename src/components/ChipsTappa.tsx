'use client';

import { useActionState, useEffect, useTransition } from 'react';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import { spostaPasseggero } from '@/actions/macchine';
import type { StatoForm } from '@/lib/form';

type Persona = { id: string; nome: string };

/**
 * Chi sale a una tappa, come chips: il nome, e per chi guida una crocetta per
 * toglierlo e un «+» per aggiungere uno di quelli a bordo. Spostare qualcuno
 * da un ritrovo all'altro è un tocco: lo si aggiunge qui, e lascia l'altro.
 */
export function ChipsTappa({
  macchinaId,
  tappaId,
  qui,
  altri,
  modifica,
}: {
  macchinaId: string;
  /** Vuoto: la fila di chi non ha ancora un ritrovo. */
  tappaId: string;
  qui: Persona[];
  /** Quelli a bordo che si possono portare qui (stanno altrove o da nessuna parte). */
  altri: Persona[];
  /** Chi guida: crocette e «+». Gli altri leggono soltanto. */
  modifica: boolean;
}) {
  const [stato, invia] = useActionState(spostaPasseggero, {} as StatoForm);
  const [inCorso, avvia] = useTransition();
  useEffect(() => {
    if (stato.errore) mostraToast(stato.errore, 'errore');
  }, [stato]);

  const sposta = (userId: string, dove: string) => {
    const fd = new FormData();
    fd.set('id', macchinaId);
    fd.set('userId', userId);
    fd.set('tappaId', dove);
    avvia(() => invia(fd));
  };

  return (
    <div className={`mt-1.5 flex flex-wrap items-center gap-1.5 ${inCorso ? 'opacity-60' : ''}`}>
      {qui.map((p) => (
        <span
          key={p.id}
          className="inline-flex items-center gap-1 rounded-full border border-nvg/40 bg-nvg/10 py-0.5 pl-2.5 pr-1.5 text-xs text-ink"
        >
          {p.nome}
          {modifica && tappaId && (
            <button
              type="button"
              onClick={() => sposta(p.id, '')}
              disabled={inCorso}
              className="rounded-full p-0.5 text-muted hover:text-danger"
              aria-label={`Togli ${p.nome} da questa tappa`}
              title="Togli da questa tappa"
            >
              <Icona nome="chiudi" size={12} />
            </button>
          )}
        </span>
      ))}
      {qui.length === 0 && !modifica && <span className="text-xs text-muted">Nessuno</span>}
      {modifica && tappaId && altri.length > 0 && (
        <label className="inline-flex items-center">
          <span className="sr-only">Aggiungi un passeggero a questa tappa</span>
          <select
            value=""
            disabled={inCorso}
            onChange={(e) => e.target.value && sposta(e.target.value, tappaId)}
            className="cursor-pointer rounded-full border border-dashed border-line bg-transparent py-0.5 pl-2.5 pr-6 text-xs text-muted hover:border-nvg hover:text-nvg"
          >
            <option value="">+ aggiungi</option>
            {altri.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
