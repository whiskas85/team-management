import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Tono } from '@/lib/domain';

const TONI: Record<Tono, string> = {
  ok: 'border-nvg/40 bg-nvg/10 text-nvg',
  warn: 'border-warn/40 bg-warn/10 text-warn',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  info: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  neutro: 'border-line bg-surface2 text-muted',
};

export function Badge({ tono = 'neutro', children }: { tono?: Tono; children: ReactNode }) {
  return <span className={`badge ${TONI[tono]}`}>{children}</span>;
}

export function Intestazione({
  titolo,
  sottotitolo,
  azioni,
}: {
  titolo: string;
  sottotitolo?: string;
  azioni?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titolo}</h1>
        {sottotitolo && <p className="mt-1 text-sm text-muted">{sottotitolo}</p>}
      </div>
      {azioni && <div className="flex flex-wrap gap-2">{azioni}</div>}
    </div>
  );
}

export function Vuoto({ testo, azione }: { testo: string; azione?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
      <p className="text-sm text-muted">{testo}</p>
      {azione && <div className="mt-4 flex justify-center">{azione}</div>}
    </div>
  );
}

export function Statistica({
  etichetta,
  valore,
  dettaglio,
  tono = 'neutro',
  href,
}: {
  etichetta: string;
  valore: string | number;
  dettaglio?: string;
  tono?: Tono;
  /**
   * Dove porta il riquadro, se porta da qualche parte. Un numero che riguarda
   * qualcosa — il certificato, i soldi da saldare — la prima cosa che fa
   * venire voglia è di andarci: senza il collegamento tocca cercarsi la voce
   * di menu giusta.
   */
  href?: string;
}) {
  const colore =
    tono === 'ok'
      ? 'text-nvg'
      : tono === 'warn'
        ? 'text-warn'
        : tono === 'danger'
          ? 'text-danger'
          : 'text-ink';
  const dentro = (
    <>
      <p className="titolo-sezione">{etichetta}</p>
      <p className={`mt-2 num text-2xl font-semibold ${colore}`}>{valore}</p>
      {dettaglio && <p className="mt-1 text-xs text-muted">{dettaglio}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card block transition-colors hover:border-nvgdim">
        {dentro}
      </Link>
    );
  }

  return <div className="card">{dentro}</div>;
}

export function Campo({
  label,
  children,
  span,
}: {
  label: string;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <div className={span ? 'sm:col-span-2' : undefined}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Dato({ etichetta, valore }: { etichetta: string; valore: ReactNode }) {
  return (
    <div>
      <p className="titolo-sezione">{etichetta}</p>
      <p className="mt-1 text-sm">{valore ?? '—'}</p>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
export function Avatar({
  iniziali,
  size = 'md',
  fotoDi,
}: {
  iniziali: string;
  size?: 'sm' | 'md' | 'lg';
  /** Id dell'operatore: se ha una foto viene mostrata al posto delle iniziali. */
  fotoDi?: string | null;
}) {
  const dim =
    size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-16 w-16 text-lg' : 'h-11 w-11 text-sm';

  if (fotoDi) {
    return (
      <img
        src={`/api/foto/${fotoDi}`}
        alt=""
        className={`${dim} shrink-0 rounded-full border border-nvg/30 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full border border-nvg/30 bg-nvg/10 font-semibold text-nvg`}
    >
      {iniziali}
    </div>
  );
}

export function Avviso({ tono = 'info', children }: { tono?: Tono; children: ReactNode }) {
  return (
    <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${TONI[tono]}`}>{children}</div>
  );
}

/** Contenitore che mostra le card su telefono e la tabella su desktop. */
export function Elenco({ cards, tabella }: { cards: ReactNode; tabella: ReactNode }) {
  return (
    <>
      <div className="space-y-3 md:hidden">{cards}</div>
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
        {tabella}
      </div>
    </>
  );
}
