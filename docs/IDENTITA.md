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
| Ambiti | `openid` (sempre), `profile`, `email`, `phone`, `squadra` |
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
  "picture": "https://…/oauth/avatar/ckx…/….jpg", // solo se ha la foto
  "email": "mario@…", "email_verified": true,
  "phone_number": "+393331234567",        // E.164, con lo scope phone
  "phone_number_verified": false,         // il gestionale non verifica i numeri
  "squadra": { "nome": "Zero Dark Team", "gestionale": "Zero Dark Ops", "indirizzo": "https://…" },
  "stato": "SQUADRA",                     // NUOVO, SQUADRA, SOSPESO, …
  "ruoli": ["ATLETA", "TL"]
}
```

**Chi entra.** «Accedi con …» identifica chi è già della squadra (stato
`SQUADRA`, `SOSPESO` o `DA_RICONFERMARE`): non crea account. Dalla pagina di
accesso aperta da un'app non si può registrarsi, e un account appena
registrato, in attesa, rifiutato o disabilitato viene rimandato all'app con
`error=access_denied`. Chi esce dalla squadra perde subito anche l'accesso:
`userinfo` risponde 401 e i codici non si scambiano più.

Solo i campi degli ambiti chiesti, e solo dopo il consenso della persona.
Gli stessi dati arrivano nell'`id_token` e da `userinfo`.

- **`picture`** (con `profile`) è un indirizzo pubblico, apribile senza
  accesso né cookie: la foto quadrata, 512×512, JPEG. Non si indovina (porta
  una firma) e cambia quando cambia la foto; senza foto il claim non c'è.
- **`phone_number`** (con `phone`) è in formato E.164. Se il numero scritto
  nel profilo non si riesce a leggere, il claim non c'è.

 Dal
suo profilo («App collegate») la persona toglie l'accesso quando vuole: i token
già dati smettono di valere.
