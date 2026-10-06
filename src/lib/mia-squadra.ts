import { cache } from 'react';
import { prisma } from './db';

/**
 * La nostra squadra, con i valori di partenza al posto dei campi vuoti.
 *
 * Il gestionale deve avere un nome anche prima che qualcuno lo scriva, e anche
 * quando il database non risponde (la compilazione, una pagina d'errore): i
 * valori di partenza arrivano dalle variabili d'ambiente.
 *
 * **Senza NOME_SQUADRA è Zero Dark** (la produzione e il suo test), e i
 * valori sono i suoi. Con NOME_SQUADRA è un'altra squadra — un gestionale
 * ospitato, test2 — e allora niente di Zero Dark: motto «HUB», e al posto del
 * logo le iniziali della squadra (lib/iniziali-squadra) finché non ne carica uno.
 */
const nostro = !process.env.NOME_SQUADRA;

export const PARTENZA = {
  nome: process.env.NOME_SQUADRA || 'Zero Dark Team',
  nomeGestionale: process.env.NOME_GESTIONALE || process.env.NOME_SQUADRA || 'Zero Dark Ops',
  motto: process.env.MOTTO_SQUADRA || (nostro ? 'Going dark' : 'HUB'),
  /** Un file dentro public/; vuoto: le iniziali della squadra. */
  logo: process.env.LOGO_SQUADRA || (nostro ? '/logo.jpg' : ''),
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

/**
 * Il logo «vuoto» della squadra, in SVG: le sue iniziali coi colori del suo
 * tema. Lo usa chi non ha né un logo caricato né uno di partenza.
 */
export async function logoIniziali(lato = 512): Promise<string> {
  const { svgIniziali } = await import('./iniziali-squadra');
  const { tavolozza } = await import('./tema');
  const { temaSquadra } = await import('./tema-server');
  const [m, tema] = await Promise.all([marchio(), temaSquadra()]);
  const c = tavolozza(tema).colori;
  return svgIniziali(m.nome, c.surface ?? c.bg, c.nvg, lato);
}
