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
export function ContaRisposte({
  presenti,
  forse,
  assenti,
  silenziosi,
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
    </div>
  );
}
