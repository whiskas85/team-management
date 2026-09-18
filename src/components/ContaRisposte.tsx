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
 *
 * Il silenzio si conta **solo in squadra**, e l'etichetta lo dice. Dai nuovi
 * non si aspetta una risposta: uno che si affaccia a un'aperta viene se gli va,
 * e metterlo fra quelli che «non si sono espressi» gonfierebbe il numero con
 * gente a cui nessuno ha intenzione di scrivere.
 */
export type InGiocata = {
  /** Chi è in squadra e ha detto «ci sono». */
  interni: number;
  /** Chi non è in squadra e ha detto «ci sono»: i nuovi delle aperte. */
  nuovi: number;
  /** Gli operatori annunciati dalle squadre di fuori. */
  esterni: number;
  /** Quante squadre ospiti hanno detto un numero più grande di zero. */
  squadre: number;
  /** Quante squadre ospiti non hanno ancora detto niente. */
  mancanti: number;
  /** Se l'attività ha squadre ospiti: senza, la voce non compare. */
  conOspiti: boolean;
};

export function ContaRisposte({
  presenti,
  forse,
  assenti,
  silenziosi,
  inGiocata,
}: {
  presenti: number;
  forse: number;
  assenti: number;
  /**
   * Chi è **in squadra** e non ha ancora risposto. I nuovi non si contano: da
   * loro non si aspetta una risposta, e sommarli darebbe un numero che non
   * corrisponde a nessuna telefonata da fare. Nullo dove la domanda non ha
   * senso.
   */
  silenziosi: number | null;
  /**
   * Quanti siamo in campo, divisi per chi viene da dove.
   *
   * Le risposte dicono chi ha alzato la mano; questo dice **com'è fatta la
   * giornata**: quanti dei nostri, quanti nuovi da seguire — vanno assicurati,
   * vanno spiegate le regole — e quanti arrivano con le altre squadre. È la
   * domanda che si fa chi organizza il campo, e prima la risposta andava
   * ricostruita contando i gruppi e sommando gli ospiti a mente.
   */
  inGiocata?: InGiocata;
}) {
  const voci: { n: number; etichetta: string; classe: string }[] = [
    { n: presenti, etichetta: presenti === 1 ? 'presente' : 'presenti', classe: 'text-nvg' },
    { n: forse, etichetta: 'forse', classe: 'text-warn' },
    { n: assenti, etichetta: assenti === 1 ? 'assente' : 'assenti', classe: 'text-danger' },
  ];
  if (silenziosi !== null) {
    // L'etichetta dice **di chi** si sta parlando, e non è pignoleria: «non si
    // sono espressi» da solo fa pensare a tutti quelli che potevano venire,
    // nuovi compresi, e quel numero vorrebbe dire un'altra cosa. Qui si
    // contano quelli in squadra, che sono quelli a cui si scrive il sabato.
    voci.push({ n: silenziosi, etichetta: 'in squadra, senza risposta', classe: 'text-muted' });
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

      {inGiocata && (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-line bg-surface2/60 px-3 py-2 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            In giocata
          </span>
          <span>
            <span className="num text-sm font-semibold text-ink">{inGiocata.interni}</span>{' '}
            <span className="text-muted">interni</span>
          </span>
          <span>
            <span className="num text-sm font-semibold text-sky-300">{inGiocata.nuovi}</span>{' '}
            <span className="text-muted">{inGiocata.nuovi === 1 ? 'nuovo' : 'nuovi'}</span>
          </span>
          {inGiocata.conOspiti && (
            <span>
              <span className="num text-sm font-semibold text-warn">{inGiocata.esterni}</span>{' '}
              <span className="text-muted">
                da {inGiocata.squadre} {inGiocata.squadre === 1 ? 'squadra esterna' : 'squadre esterne'}
                {inGiocata.mancanti > 0 &&
                  ` · ${inGiocata.mancanti} ${inGiocata.mancanti === 1 ? 'non ha' : 'non hanno'} ancora risposto`}
              </span>
            </span>
          )}
          <span className="ml-auto">
            <span className="num text-sm font-semibold text-nvg">
              {inGiocata.interni + inGiocata.nuovi + inGiocata.esterni}
            </span>{' '}
            <span className="text-muted">in tutto</span>
          </span>
        </div>
      )}
    </div>
  );
}
