import { fmtDateLong, fmtTime } from '@/lib/format';

/**
 * Quando, in grande.
 *
 * È il dato che fa perdere la gente: si sbaglia il giorno, si arriva all'ora
 * sbagliata. Scritto in due caselle grigie — «Inizio» e «Fine», una accanto
 * all'altra, nel formato del computer — si legge come un dettaglio anagrafico
 * e si salta; scritto così si legge da lontano, e il giorno lo si vede prima
 * dell'ora perché è quello che si sbaglia.
 *
 * **Lo stesso giorno si scrive una volta sola**: «20 settembre, 08:15 → 20
 * settembre, 13:00» costringe a leggere due date per scoprire che sono la
 * stessa. Quando invece l'attività scavalca la mezzanotte — la 24 ore dal
 * sabato alla domenica — la seconda data si scrive per intero, perché lì la
 * differenza è tutto.
 *
 * Nato per l'invito delle squadre esterne e portato dentro l'attività: a
 * chiederselo sono le stesse persone, e non c'era ragione perché a quelli di
 * casa fosse detto peggio.
 *
 * **Con un ritrovo, l'ora che conta è la sua.** L'attività alle 10 con il
 * ritrovo alle 8 vuol dire uscire di casa per le 8: scritto «10:00 → 18:00» in
 * grande e il ritrovo in piccolo più sotto, il quando era giusto e l'ora da
 * ricordare stava nel posto sbagliato. Allora il ritrovo va sopra, in verde, e
 * l'orario dell'attività sotto, più piccolo.
 */
export function Quando({
  inizio,
  fine,
  ritrovo = null,
  durataOre = null,
  className,
}: {
  inizio: Date;
  fine: Date | null;
  /** L'ora del ritrovo, se c'è: diventa l'ora in evidenza. */
  ritrovo?: Date | null;
  /**
   * Quanto dura la gara sul volantino, quando è dichiarata. Sta qui e non in
   * un riquadro suo: è leggendo che una 24 ore occupa tre giorni che viene il
   * dubbio di un errore, e la risposta deve stare sotto gli occhi in quel
   * momento.
   */
  durataOre?: number | null;
  className?: string;
}) {
  const stessoGiorno = !!fine && fine.toDateString() === inizio.toDateString();
  const orario = `${fmtTime(inizio)}${fine && stessoGiorno ? ` → ${fmtTime(fine)}` : ''}`;
  // il ritrovo della sera prima — la 24 ore che parte all'alba — porta la sua data
  const ritrovoAltroGiorno = !!ritrovo && ritrovo.toDateString() !== inizio.toDateString();

  return (
    <div className={className}>
      <p className="titolo-sezione">Quando</p>
      <p className="mt-1 text-xl font-semibold leading-tight first-letter:uppercase">
        {fmtDateLong(inizio)}
      </p>
      {ritrovo ? (
        <>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="num text-lg text-nvg">{fmtTime(ritrovo)}</span>
            <span className="text-sm text-ink/90">
              ritrovo
              {ritrovoAltroGiorno && <span className="text-muted"> · {fmtDateLong(ritrovo)}</span>}
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="num text-ink/90">{orario}</span>
            <span className="text-muted">attività</span>
          </p>
        </>
      ) : (
        <p className="num mt-1 text-lg text-nvg">{orario}</p>
      )}
      {fine && !stessoGiorno && (
        <p className="mt-2 text-sm text-ink/90">
          <span className="text-muted">fino a</span>{' '}
          <span className="font-medium first-letter:uppercase">{fmtDateLong(fine)}</span>{' '}
          <span className="num text-nvg">{fmtTime(fine)}</span>
        </p>
      )}
      {durataOre !== null && (
        <p className="mt-2 text-[11px] text-muted">
          <span className="num text-ink">{durataOre}h</span> di gara dichiarate · l’attività tiene
          occupato tutto lo spazio fra inizio e fine
        </p>
      )}
    </div>
  );
}
