import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fmtDate, fmtDateTime, fmtEuro } from '@/lib/format';
import { contoFraSquadre, dovutoAllOrganizzatore } from '@/lib/eventi-condivisi';
import { confermaIncassoOspite } from '@/actions/ospiti';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { ContoFraSquadre } from './ContoFraSquadre';

/**
 * I soldi delle squadre ospiti collegate, nella cassa in cui li abbiamo fatti
 * arrivare: squadra per squadra, quanto devono, quanto è già in cassa, quanto
 * aspetta una conferma e quanto resta scoperto. Chi ha segnalato un pagamento
 * aspetta che lo si confermi, come le quote dichiarate dai nostri; confermato,
 * è in cassa (in quella del club, un'entrata del registro).
 */
export async function OspitiInCassa({ cassaId }: { cassaId: string | null }) {
  const da = new Date(Date.now() - 90 * 86_400_000);
  const ospiti = await prisma.squadraOspite.findMany({
    where: {
      collegamentoId: { not: null },
      risposta: { not: 'RIFIUTATA' },
      event: { cassaOspitiId: cassaId },
      OR: [
        // quelle che hanno pagato qualcosa, e quelle che devono ancora pagare
        { versamenti: { some: {} } },
        { event: { costoOspiti: { gt: 0 }, inizio: { gte: da }, status: { not: 'ANNULLATA' } } },
      ],
    },
    include: {
      event: {
        select: {
          id: true,
          titolo: true,
          inizio: true,
          costoOspiti: true,
          costoOspitiPer: true,
        },
      },
      versamenti: { orderBy: { segnalatoIl: 'desc' } },
    },
    orderBy: { event: { inizio: 'desc' } },
    take: 30,
  });
  if (ospiti.length === 0) return null;

  const righe = ospiti.map((o) => {
    const dovuto =
      o.event.costoOspiti && Number(o.event.costoOspiti) > 0
        ? dovutoAllOrganizzatore(
            { importo: Number(o.event.costoOspiti), per: o.event.costoOspitiPer ?? 'OPERATORE' },
            o.operatori ?? 0,
          )
        : 0;
    return { o, conto: contoFraSquadre(dovuto, o.versamenti) };
  });
  const daConfermare = ospiti.reduce(
    (t, o) => t + o.versamenti.filter((v) => !v.confermatoIl).length,
    0,
  );
  const scoperto = righe.reduce((t, r) => t + r.conto.scoperto, 0);

  return (
    <div className="card mb-6" id="squadre-ospiti">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="titolo-sezione">Squadre ospiti</p>
        <p className="flex flex-wrap gap-3 text-xs">
          {daConfermare > 0 && (
            <span className="text-warn">
              {daConfermare} {daConfermare === 1 ? 'pagamento' : 'pagamenti'} da confermare
            </span>
          )}
          {scoperto > 0 ? (
            <span className="text-danger">{fmtEuro(scoperto)} ancora scoperti</span>
          ) : (
            daConfermare === 0 && <span className="text-muted">Tutto pagato e confermato</span>
          )}
        </p>
      </div>
      <ul className="divide-y divide-line">
        {righe.map(({ o, conto }) => (
          <li key={o.id} className="space-y-1.5 py-3">
            <p className="text-sm font-medium">
              {o.nome}{' '}
              <Link href={`/calendario/${o.event.id}`} className="text-muted hover:text-nvg">
                · {o.event.titolo} · {fmtDate(o.event.inizio)}
              </Link>
              <span className="text-xs font-normal text-muted">
                {' '}
                · {o.operatori ?? 0} presenti
              </span>
            </p>
            <ContoFraSquadre conto={conto} />
            {o.versamenti.length > 0 && (
              <ul className="space-y-1 border-l border-line pl-3">
                {o.versamenti.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-3">
                    <span className="num text-sm font-semibold">{fmtEuro(Number(v.importo))}</span>
                    <span className="min-w-0 flex-1 text-xs text-muted">
                      segnalato il {fmtDateTime(v.segnalatoIl)}
                      {v.metodo ? ` · ${v.metodo}` : ''}
                      {v.note ? ` · «${v.note}»` : ''}
                      {v.confermatoIl ? ` · confermato il ${fmtDateTime(v.confermatoIl)}` : ''}
                    </span>
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
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
