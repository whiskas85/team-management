import type { Role, StatoOperatore, TipoDocumento } from '@prisma/client';
import { prisma } from './db';
import { puoScrivereDocumenti, vedeAttivitaSquadra } from './domain';

/**
 * Statuto e regolamenti.
 *
 * Sono due cose diverse e stanno in due posti diversi. **Lo statuto è di chi è
 * dentro**: dice come funziona il team, e non riguarda chi si è appena
 * affacciato. **I regolamenti li legge chiunque abbia un account**, contatti
 * compresi — anzi, sono proprio quello che si mostra a chi sta valutando se
 * entrare: come ci si comporta in campo, cosa si può e cosa no.
 *
 * La regola di chi legge sta qui e non nella tabella: è una proprietà del
 * *tipo* di documento, non del singolo testo. Metterla su ogni riga vorrebbe
 * dire poterla sbagliare una riga per volta.
 */

export const SEZIONI: Record<
  TipoDocumento,
  { titolo: string; sottotitolo: string; percorso: string }
> = {
  STATUTO: {
    titolo: 'Statuto',
    sottotitolo: 'Le regole con cui il team esiste',
    percorso: '/statuto',
  },
  REGOLAMENTO: {
    titolo: 'Regolamenti',
    sottotitolo: 'Come ci si comporta, in campo e fuori',
    percorso: '/regolamenti',
  },
};

/** Chi può leggere una sezione. */
export const puoLeggere = (tipo: TipoDocumento, stato: StatoOperatore) =>
  tipo === 'REGOLAMENTO' || vedeAttivitaSquadra(stato);

/** Chi può scriverla: comando, amministrazione, segreteria — per entrambe. */
export const puoScrivere = (roles: Role[]) => puoScrivereDocumenti(roles);

export const elencoDocumenti = (tipo: TipoDocumento) =>
  prisma.documento.findMany({
    where: { tipo },
    orderBy: [{ ordine: 'asc' }, { titolo: 'asc' }],
    include: { aggiornatoDa: { select: { nome: true, cognome: true, callsign: true } } },
  });

export const documentoDa = (slug: string) =>
  prisma.documento.findUnique({
    where: { slug },
    include: { aggiornatoDa: { select: { nome: true, cognome: true, callsign: true } } },
  });

/**
 * Da un titolo all'indirizzo: "Regolamento del mercatino" -> regolamento-del-mercatino.
 *
 * Serve che sia leggibile, non che sia unico: l'unicità la garantisce il
 * database, e chi salva se lo sente dire.
 */
export const slugDa = (titolo: string) =>
  titolo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
