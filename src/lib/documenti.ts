import type { Role, StatoOperatore, TipoDocumento } from '@prisma/client';
import { prisma } from './db';
import { puoScrivereDocumenti, vedeAttivitaSquadra } from './domain';
import { SLUG_REGOLAMENTO } from './mercatino';

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

/**
 * Il regolamento del mercatino, se questa persona deve ancora accettarlo.
 *
 * Lì le regole non sono un cartello ma un patto fra due persone che si
 * scambiano soldi e roba: il mercatino non si apre finché non le si è lette.
 * Se il testo cambia si torna a chiedere — aver accettato altro non è aver
 * accettato questo — e se il regolamento è vuoto non si obbliga nessuno a
 * leggere una pagina bianca.
 */
export async function regolamentoDaAccettare(userId: string) {
  const documento = await prisma.documento.findUnique({
    where: { slug: SLUG_REGOLAMENTO },
    include: {
      aggiornatoDa: { select: { nome: true, cognome: true, callsign: true } },
      accettazioni: { where: { userId }, select: { versione: true } },
    },
  });
  if (!documento || !documento.testo.trim()) return null;

  const gia = documento.accettazioni[0];
  if (gia && gia.versione >= documento.aggiornatoIl) return null;

  return { documento, cambiato: gia != null };
}

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
