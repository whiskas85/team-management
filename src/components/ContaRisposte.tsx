/**
 * Quanti ci sono, quanti forse, quanti no, quanti non hanno detto niente.
 *
 * **È il dato per cui si apre un'attività**, e stava scritto in grigio piccolo
 * come fosse una didascalia: chi guarda vuole sapere in un colpo d'occhio se
 * si gioca o se manca mezza squadra, e quattro numeri della stessa misura e
 * dello stesso colore costringono a leggerli uno per uno.
 *
 * I colori sono quelli che il gestionale usa ovunque per le risposte: verde chi
 * c'è, giallo il forse, rosso chi non viene. Il grigio è **il silenzio**, che
 * non è un no: è la riga da cui nasce il messaggio nel gruppo il sabato sera,
 * e prima non si vedeva da nessuna parte — mancavano semplicemente all'appello,
 * senza che nessuno potesse contarli.
 */
export function ContaRisposte({
  presenti,
  forse,
  assenti,
  silenziosi,
}: {
  presenti: number;
  forse: number;
  assenti: number;
  /** Chi è in rosa e non ha ancora risposto. Nullo dove la domanda non ha senso. */
  silenziosi: number | null;
}) {
  const voci: { n: number; etichetta: string; classe: string }[] = [
    { n: presenti, etichetta: presenti === 1 ? 'presente' : 'presenti', classe: 'text-nvg' },
    { n: forse, etichetta: 'forse', classe: 'text-warn' },
    { n: assenti, etichetta: assenti === 1 ? 'assente' : 'assenti', classe: 'text-danger' },
  ];
  if (silenziosi !== null) {
    voci.push({ n: silenziosi, etichetta: 'non si sono espressi', classe: 'text-muted' });
  }

  return (
    <div>
      <h2 className="titolo-sezione">Partecipanti</h2>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {voci.map((v) => (
          <span key={v.etichetta} className={`flex items-baseline gap-1.5 ${v.classe}`}>
            <span className="num text-xl font-semibold leading-none">{v.n}</span>
            <span className="text-xs">{v.etichetta}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
