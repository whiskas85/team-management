/**
 * Quanto devo ancora pagare, e quanto ho già pagato ma aspetta la verifica.
 *
 * Una quota che ho segnalato come pagata **per me è fatta**: il bonifico è
 * partito, manca solo che chi tiene la cassa lo trovi sull'estratto conto.
 * Contarla ancora in «Da saldare» faceva sembrare che fosse da pagare di
 * nuovo, e qualcuno l'avrebbe pagata due volte. Resta visibile a parte, come
 * «in verifica», finché la cassa non la conferma.
 *
 * Il conto sta qui perché lo fanno il profilo, la home e la pagina dei
 * pagamenti: tre conti scritti tre volte avevano già cominciato a dire tre
 * cose diverse. Il pallino del menu segue la stessa regola (app/layout).
 */

type Voce = {
  status: string;
  importo: unknown;
  pagato: unknown;
  dichiaratoIl: Date | null;
};

const residuo = (p: Voce) => Number(p.importo) - Number(p.pagato);

export function daSaldare(pagamenti: Voce[]) {
  const aperti = pagamenti.filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE');
  const daPagare = aperti.filter((p) => !p.dichiaratoIl);
  const inVerifica = aperti.filter((p) => p.dichiaratoIl);
  return {
    /** Quanto resta da pagare davvero: le quote non ancora segnalate. */
    importo: daPagare.reduce((t, p) => t + residuo(p), 0),
    voci: daPagare.length,
    /** Già segnalato come pagato, in attesa che la cassa lo confermi. */
    inVerifica: inVerifica.reduce((t, p) => t + residuo(p), 0),
    vociInVerifica: inVerifica.length,
  };
}
