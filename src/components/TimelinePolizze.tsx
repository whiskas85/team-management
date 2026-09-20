import Link from 'next/link';
import { fmtDate } from '@/lib/format';
import { SCORTA_POLIZZE } from '@/lib/assicurazione';

export type TappaPolizze = {
  id: string;
  titolo: string;
  quando: Date;
  /** Quante polizze si bruciano lì: una per persona e per giorno da coprire. */
  serve: number;
};

/**
 * Quando finiscono le polizze, guardando avanti.
 *
 * Le polizze prova sono prepagate e si comprano a blocchi, con in mezzo i
 * tempi della segreteria federale. Il numero che restano c'era già — un
 * riquadro in cassa — ma da solo non risponde alla domanda vera, che non è
 * *quante ne ho* ma **fino a quando mi bastano**. Con dodici polizze in cassa
 * uno sta tranquillo; se le prossime tre domeniche ne chiedono quattro, sei e
 * cinque, non è tranquillo affatto, e lo scopre il sabato sera della terza.
 *
 * Qui il conto si fa da sé: si parte dalla giacenza e si scala attività per
 * attività, nell'ordine in cui arrivano. La riga dove il numero passa sotto
 * zero è **il giorno in cui qualcuno resta a casa**, e si vede settimane
 * prima — che è esattamente il tempo che serve per comprarle.
 *
 * È una previsione, non un impegno: chi ha detto «ci sono» può cambiare idea,
 * e un nuovo può tesserarsi. Per questo le attività senza niente da coprire
 * non compaiono: allungherebbero l'elenco senza spostare il conto.
 */
export function TimelinePolizze({
  giacenza,
  tappe,
}: {
  /** Quante ne restano adesso, come le conta il portale. Nulla se mai lette. */
  giacenza: number | null;
  tappe: TappaPolizze[];
}) {
  if (giacenza === null) {
    return (
      <div className="card">
        <p className="titolo-sezione">Quando finiscono</p>
        <p className="mt-2 text-sm text-muted">
          Il portale non ha ancora detto quante polizze restano: leggile dal riquadro «Polizze
          prova» e il conto si fa da sé.
        </p>
      </div>
    );
  }

  if (tappe.length === 0) {
    return (
      <div className="card">
        <p className="titolo-sezione">Quando finiscono</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="num text-2xl font-semibold text-nvg">{giacenza}</span>
          <span className="text-sm text-muted">
            {giacenza === 1 ? 'polizza in cassa' : 'polizze in cassa'}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted">
          Nelle attività in programma non c’è niente da coprire: il conto resta così.
        </p>
      </div>
    );
  }

  // il conto, tappa per tappa: quante ne restano dopo ognuna
  let residuo = giacenza;
  const righe = tappe.map((t) => {
    residuo -= t.serve;
    return { ...t, residuo };
  });

  const finisceA = righe.find((r) => r.residuo < 0);
  const mancanti = Math.max(0, -righe[righe.length - 1].residuo);

  /** La barra è lunga quanto il residuo sulla giacenza di partenza. */
  const larghezza = (n: number) => `${Math.max(0, Math.min(100, (n / Math.max(giacenza, 1)) * 100))}%`;

  return (
    <div className="card">
      <p className="titolo-sezione">Quando finiscono</p>

      <p className="mt-2 flex items-baseline gap-2">
        <span
          className={`num text-2xl font-semibold ${
            giacenza <= SCORTA_POLIZZE ? 'text-danger' : 'text-nvg'
          }`}
        >
          {giacenza}
        </span>
        <span className="text-sm text-muted">
          {giacenza === 1 ? 'polizza in cassa' : 'polizze in cassa'}
        </span>
      </p>

      {/* La riga che conta, detta prima dell'elenco: chi apre questa pagina
          per sapere se deve comprare ha la risposta senza leggere il resto. */}
      <p
        className={`mt-1 text-xs ${finisceA ? 'text-danger' : 'text-muted'}`}
      >
        {finisceA
          ? `Non bastano: a «${finisceA.titolo}» ne ${mancanti === 1 ? 'manca 1' : `mancano ${mancanti}`}. Vanno comprate prima.`
          : 'Bastano per tutto quello che è in programma.'}
      </p>

      <ol className="mt-4 space-y-3 border-l border-line pl-4">
        {righe.map((r) => {
          const tono =
            r.residuo < 0 ? 'text-danger' : r.residuo <= SCORTA_POLIZZE ? 'text-warn' : 'text-nvg';
          const barra =
            r.residuo < 0 ? 'bg-danger' : r.residuo <= SCORTA_POLIZZE ? 'bg-warn' : 'bg-nvg';
          return (
            <li key={r.id} className="relative">
              {/* il pallino sulla linea: sta fuori dal bordo, all'altezza
                  della data, così l'occhio scende lungo il tempo */}
              <span
                className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${
                  r.residuo < 0 ? 'bg-danger' : 'bg-nvgdim'
                }`}
              />
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/calendario/${r.id}`}
                  className="min-w-0 truncate text-sm hover:text-nvg"
                >
                  {r.titolo}
                </Link>
                <span className="num shrink-0 text-xs text-muted">−{r.serve}</span>
              </div>
              <p className="num text-[11px] text-muted">{fmtDate(r.quando)}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-1 flex-1 rounded-full bg-surface2">
                  <span
                    className={`block h-1 rounded-full ${barra}`}
                    style={{ width: larghezza(r.residuo) }}
                  />
                </span>
                <span className={`num shrink-0 text-[11px] ${tono}`}>
                  {r.residuo < 0
                    ? r.residuo === -1
                      ? 'manca 1'
                      : `mancano ${-r.residuo}`
                    : r.residuo === 1
                      ? 'resta 1'
                      : `restano ${r.residuo}`}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
