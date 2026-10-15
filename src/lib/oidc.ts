import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { SignJWT, exportJWK, generateKeyPair, importPKCS8, type JWK } from 'jose';
import { prisma } from './db';
import { cifra, decifra } from './segreti';
import { marchio } from './mia-squadra';
import { emailVerificata } from './verifica-email';

/**
 * Il gestionale come fornitore di identità, con OpenID Connect.
 *
 * Un'app esterna (un gioco, un sito di tornei) mette il pulsante «Accedi con
 * <gestionale>»: la persona entra qui con il suo account, la prima volta dice
 * «va bene» ai dati che l'app chiede, e torna all'app riconosciuta. L'app non
 * vede mai la password, e non deve gestire né password né recuperi.
 *
 * Solo la parte moderna e sicura del protocollo:
 * - **codice di autorizzazione con PKCE obbligatorio** (S256), per tutte le app;
 * - codici monouso che valgono 5 minuti, token di accesso di un'ora, nessun
 *   refresh token (l'app tiene la sua sessione, e quando scade ripassa di qui:
 *   se la persona è già dentro, è un attimo);
 * - indirizzi di ritorno registrati e confrontati **esatti**;
 * - id_token firmati RS256 con una chiave del gestionale, pubblicata in JWKS;
 * - segreti, codici e token salvati solo come impronta.
 *
 * Ogni gestionale è il fornitore dei suoi: è generico, non sa niente di una
 * squadra in particolare. Un'app usata da più squadre ne accetta più d'uno.
 */

export const AMBITI = {
  openid: 'chi sei (un identificativo)',
  profile: 'nome, cognome e callsign',
  email: 'la tua email',
  squadra: 'la squadra, il tuo stato e i tuoi ruoli',
} as const;
export type Ambito = keyof typeof AMBITI;

export const impronta = (t: string) => createHash('sha256').update(t).digest('hex');
const casuale = (n = 32) => randomBytes(n).toString('base64url');

/** L'indirizzo del gestionale come emittente: lo stesso che leggono le app. */
export function emittente() {
  const base = process.env.INDIRIZZO_PUBBLICO?.replace(/\/+$/, '');
  if (!base)
    throw new Error('INDIRIZZO_PUBBLICO non impostato: serve per fare da fornitore di identità.');
  return base;
}

// ------------------------------------------------------------------ chiavi

/** La chiave di firma attiva: la si crea la prima volta che serve. */
async function chiave() {
  const c = await prisma.chiaveFirma.findFirst({
    where: { attiva: true },
    orderBy: { creataIl: 'desc' },
  });
  if (c) return { kid: c.kid, privata: await importPKCS8(decifra(c.privataCifrata), 'RS256') };
  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    modulusLength: 2048,
    extractable: true,
  });
  const kid = casuale(12);
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };
  const pem = (privateKey as unknown as { export: (o: object) => string }).export({
    type: 'pkcs8',
    format: 'pem',
  });
  await prisma.chiaveFirma.create({
    data: { kid, jwkPubblica: jwk as object, privataCifrata: cifra(pem) },
  });
  return { kid, privata: privateKey };
}

/** Le chiavi pubbliche, per /oauth/jwks. */
export async function jwks(): Promise<{ keys: JWK[] }> {
  await chiave(); // la prima volta, la crea
  const tutte = await prisma.chiaveFirma.findMany({ orderBy: { creataIl: 'desc' }, take: 3 });
  return { keys: tutte.map((c) => c.jwkPubblica as unknown as JWK) };
}

// ------------------------------------------------------------------ app

export async function nuovoSegreto() {
  const segreto = casuale(32);
  return { segreto, hash: impronta(segreto) };
}
export const nuovoClientId = () => `app_${casuale(12)}`;

/** Un indirizzo di ritorno accettabile: https, o http solo in locale. */
export function redirectValido(u: string) {
  try {
    const x = new URL(u);
    if (x.hash) return false;
    if (x.protocol === 'https:') return true;
    return x.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(x.hostname);
  } catch {
    return false;
  }
}

export async function appDa(clientId: string | null | undefined) {
  if (!clientId) return null;
  const app = await prisma.appCollegata.findUnique({ where: { clientId } });
  return app?.attiva ? app : null;
}

