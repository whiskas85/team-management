import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { Role, StatoOperatore } from '@prisma/client';
import { prisma } from './db';

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
};

export async function getCurrentUser(): Promise<SessionUser | null> {
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
