// import di default e non della singola chiave: il bundler avverte che dai
// moduli JSON presto si potrà prendere solo l'export di default
import pacchetto from '../../package.json';

/**
 * Versione del gestionale, mostrata accanto al nome.
 *
 * La fonte è una sola, `package.json`: così non può succedere che il badge
 * dica una cosa e il pacchetto un'altra. Si alza di qui a ogni rilascio.
 */
export const VERSIONE = pacchetto.version;
