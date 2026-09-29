import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fmtDate, fmtDateTime, fmtEuro } from '@/lib/format';
import {
  contaPresenti,
  contoFraSquadre,
  datiOrigine,
  dovutoAllOrganizzatore,
  organizzatoreDi,
} from '@/lib/eventi-condivisi';
import { ContoFraSquadre } from './ContoFraSquadre';

/**
 * Quello che dobbiamo alle squadre che ci hanno invitato a un'attività a
 * pagamento: attività per attività, il dovuto sui nostri presenti, quanto
 * hanno già confermato, quanto aspetta la loro conferma e quanto è scoperto.
 * Si paga dalla scheda dell'attività; confermato, è un'uscita del registro.
 */
export async function PagamentiAdAltreSquadre() {
  const da = new Date(Date.now() - 90 * 86_400_000);
  const eventi = await prisma.event.findMany({
    where: {
      origineCollegamentoId: { not: null },
      status: { notIn: ['INVITATA', 'ANNULLATA'] },
      OR: [{ inizio: { gte: da } }, { versamentiOrganizzatore: { some: {} } }],
    },
    orderBy: { inizio: 'desc' },
    take: 40,
    include: {
      rsvps: { select: { status: true, presente: true } },
      versamentiOrganizzatore: { orderBy: { segnalatoIl: 'desc' } },
      origineCollegamento: {
        select: { profilo: true, squadra: { select: { id: true, nome: true, logoPath: true } } },
      },
    },
  });
  const righe = eventi.flatMap((e) => {
    const { costo } = datiOrigine(e.origineDati);
    if (!costo && e.versamentiOrganizzatore.length === 0) return [];
    const dovuto = costo ? dovutoAllOrganizzatore(costo, contaPresenti(e.rsvps).presenti) : 0;
    return [
      {
        e,
        organizzatore: organizzatoreDi(e.origineCollegamento)?.nome ?? 'Organizzatore',
        conto: contoFraSquadre(dovuto, e.versamentiOrganizzatore),
      },
    ];
  });
  if (righe.length === 0) return null;
  const scoperto = righe.reduce((t, r) => t + r.conto.scoperto, 0);
  const inAttesa = righe.reduce((t, r) => t + r.conto.inAttesa, 0);

  return (
    <div className="card mb-6" id="altre-squadre">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="titolo-sezione">Da pagare ad altre squadre</p>
        <p className="flex flex-wrap gap-3 text-xs">
          {inAttesa > 0 && (
            <span className="text-warn">{fmtEuro(inAttesa)} in attesa della loro conferma</span>
          )}
          {scoperto > 0 ? (
            <span className="text-danger">{fmtEuro(scoperto)} ancora da pagare</span>
          ) : (
            inAttesa === 0 && <span className="text-muted">Tutto pagato</span>
          )}
        </p>
      </div>
      <ul className="divide-y divide-line">
        {righe.map(({ e, organizzatore, conto }) => (
          <li key={e.id} className="space-y-1.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {organizzatore}{' '}
                <Link href={`/calendario/${e.id}`} className="text-muted hover:text-nvg">
                  · {e.titolo} · {fmtDate(e.inizio)}
                </Link>
              </p>
              {conto.scoperto > 0 && (
                <Link href={`/calendario/${e.id}`} className="btn-primary btn-sm">
                  Paga {fmtEuro(conto.scoperto)}
                </Link>
              )}
            </div>
            <ContoFraSquadre conto={conto} />
            {e.versamentiOrganizzatore.length > 0 && (
              <ul className="space-y-0.5 border-l border-line pl-3 text-xs">
                {e.versamentiOrganizzatore.map((v) => (
                  <li key={v.id} className="flex flex-wrap gap-x-2">
                    <span className="num font-semibold">{fmtEuro(Number(v.importo))}</span>
                    <span className="text-muted">
                      segnalato il {fmtDateTime(v.segnalatoIl)}
                      {v.metodo ? ` · ${v.metodo}` : ''}
                    </span>
                    {v.confermatoIl ? (
                      <span className="text-nvg">
                        confermato il {fmtDateTime(v.confermatoIl)}
                        {v.movimentoCassaId ? ' · uscita nel registro' : ''}
                      </span>
                    ) : (
                      <span className="text-warn">da confermare da {organizzatore}</span>
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
