export type Punto = {
  etichetta: string;
  valore: number;
  nota?: string;
  /** Il valore com'è scritto accanto alla barra («5,1 MB»), se non basta il numero. */
  testo?: string;
};

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

export type Serie = {
  nome: string;
  /** Classe Tailwind dello sfondo: scritta per intero, o il build la perde. */
  classe: string;
};
export type PuntoImpilato = {
  etichetta: string;
  /** Un valore per serie, nello stesso ordine: la prima sta in fondo. */
  valori: number[];
  /** Il mese in cui siamo: l'etichetta si accende. */
  adesso?: boolean;
};

/**
 * Istogramma a pila: ogni barra è la somma delle serie, una sopra l'altra.
 * Sopra il totale, sotto la legenda con le serie che hanno almeno un valore.
 */
export function BarreImpilate({ dati, serie }: { dati: PuntoImpilato[]; serie: Serie[] }) {
  const totale = (d: PuntoImpilato) => d.valori.reduce((t, v) => t + v, 0);
  const massimo = Math.max(1, ...dati.map(totale));
  const usate = serie.filter((_, i) => dati.some((d) => (d.valori[i] ?? 0) > 0));

  return (
    <div>
      <div className="flex h-44 gap-1.5">
        {dati.map((d, i) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="num text-[10px] text-muted">{totale(d) || ''}</span>
            <div className="flex w-full flex-1 flex-col justify-end">
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t"
                style={{ height: `${(totale(d) / massimo) * 100}%` }}
                title={`${d.etichetta}: ${serie
                  .map((s, j) => `${s.nome} ${d.valori[j] ?? 0}`)
                  .join(' · ')}`}
              >
                {serie.map((s, j) =>
                  d.valori[j] ? (
                    <div
                      key={j}
                      className={`w-full ${s.classe}`}
                      style={{ height: `${(d.valori[j] / totale(d)) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
              {/* la base, anche per i mesi vuoti: il mese c'è, è solo vuoto */}
              <div className="h-px w-full bg-line" />
            </div>
            <span
              className={`w-full truncate text-center num text-[10px] ${
                d.adesso ? 'font-semibold text-nvg' : 'text-muted'
              }`}
            >
              {d.etichetta}
            </span>
          </div>
        ))}
      </div>
      {usate.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {usate.map((s) => (
            <li key={s.nome} className="flex items-center gap-1.5 text-xs text-muted">
              <span className={`h-2.5 w-2.5 rounded-sm ${s.classe}`} />
              {s.nome}
            </li>
          ))}
        </ul>
      )}
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
          <span className="w-20 shrink-0 text-right num text-xs" title={d.etichetta}>
            {d.testo ?? `${d.valore}${unita}`}
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

export type Fetta = { etichetta: string; valore: number; colore: string };

/**
 * Torta ad anello con la legenda accanto: al centro il totale, attorno come
 * si divide. Le fette sono archi dello stesso cerchio, uno dopo l'altro.
 */
export function Torta({
  fette,
  totale,
  sotto,
  size = 140,
}: {
  fette: Fetta[];
  /** Il numero al centro: se manca, la somma delle fette. */
  totale?: number;
  /** La parolina sotto al numero centrale. */
  sotto?: string;
  size?: number;
}) {
  const somma = fette.reduce((t, f) => t + f.valore, 0);
  const r = 45;
  const circonferenza = 2 * Math.PI * r;
  // un filo di stacco fra una fetta e l'altra, se ce n'è più di una
  const stacco = fette.length > 1 ? 2 : 0;
  let giaDisegnato = 0;

  return (
    <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center lg:flex-col">
      <svg width={size} height={size} viewBox="0 0 120 120" className="shrink-0">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="14" />
        {somma > 0 &&
          fette.map((f) => {
            const lunghezza = (f.valore / somma) * circonferenza;
            const arco = (
              <circle
                key={f.etichetta}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={f.colore}
                strokeWidth="14"
                strokeDasharray={`${Math.max(0, lunghezza - stacco)} ${circonferenza}`}
                strokeDashoffset={-giaDisegnato}
                transform="rotate(-90 60 60)"
              >
                <title>{`${f.etichetta}: ${f.valore}`}</title>
              </circle>
            );
            giaDisegnato += lunghezza;
            return arco;
          })}
        <text
          x="60"
          y={sotto ? 62 : 69}
          textAnchor="middle"
          fill="var(--text)"
          fontSize="28"
          fontWeight="600"
        >
          {totale ?? somma}
        </text>
        {sotto && (
          <text x="60" y="80" textAnchor="middle" fill="var(--muted)" fontSize="11">
            {sotto}
          </text>
        )}
      </svg>
      <ul className="w-full max-w-[14rem] space-y-1.5">
        {fette.map((f) => (
          <li key={f.etichetta} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: f.colore }} />
            <span className="min-w-0 flex-1 truncate text-muted">{f.etichetta}</span>
            <span className="num">{f.valore}</span>
            <span className="num w-9 text-right text-muted">
              {somma ? Math.round((f.valore / somma) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
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

/**
 * Linea nel tempo, una serie sola: l'area sotto in trasparenza, la linea
 * sottile, l'ultimo punto acceso. Passando sopra (o toccando) ogni giorno dice
 * il suo valore. La scala parte da zero: un disco al 51% non deve sembrare
 * pieno perché ieri era al 50%.
 */
export function Linea({
  dati,
  formatta = (v) => String(v),
  altezza = 160,
}: {
  dati: Punto[];
  formatta?: (v: number) => string;
  altezza?: number;
}) {
  if (dati.length === 0) return <p className="text-xs text-muted">Ancora nessuna misura.</p>;
  const L = 600;
  const H = altezza;
  const massimo = Math.max(1, ...dati.map((d) => d.valore)) * 1.1;
  const passo = dati.length > 1 ? L / (dati.length - 1) : 0;
  const x = (i: number) => (dati.length > 1 ? i * passo : L / 2);
  const y = (v: number) => H - (v / massimo) * H;
  const linea = dati
    .map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.valore).toFixed(1)}`)
    .join(' ');
  const area = `${linea} L${x(dati.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const ultimo = dati[dati.length - 1];

  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-muted num">
        <span>{formatta(massimo / 1.1)} max</span>
        <span>
          oggi <span className="text-ink">{formatta(ultimo.valore)}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${L} ${H}`}
        preserveAspectRatio="none"
        className="block w-full overflow-visible"
        style={{ height: H }}
        role="img"
        aria-label={`Andamento: ${dati.map((d) => `${d.etichetta} ${formatta(d.valore)}`).join(', ')}`}
      >
        <line
          x1="0"
          y1={H}
          x2={L}
          y2={H}
          stroke="var(--border)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path d={area} fill="var(--nvg)" opacity="0.12" />
        <path
          d={linea}
          fill="none"
          stroke="var(--nvg)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        {dati.map((d, i) => (
          <rect
            key={i}
            x={Math.max(0, x(i) - passo / 2)}
            y="0"
            width={Math.max(passo, 8)}
            height={H}
            fill="transparent"
            className="hover:fill-[color:var(--nvg)] hover:opacity-10"
          >
            <title>{`${d.etichetta}: ${formatta(d.valore)}${d.nota ? ` · ${d.nota}` : ''}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted num">
        <span>{dati[0].etichetta}</span>
        {dati.length > 1 && <span>{ultimo.etichetta}</span>}
      </div>
    </div>
  );
}
