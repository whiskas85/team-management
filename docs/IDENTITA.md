# «Accedi con il gestionale» — OpenID Connect

Ogni gestionale è un **fornitore di identità OpenID Connect** per le persone
della sua squadra. Un'app esterna (un gioco, un sito di tornei) le fa entrare
con l'account che hanno già: niente password da gestire, niente recuperi.

## 1. Registrare l'app

Nel gestionale, da admin: **Sistema → App collegate → Nuova app**.

- **Nome**: lo legge la persona quando le si chiede il permesso.
- **Indirizzi di ritorno** (redirect URI), esatti: `https://…`, o `http://localhost…`
  per lo sviluppo.
- **Tipo**: *con un suo server* (riceve un `client_secret`, mostrato una volta
  sola) o *solo nel browser / sul telefono* (senza segreto, solo PKCE).

Si ottiene il `client_id` (e il `client_secret`).

## 2. Collegarla

| | |
|---|---|
| Emittente (issuer) | l'indirizzo del gestionale, es. `https://ops.zerodarkteam.it` |
| Configurazione | `<issuer>/.well-known/openid-configuration` |
| Flusso | authorization code **con PKCE S256 obbligatorio** |
| Ambiti | `openid` (sempre), `profile`, `email`, `squadra` |
| Firma id_token | RS256, chiavi su `<issuer>/oauth/jwks` |
| Autenticazione app | `client_secret_basic`, `client_secret_post` o `none` (app pubbliche) |

Niente refresh token: l'app tiene la sua sessione e, quando scade, ripassa dal
gestionale (se la persona è già dentro e ha già dato il permesso, torna subito).
`prompt=none` è supportato (`login_required` / `consent_required`).

### Esempio: Next.js con Auth.js

```ts
// auth.ts
import NextAuth from 'next-auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: 'gestionale',
      name: 'Zero Dark Ops',
      type: 'oidc',
      issuer: process.env.GESTIONALE_ISSUER, // es. https://ops.zerodarkteam.it
      clientId: process.env.GESTIONALE_CLIENT_ID,
      clientSecret: process.env.GESTIONALE_CLIENT_SECRET,
      authorization: { params: { scope: 'openid profile email squadra' } },
      checks: ['pkce', 'state', 'nonce'],
    },
  ],
});
```

Indirizzo di ritorno da registrare: `https://<gioco>/api/auth/callback/gestionale`.

### Più squadre

Un'app usata da più squadre registra un fornitore per ogni gestionale (stesso
codice, `issuer` e chiavi diversi). L'identità di una persona è la coppia
`(iss, sub)`: `sub` è unico solo dentro il suo gestionale.

## 3. Cosa arriva

```json
{
  "sub": "ckx…",                          // sempre lo stesso per la stessa persona
  "name": "Mario Rossi", "given_name": "Mario", "family_name": "Rossi",
  "preferred_username": "Falco",          // il callsign, o il nome
  "email": "mario@…", "email_verified": true,
  "squadra": { "nome": "Zero Dark Team", "gestionale": "Zero Dark Ops", "indirizzo": "https://…" },
  "stato": "SQUADRA",                     // NUOVO, SQUADRA, SOSPESO, …
  "ruoli": ["ATLETA", "TL"]
}
```

Solo i campi degli ambiti chiesti, e solo dopo il consenso della persona. Dal
suo profilo («App collegate») la persona toglie l'accesso quando vuole: i token
già dati smettono di valere.
