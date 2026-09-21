/**
 * Quando due attività sono **lo stesso impegno**.
 *
 * Capita di continuo: la domenica c'è la PLR e c'è la giocata, oppure la
 * notturna che finisce alle tredici e la diurna che comincia alle otto. Sono
 * due righe nel calendario — e devono restarlo, perché sono due cose diverse
 * con due formazioni e due quote — ma **un operatore ci può stare una volta
 * sola**. Contarle come due gli rovina le statistiche due volte: gli abbassa
 * la percentuale di presenze per una giornata in cui c'era, e gonfia il
 * denominatore con un impegno che non poteva prendere.
 *
 * ## La regola
 *
 * Due attività sono lo stesso impegno se **si sovrappongono nel tempo**, o se
 * qualcuno le ha collegate a mano.
 *
 * Sovrapporsi vuol dire che c'è un istante in cui sono tutte e due in corso, e
 * basta questo a rendere impossibile andare a entrambe — a Torino e a Milano
 * la domenica mattina non ci si va lo stesso. **Toccarsi non è sovrapporsi**:
 * la notturna che finisce alle otto e la diurna che comincia alle otto sono
 * due impegni veri, e chi fa tutte e due ha fatto due cose.
 *
 * Il collegamento a mano serve per quello che l'orologio non vede: due giornate
 * che sono la stessa trasferta, la gara con il suo allenamento del venerdì.
 *
 * ## Perché non si guarda il campo
 *
 * Verrebbe da dire «stesso posto, stesso impegno». Ma l'esempio che conta è
 * l'opposto: Torino e Milano, stessa domenica, **posti diversi** — e proprio
 * per questo un operatore ne fa una sola. È il tempo a decidere, non il luogo.
 */

export type Impegnabile = {
  id: string;
  inizio: Date;
  fine: Date | null;
  /** Collegata a mano a un'altra: fanno parte della stessa cosa. */
  collegatoAId?: string | null;
};

/** Un'attività senza fine dura quel tanto che basta a sé stessa. */
const finisce = (e: Impegnabile) => e.fine ?? e.inizio;

/**
 * Si sovrappongono davvero: c'è un momento in cui sono tutte e due in corso.
 *
 * I confronti sono stretti apposta — `<` e non `<=` — perché due attività che
 * si passano il testimone alle otto in punto non sono mai in corso insieme.
 */
export function siSovrappongono(a: Impegnabile, b: Impegnabile) {
  return a.inizio < finisce(b) && b.inizio < finisce(a);
}

/**
 * Raggruppa le attività in impegni: a ogni id risponde la chiave del suo gruppo.
 *
 * Il gruppo è transitivo, e deve esserlo: se la notturna ingloba la diurna e la
 * diurna si sovrappone alla riunione, sono tutte e tre la stessa giornata —
 * altrimenti il conto cambierebbe a seconda di quale si guarda per prima.
 */
export function impegni(eventi: Impegnabile[]): Map<string, string> {
  // ogni attività parte da sé stessa, poi le si unisce
  const padre = new Map(eventi.map((e) => [e.id, e.id]));

  const radice = (id: string): string => {
    let corrente = id;
    while (padre.get(corrente) !== corrente) corrente = padre.get(corrente) as string;
    // si appiattisce la catena: la prossima domanda costa un passo solo
    let cammino = id;
    while (padre.get(cammino) !== corrente) {
      const prossimo = padre.get(cammino) as string;
      padre.set(cammino, corrente);
      cammino = prossimo;
    }
    return corrente;
  };

  const unisci = (a: string, b: string) => {
    const ra = radice(a);
    const rb = radice(b);
    if (ra !== rb) padre.set(ra, rb);
  };

  for (const e of eventi) {
    // il collegamento a mano vale anche verso un'attività che non è in elenco:
    // in quel caso non unisce niente, e va bene così
    if (e.collegatoAId && padre.has(e.collegatoAId)) unisci(e.id, e.collegatoAId);
  }

  // Le attività ordinate per inizio: così si confronta ognuna solo con quelle
  // che le stanno davanti e che possono ancora essere in corso. Su un
  // calendario di anni, il confronto di tutti con tutti sarebbe inutilmente
  // lungo — e il risultato lo stesso.
  const ordinate = [...eventi].sort((a, b) => a.inizio.getTime() - b.inizio.getTime());
  for (let i = 0; i < ordinate.length; i += 1) {
    for (let j = i + 1; j < ordinate.length; j += 1) {
      // la prossima comincia dopo la fine di questa: da qui in poi nessuna
      // può più sovrapporsi, perché sono in ordine di inizio
      if (ordinate[j].inizio >= finisce(ordinate[i])) break;
      if (siSovrappongono(ordinate[i], ordinate[j])) unisci(ordinate[i].id, ordinate[j].id);
    }
  }

  return new Map(eventi.map((e) => [e.id, radice(e.id)]));
}

/**
 * Quanti impegni sono, contando una volta sola quelli che vanno insieme.
 *
 * Il filtro dice quali righe fanno «sì» per quell'impegno: per le presenze di
 * una persona, essere stato a una delle due attività di quella giornata è
 * esserci stato — non ci poteva essere due volte.
 */
export function contaImpegni<T extends { eventId: string }>(
  righe: T[],
  gruppi: Map<string, string>,
  vale: (r: T) => boolean,
): number {
  const dentro = new Set<string>();
  for (const r of righe) {
    if (!vale(r)) continue;
    dentro.add(gruppi.get(r.eventId) ?? r.eventId);
  }
  return dentro.size;
}
