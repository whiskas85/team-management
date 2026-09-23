import { firma, firmaValida } from './segreti';

/**
 * Il link per aprire un allegato **fuori** dal gestionale.
 *
 * Un PDF si legge meglio col lettore del telefono che dentro una pagina
 * dell'applicazione: si ingrandisce, si scorre, si tiene aperto mentre si
 * torna a OPS. Il problema è l'accesso. Sull'iPhone l'applicazione installata
 * e la finestra che si apre fuori non si scambiano la sessione: il file
 * risponderebbe «non autenticato» a chi l'ha appena aperto da dentro.
 *
 * Allora il link porta con sé chi lo apre, firmato e con una scadenza: un'ora,
 * arrotondata ai dieci minuti perché resti lo stesso fra un aggiornamento
 * della pagina e l'altro. La firma lega il link a **quell'allegato e a quella
 * persona**, e le regole per aprirlo restano quelle di sempre: il server le
 * rifà con la persona scritta nel link, come se avesse fatto l'accesso.
 *
 * Sta in un file suo e non in `lib/allegati.ts` perché quello lo legge anche
 * il browser, e la firma deve restare sul server.
 */
const DURATA_S = 60 * 60;
const PASSO_S = 10 * 60;

const testoDa = (id: string, userId: string, scade: number) => `allegato:${id}:${userId}:${scade}`;

export function linkEsternoAllegato(id: string, userId: string, adesso = Date.now()): string {
  const scade = Math.ceil((adesso / 1000 + DURATA_S) / PASSO_S) * PASSO_S;
  const q = new URLSearchParams({ u: userId, s: String(scade), f: firma(testoDa(id, userId, scade)) });
  return `/api/allegati/${id}?${q.toString()}`;
}

/** La persona scritta nel link, se il link è suo, integro e non scaduto. */
export function chiDalLink(id: string, url: URL): string | null {
  const u = url.searchParams.get('u');
  const s = Number(url.searchParams.get('s'));
  const f = url.searchParams.get('f');
  if (!u || !f || !Number.isFinite(s) || s * 1000 < Date.now()) return null;
  return firmaValida(testoDa(id, u, s), f) ? u : null;
}
