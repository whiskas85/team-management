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
  const versamenti = await prisma.versamentoSquadra.findMany({
    where: {
      squadraOspite: { collegamentoId: { not: null }, event: { cassaOspitiId: cassaId } },
    },
    // prima quelli da confermare, poi i più recenti
    orderBy: [{ confermatoIl: { sort: 'desc', nulls: 'first' } }, { segnalatoIl: 'desc' }],
    take: 30,
    include: {
      squadraOspite: {
        select: { nome: true, event: { select: { id: true, titolo: true } } },
      },
    },
  });
  if (versamenti.length === 0) return null;
  const daConfermare = versamenti.filter((v) => !v.confermatoIl).length;

  return (
    <div className="card mb-6" id="squadre-ospiti">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="titolo-sezione">Squadre ospiti</p>
        <p className={`text-xs ${daConfermare > 0 ? 'text-warn' : 'text-muted'}`}>
          {daConfermare > 0
            ? `${daConfermare} ${daConfermare === 1 ? 'pagamento' : 'pagamenti'} da confermare`
            : 'Tutto confermato'}
        </p>
      </div>
      <ul className="divide-y divide-line">
        {versamenti.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {v.squadraOspite!.nome}{' '}
                <Link
                  href={`/calendario/${v.squadraOspite!.event.id}`}
                  className="text-muted hover:text-nvg"
                >
                  · {v.squadraOspite!.event.titolo}
                </Link>
              </p>
              <p className="text-xs text-muted">
                Segnalato il {fmtDateTime(v.segnalatoIl)}
                {v.metodo ? ` · ${v.metodo}` : ''}
                {v.note ? ` · «${v.note}»` : ''}
                {v.confermatoIl ? ` · confermato il ${fmtDateTime(v.confermatoIl)}` : ''}
              </p>
            </div>
            <span className="num text-sm font-semibold">{fmtEuro(Number(v.importo))}</span>
            {v.confermatoIl ? (
              <span className="text-xs text-nvg">in cassa</span>
            ) : (
              <FormAzione azione={confermaIncassoOspite} className="contents">
                <input type="hidden" name="id" value={v.id} />
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
