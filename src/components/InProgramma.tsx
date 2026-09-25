'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Icona } from './Icona';

export type VoceInProgramma = {
  id: string;
  /** L'anno dell'inizio, letto sull'ora di qui. */
  anno: number;
  /** Il mese dell'inizio, da 0 (gennaio) a 11. */
  mese: number;
  /** Tutto il testo in cui si cerca, già messo insieme dal server. */
  cerca: string;
  /** La card, disegnata dal server come sempre. */
  card: ReactNode;
  /** Cominciata e non ancora chiusa: sta fra le correnti, sopra ai mesi. */
  fase?: 'in corso' | 'terminata' | null;
};

/** Minuscole e senza accenti: «Città» e «citta» sono la stessa ricerca. */
const normalizza = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Il nome del mese, con l'anno solo se non è quello in corso. */
const nomeMese = (anno: number, mese: number, annoCorrente: number) => {
  const nome = new Date(anno, mese, 1).toLocaleDateString('it-IT', { month: 'long' });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}${anno === annoCorrente ? '' : ` ${anno}`}`;
};

/** Come si chiama un mese rispetto a quello in corso. */
const quando = (chiave: number, corrente: number) =>
  chiave === corrente ? 'questo mese' : chiave === corrente + 1 ? 'il mese prossimo' : null;

/**
 * Le attività in programma, con la ricerca e divise per mese.
 *
 * Le card le disegna il server, come prima: qui arrivano già fatte, con i
 * pulsanti per rispondere e quelli di gestione dentro. Questo componente
 * decide soltanto quali mostrare e sotto quale anno, e lo fa nel browser —
 * filtrare mentre si scrive non deve ricaricare la pagina a ogni lettera.
 *
 * **Divise per mese**, prima quello in corso: chi scorre sa cosa c'è questo
 * mese e cosa il prossimo, senza leggere le date una a una. L'anno si scrive
 * solo quando non è quello in corso, così gennaio prossimo non si confonde
 * con quello passato. Le correnti restano un gruppo solo in cima, e le
 * passate stanno nello storico. **La ricerca** guarda titolo, tipologia, campo e data scritta
 * per esteso, con tutte le parole in qualsiasi ordine: «k9 ottobre» trova il
 * corso di ottobre. Se non trova niente lo dice, invece di lasciare la pagina
 * vuota come se non ci fosse nulla in programma.
 */
export function InProgramma({
  voci,
  annoCorrente,
  meseCorrente,
}: {
  voci: VoceInProgramma[];
  annoCorrente: number;
  meseCorrente: number;
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

  // Le correnti — in corso, o finite e ancora da chiudere — stanno sopra a
  // tutto e fuori dai mesi: sono quelle su cui c'è da fare qualcosa adesso,
  // e una giornata finita resta lì a ricordare che va chiusa.
  const [correnti, resto] = useMemo(
    () => [trovate.filter((v) => v.fase), trovate.filter((v) => !v.fase)],
    [trovate],
  );

  // Quelle che verranno, mese per mese: la chiave è anno*12+mese, così
  // dicembre e il gennaio dopo stanno in fila
  const mesi = useMemo(() => {
    const perMese = new Map<number, typeof resto>();
    for (const v of resto) {
      const chiave = v.anno * 12 + v.mese;
      perMese.set(chiave, [...(perMese.get(chiave) ?? []), v]);
    }
    return [...perMese.entries()].sort(([a], [b]) => a - b);
  }, [resto]);
  const adesso = annoCorrente * 12 + meseCorrente;

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

      {correnti.length > 0 && (
        <section>
          <h2 className="titolo-sezione mb-3 flex flex-wrap items-baseline gap-x-2">
            <span className="text-warn">Correnti</span>
            <span>· in corso o da chiudere</span>
            <span className="num">
              · {correnti.length === 1 ? '1 attività' : `${correnti.length} attività`}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {correnti.map((v) => (
              <Fragment key={v.id}>{v.card}</Fragment>
            ))}
          </div>
        </section>
      )}

      {mesi.length === 0 && correnti.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Nessuna attività in programma corrisponde a «{q.trim()}».{' '}
          <button type="button" onClick={() => setQ('')} className="text-nvg hover:underline">
            Cancella la ricerca
          </button>
        </div>
      ) : (
        mesi.map(([chiave, elenco]) => (
          <section key={chiave}>
            <h2 className="titolo-sezione mb-3 flex flex-wrap items-baseline gap-x-2">
              <span className={chiave === adesso ? 'text-nvg' : 'text-ink'}>
                {nomeMese(Math.floor(chiave / 12), chiave % 12, annoCorrente)}
              </span>
              {quando(chiave, adesso) && <span>· {quando(chiave, adesso)}</span>}
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
