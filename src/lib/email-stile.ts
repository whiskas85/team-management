import { marchio } from './mia-squadra';
import { temaSquadra } from './tema-server';
import type { StileSquadra } from './email-corpo';

/** I colori e il nome con cui si vestono le email: quelli della squadra. */
export async function stileDellaSquadra(): Promise<StileSquadra> {
  const [{ accento }, m] = await Promise.all([temaSquadra(), marchio()]);
  return { accento, nome: m.nome, motto: m.motto };
}
