import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { puoAmministrare } from '@/lib/domain';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { Badge, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { elencoAssicurazioni } from '@/lib/elenco-assicurazioni';
import { infoPolizza } from '@/lib/info-polizza';
import { BottoneModale } from '@/components/Modale';
import { Markdown } from '@/components/Markdown';

export const dynamic = 'force-dynamic';

/**
 * Tutte le assicurazioni giornaliere emesse: chi è coperto, per quale
 * attività e quale giorno, i numeri di polizza, e chi le ha stipulate e
 * quando. Le polizze da fare stanno in «Polizze giornaliere»; qui quelle fatte.
 */
export default async function AssicurazioniPage() {
  await requirePermesso(puoAmministrare);
  const [tutte, info] = await Promise.all([elencoAssicurazioni({}, true, 500), infoPolizza()]);
  const valide = tutte.filter((a) => a.valida).length;
  return (
    <>
      <Intestazione
        titolo="Assicurazioni"
        sottotitolo="Le polizze giornaliere emesse: chi è coperto, chi le ha stipulate e quando"
        azioni={
          <div className="flex flex-wrap gap-2">
            <BottoneModale
              etichetta="Cosa copre"
              icona="scudo"
              titolo="Cosa copre la polizza"
              className="btn-ghost btn-sm"
            >
              <div className="text-left">
                <Markdown testo={info} />
              </div>
            </BottoneModale>
            <Link href="/admin/polizze" className="btn-ghost btn-sm">
              Polizze da fare
            </Link>
          </div>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Statistica etichetta="Valide adesso" valore={valide} tono={valide > 0 ? 'ok' : 'neutro'} />
        <Statistica etichetta="Emesse" valore={tutte.length} dettaglio="le ultime 500" />
      </div>
      {tutte.length === 0 ? (
        <Vuoto testo="Nessuna assicurazione emessa finora." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="tabella min-w-[46rem]">
            <thead>
              <tr>
                <th>Assicurato</th>
                <th>Attività · giorno</th>
                <th>Polizza</th>
                <th>Stipulata da</th>
                <th>Quando</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tutte.map((a) => (
                <tr key={a.id}>
                  <td>
                    <p className="font-medium">
                      {a.assicurato.nome} {a.assicurato.cognome}
                    </p>
                    {a.assicurato.callsign && (
                      <p className="text-xs text-muted">{a.assicurato.callsign}</p>
                    )}
                  </td>
                  <td>
                    {a.event ? (
                      <Link href={`/calendario/${a.event.id}`} className="hover:text-nvg">
                        {a.event.titolo}
                      </Link>
                    ) : (
                      '—'
                    )}
                    <p className="text-xs text-muted">{fmtDate(a.giorno)}</p>
                  </td>
                  <td className="num text-xs">
                    {a.codice ?? '—'}
                    {a.polizzaInfortuni && <p className="text-muted">infortuni {a.polizzaInfortuni}</p>}
                  </td>
                  <td className="text-sm">{a.stipulataDa ?? 'in automatico'}</td>
                  <td className="num text-xs text-muted">
                    {a.emessaIl ? fmtDateTime(a.emessaIl) : a.richiestaIl ? fmtDateTime(a.richiestaIl) : '—'}
                  </td>
                  <td>
                    <Badge tono={a.valida ? 'ok' : 'neutro'}>{a.valida ? 'valida' : 'scaduta'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
