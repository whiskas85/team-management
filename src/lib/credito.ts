import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { quoteTutteSaldate } from './casse';

/**
 * Il credito: soldi già in cassa che restano di chi li ha dati.
 *
 * Nasce soprattutto da una quota pagata che non serve più — l'evento si
 * annulla, uno non può più venire — quando chi aveva pagato, invece del
 * rimborso, preferisce tenerli per la prossima. Si può anche registrare un
 * versamento a credito, senza una quota di mezzo.
 *
 * **Si spende come un pagamento**: quando si paga una quota il credito è
 * proposto per primo, già scelto, e chi paga (o chi incassa) può preferire un
 * altro metodo. Non si scala mai da solo.
 *
 * È un registro (MovimentoCredito), non un numero scritto: +20 quando nasce,
 * −10 legato alla quota quando la paga, e la quota si ritrova 10 € incassati.
 * Il saldo della cassa è l'incassato sulle quote **più** il credito che resta:
 * i soldi si contano una volta sola.
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
 * Paga una quota col credito di chi la deve, nella sua cassa: tutta, o fin
 * dove arriva il credito (fino a `massimo`, se chi paga ne vuole usare meno).
 * Chi era convocato passa titolare quando tutte le sue quote dell'attività
 * sono chiuse, come quando l'incasso lo registra la segreteria.
 *
 * Restituisce quanto è stato usato: zero se non c'era credito o niente da pagare.
 */
export async function pagaConCredito(paymentId: string, massimo?: number): Promise<number> {
  const q = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!q || q.tipo === 'RIMBORSO') return 0;
  if (q.status !== 'DA_PAGARE' && q.status !== 'PARZIALE') return 0;
  const credito = await saldoCredito(q.userId, q.cassaId);
  const resto = centesimi(Number(q.importo) - Number(q.pagato));
  const quanto = centesimi(Math.min(resto, credito, massimo ?? Infinity));
  if (quanto <= 0) return 0;

  const pagato = centesimi(Number(q.pagato) + quanto);
  const status = statoDaImporti(Number(q.importo), pagato);
  await prisma.$transaction([
    prisma.movimentoCredito.create({
      data: {
        userId: q.userId,
        cassaId: q.cassaId,
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
        // pagata: la segnalazione di un altro metodo non serve più
        ...(status === 'PAGATO' ? { dichiaratoIl: null } : {}),
      },
    }),
  ]);

  if (status === 'PAGATO' && q.eventId && (await quoteTutteSaldate(q.eventId, q.userId))) {
    await prisma.eventRsvp.updateMany({
      where: { eventId: q.eventId, userId: q.userId, assegnazione: 'CONVOCATO' },
      data: { assegnazione: 'TITOLARE' },
    });
    revalidatePath(`/calendario/${q.eventId}`);
  }
  return quanto;
}

/**
 * Una quota pagata diventa credito: i soldi restano in cassa e tornano di chi
 * li aveva dati, da spendere su un'altra attività. La quota si chiude
 * (annullata, con la nota), e un rimborso eventualmente chiesto per lei non
 * serve più.
 *
 * Restituisce quanto è diventato credito.
 */
export async function quotaInCredito(paymentId: string, chi: string): Promise<number> {
  const q = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { rimborso: true },
  });
  if (!q || q.tipo === 'RIMBORSO') return 0;

  // la parte già pagata col credito torna com'era, il resto nasce ora
  const giaCredito = await riprendiCredito(q.id);
  const fresca = await prisma.payment.findUnique({ where: { id: q.id } });
  const contanti = centesimi(Number(fresca?.pagato ?? 0));
  const nota = `Trasformata in credito il ${new Date().toLocaleDateString('it-IT')} (${chi})`;

  await prisma.$transaction([
    ...(contanti > 0
      ? [
          prisma.movimentoCredito.create({
            data: {
              userId: q.userId,
              cassaId: q.cassaId,
              tipo: 'DA_QUOTA' as const,
              importo: contanti,
              descrizione: q.descrizione,
              // la data in cui i soldi sono entrati davvero
              data: q.pagatoIl ?? new Date(),
            },
          }),
        ]
      : []),
    prisma.payment.update({
      where: { id: q.id },
      data: {
        pagato: 0,
        status: 'ANNULLATO',
        pagatoIl: null,
        // una quota chiusa non aspetta più conferme: senza, la vecchia
        // segnalazione la faceva tornare «da confermare»
        dichiaratoIl: null,
        note: [q.note, nota].filter(Boolean).join(' · '),
      },
    }),
    ...(q.rimborso && q.rimborso.status !== 'PAGATO'
      ? [
          prisma.payment.update({
            where: { id: q.rimborso.id },
            data: {
              status: 'ANNULLATO',
              note: [q.rimborso.note, 'Non serve: tenuto come credito'].filter(Boolean).join(' · '),
            },
          }),
        ]
      : []),
  ]);
  return centesimi(contanti + giaCredito);
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

/**
 * Un'attività annullata non la deve più nessuno: le sue quote si chiudono.
 *
 * - la parte pagata col credito torna credito;
 * - una quota rimasta senza un euro incassato sparisce, come quando uno toglie
 *   l'adesione: nella cassa non resta nessuno «che deve» per un'attività che
 *   non c'è;
 * - una quota pagata a metà si chiude a quanto è entrato: il resto non è più
 *   dovuto. Quello che è entrato resta dov'è — la persona lo tiene come credito
 *   o chiede il rimborso, come per ogni attività annullata.
 *
 * Le quote pagate per intero e i rimborsi non si toccano. Riaprendo
 * l'attività le quote rinascono dalle adesioni.
 */
export async function chiudiQuoteAnnullata(eventId: string): Promise<void> {
  const quote = await prisma.payment.findMany({
    where: { eventId, tipo: { not: 'RIMBORSO' }, status: { in: ['DA_PAGARE', 'PARZIALE', 'PAGATO'] } },
    select: { id: true },
  });
  for (const { id } of quote) {
    await riprendiCredito(id);
    const q = await prisma.payment.findUnique({ where: { id } });
    if (!q || q.status === 'PAGATO') continue;
    if (Number(q.pagato) <= 0) {
      await prisma.payment.delete({ where: { id } });
    } else {
      await prisma.payment.update({
        where: { id },
        data: {
          importo: q.pagato,
          status: 'PAGATO',
          pagatoIl: q.pagatoIl ?? new Date(),
          note: [q.note, 'Attività annullata: chiusa a quanto versato'].filter(Boolean).join(' · '),
        },
      });
    }
  }
}
