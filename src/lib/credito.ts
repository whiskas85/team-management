import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { quoteTutteSaldate } from './casse';

/**
 * Il credito: soldi versati prima delle quote.
 *
 * Jak dà 30 € alla segreteria. Se ha delle quote aperte in quella cassa, i
 * soldi le pagano subito; quello che avanza resta suo, come credito, e paga da
 * solo le quote che arriveranno. Lui lo vede nei suoi pagamenti, chi tiene la
 * cassa vede chi ha credito e quanto.
 *
 * Il credito è un registro (MovimentoCredito), non un numero scritto: +30 al
 * versamento, −20 legato alla quota quando la paga. La quota intanto si
 * ritrova 20 € incassati, come se li avesse dati allora. Il saldo della cassa
 * è quindi l'incassato sulle quote **più** il credito che resta: i soldi si
 * contano una volta sola, e le quote pagate col credito si leggono come tutte
 * le altre.
 */

const centesimi = (n: number) => Math.round(n * 100) / 100;

/** Il credito di una persona in una cassa (nulla: quella del club). */
export async function saldoCredito(userId: string, cassaId: string | null): Promise<number> {
  const r = await prisma.movimentoCredito.aggregate({
    where: { userId, cassaId },
    _sum: { importo: true },
  });
  return centesimi(Number(r._sum.importo ?? 0));
}

/** Chi ha credito in una cassa, e quanto: per chi la tiene. */
export async function creditiDellaCassa(cassaId: string | null) {
  const gruppi = await prisma.movimentoCredito.groupBy({
    by: ['userId'],
    where: { cassaId },
    _sum: { importo: true },
  });
  const conCredito = gruppi
    .map((g) => ({ userId: g.userId, credito: centesimi(Number(g._sum.importo ?? 0)) }))
    .filter((g) => g.credito > 0);
  if (conCredito.length === 0) return [];
  const persone = await prisma.user.findMany({
    where: { id: { in: conCredito.map((g) => g.userId) } },
    select: { id: true, nome: true, cognome: true, callsign: true },
  });
  return conCredito
    .map((g) => ({ ...g, user: persone.find((p) => p.id === g.userId)! }))
    .filter((g) => g.user)
    .sort((a, b) => b.credito - a.credito);
}

/** Il totale del registro di una cassa: quanto credito c'è ancora dentro. */
export async function creditoInCassa(cassaId: string | null): Promise<number> {
  const r = await prisma.movimentoCredito.aggregate({
    where: { cassaId },
    _sum: { importo: true },
  });
  return centesimi(Number(r._sum.importo ?? 0));
}

const statoDaImporti = (importo: number, pagato: number) =>
  pagato <= 0.001 ? ('DA_PAGARE' as const) : pagato + 0.001 >= importo ? ('PAGATO' as const) : ('PARZIALE' as const);

/**
 * Paga col credito le quote aperte di una persona in una cassa, dalla più
 * vecchia. Si chiama dopo un versamento e ogni volta che nasce una quota: il
 * credito non aspetta nessuno. Restano fuori le quote per cui la persona ha
 * detto di aver già pagato in un altro modo, e quelle gestite fuori.
 *
 * Restituisce quanto è stato usato.
 */
export async function usaCredito(userId: string, cassaId: string | null): Promise<number> {
  let credito = await saldoCredito(userId, cassaId);
  if (credito <= 0) return 0;

  const aperte = await prisma.payment.findMany({
    where: {
      userId,
      cassaId,
      tipo: { not: 'RIMBORSO' },
      status: { in: ['DA_PAGARE', 'PARZIALE'] },
      dichiaratoIl: null,
    },
    orderBy: [{ scadenza: 'asc' }, { createdAt: 'asc' }],
  });

  let usato = 0;
  const eventiDaPromuovere = new Set<string>();
  for (const q of aperte) {
    if (credito <= 0) break;
    const resto = centesimi(Number(q.importo) - Number(q.pagato));
    if (resto <= 0) continue;
    const quanto = centesimi(Math.min(resto, credito));
    const pagato = centesimi(Number(q.pagato) + quanto);
    const status = statoDaImporti(Number(q.importo), pagato);
    await prisma.$transaction([
      prisma.movimentoCredito.create({
        data: {
          userId,
          cassaId,
          tipo: 'USO',
          importo: -quanto,
          paymentId: q.id,
          descrizione: q.descrizione,
        },
      }),
      prisma.payment.update({
        where: { id: q.id },
        data: {
          pagato,
          status,
          pagatoIl: status === 'PAGATO' ? new Date() : null,
        },
      }),
    ]);
    credito = centesimi(credito - quanto);
    usato = centesimi(usato + quanto);
    if (status === 'PAGATO' && q.eventId) eventiDaPromuovere.add(q.eventId);
  }

  // Il posto si tiene pagando, anche col credito: chi era convocato diventa
  // titolare quando tutte le sue quote dell'attività sono chiuse, come quando
  // l'incasso lo registra la segreteria.
  for (const eventId of eventiDaPromuovere) {
    if (await quoteTutteSaldate(eventId, userId)) {
      await prisma.eventRsvp.updateMany({
        where: { eventId, userId, assegnazione: 'CONVOCATO' },
        data: { assegnazione: 'TITOLARE' },
      });
      revalidatePath(`/calendario/${eventId}`);
    }
  }
  return usato;
}

/** Quanto di una quota è stato pagato col credito, e non ancora ripreso. */
export async function parteDaCredito(paymentId: string): Promise<number> {
  const r = await prisma.movimentoCredito.aggregate({
    where: { paymentId },
    _sum: { importo: true },
  });
  return centesimi(-Number(r._sum.importo ?? 0));
}

/**
 * Una quota pagata col credito non è più dovuta — l'adesione è stata tolta, la
 * quota annullata o eliminata: quei soldi tornano credito. La quota perde
 * l'incassato che veniva dal credito; se non le resta altro, torna da pagare
 * (e chi la cancella può cancellarla senza lasciare soldi per strada).
 *
 * Restituisce quanto è tornato.
 */
export async function riprendiCredito(paymentId: string): Promise<number> {
  const quota = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!quota) return 0;
  const parte = await parteDaCredito(paymentId);
  if (parte <= 0) return 0;
  const pagato = centesimi(Math.max(0, Number(quota.pagato) - parte));
  const status = statoDaImporti(Number(quota.importo), pagato);
  await prisma.$transaction([
    prisma.movimentoCredito.create({
      data: {
        userId: quota.userId,
        cassaId: quota.cassaId,
        tipo: 'RIPRESO',
        importo: parte,
        paymentId,
        descrizione: quota.descrizione,
      },
    }),
    prisma.payment.update({
      where: { id: paymentId },
      data: { pagato, status, pagatoIl: status === 'PAGATO' ? quota.pagatoIl : null },
    }),
  ]);
  return parte;
}
