'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Icona } from './Icona';

export type VoceInProgramma = {
  id: string;
  /** L'anno dell'inizio, letto sull'ora di qui. */
  anno: number;
  /** Tutto il testo in cui si cerca, già messo insieme dal server. */
  cerca: string;
  /** La card, disegnata dal server come sempre. */
  card: ReactNode;
};

/** Minuscole e senza accenti: «Città» e «citta» sono la stessa ricerca. */
const normalizza = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Come si chiama un anno rispetto a quello in corso. */
const quando = (anno: number, corrente: number) =>
  anno === corrente ? 'quest’anno' : anno === corrente + 1 ? 'l’anno prossimo' : 'più avanti';

/**
 * Le attività in programma, con la ricerca e divise per anno.
 *
 * Le card le disegna il server, come prima: qui arrivano già fatte, con i
 * pulsanti per rispondere e quelli di gestione dentro. Questo componente
 * decide soltanto quali mostrare e sotto quale anno, e lo fa nel browser —
 * filtrare mentre si scrive non deve ricaricare la pagina a ogni lettera.
 *
 * **Divise per anno**, prima quello in corso: una gara di marzo del prossimo
 * anno non si confonde con quella di questo ottobre, e chi scorre sa quando ha
 * finito l'anno. **La ricerca** guarda titolo, tipologia, campo e data scritta
 * per esteso, con tutte le parole in qualsiasi ordine: «k9 ottobre» trova il
 * corso di ottobre. Se non trova niente lo dice, invece di lasciare la pagina
 * vuota come se non ci fosse nulla in programma.
 */
export function InProgramma({
  voci,
  annoCorrente,
}: {
  voci: VoceInProgramma[];
  annoCorrente: number;
}) {
  const [q, setQ] = useState('');

  // il testo di ogni voce si prepara una volta sola, non a ogni lettera
  const preparate = useMemo(
    () => voci.map((v) => ({ ...v, testo: normalizza(v.cerca) })),
    [voci],
  );

  const trovate = useMemo(() => {
    const parole = normalizza(q).split(/\s+/).filter(Boolean);
    if (parole.length === 0) return preparate;
    return preparate.filter((v) => parole.every((p) => v.testo.includes(p)));
  }, [preparate, q]);

  const anni = useMemo(() => {
    const perAnno = new Map<number, typeof trovate>();
    for (const v of trovate) perAnno.set(v.anno, [...(perAnno.get(v.anno) ?? []), v]);
    return [...perAnno.entries()].sort(([a], [b]) => a - b);
  }, [trovate]);

  const cercando = q.trim() !== '';

  return (
    <div className="space-y-6">
      <div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icona nome="cerca" size={16} />
          </span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQ('');
            }}
            className="input pl-9 pr-9"
            placeholder="Cerca per titolo, tipologia, campo o data…"
            aria-label="Cerca fra le attività in programma"
            autoComplete="off"
          />
          {cercando && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-lg leading-none text-muted transition-colors hover:text-ink"
              aria-label="Cancella la ricerca"
            >
              ×
            </button>
          )}
        </div>
        {cercando && trovate.length > 0 && (
          <p className="num mt-1.5 text-xs text-muted">
            {trovate.length} di {voci.length}
          </p>
        )}
      </div>

      {anni.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Nessuna attività in programma corrisponde a «{q.trim()}».{' '}
          <button type="button" onClick={() => setQ('')} className="text-nvg hover:underline">
            Cancella la ricerca
          </button>
        </div>
      ) : (
        anni.map(([anno, elenco]) => (
          <section key={anno}>
            <h2 className="titolo-sezione mb-3 flex flex-wrap items-baseline gap-x-2">
              <span className={anno === annoCorrente ? 'text-nvg' : 'text-ink'}>{anno}</span>
              <span>· {quando(anno, annoCorrente)}</span>
              <span className="num">
                · {elenco.length === 1 ? '1 attività' : `${elenco.length} attività`}
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {elenco.map((v) => (
                <Fragment key={v.id}>{v.card}</Fragment>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
