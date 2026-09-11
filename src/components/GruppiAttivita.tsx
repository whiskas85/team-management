import Link from 'next/link';
import { fmtDate, fmtEuro } from '@/lib/format';

/** I pagamenti di un'attività, o quelli che un'attività non ce l'hanno. */
export type GruppoAttivita<T> = {
  chiave: string;
  titolo: string;
  eventId: string | null;
  quando: Date | null;
  righe: T[];
  /** Quanto resta da incassare in questo gruppo. */
  aperto: number;
};

type Pagamento = {
  event: { id: string; titolo: string; inizio: Date } | null;
  tipo: string;
  status: string;
  importo: unknown;
  pagato: unknown;
};

/**
 * Divide i pagamenti per attività.
 *
 * Chi tiene una cassa ragiona per giornata: «del Corso CQB chi manca?». Una
 * lista unica mescola le quote di tre attività e costringe a leggere la
 * descrizione riga per riga. Qui ogni attività ha il suo gruppo, nell'ordine
 * in cui arrivano i pagamenti — il più urgente in cima — e quello che
 * un'attività non ce l'ha (iscrizioni, tessere, merchandising) sta in fondo.
 */
export function raggruppaPerAttivita<T extends Pagamento>(righe: T[]): GruppoAttivita<T>[] {
  const gruppi = new Map<string, GruppoAttivita<T>>();
  for (const r of righe) {
    const chiave = r.event?.id ?? '';
    const g = gruppi.get(chiave) ?? {
      chiave: chiave || 'senza-attivita',
      titolo: r.event?.titolo ?? 'Altri pagamenti',
      eventId: r.event?.id ?? null,
      quando: r.event?.inizio ?? null,
      righe: [],
      aperto: 0,
    };
    g.righe.push(r);
    if (r.tipo !== 'RIMBORSO' && (r.status === 'DA_PAGARE' || r.status === 'PARZIALE')) {
      g.aperto += Number(r.importo) - Number(r.pagato);
    }
    gruppi.set(chiave, g);
  }
  // quello senza attività va in fondo: è il resto, non una giornata
  return [...gruppi.values()].sort((a, b) => Number(!a.eventId) - Number(!b.eventId));
}

/** Il titolo di un gruppo: l'attività, quando, quanti sono e quanto manca. */
export function TitoloGruppo({ gruppo }: { gruppo: GruppoAttivita<unknown> }) {
  return (
    <h2 className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {gruppo.eventId ? (
        <Link
          href={`/calendario/${gruppo.eventId}`}
          className="font-medium hover:text-nvg"
        >
          {gruppo.titolo}
        </Link>
      ) : (
        <span className="font-medium">{gruppo.titolo}</span>
      )}
      {gruppo.quando && (
        <span className="num text-xs text-muted">{fmtDate(gruppo.quando)}</span>
      )}
      <span className="num text-xs text-muted">
        · {gruppo.righe.length === 1 ? '1 pagamento' : `${gruppo.righe.length} pagamenti`}
      </span>
      {gruppo.aperto > 0 && (
        <span className="num text-xs text-warn">· {fmtEuro(gruppo.aperto)} da incassare</span>
      )}
    </h2>
  );
}
