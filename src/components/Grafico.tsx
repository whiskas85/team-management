export type Punto = { etichetta: string; valore: number; nota?: string };

/**
 * Istogramma costruito con dei div: si adatta alla larghezza senza viewBox da
 * ricalcolare e resta leggibile anche su telefono.
 */
export function Barre({ dati, unita = '' }: { dati: Punto[]; unita?: string }) {
  const massimo = Math.max(1, ...dati.map((d) => d.valore));

  return (
    <div className="flex h-44 gap-1.5">
      {dati.map((d, i) => (
        <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="num text-[10px] text-muted">
            {d.valore || ''}
            {d.valore ? unita : ''}
          </span>
          {/* la barra vive in un contenitore flessibile: solo così l'altezza
              percentuale ha un riferimento definito e non schiaccia le etichette */}
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-gradient-to-t from-nvgdim/40 to-nvg/80 transition-all"
              style={{ height: `${Math.max(2, (d.valore / massimo) * 100)}%` }}
              title={`${d.etichetta}: ${d.valore}${unita}`}
            />
          </div>
          <span className="w-full truncate text-center num text-[10px] text-muted">
            {d.etichetta}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Barre orizzontali: meglio delle verticali quando le etichette sono nomi. */
export function BarreOrizzontali({ dati, unita = '' }: { dati: Punto[]; unita?: string }) {
  const massimo = Math.max(1, ...dati.map((d) => d.valore));

  return (
    <div className="space-y-2">
      {dati.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-muted">{d.etichetta}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-surface2">
            <div
              className="h-full rounded bg-gradient-to-r from-nvgdim to-nvg"
              style={{ width: `${(d.valore / massimo) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right num text-xs">
            {d.valore}
            {unita}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Anello di percentuale, per il tasso di presenza. */
export function Anello({
  percentuale,
  etichetta,
  size = 120,
}: {
  percentuale: number;
  etichetta: string;
  size?: number;
}) {
  const p = Math.max(0, Math.min(100, percentuale));
  const r = 45;
  const circonferenza = 2 * Math.PI * r;
  const colore = p >= 70 ? 'var(--nvg)' : p >= 40 ? 'var(--warn)' : 'var(--danger)';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={colore}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(p / 100) * circonferenza} ${circonferenza}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="67" textAnchor="middle" fill="var(--text)" fontSize="26" fontWeight="600">
          {Math.round(p)}%
        </text>
      </svg>
      <span className="text-xs text-muted">{etichetta}</span>
    </div>
  );
}

/** Ultimi 12 mesi come punti pronti per il grafico. */
export function mesiRecenti(date: Date[], quanti = 12): Punto[] {
  const mesi: Punto[] = [];
  const oggi = new Date();

  for (let i = quanti - 1; i >= 0; i--) {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
    const chiave = `${d.getFullYear()}-${d.getMonth()}`;
    const valore = date.filter((x) => {
      const dx = new Date(x);
      return `${dx.getFullYear()}-${dx.getMonth()}` === chiave;
    }).length;
    mesi.push({
      etichetta: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
      valore,
    });
  }
  return mesi;
}