/** Il segreto dell'app è giusto? (Le app senza segreto non ne mandano.) */
export function segretoGiusto(hash: string | null, segreto: string | null) {
  if (!hash) return !segreto;
  if (!segreto) return false;
  const a = Buffer.from(hash);
  const b = Buffer.from(impronta(segreto));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Gli ambiti chiesti, ripuliti: solo quelli che conosciamo, openid sempre. */
export function ambitiDa(scope: string | null | undefined): Ambito[] {
  const chiesti = new Set((scope ?? '').split(/\s+/).filter(Boolean));
  return (Object.keys(AMBITI) as Ambito[]).filter((a) => chiesti.has(a));
}

// ------------------------------------------------------------------ codici e token

export async function creaCodice(d: {
  appId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  nonce: string | null;
  codeChallenge: string;
}) {
  const codice = casuale(32);
  await prisma.codiceOidc.create({
    data: { ...d, hash: impronta(codice), scadeIl: new Date(Date.now() + 5 * 60_000) },
  });
  // i codici vecchi non servono a nessuno
  await prisma.codiceOidc
    .deleteMany({ where: { scadeIl: { lt: new Date(Date.now() - 3600_000) } } })
    .catch(() => null);
  return codice;
}

/** PKCE S256: l'impronta del verificatore dev'essere quella mandata all'inizio. */
export function pkceGiusto(verificatore: string | null, sfida: string) {
  if (!verificatore || !/^[A-Za-z0-9\-._~]{43,128}$/.test(verificatore)) return false;
  const calcolata = createHash('sha256').update(verificatore).digest('base64url');
  const a = Buffer.from(calcolata);
  const b = Buffer.from(sfida);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** I dati di una persona, secondo gli ambiti concessi. */
export async function datiPersona(userId: string, ambiti: string[]) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nome: true,
      cognome: true,
      callsign: true,
      email: true,
      emailVerificata: true,
      stato: true,
      roles: true,
      updatedAt: true,
    },
  });
  if (!u) return null;
  const dati: Record<string, unknown> = { sub: u.id };
  if (ambiti.includes('profile')) {
    Object.assign(dati, {
      name: `${u.nome} ${u.cognome}`.trim(),
      given_name: u.nome,
      family_name: u.cognome,
      preferred_username: u.callsign || `${u.nome} ${u.cognome}`.trim(),
      nickname: u.callsign ?? undefined,
      updated_at: Math.floor(u.updatedAt.getTime() / 1000),
    });
  }
  if (ambiti.includes('email')) {
    Object.assign(dati, { email: u.email, email_verified: emailVerificata(u) });
  }
  if (ambiti.includes('squadra')) {
    const m = await marchio();
    Object.assign(dati, {
      squadra: { nome: m.nome, gestionale: m.nomeGestionale, indirizzo: emittente() },
      stato: u.stato,
      ruoli: u.roles,
    });
  }
  return dati;
}

/** I token per un codice valido: id_token firmato e access token per userinfo. */
export async function emettiToken(c: {
  appId: string;
  clientId: string;
  userId: string;
  scope: string;
  nonce: string | null;
}) {
  const accesso = casuale(32);
  const durata = 3600;
  await prisma.tokenOidc.create({
    data: {
      hash: impronta(accesso),
      appId: c.appId,
      userId: c.userId,
      scope: c.scope,
      scadeIl: new Date(Date.now() + durata * 1000),
    },
  });
  await prisma.tokenOidc.deleteMany({ where: { scadeIl: { lt: new Date() } } }).catch(() => null);

  const dati = (await datiPersona(c.userId, c.scope.split(' '))) ?? { sub: c.userId };
  const { kid, privata } = await chiave();
  const ora = Math.floor(Date.now() / 1000);
  const idToken = await new SignJWT({ ...dati, ...(c.nonce ? { nonce: c.nonce } : {}) })
    .setProtectedHeader({ alg: 'RS256', kid, typ: 'JWT' })
    .setIssuer(emittente())
    .setAudience(c.clientId)
    .setSubject(c.userId)
    .setIssuedAt(ora)
    .setExpirationTime(ora + durata)
    .sign(privata);

  return {
    access_token: accesso,
    token_type: 'Bearer',
    expires_in: durata,
    id_token: idToken,
    scope: c.scope,
  };
}

/** Il token di accesso dato all'app, se vale ancora. */
export async function tokenValido(accesso: string | null) {
  if (!accesso) return null;
  const t = await prisma.tokenOidc.findUnique({
    where: { hash: impronta(accesso) },
    include: { app: { select: { attiva: true } } },
  });
  if (!t || t.scadeIl < new Date() || !t.app.attiva) return null;
  // il consenso tolto dal profilo spegne anche i token già dati
  const consenso = await prisma.consensoApp.findUnique({
    where: { userId_appId: { userId: t.userId, appId: t.appId } },
  });
  return consenso ? t : null;
}

/** La configurazione pubblica, per /.well-known/openid-configuration. */
export function configurazione() {
  const e = emittente();
  return {
    issuer: e,
    authorization_endpoint: `${e}/oauth/authorize`,
    token_endpoint: `${e}/oauth/token`,
    userinfo_endpoint: `${e}/oauth/userinfo`,
    jwks_uri: `${e}/oauth/jwks`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: Object.keys(AMBITI),
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    code_challenge_methods_supported: ['S256'],
    claims_supported: [
      'sub',
      'name',
      'given_name',
      'family_name',
      'preferred_username',
      'nickname',
      'email',
      'email_verified',
      'squadra',
      'stato',
      'ruoli',
    ],
  };
}

/** Le intestazioni per le chiamate dalle app che girano nel browser. */
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Cache-Control': 'no-store',
};
