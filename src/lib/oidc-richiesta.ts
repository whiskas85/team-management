import { appDa, ambitiDa, redirectValido } from './oidc';

/**
 * La richiesta di accesso di un'app, controllata. Due esiti diversi per due
 * errori diversi:
 * - **app o indirizzo di ritorno sbagliati**: non si rimanda da nessuna parte
 *   (sarebbe il modo di usarci per mandare la gente su un sito qualunque), si
 *   mostra l'errore;
 * - **il resto**: si torna all'app con l'errore, come vuole il protocollo.
 */
export type Richiesta = {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string | null;
  nonce: string | null;
  codeChallenge: string;
  prompt: string | null;
};

export async function controllaRichiesta(p: Record<string, string | undefined>) {
  const app = await appDa(p.client_id);
  if (!app) return { fermo: 'App sconosciuta o spenta.' } as const;
  const redirectUri = p.redirect_uri ?? '';
  if (!redirectValido(redirectUri) || !app.redirectUris.includes(redirectUri)) {
    return { fermo: 'L’indirizzo di ritorno non è tra quelli registrati per questa app.' } as const;
  }
  const torna = (errore: string, descrizione?: string) =>
    ritorno(redirectUri, { error: errore, error_description: descrizione, state: p.state });

  if (p.response_type !== 'code') return { torna: torna('unsupported_response_type') } as const;
  const ambiti = ambitiDa(p.scope);
  if (!ambiti.includes('openid'))
    return { torna: torna('invalid_scope', 'Serve openid.') } as const;
  if (!p.code_challenge || p.code_challenge_method !== 'S256') {
    return { torna: torna('invalid_request', 'PKCE con S256 è obbligatorio.') } as const;
  }
  return {
    app,
    ambiti,
    richiesta: {
      clientId: app.clientId,
      redirectUri,
      scope: ambiti.join(' '),
      state: p.state ?? null,
      nonce: p.nonce ?? null,
      codeChallenge: p.code_challenge,
      prompt: p.prompt ?? null,
    } satisfies Richiesta,
  } as const;
}

/** L'indirizzo di ritorno dell'app, coi parametri della risposta. */
export function ritorno(redirectUri: string, parametri: Record<string, string | null | undefined>) {
  const u = new URL(redirectUri);
  for (const [k, v] of Object.entries(parametri)) if (v) u.searchParams.set(k, v);
  if (process.env.INDIRIZZO_PUBBLICO) {
    u.searchParams.set('iss', process.env.INDIRIZZO_PUBBLICO.replace(/\/+$/, ''));
  }
  return u.toString();
}
