import type { CSSProperties } from 'react';
import { daHex, TOKEN, type Tavolozza } from '@/lib/tema';

/** Le variabili di un tema, da mettere su un riquadro: dentro vale quel tema. */
export function stileTema(t: Tavolozza): CSSProperties {
  const v: Record<string, string> = {};
  for (const k of TOKEN) v[`--c-${k}`] = daHex(t.colori[k])!.join(' ');
  for (const [k, hex] of Object.entries(t.tinte)) v[`--t-${k}`] = daHex(hex)!.join(' ');
  return { ...v, colorScheme: t.scuro ? 'dark' : 'light' } as CSSProperties;
}

/**
 * Un pezzo di gestionale col tema dato: card, testo, pulsanti, badge e una
 * casella. Si vede com'è prima di salvarlo, invece di scoprirlo dopo.
 */
export function AnteprimaTema({ t, compatta = false }: { t: Tavolozza; compatta?: boolean }) {
  if (compatta) {
    // quattro pallini: fondo, testo, accento, avviso — per l'elenco dei temi
    return (
      <span
        style={stileTema(t)}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-surface p-1"
        aria-hidden
      >
        <span className="h-4 w-4 rounded-sm border border-line bg-bg" />
        <span className="h-4 w-4 rounded-sm bg-ink" />
        <span className="h-4 w-4 rounded-sm bg-nvg" />
        <span className="h-4 w-4 rounded-sm bg-danger" />
      </span>
    );
  }
  return (
    <div style={stileTema(t)} className="rounded-lg border border-line bg-bg p-3 text-ink">
      <div className="rounded-lg border border-line bg-surface p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Prossima attività
        </p>
        <p className="mt-1 font-medium">Op. Notturna al Campo Nord</p>
        <p className="text-xs text-muted">sabato 17 ottobre · ritrovo alle 18:30</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="badge border-nvg/40 bg-nvg/10 text-nvg">Confermato</span>
          <span className="badge border-warn/40 bg-warn/10 text-warn">Da pagare</span>
          <span className="badge border-danger/40 bg-danger/10 text-danger">Scaduto</span>
          <span className="badge border-info/40 bg-info/10 text-info">Nuovo</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="btn-primary btn-sm">Ci sono</span>
          <span className="btn-ghost btn-sm">Forse</span>
          <span className="text-sm text-nvg underline">Apri la scheda</span>
        </div>
        <span className="input mt-3 block text-muted">Scrivi una nota…</span>
      </div>
    </div>
  );
}
