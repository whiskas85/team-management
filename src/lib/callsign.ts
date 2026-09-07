import { prisma } from './db';

/**
 * Chi ha già questo callsign, se qualcuno ce l'ha.
 *
 * Il callsign non è un vezzo: con quello si entra nel gestionale, al posto
 * dell'email. Due uguali rendono l'accesso una lotteria — infatti il login, se
 * ne trova due, si arrende e chiede l'indirizzo. Quindi si controlla in tutti i
 * punti in cui qualcuno può scriverne uno, ignorando maiuscole e spazi.
 */
export async function callsignOccupato(callsign: string, escludiId?: string) {
  const cs = callsign.trim();
  if (!cs) return null;

  return prisma.user.findFirst({
    where: {
      callsign: { equals: cs, mode: 'insensitive' },
      ...(escludiId ? { NOT: { id: escludiId } } : {}),
    },
    select: { nome: true, cognome: true },
  });
}

/** Il messaggio è sempre lo stesso, ovunque si provi a metterlo. */
export const CALLSIGN_PRESO = (callsign: string, di: { nome: string; cognome: string }) =>
  `Il callsign "${callsign}" è già di ${di.nome} ${di.cognome}: scegline un altro.`;
