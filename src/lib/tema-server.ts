import { cache } from 'react';
import { getCurrentUser } from './auth';
import { leggiMiaSquadra } from './mia-squadra';
import {
  cssTema,
  daHex,
  eTemaPersonale,
  tavolozza,
  TEMA_PARTENZA,
  type TemaPersonale,
  type TemaSquadra,
} from './tema';

/** Il tema della squadra, come l'ha scelto l'admin (o quello di partenza). */
export const temaSquadra = cache(async (): Promise<TemaSquadra> => {
  const s = await leggiMiaSquadra();
  const accento =
    (s?.temaAccento && daHex(s.temaAccento) && s.temaAccento) ||
    (process.env.ACCENTO_SQUADRA && daHex(process.env.ACCENTO_SQUADRA) && process.env.ACCENTO_SQUADRA) ||
    TEMA_PARTENZA.accento;
  return { accento, modo: s?.temaModo === 'chiaro' ? 'chiaro' : 'scuro' };
});

/**
 * Il tema di questa pagina: quello della squadra, o quello di accessibilità
 * di chi la guarda. Senza sessione (l'accesso) vale quello della squadra.
 */
export const temaPagina = cache(async () => {
  const [squadra, utente] = await Promise.all([temaSquadra(), getCurrentUser().catch(() => null)]);
  const personale = (eTemaPersonale(utente?.tema) ? utente!.tema : 'squadra') as TemaPersonale;
  // la squadra dà solo notte o giorno di partenza: con la levetta decide ognuno
  const modo = utente?.modo === 'chiaro' || utente?.modo === 'scuro' ? utente.modo : squadra.modo;
  const t = tavolozza({ ...squadra, modo }, personale);
  return {
    t,
    css: cssTema(t, !!utente?.testoGrande),
    // i temi per daltonici sono pensati al buio: lì la levetta non c'è
    levetta: personale === 'squadra' || personale.startsWith('contrasto'),
  };
});
