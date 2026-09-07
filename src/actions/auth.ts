'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { CALLSIGN_PRESO, callsignOccupato } from '@/lib/callsign';
import { createSession, destroySession, hashPassword, verifyPassword } from '@/lib/auth';
import { VERSIONE_PRIVACY } from '@/lib/gdpr';

export type StatoForm = { errore?: string; ok?: string };

const testo = (fd: FormData, k: string) => (fd.get(k)?.toString() ?? '').trim();
const flag = (fd: FormData, k: string) => {
  const v = testo(fd, k);
  return v === 'on' || v === 'true' || v === '1';
};

export async function accedi(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const identita = testo(fd, 'email').toLowerCase();
  const password = testo(fd, 'password');

  if (!identita || !password) return { errore: 'Inserisci email o callsign, e la password.' };

  // si entra con l'email o con il callsign: chi ne ha uno se lo ricorda meglio
  // dell'indirizzo. Il confronto sul callsign ignora le maiuscole
  let user = await prisma.user.findUnique({ where: { email: identita } });

  if (!user) {
    const perCallsign = await prisma.user.findMany({
      where: { callsign: { equals: identita, mode: 'insensitive' } },
      take: 2,
    });
    // due persone con lo stesso callsign renderebbero l'accesso una lotteria:
    // meglio dirlo e farsi dare l'email
    if (perCallsign.length > 1) {
      return { errore: 'Questo callsign appartiene a più operatori: entra con l’email.' };
    }
    user = perCallsign[0] ?? null;
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { errore: 'Credenziali non valide.' };
  }
  if (user.stato === 'DISABILITATO') {
    return { errore: 'Account disabilitato. Contatta l’amministrazione del team.' };
  }

  await prisma.user.update({ where: { id: user.id }, data: { ultimoAccesso: new Date() } });
  await createSession(user.id, flag(fd, 'ricordami'));
  redirect('/dashboard');
}

/**
 * Accesso rapido di sviluppo: entra come il primo account che ha il ruolo
 * richiesto. Attivo solo con DEBUG_LOGIN=1, così in produzione sparisce.
 */
export async function accessoDebug(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  if (process.env.DEBUG_LOGIN !== '1') return { errore: 'Accesso rapido disattivato.' };

  const email = testo(fd, 'email');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { errore: `Account di prova ${email} non trovato.` };

  await createSession(user.id, false);
  redirect('/dashboard');
}

export async function registrati(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const nome = testo(fd, 'nome');
  const cognome = testo(fd, 'cognome');
  const email = testo(fd, 'email').toLowerCase();
  const callsign = testo(fd, 'callsign');
  const telefono = testo(fd, 'telefono');
  const password = testo(fd, 'password');
  const conferma = testo(fd, 'conferma');

  if (!nome || !cognome || !email || !password) {
    return { errore: 'Nome, cognome, email e password sono obbligatori.' };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { errore: 'Email non valida.' };
  if (password.length < 8) return { errore: 'La password deve avere almeno 8 caratteri.' };
  if (password !== conferma) return { errore: 'Le due password non coincidono.' };
  if (!flag(fd, 'privacy')) {
    return { errore: 'Per creare l’account devi accettare l’informativa privacy.' };
  }

  const esistente = await prisma.user.findUnique({ where: { email } });
  if (esistente) return { errore: 'Esiste già un account con questa email.' };

  // il callsign serve anche per entrare: due uguali e l'accesso diventa ambiguo
  if (callsign) {
    const preso = await callsignOccupato(callsign);
    if (preso) return { errore: CALLSIGN_PRESO(callsign, preso) };
  }

  const adesso = new Date();
  const consensoImmagini = flag(fd, 'immagini');

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      nome,
      cognome,
      callsign: callsign || null,
      telefono: telefono || null,
      roles: [], // nessun incarico: è un contatto, non un atleta
      stato: 'NUOVO',
      privacyAccettataIl: adesso,
      privacyVersione: VERSIONE_PRIVACY,
      consensoImmagini,
      consensoImmaginiIl: consensoImmagini ? adesso : null,
      ultimoAccesso: adesso,
    },
  });

  await createSession(user.id, flag(fd, 'ricordami'));
  redirect('/dashboard?benvenuto=1');
}

export async function esci() {
  await destroySession();
  redirect('/login');
}
