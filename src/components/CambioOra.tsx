import { cambioOra, testoCambioOra } from '@/lib/cambio-ora';
import { Badge } from './ui';

type Quando = { inizio: Date | string; fine?: Date | string | null };

const calcola = ({ inizio, fine }: Quando) =>
  cambioOra(new Date(inizio), fine ? new Date(fine) : null);

/**
 * L'avviso del cambio dell'ora, nella pagina dell'attività: quale notte, cosa
 * fanno le lancette, e di stare attenti a sveglie e orari.
 */
export function AvvisoCambioOra(q: Quando) {
  const c = calcola(q);
  if (!c) return null;
  return (
    <div
      role="note"
      className="mb-6 flex flex-col gap-1 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-warn sm:flex-row sm:items-center sm:gap-x-3"
    >
      <span className="text-base font-semibold">
        {c.verso === 'solare' ? 'TORNA L’ORA SOLARE' : 'ENTRA L’ORA LEGALE'}
      </span>
      <span className="min-w-0 flex-1 text-sm">{testoCambioOra(c)}</span>
    </div>
  );
}

/** Lo stesso, in piccolo, sulla card dell'attività. */
export function BadgeCambioOra(q: Quando) {
  const c = calcola(q);
  if (!c) return null;
  return (
    <span title={testoCambioOra(c)} className="mt-1 inline-block">
      <Badge tono="warn">
        Cambio ora {c.verso === 'solare' ? '(si dorme un’ora in più)' : '(un’ora in meno)'}
      </Badge>
    </span>
  );
}
