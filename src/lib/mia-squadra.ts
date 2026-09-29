import { cache } from 'react';
import { prisma } from './db';

/**
 * La nostra squadra, con i valori di partenza al posto dei campi vuoti.
 *
 * Il gestionale deve avere un nome anche prima che qualcuno lo scriva, e anche
 * quando il database non risponde (la compilazione, una pagina d'errore): i
 * valori di partenza arrivano dalle variabili d'ambiente, e in mancanza sono
 * quelli di Zero Dark. Un ambiente di prova nasce così col suo nome e il suo
 * logo, senza toccare il codice né il database.
 */
export const PARTENZA = {
  nome: process.env.NOME_SQUADRA || 'Zero Dark Team',
  nomeGestionale: process.env.NOME_GESTIONALE || 'Zero Dark Ops',
  motto: process.env.MOTTO_SQUADRA || 'Going dark',
  /** Un file dentro public/. */
  logo: process.env.LOGO_SQUADRA || '/logo.jpg',
};

export type Marchio = {
  nome: string;
  nomeGestionale: string;
  motto: string;
  /** Dove si prende il logo: cambia quando il logo cambia, per non vedere il vecchio. */
  logoUrl: string;
};

export const leggiMiaSquadra = cache(async () => {
  // durante la compilazione il database non c'è: valori di partenza, in silenzio
  if (!process.env.DATABASE_URL) return null;
  try {
    return await prisma.miaSquadra.findUnique({ where: { id: 'mia' } });
  } catch {
    return null;
  }
});

/** Nome, motto e logo, per l'intestazione e l'app installata. */
export const marchio = cache(async (): Promise<Marchio> => {
  const s = await leggiMiaSquadra();
  return {
    nome: s?.nome || PARTENZA.nome,
    nomeGestionale: s?.nomeGestionale || PARTENZA.nomeGestionale,
    motto: s?.motto || PARTENZA.motto,
    logoUrl: s?.logoPath ? `/api/squadra/logo?v=${s.aggiornatoIl.getTime()}` : '/api/squadra/logo',
  };
});
