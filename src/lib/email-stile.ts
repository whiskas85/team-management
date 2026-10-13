import { marchio } from './mia-squadra';
import { temaSquadra } from './tema-server';
import type { StileSquadra } from './email-corpo';

/** I colori e il nome con cui si vestono le email: quelli della squadra. */
export async function stileDellaSquadra(): Promise<StileSquadra> {
  const [{ accento }, m] = await Promise.all([temaSquadra(), marchio()]);
  return { accento, nome: m.nome, motto: m.motto };
}

/**
 * Il pulsante in fondo all'email, per quelle che arrivano alla persona del
 * certificato: la porta dritta alla sua pagina, senza dover entrare e cercarla.
 * A chi archivia (la segreteria, il medico) non serve: non ha un accesso.
 */
export const bottonePer = (r: { quando: string; allInteressato: boolean }) =>
  r.quando === 'SCADENZA' || r.allInteressato
    ? { testo: 'Vai ai miei certificati', url: '{linkCertificati}' }
    : null;
