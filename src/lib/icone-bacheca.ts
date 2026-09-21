import type { NomeIcona } from '@/components/Icona';

/**
 * Le icone che si possono dare a una bacheca.
 *
 * Una scelta, non tutte: nel menu le bacheche stanno una sotto l'altra, e
 * l'icona serve a riconoscerle prima di leggere il nome — la campanella per
 * gli avvisi, la maglietta per il merchandising, lo scudo per il direttivo.
 * Le frecce, il cestino o la matita vogliono dire un gesto, non un posto, e
 * in un menu confonderebbero.
 *
 * Sta in un file suo, senza database, perché la usano sia il modulo nel
 * browser sia l'azione che salva.
 */
export const ICONE_BACHECA: { nome: NomeIcona; testo: string }[] = [
  { nome: 'bacheca', testo: 'Puntina' },
  { nome: 'avvisi', testo: 'Campanella' },
  { nome: 'regolamento', testo: 'Documento' },
  { nome: 'calendario', testo: 'Calendario' },
  { nome: 'squadra', testo: 'Squadra' },
  { nome: 'tutti', testo: 'Tutti' },
  { nome: 'operatori', testo: 'Persone' },
  { nome: 'nuovi', testo: 'Nuovi' },
  { nome: 'scudo', testo: 'Scudo' },
  { nome: 'stellaVita', testo: 'Soccorso' },
  { nome: 'campi', testo: 'Campo' },
  { nome: 'naviga', testo: 'Mappa' },
  { nome: 'maglietta', testo: 'Maglietta' },
  { nome: 'mercatino', testo: 'Mercatino' },
  { nome: 'pagamenti', testo: 'Soldi' },
  { nome: 'tessera', testo: 'Tessera' },
  { nome: 'certificato', testo: 'Certificato' },
  { nome: 'commento', testo: 'Messaggi' },
  { nome: 'miPiace', testo: 'Cuore' },
  { nome: 'grafici', testo: 'Grafici' },
  { nome: 'chiave', testo: 'Chiave' },
  { nome: 'telefono', testo: 'Telefono' },
  { nome: 'email', testo: 'Email' },
  { nome: 'allegato', testo: 'Graffetta' },
];

/** L'icona salvata, se e' una di quelle previste; altrimenti la puntina. */
export function iconaBacheca(valore: string | null | undefined): NomeIcona {
  return ICONE_BACHECA.find((i) => i.nome === valore)?.nome ?? 'bacheca';
}
