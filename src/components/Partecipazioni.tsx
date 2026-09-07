import Link from 'next/link';
import { tonoRsvp } from '@/lib/domain';
import { fmtDate, umanizza } from '@/lib/format';
import { Badge } from '@/components/ui';

/**
 * Le attività di una persona: quelle che verranno e quelle passate.
 *
 * Stavano in un elenco solo, in ordine di risposta, e quindi un'uscita fra tre
 * settimane compariva in mezzo allo "storico" — che di storico non aveva più
 * niente. Sono due domande diverse: *dove sarà* e *dov'è stato*, e si guardano
 * in due momenti diversi.
 *
 * Il componente è uno per il profilo e per la scheda vista dallo staff: sono la
 * stessa cosa vista da due parti, e tenerli separati significava correggerli
 * due volte.
 */

export type Partecipazione = {
  id: string;
  status: string;
  /** Verdetto dell'appello: nullo finché l'appello non è stato fatto. */
  presente: boolean | null;
  event: {
    id: string;
    titolo: string;
    inizio: Date;
    tipo: { nome: string } | null;
  };
};

/**
 * Un badge solo, che dice l'ultima cosa vera.
 *
 * Prima dell'appello conta quello che ha risposto; dopo l'appello conta se
 * c'era davvero, e la risposta non serve più a nessuno.
 */
function statoDiFatto(p: Partecipazione) {
  if (p.presente === null) {
    return { testo: umanizza(p.status), tono: tonoRsvp[p.status] ?? 'neutro' } as const;
  }
  return p.presente
    ? ({ testo: 'c’era', tono: 'ok' } as const)
    : ({ testo: 'non c’era', tono: 'danger' } as const);
}

function Riga({ p }: { p: Partecipazione }) {
  const stato = statoDiFatto(p);
  return (
    <Link
      href={`/calendario/${p.event.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 transition-colors hover:border-nvgdim"
    >
      <div className="min-w-0">
        <p className="truncate text-sm">{p.event.titolo}</p>
        <p className="num text-xs text-muted">
          {p.event.tipo?.nome ?? 'Senza tipologia'} · {fmtDate(p.event.inizio)}
        </p>
      </div>
      <span className="shrink-0">
        <Badge tono={stato.tono}>{stato.testo}</Badge>
      </span>
    </Link>
  );
}

export function Partecipazioni({
  rsvps,
  limite = 20,
  vuoto = 'Nessuna partecipazione registrata.',
}: {
  rsvps: Partecipazione[];
  /** Quante passate mostrare: le prossime si mostrano tutte, sono poche. */
  limite?: number;
  vuoto?: string;
}) {
  const adesso = new Date();
  // la giornata conta intera: un'attività cominciata stamattina è ancora di oggi
  const inizioOggi = new Date(adesso);
  inizioOggi.setHours(0, 0, 0, 0);

  // Fatto l'appello l'attività è andata, anche se è di oggi: lasciarla fra le
  // prossime vorrebbe dire leggere "c'era" sotto il titolo "in programma".
  const finita = (p: Partecipazione) =>
    p.presente !== null || new Date(p.event.inizio) < inizioOggi;

  const prossime = rsvps
    .filter((p) => !finita(p))
    .sort((a, b) => +new Date(a.event.inizio) - +new Date(b.event.inizio));
  const passate = rsvps
    .filter(finita)
    .sort((a, b) => +new Date(b.event.inizio) - +new Date(a.event.inizio));

  if (rsvps.length === 0) return <p className="text-sm text-muted">{vuoto}</p>;

  return (
    <div className="space-y-5">
      {prossime.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
            In programma · {prossime.length}
          </p>
          <div className="space-y-2">
            {prossime.map((p) => (
              <Riga key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}

      {passate.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Già fatte · {passate.length}
          </p>
          <div className="space-y-2">
            {passate.slice(0, limite).map((p) => (
              <Riga key={p.id} p={p} />
            ))}
          </div>
          {passate.length > limite && (
            <p className="mt-2 text-[11px] text-muted">
              Le {limite} più recenti, di {passate.length}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
