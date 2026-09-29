import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fmtDateTime, fmtEuro } from '@/lib/format';
import { confermaIncassoOspite } from '@/actions/ospiti';
import { FormAzione } from './Form';
import { Invia } from './Bottone';

/**
 * I soldi delle squadre ospiti collegate, nella cassa in cui li abbiamo fatti
 * arrivare: chi ha segnalato un pagamento aspetta che lo si confermi, come le
 * quote dichiarate dai nostri. Confermato, è in cassa (in quella del club,
 * un'entrata del registro).
 */
export async function OspitiInCassa({ cassaId }: { cassaId: string | null }) {
  const ospiti = await prisma.squadraOspite.findMany({
    where: {
      collegamentoId: { not: null },
      versatoIl: { not: null },
      event: { cassaOspitiId: cassaId },
    },
    orderBy: [{ confermatoIl: { sort: 'desc', nulls: 'first' } }, { versatoIl: 'desc' }],
    take: 30,
    include: { event: { select: { id: true, titolo: true, inizio: true } } },
  });
  if (ospiti.length === 0) return null;
  const daConfermare = ospiti.filter((o) => !o.confermatoIl).length;

  return (
    <div className="card mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="titolo-sezione">Squadre ospiti</p>
        <p className="text-xs text-muted">
          {daConfermare > 0
            ? `${daConfermare} ${daConfermare === 1 ? 'pagamento' : 'pagamenti'} da confermare`
            : 'Tutto confermato'}
        </p>
      </div>
      <ul className="divide-y divide-line">
        {ospiti.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {o.nome}{' '}
                <Link href={`/calendario/${o.event.id}`} className="text-muted hover:text-nvg">
                  · {o.event.titolo}
                </Link>
              </p>
              <p className="text-xs text-muted">
                Segnalato il {fmtDateTime(o.versatoIl)}
                {o.versatoMetodo ? ` · ${o.versatoMetodo}` : ''}
                {o.versatoNote ? ` · «${o.versatoNote}»` : ''}
                {o.confermatoIl ? ` · confermato il ${fmtDateTime(o.confermatoIl)}` : ''}
              </p>
            </div>
            <span className="num text-sm font-semibold">{fmtEuro(Number(o.versatoImporto ?? 0))}</span>
            {!o.confermatoIl && (
              <FormAzione azione={confermaIncassoOspite} className="contents">
                <input type="hidden" name="id" value={o.id} />
                <Invia icona="incassa" className="btn-primary btn-sm">
                  Conferma incasso
                </Invia>
              </FormAzione>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
