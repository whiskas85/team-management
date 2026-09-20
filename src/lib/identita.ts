import { AsyncLocalStorage } from 'node:async_hooks';
import type { SessionUser } from './auth';

/**
 * Chi sta agendo, quando non è un browser con un cookie.
 *
 * Serve agli assistenti collegati via MCP: presentano una chiave personale, si
 * risale alla persona, e da quel momento **tutto il resto dell'applicazione la
 * tratta come se avesse fatto il login**. È il punto della faccenda: i permessi
 * non si riscrivono da qualche altra parte per gli assistenti — sarebbe una
 * seconda verità da tenere allineata a quella vera, e prima o poi divergono —
 * si riusa quella che c'è già, ruolo per ruolo, controllo per controllo.
 *
 * Da qui si entra da **due soli posti**, e tutti e due dopo aver verificato
 * qualcosa: la rotta `/api/mcp`, che ha già controllato la chiave personale, e
 * i lavori automatici (`lib/lavori.ts`), che girano per conto di chi li ha
 * accesi — una polizza che parte da sola ha comunque una firma. Nessun altro
 * chiama `conIdentita`: ogni chiamata in più è un modo di diventare qualcuno
 * senza fare il login.
 */
const contesto = new AsyncLocalStorage<SessionUser>();

/** Esegue qualcosa per conto di una persona. */
export function conIdentita<T>(chi: SessionUser, cosa: () => Promise<T>): Promise<T> {
  return contesto.run(chi, cosa);
}

/** La persona per conto di cui si sta lavorando, se non è una sessione normale. */
export const identitaCorrente = (): SessionUser | null => contesto.getStore() ?? null;
