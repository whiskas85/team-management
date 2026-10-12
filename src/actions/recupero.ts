'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { creaGettone } from '@/lib/gettoni';
import { inviaEmail, serverPosta } from '@/lib/posta';
import { marchio } from '@/lib/mia-squadra';

export type StatoRecupero = { errore?: string; ok?: string };

/** Quanto vale il link mandato per email. */
const MINUTI = 60;

/**
 * «Ho dimenticato la password»: un link per entrare, mandato all'email
 * dell'account.
 *
 * Il link è un gettone di accesso come quelli che si mandano su WhatsApp
 * (lib/gettoni), ma vale un'ora: entrando si sceglie subito una password nuova.
 *
 * La risposta è **sempre la stessa**, che l'account esista o no: altrimenti
 * questa pagina direbbe a chiunque quali email sono iscritte. E una richiesta
 * ogni due minuti per account basta: chi preme dieci volte riceve un'email.
 */
export async function chiediRecupero(_prev: StatoRecupero, fd: FormData): Promise<StatoRecupero> {
  const chi = (fd.get('identita')?.toString() ?? '').trim().toLowerCase();
  if (!chi) return { errore: 'Scrivi la tua email, il callsign o il telefono.' };

  if (!(await serverPosta())) {
    return {
      errore:
        'Il recupero via email non è attivo: chiedi a chi segue la squadra un link di accesso.',
    };
  }

  const fatto = {
    ok: 'Se c’è un account con questi dati, gli abbiamo mandato un’email con un link per entrare: vale un’ora. Controlla anche nello spam.',
  };

  const user = await trova(chi);
  if (!user?.email || user.stato === 'DISABILITATO') return fatto;

  // una richiesta ogni due minuti: l'ultima email basta
  const recente = await prisma.gettoneAccesso.findFirst({
    where: {
      userId: user.id,
      creatoDaId: null,
      creatoIl: { gt: new Date(Date.now() - 2 * 60_000) },
    },
  });
  if (recente) return fatto;

  const gettone = await creaGettone(user.id, undefined, MINUTI);
  const link = `${await indirizzo()}/accesso/${gettone}`;
  const { nomeGestionale } = await marchio();

  const esito = await inviaEmail({
    a: user.email,
    oggetto: `${nomeGestionale}: il tuo link per entrare`,
    testo: `Ciao ${user.nome},

hai chiesto di entrare nel gestionale ${nomeGestionale} senza la password. Questo link ti fa entrare una volta sola e vale un'ora:

${link}

Appena dentro ti chiederà di scegliere una password nuova.

Se non sei stato tu, ignora questa email: senza il link non entra nessuno, e la tua password resta quella di prima.`,
    html: `<p>Ciao ${esc(user.nome)},</p>
<p>hai chiesto di entrare nel gestionale <strong>${esc(nomeGestionale)}</strong> senza la password. Questo link ti fa entrare una volta sola e vale un'ora:</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#39ff14;color:#000;text-decoration:none;border-radius:6px;font-weight:bold">Entra e scegli una password nuova</a></p>
<p style="font-size:12px;color:#666">Se il pulsante non si apre, copia questo indirizzo nel browser:<br>${link}</p>
<p style="font-size:12px;color:#666">Se non sei stato tu, ignora questa email: senza il link non entra nessuno, e la tua password resta quella di prima.</p>`,
  });
  if (esito.errore) console.error('[recupero password] email non partita:', esito.errore);
  return fatto;
}

const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** L'indirizzo pubblico del gestionale: dall'ambiente, o da chi sta chiedendo. */
async function indirizzo() {
  const env = process.env.INDIRIZZO_PUBBLICO?.replace(/\/+$/, '');
  if (env) return env;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const protocollo = h.get('x-forwarded-proto') ?? 'https';
  return `${protocollo}://${host}`;
}

/** L'account da email, callsign o telefono: come all'accesso. */
async function trova(chi: string) {
  const sel = { id: true, email: true, nome: true, stato: true } as const;
  const perEmail = await prisma.user.findUnique({ where: { email: chi }, select: sel });
  if (perEmail) return perEmail;
  const perCallsign = await prisma.user.findMany({
    where: { callsign: { equals: chi, mode: 'insensitive' } },
    select: sel,
    take: 2,
  });
  if (perCallsign.length === 1) return perCallsign[0];
  const cifre = chi.replace(/\D/g, '');
  if (cifre.length >= 8) {
    const coda = cifre.slice(-9);
    const righe = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User"
      WHERE regexp_replace(COALESCE(telefono, ''), '[^0-9]', '', 'g') LIKE ${'%' + coda}
        AND telefono IS NOT NULL AND telefono <> ''
      LIMIT 2`;
    if (righe.length === 1) {
      return prisma.user.findUnique({ where: { id: righe[0].id }, select: sel });
    }
  }
  return null;
}
