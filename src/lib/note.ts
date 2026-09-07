import { prisma } from './db';
import { nomeCompleto } from './format';

/**
 * Le chiocciole dentro le note.
 *
 * Una nota nomina delle persone scrivendo `@zero`, e quel nome deve restare
 * leggibile nel testo: la nota è un appunto, non un record con dei campi. Le
 * citazioni sono quindi **ricavate dal testo** a ogni salvataggio, non un
 * elenco tenuto a parte che prima o poi non corrisponde più a quello che c'è
 * scritto.
 */

/** Come si scrive una persona dopo la chiocciola. */
export function maniglia(u: { nome: string; cognome: string; callsign?: string | null }) {
  const base = u.callsign ? u.callsign : `${u.nome}.${u.cognome}`;
  return base
    .toLowerCase()
    .normalize('NFD')
    // NFD stacca gli accenti dalle lettere e la riga sotto li butta via
    .replace(/[^a-z0-9._-]/g, '');
}

export type Citabile = { id: string; maniglia: string; nome: string };

/**
 * Chi si può citare: tutti quelli che hanno un account, contatti compresi.
 *
 * Le note servono anche a seguire chi si sta affacciando ora — "@mario è venuto
 * tre volte e non si è ancora iscritto" — quindi l'elenco non si ferma alla
 * rosa. A leggere la nota sarà comunque solo chi l'ha scritta.
 */
export async function citabili(): Promise<Citabile[]> {
  const persone = await prisma.user.findMany({
    where: { stato: { not: 'DISABILITATO' } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, cognome: true, callsign: true },
  });

  return persone.map((p) => ({
    id: p.id,
    maniglia: maniglia(p),
    nome: nomeCompleto(p),
  }));
}

/** Le maniglie scritte in un testo, senza ripetizioni. */
export const manigliesCitate = (testo: string) => [
  ...new Set([...testo.matchAll(/@([a-z0-9._-]{2,})/gi)].map((m) => m[1].toLowerCase())),
];

/**
 * Da un testo alle persone citate davvero.
 *
 * Una chiocciola che non corrisponde a nessuno resta scritta e non diventa un
 * errore: chi annota di corsa scrive `@campo` intendendo il posto, e non è il
 * momento di fermarlo con un messaggio.
 */
export function citatiIn(testo: string, elenco: Citabile[]) {
  const scritte = manigliesCitate(testo);
  return elenco.filter((c) => scritte.includes(c.maniglia)).map((c) => c.id);
}

/** Le maniglie da evidenziare quando si legge: solo quelle di persone vere. */
export const mappaManiglie = (elenco: Citabile[]) =>
  Object.fromEntries(elenco.map((c) => [c.maniglia, c.nome]));
