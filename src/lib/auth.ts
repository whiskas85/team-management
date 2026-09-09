import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { Role, StatoOperatore } from '@prisma/client';
import { prisma } from './db';
import { identitaCorrente } from './identita';

const COOKIE = 'zd_session';
const DURATA_BREVE = 60 * 60 * 12; // sessione di lavoro
const DURATA_LUNGA = 60 * 60 * 24 * 60; // "ricordami": due mesi

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET mancante o troppo corta (minimo 16 caratteri).');
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string, ricordami = false) {
  const durata = ricordami ? DURATA_LUNGA : DURATA_BREVE;

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${durata}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // In LAN si accede via http://ip:3000 e un cookie Secure verrebbe scartato
    // dal browser: si attiva esplicitamente quando davanti c'è HTTPS.
    secure: process.env.COOKIE_SECURE === '1',
    path: '/',
    // senza "ricordami" il cookie muore alla chiusura del browser
    ...(ricordami ? { maxAge: durata } : {}),
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  callsign: string | null;
  deveCambiarePassword: boolean;
  roles: Role[];
  stato: StatoOperatore;
  ultimaAttivita: Date | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  // Un assistente collegato via MCP lavora per conto di una persona: la chiave
  // è già stata verificata, qui si legge chi è. Da questa riga in poi il resto
  // dell'applicazione non sa nemmeno che la richiesta non arriva da un browser,
  // ed è voluto: i permessi restano quelli, uno solo per tutti i modi di entrare.
  const perConto = identitaCorrente();
  if (perConto) return perConto;

  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = payload.sub;
    if (typeof id !== 'string') return null;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nome: true,
        cognome: true,
        callsign: true,
        deveCambiarePassword: true,
        roles: true,
        stato: true,
        ultimaAttivita: true,
      },
    });
    if (!user || user.stato === 'DISABILITATO') return null;
    return user;
  } catch {
    return null;
  }
}

/** Richiede una sessione valida, altrimenti manda al login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Richiede che il permesso indicato sia soddisfatto dai ruoli dell'utente. */
export async function requirePermesso(
  test: (roles: Role[]) => boolean,
): Promise<SessionUser> {
  const user = await requireUser();
  if (!test(user.roles)) redirect('/dashboard?errore=permessi');
  return user;
}

/**
 * Segna che questa persona sta usando il gestionale, adesso.
 *
 * Si scrive **al massimo una volta ogni cinque minuti**, non a ogni pagina: la
 * data serve a sapere se qualcuno è passato oggi o tre settimane fa, e per
 * quella domanda cinque minuti di approssimazione non cambiano niente — mentre
 * una scrittura per ogni schermata aperta sì.
 *
 * Se il database non risponde non succede niente: è un dato di comodo, e non
 * deve poter impedire a nessuno di aprire una pagina.
 */
const PASSO_ATTIVITA = 5 * 60 * 1000;

export async function segnaAttivita(user: {
  id: string;
  ultimaAttivita?: Date | null;
}): Promise<void> {
  const ultima = user.ultimaAttivita;
  if (ultima && Date.now() - ultima.getTime() < PASSO_ATTIVITA) return;
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { ultimaAttivita: new Date() },
    });
  } catch {
    /* vedi sopra */
  }
}
