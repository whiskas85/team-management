import Link from 'next/link';
import type { VoceAiuto } from '@/lib/aiuto';
import { TestoAiuto } from './TestoAiuto';

/**
 * Una voce dell'aiuto: cosa si fa, per chi, e i gesti che servono — con i
 * pulsanti disegnati come sulla pagina, perché si riconoscano.
 */
export function VoceAiutoVista({
  voce,
  link = true,
  onVai,
}: {
  voce: VoceAiuto;
  /** Il collegamento alla pagina di cui parla, se ce n'è una senza pezzi variabili. */
  link?: boolean;
  onVai?: () => void;
}) {
  const vai = link && voce.percorso && !voce.percorso.includes('[') ? voce.percorso : null;
  return (
    <article className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {voce.area}
          {voce.perChi && <span className="normal-case tracking-normal"> · {voce.perChi}</span>}
        </p>
        <h3 className="mt-0.5 text-base font-semibold">{voce.titolo}</h3>
        <p className="mt-1 text-sm leading-6 text-ink/90">
          <TestoAiuto testo={voce.cosa} />
        </p>
      </div>
      <ul className="space-y-2">
        {voce.passi.map((p) => (
          <li key={p.titolo} className="rounded-md border border-line bg-surface2/60 px-3 py-2">
            <p className="text-sm font-medium">{p.titolo}</p>
            <p className="mt-0.5 text-sm leading-7 text-muted">
              <TestoAiuto testo={p.testo} />
            </p>
          </li>
        ))}
      </ul>
      {vai && (
        <Link href={vai} onClick={onVai} className="inline-block text-sm text-nvg hover:underline">
          Vai a {voce.titolo} →
        </Link>
      )}
    </article>
  );
}
