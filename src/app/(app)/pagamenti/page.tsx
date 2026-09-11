import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { tonoPagamento } from '@/lib/domain';
import { fmtDate, fmtEuro, inputDate, umanizza } from '@/lib/format';
import { Badge, Campo, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { dichiaraPagamento } from '@/actions/metodi';
import { chiediRimborso } from '@/actions/pagamenti';
import { AzioneBottone } from '@/components/AzioneBottone';

export default async function MieiPagamentiPage() {
  const me = await requireUser();

  const [pagamenti, metodi] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: me.id },
      orderBy: [{ status: 'asc' }, { scadenza: 'asc' }],
      include: {
        metodo: { select: { nome: true } },
        cassa: { select: { nome: true } },
        event: { select: { id: true, titolo: true, inizio: true } },
        rimborso: { select: { id: true, status: true } },
      },
    }),
    prisma.metodoPagamento.findMany({
      // di tutte le casse: a ogni quota si mostrano solo quelli della sua
      where: { attivo: true, selfService: true },
      orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, istruzioni: true, cassaId: true },
    }),
  ]);

  const aperti = pagamenti.filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE');
  const daSaldare = aperti.reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);
  const versato = pagamenti.reduce((t, p) => t + Number(p.pagato), 0);

  return (
    <>
      <Intestazione
        titolo="I miei pagamenti"
        sottotitolo="Quote associative, tessere e attività a pagamento"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Statistica
          etichetta="Da saldare"
          valore={fmtEuro(daSaldare)}
          dettaglio={`${aperti.length} voci aperte`}
          tono={daSaldare > 0 ? 'warn' : 'ok'}
        />
        <Statistica etichetta="Totale versato" valore={fmtEuro(versato)} tono="ok" />
        <Statistica etichetta="Movimenti" valore={pagamenti.length} />
      </div>

      {aperti.some((p) => p.eventId) && (
        <div className="mb-6 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Le quote legate a un’attività vanno saldate perché la tua presenza sia confermata.
        </div>
      )}

      {pagamenti.length === 0 ? (
        <Vuoto testo="Nessun pagamento registrato a tuo carico." />
      ) : (
        <Elenco
          cards={pagamenti.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
                    {umanizza(p.tipo)}
                  </p>
                  <h3 className="mt-1 truncate font-medium">{p.descrizione}</h3>
                  {/* non tutto si paga al club: il corso si paga a chi lo tiene */}
                  {p.cassa && (
                    <p className="text-xs text-nvg/80">da pagare a {p.cassa.nome}</p>
                  )}
                  {/* una quota sola, composta da più voci: qui c'è lo spaccato */}
                  {p.note && <p className="text-xs text-muted">{p.note}</p>}
                  {p.event && (
                    <Link
                      href={`/calendario/${p.event.id}`}
                      className="text-xs text-muted hover:text-nvg"
                    >
                      Vai all’attività →
                    </Link>
                  )}
                  {p.scadenza && (
                    <p className="text-xs text-muted num">Scadenza {fmtDate(p.scadenza)}</p>
                  )}
                </div>
                <StatoQuota pagamento={p} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <span className="num text-sm">{fmtEuro(Number(p.importo))}</span>
                <Dichiara
                  pagamento={p}
                  metodi={metodi.filter((m) => m.cassaId === p.cassaId)}
                  cassa={p.cassa?.nome ?? null}
                />
              </div>
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Voce</th>
                  <th>Tipo</th>
                  <th>Scadenza</th>
                  <th>Importo</th>
                  <th>Versato</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagamenti.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="font-medium">{p.descrizione}</span>
                      {p.cassa && (
                        <span className="block text-[11px] text-nvg/80">
                          da pagare a {p.cassa.nome}
                        </span>
                      )}
                      {p.note && <span className="block text-[11px] text-muted">{p.note}</span>}
                      {p.event && (
                        <Link
                          href={`/calendario/${p.event.id}`}
                          className="block text-[11px] text-muted hover:text-nvg"
                        >
                          {p.event.titolo}
                        </Link>
                      )}
                    </td>
                    <td className="text-muted">
                      {umanizza(p.tipo)}
                      {p.metodo && <span className="block text-[11px]">{p.metodo.nome}</span>}
                    </td>
                    <td className="whitespace-nowrap text-muted num">{fmtDate(p.scadenza)}</td>
                    <td className="whitespace-nowrap num">{fmtEuro(Number(p.importo))}</td>
                    <td className="whitespace-nowrap text-muted num">
                      {fmtEuro(Number(p.pagato))}
                    </td>
                    <td>
                      <StatoQuota pagamento={p} />
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <Dichiara
                  pagamento={p}
                  metodi={metodi.filter((m) => m.cassaId === p.cassaId)}
                  cassa={p.cassa?.nome ?? null}
                />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      )}
    </>
  );
}

