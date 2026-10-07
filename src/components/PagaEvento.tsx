import { prisma } from '@/lib/db';
import { saldoCredito } from '@/lib/credito';
import { fmtEuro } from '@/lib/format';
import { BottoneModale } from './Modale';
import { Dichiara } from './PagaQuota';

/**
 * Il «Paga» di una card dell'attività: una finestra con tutte le quote che la
 * persona deve per quell'attività — il club e le altre casse — e per ognuna
 * come si paga, il credito e la segnalazione, come in «Miei pagamenti».
 *
 * Non c'è niente da pagare (o è tutto segnalato e pagato): niente pulsante.
 */
export async function PagaEvento({
  eventId,
  userId,
  titolo,
}: {
  eventId: string;
  userId: string;
  titolo: string;
}) {
  const quote = await prisma.payment.findMany({
    where: {
      eventId,
      userId,
      tipo: { not: 'RIMBORSO' },
      status: { in: ['DA_PAGARE', 'PARZIALE'] },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      cassa: { select: { nome: true } },
      rimborso: { select: { id: true, status: true } },
      crediti: { select: { importo: true } },
    },
  });
  if (quote.length === 0) return null;

  const casse = [...new Set(quote.map((q) => q.cassaId))];
  const [metodi, crediti] = await Promise.all([
    prisma.metodoPagamento.findMany({
      where: { attivo: true, selfService: true, cassaId: { in: casse.filter(Boolean) as string[] } },
      orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
    }),
    Promise.all(casse.map(async (c) => [c, await saldoCredito(userId, c)] as const)),
  ]);
  // i metodi del club: cassaId nullo non si chiede con «in»
  const metodiClub = casse.includes(null)
    ? await prisma.metodoPagamento.findMany({
        where: { attivo: true, selfService: true, cassaId: null },
        orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
      })
    : [];
  const creditoDi = new Map(crediti);
  const tutteSegnalate = quote.every((q) => q.dichiaratoIl);
  const totale = quote.reduce((t, q) => t + Number(q.importo) - Number(q.pagato), 0);

  return (
    <BottoneModale
      etichetta={tutteSegnalate ? 'Segnalato' : 'Paga'}
      icona="incassa"
      titolo={`Paga · ${titolo}`}
      className={tutteSegnalate ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
    >
      <div className="space-y-6 text-left">
        {quote.length > 1 && (
          <p className="text-sm text-muted">
            {quote.length} quote, {fmtEuro(totale)} in tutto: ognuna si paga alla sua cassa.
          </p>
        )}
        {quote.map((q, i) => (
          <section key={q.id} className={i > 0 ? 'border-t border-line pt-5' : undefined}>
            <p className="font-medium">{q.descrizione}</p>
            <p className="mb-3 text-xs text-muted">
              {q.cassa ? `da pagare a ${q.cassa.nome}` : 'da pagare al club'}
              {q.dichiaratoIl ? ' · segnalata, in verifica' : ''}
            </p>
            <Dichiara
              pagamento={q}
              metodi={q.cassaId ? metodi.filter((m) => m.cassaId === q.cassaId) : metodiClub}
              cassa={q.cassa?.nome ?? null}
              credito={creditoDi.get(q.cassaId) ?? 0}
              nonServe={false}
              persone={[]}
              inline
            />
          </section>
        ))}
      </div>
    </BottoneModale>
  );
}
