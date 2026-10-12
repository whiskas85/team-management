import { prisma } from './db';
import { marchio } from './mia-squadra';
import { esc, indirizzoPubblico, inviaEmail, pulsanteEmail } from './posta';
import { firma, firmaValida } from './segreti';

/**
 * La verifica dell'email: un link firmato che la persona apre dalla sua
 * casella. Aprendolo dimostra che l'indirizzo è suo e che le email ci
 * arrivano.
 *
 * Il link non sta nel database: porta con sé chi è, quale indirizzo e fino a
 * quando vale, firmati col segreto del gestionale. Chi non l'ha ricevuto non
 * può inventarlo. Vale un giorno, e solo per l'indirizzo per cui è partito:
 * se nel frattempo l'email dell'account cambia, quel link non verifica più
 * niente.
 *
 * Solo a un indirizzo verificato il gestionale manda gli avvisi per email
 * (lib/avvisi): scrivere a una casella mai confermata vuol dire, prima o poi,
 * scrivere a uno sconosciuto.
 */

const ORE = 24;

const testoFirmato = (userId: string, email: string, scade: number) =>
  `verifica:${userId}:${email.toLowerCase()}:${scade}`;

/** L'email dell'account è quella verificata? */
export const emailVerificata = (u: { email: string | null; emailVerificata: string | null }) =>
  !!u.email && u.emailVerificata?.toLowerCase() === u.email.toLowerCase();

/**
 * Manda il link di verifica all'email dell'account. Il motivo, se non parte.
 * `base` è l'indirizzo del gestionale, per chi lo chiama fuori da una richiesta.
 */
export async function mandaVerifica(userId: string, base?: string): Promise<{ errore?: string }> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nome: true, email: true },
  });
  if (!u?.email) return { errore: 'L’account non ha un’email.' };

  const scade = Date.now() + ORE * 3_600_000;
  const q = new URLSearchParams({
    u: u.id,
    s: String(scade),
    f: firma(testoFirmato(u.id, u.email, scade)),
  });
  const link = `${base ?? (await indirizzoPubblico())}/verifica-email?${q}`;
  const { nomeGestionale } = await marchio();

  return inviaEmail({
    a: u.email,
    oggetto: `${nomeGestionale}: conferma la tua email`,
    testo: `Ciao ${u.nome},

per confermare che questa è la tua email nel gestionale ${nomeGestionale}, apri questo link (vale un giorno):

${link}

Così, se non hai le notifiche né WhatsApp, gli avvisi importanti ti arrivano qui.

Se non sai di cosa si tratta, ignora questa email.`,
    html: `<p>Ciao ${esc(u.nome)},</p>
<p>per confermare che questa è la tua email nel gestionale <strong>${esc(nomeGestionale)}</strong>, apri questo link (vale un giorno):</p>
${pulsanteEmail(link, 'Confermo, è la mia email')}
<p>Così, se non hai le notifiche né WhatsApp, gli avvisi importanti ti arrivano qui.</p>
<p style="font-size:12px;color:#666">Se non sai di cosa si tratta, ignora questa email.</p>`,
  });
}

export type EsitoVerifica = 'fatta' | 'gia' | 'scaduto' | 'non-valido';

/** Il link aperto: se è buono, l'email dell'account diventa verificata. */
export async function confermaVerifica(
  userId: string,
  scade: string,
  f: string,
): Promise<EsitoVerifica> {
  const quando = Number(scade);
  if (!userId || !f || !Number.isFinite(quando)) return 'non-valido';
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerificata: true },
  });
  if (!u?.email) return 'non-valido';
  if (!firmaValida(testoFirmato(userId, u.email, quando), f)) return 'non-valido';
  if (emailVerificata(u)) return 'gia';
  if (quando < Date.now()) return 'scaduto';
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerificata: u.email, emailVerificataIl: new Date() },
  });
  return 'fatta';
}