/**
 * Stato della quota dal punto di vista dell'operatore: fra "da pagare" e
 * "pagato" c'è il momento in cui lui ha versato ma la segreteria non ha ancora
 * verificato, e va detto chiaramente invece di lasciarlo sparire.
 */
function StatoQuota({
  pagamento,
}: {
  pagamento: { status: string; dichiaratoIl: Date | null; pagatoIl: Date | null };
}) {
  if (pagamento.status !== 'PAGATO' && pagamento.dichiaratoIl) {
    return (
      <span className="text-right">
        <Badge tono="info">In verifica</Badge>
        <span className="num mt-0.5 block text-[11px] text-muted">
          segnalato il {fmtDate(pagamento.dichiaratoIl)}
        </span>
      </span>
    );
  }

  return (
    <span className="text-right">
      <Badge tono={tonoPagamento[pagamento.status] ?? 'neutro'}>
        {umanizza(pagamento.status)}
      </Badge>
      {pagamento.pagatoIl && (
        <span className="num mt-0.5 block text-[11px] text-muted">
          il {fmtDate(pagamento.pagatoIl)}
        </span>
      )}
    </span>
  );
}

/** L'operatore segnala di aver pagato: la segreteria conferma l'incasso. */
function Dichiara({
  pagamento,
  metodi,
  cassa = null,
}: {
  pagamento: {
    id: string;
    tipo: string;
    status: string;
    importo: unknown;
    pagato: unknown;
    descrizione: string;
    dichiaratoIl: Date | null;
    metodoId: string | null;
    rimborso: { id: string; status: string } | null;
  };
  metodi: { id: string; nome: string; istruzioni: string | null }[];
  /** A chi va pagata, se non al club: il nome della sua cassa. */
  cassa?: string | null;
}) {
  // quota già versata: se serve, da qui si chiede indietro
  if (
    pagamento.status === 'PAGATO' &&
    pagamento.tipo !== 'RIMBORSO' &&
    Number(pagamento.pagato) > 0
  ) {
    if (pagamento.rimborso) {
      return (
        <span className="text-xs text-warn">
          {pagamento.rimborso.status === 'PAGATO' ? 'rimborsato' : 'rimborso richiesto'}
        </span>
      );
    }
    return (
      <AzioneBottone
        azione={chiediRimborso}
        valori={{ id: pagamento.id }}
        icona="riapri"
        conferma="Chiedere il rimborso di questa quota?"
        className="btn-ghost btn-sm"
      >
        Chiedi rimborso
      </AzioneBottone>
    );
  }

  if (pagamento.status === 'PAGATO' || pagamento.status === 'ANNULLATO') {
    return <span className="text-xs text-muted">—</span>;
  }
  if (pagamento.tipo === 'RIMBORSO') {
    return <span className="text-xs text-warn">in attesa di erogazione</span>;
  }
  if (metodi.length === 0) {
    return <span className="text-xs text-muted">Salda con {cassa ?? 'la segreteria'}</span>;
  }

  return (
    <BottoneModale
      etichetta={pagamento.dichiaratoIl ? 'Correggi la segnalazione' : 'Ho pagato'}
      icona="incassa"
      titolo={`Segnala il pagamento · ${pagamento.descrizione}`}
      className="btn-ghost btn-sm"
    >
      <FormAzione azione={dichiaraPagamento}>
        <input type="hidden" name="id" value={pagamento.id} />

        <p className="text-sm text-muted">
          Importo: <span className="text-ink num">{fmtEuro(Number(pagamento.importo))}</span>
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Con quale metodo hai pagato *">
            <select
              name="metodoId"
              required
              className="input"
              defaultValue={pagamento.metodoId ?? ''}
            >
              <option value="">— seleziona —</option>
              {metodi.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Quando hai pagato">
            <input
              type="date"
              name="quando"
              defaultValue={inputDate(pagamento.dichiaratoIl ?? new Date())}
              className="input"
            />
          </Campo>
        </div>

        {metodi.some((m) => m.istruzioni) && (
          <div className="rounded-md border border-line bg-surface2 px-3 py-2 text-xs text-muted">
            {metodi
              .filter((m) => m.istruzioni)
              .map((m) => (
                <p key={m.id}>
                  <span className="text-ink">{m.nome}:</span> {m.istruzioni}
                </p>
              ))}
          </div>
        )}

        <Invia icona="incassa">Segnala il pagamento</Invia>
        <p className="text-xs text-muted">
          La quota risulterà saldata quando{' '}
          {cassa ? `chi gestisce «${cassa}»` : 'la segreteria'} avrà verificato l’incasso.
        </p>
      </FormAzione>
    </BottoneModale>
  );
}
