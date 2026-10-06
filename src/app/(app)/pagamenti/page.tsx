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
import { cediCredito, chiediRimborso, trasformaInCredito } from '@/actions/pagamenti';
import { SceltaPagamento } from '@/components/SceltaPagamento';
import { AzioneBottone } from '@/components/AzioneBottone';
import { daSaldare } from '@/lib/da-saldare';
import { MetodiPagamento, type MetodoDaMostrare } from '@/components/MetodiPagamento';
import { AllegatoMetodo } from '@/components/AllegatoMetodo';
import { primoIban, primoLink } from '@/lib/link';
import { SceltaCassa } from '@/components/SceltaCassa';
import { annullaVersamentoCredito, segnalaVersamentoCredito } from '@/actions/versamenti-credito';

export default async function MieiPagamentiPage() {
  const me = await requireUser();

  const [pagamenti, metodi, movimentiCredito, versamentiInAttesa, casse] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: me.id },
      orderBy: [{ status: 'asc' }, { scadenza: 'asc' }],
      include: {
        metodo: { select: { nome: true } },
        cassa: { select: { nome: true } },
        event: {
          select: {
            id: true,
            titolo: true,
            inizio: true,
            status: true,
            // la mia risposta: dice se la quota mi serve ancora
            rsvps: { where: { userId: me.id }, select: { status: true } },
          },
        },
        rimborso: { select: { id: true, status: true } },
        crediti: { select: { importo: true } },
      },
    }),
    prisma.metodoPagamento.findMany({
      // di tutte le casse: a ogni quota si mostrano solo quelli della sua
      where: { attivo: true, selfService: true },
      orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        descrizione: true,
        istruzioni: true,
        cassaId: true,
        allegatoObbligatorio: true,
        titoloAllegato: true,
      },
    }),
    prisma.movimentoCredito.findMany({
      where: { userId: me.id },
      orderBy: { data: 'desc' },
      include: { cassa: { select: { nome: true } } },
    }),
    // i versamenti a credito segnalati e non ancora confermati
    prisma.versamentoCredito.findMany({
      where: { userId: me.id, confermatoIl: null },
      orderBy: { createdAt: 'desc' },
      include: { cassa: { select: { nome: true } }, metodo: { select: { nome: true } } },
    }),
    prisma.cassa.findMany({ select: { id: true, nome: true } }),
  ]);

  // Dove si può versare a credito: le casse con almeno un metodo usabile da
  // soli, il club per primo. Ognuna col suo modulo e i suoi metodi.
  const nomeCassa = (id: string | null) => (id ? (casse.find((c) => c.id === id)?.nome ?? 'Cassa') : 'Il club');
  const casseVersamento = [...new Set(metodi.map((m) => m.cassaId))]
    .filter((id) => id === null || casse.some((c) => c.id === id))
    .sort((a, b) => (a === null ? -1 : b === null ? 1 : nomeCassa(a).localeCompare(nomeCassa(b), 'it')))
    .map((cassaId) => ({ cassaId, nome: nomeCassa(cassaId), metodi: metodi.filter((m) => m.cassaId === cassaId) }));

  // il credito, cassa per cassa: soldi versati e non ancora usati
  const perCassa = new Map<string, { cassaId: string | null; nome: string; credito: number }>();
  for (const m of movimentiCredito) {
    const chiave = m.cassaId ?? 'club';
    const voce = perCassa.get(chiave) ?? {
      cassaId: m.cassaId,
      nome: m.cassa?.nome ?? 'il club',
      credito: 0,
    };
    voce.credito += Number(m.importo);
    perCassa.set(chiave, voce);
  }
  const crediti = [...perCassa.values()].filter((c) => c.credito > 0.001);
  const credito = crediti.reduce((t, c) => t + c.credito, 0);
  // a chi si può passare il proprio credito: Pippo non viene e lo lascia a Pluto
  const altri =
    crediti.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { not: me.id }, stato: { notIn: ['DISABILITATO', 'RIFIUTATO'] } },
          orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
          select: { id: true, nome: true, cognome: true, callsign: true },
        });
  /** Il credito disponibile nella cassa di una quota. */
  const creditoPer = (p: (typeof pagamenti)[number]) =>
    Math.max(0, perCassa.get(p.cassaId ?? 'club')?.credito ?? 0);
  /** La quota non serve più: attività annullata, o non ci vado. */
  const nonServe = (p: (typeof pagamenti)[number]) =>
    !!p.event && (p.event.status === 'ANNULLATA' || p.event.rsvps[0]?.status !== 'PRESENTE');
  /** Quanto di una quota l'ha pagato il credito. */
  const dalCredito = (p: (typeof pagamenti)[number]) =>
    -p.crediti.reduce((t, c) => t + Number(c.importo), 0);

  const aperti = pagamenti.filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE');
  const conto = daSaldare(pagamenti);
  // quello che è entrato sulle quote più il credito che aspetta di essere usato
  const versato = pagamenti.reduce((t, p) => t + Number(p.pagato), 0) + credito;

  return (
    <>
      <Intestazione
        titolo="I miei pagamenti"
        sottotitolo="Quote associative, tessere e attività a pagamento"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Statistica
          etichetta="Da saldare"
          valore={fmtEuro(conto.importo)}
          dettaglio={
            conto.inVerifica > 0
              ? `${fmtEuro(conto.inVerifica)} in verifica`
              : `${conto.voci} ${conto.voci === 1 ? 'voce aperta' : 'voci aperte'}`
          }
          tono={conto.importo > 0 ? 'warn' : conto.inVerifica > 0 ? 'info' : 'ok'}
        />
        <Statistica etichetta="Totale versato" valore={fmtEuro(versato)} tono="ok" />
        <Statistica
          etichetta="Credito"
          valore={fmtEuro(credito)}
          dettaglio={
            versamentiInAttesa.length > 0
              ? `${fmtEuro(versamentiInAttesa.reduce((t, v) => t + Number(v.importo), 0))} in verifica`
              : credito > 0
                ? 'lo usi quando paghi una quota'
                : 'niente da spendere'
          }
          tono={credito > 0 ? 'ok' : versamentiInAttesa.length > 0 ? 'info' : 'neutro'}
          href="#credito"
        />
      </div>

      {/* Il credito detto in chiaro: di chi è, dove sta, e cosa ci è successo.
          Chi ha dato 30 € alla segreteria vuole ritrovarli qui, e vedere quali
          quote hanno pagato. */}
      {/* Il credito detto in chiaro: di chi è, dove sta, e cosa ci è successo.
          Chi ha dato 30 € alla segreteria vuole ritrovarli qui, e vedere quali
          quote hanno pagato. E da qui si versa: come una quota, con i metodi
          della cassa scelta, e diventa credito quando chi la tiene conferma. */}
      <div id="credito" className="card mb-6 scroll-mt-24">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <p className="titolo-sezione">Il tuo credito</p>
          {casseVersamento.length > 0 && (
            <BottoneModale
              etichetta="Versa a credito"
              icona="incassa"
              titolo="Versa a credito"
              className="btn-primary btn-sm"
            >
              <div className="space-y-4 text-left">
                <p className="text-sm text-muted">
                  Paghi in anticipo in una cassa: i soldi restano tuoi come credito e li usi quando
                  paghi le prossime quote di quella cassa. Diventano credito quando chi la tiene
                  ha verificato che sono arrivati.
                </p>
                <SceltaCassa
                  casse={casseVersamento.map((c) => {
                    const campo = `credito-metodo-${c.cassaId ?? 'club'}`;
                    return {
                      id: c.cassaId ?? '',
                      nome: c.nome,
                      contenuto: (
                        <div className="space-y-5">
                          <div>
                            <p className="titolo-sezione">Come pagare</p>
                            <p className="mb-2 mt-0.5 text-[11px] text-muted">
                              Tocca il metodo con cui paghi: lo trovi già scelto qui sotto.
                            </p>
                            <MetodiPagamento
                              metodi={c.metodi.map((m) => ({
                                id: m.id,
                                nome: m.nome,
                                descrizione: m.descrizione,
                                istruzioni: m.istruzioni,
                                link: primoLink(m.istruzioni),
                                iban: primoIban(m.istruzioni),
                              }))}
                              campoMetodo={campo}
                            />
                          </div>
                          <FormAzione
                            azione={segnalaVersamentoCredito}
                            className="space-y-4 border-t border-line pt-4"
                          >
                            <input type="hidden" name="cassaId" value={c.cassaId ?? ''} />
                            <p className="titolo-sezione">Hai versato? Segnalalo</p>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <Campo label="Quanto *">
                                <input
                                  type="number"
                                  name="importo"
                                  min="1"
                                  step="0.01"
                                  required
                                  inputMode="decimal"
                                  className="input"
                                  placeholder="€"
                                />
                              </Campo>
                              <Campo label="Con quale metodo *">
                                <select id={campo} name="metodoId" required className="input" defaultValue="">
                                  <option value="">— seleziona —</option>
                                  {c.metodi.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.nome}
                                    </option>
                                  ))}
                                </select>
                              </Campo>
                              <Campo label="Quando">
                                <input
                                  type="date"
                                  name="quando"
                                  defaultValue={inputDate(new Date())}
                                  className="input"
                                />
                              </Campo>
                              <Campo label="Note">
                                <input name="note" maxLength={200} className="input" />
                              </Campo>
                            </div>
                            <AllegatoMetodo
                              campoMetodo={campo}
                              metodi={c.metodi.map((m) => ({
                                id: m.id,
                                obbligatorio: m.allegatoObbligatorio,
                                titolo: m.titoloAllegato,
                              }))}
                            />
                            <Invia icona="incassa">Segnala il versamento</Invia>
                          </FormAzione>
                        </div>
                      ),
                    };
                  })}
                />
              </div>
            </BottoneModale>
          )}
        </div>
          {crediti.length > 0 ? (
            <>
            <p className="text-sm">
              {crediti.map((c, i) => (
                <span key={c.nome}>
                  {i > 0 && ' · '}
                  <strong className="num text-nvg">{fmtEuro(c.credito)}</strong>{' '}
                  <span className="text-muted">presso {c.nome}</span>
                </span>
              ))}
              <span className="block text-xs text-muted">
                Quando paghi una quota di quella cassa te lo proponiamo per primo: basta un tocco.
              </span>
            </p>
              <div className="mt-2">
                <BottoneModale
                  etichetta="Passalo a un altro"
                  icona="invita"
                  titolo="Passa il tuo credito"
                  className="btn-ghost btn-sm"
                >
                  <FormAzione azione={cediCredito}>
                    <p className="text-sm text-muted">
                      Il credito passa a un’altra persona, nella stessa cassa: lo userà lei per le
                      sue quote. Riceve un avviso.
                    </p>
                    <SceltaCassa
                      etichetta="Da quale cassa"
                      casse={crediti.map((c) => ({
                        id: c.cassaId ?? '',
                        nome: `${c.nome} · ${fmtEuro(c.credito)}`,
                        contenuto: (
                          <div className="space-y-4">
                            <input type="hidden" name="cassaId" value={c.cassaId ?? ''} />
                            <Campo label="Quanto (€)">
                              <input
                                name="importo"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={c.credito}
                                defaultValue={Math.round(c.credito * 100) / 100}
                                className="input"
                              />
                            </Campo>
                          </div>
                        ),
                      }))}
                    />
                    <Campo label="A chi *">
                      <select name="aUserId" required className="input" defaultValue="">
                        <option value="">— seleziona —</option>
                        {altri.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.cognome} {p.nome}
                            {p.callsign ? ` · ${p.callsign}` : ''}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Invia icona="invita">Passa il credito</Invia>
                  </FormAzione>
                </BottoneModale>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">
              {movimentiCredito.length > 0
                ? 'Il credito che avevi versato è stato tutto usato.'
                : 'Non hai credito. Puoi versare in anticipo in una cassa: i soldi restano tuoi e pagano le prossime quote.'}
            </p>
          )}
          {versamentiInAttesa.length > 0 && (
            <ul className="mt-3 space-y-2">
              {versamentiInAttesa.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-info/40 bg-info/10 px-3 py-2 text-sm"
                >
                  <span className="num font-semibold text-ink">{fmtEuro(Number(v.importo))}</span>
                  <span className="min-w-0 flex-1 text-xs text-muted">
                    con {v.metodo.nome} il {fmtDate(v.quando)} · {v.cassa?.nome ?? 'il club'} ·{' '}
                    <span className="text-info">in attesa di conferma</span>
                    {v.allegatoPath && (
                      <>
                        {' · '}
                        <a
                          href={`/api/credito/versamenti/${v.id}/allegato`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-nvg hover:underline"
                        >
                          {v.allegatoTitolo ?? 'allegato'}
                        </a>
                      </>
                    )}
                  </span>
                  <AzioneBottone
                    azione={annullaVersamentoCredito}
                    valori={{ id: v.id }}
                    icona="annulla"
                    className="btn-ghost btn-sm"
                    conferma="Ritirare la segnalazione di questo versamento?"
                  >
                    Ritira
                  </AzioneBottone>
                </li>
              ))}
            </ul>
          )}
          {movimentiCredito.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line text-sm">
            {movimentiCredito.slice(0, 12).map((m) => (
              <li key={m.id} className="flex items-baseline gap-3 py-1.5">
                <span className="num w-20 shrink-0 text-xs text-muted">{fmtDate(m.data)}</span>
                <span className="min-w-0 flex-1 break-words">
                  {m.tipo === 'VERSAMENTO'
                    ? 'Versamento'
                    : m.tipo === 'DA_QUOTA'
                      ? `Tenuto come credito da «${m.descrizione}»`
                    : m.tipo === 'USO'
                      ? `Usato per «${m.descrizione}»`
                      : m.tipo === 'RIPRESO'
                        ? `Tornato da «${m.descrizione}»`
                        : m.tipo === 'CEDUTO'
                          ? m.descrizione
                          : 'Restituito'}
                  {m.cassa && <span className="text-xs text-muted"> · {m.cassa.nome}</span>}
                </span>
                <span
                  className={`num shrink-0 ${Number(m.importo) >= 0 ? 'text-nvg' : 'text-muted'}`}
                >
                  {Number(m.importo) >= 0 ? '+' : '−'}
                  {fmtEuro(Math.abs(Number(m.importo)))}
                </span>
              </li>
            ))}
          </ul>
          )}
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
                  <h3 className="mt-1 break-words font-medium">{p.descrizione}</h3>
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
                  {dalCredito(p) > 0.001 && (
                    <p className="text-xs text-nvg num">
                      {fmtEuro(dalCredito(p))} pagati col tuo credito
                    </p>
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
                  credito={creditoPer(p)}
                  nonServe={nonServe(p)}
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
                      {dalCredito(p) > 0.001 && (
                        <span className="block text-[11px] text-nvg">
                          {fmtEuro(dalCredito(p))} dal credito
                        </span>
                      )}
                    </td>
                    <td>
                      <StatoQuota pagamento={p} />
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <Dichiara
                  pagamento={p}
                  metodi={metodi.filter((m) => m.cassaId === p.cassaId)}
                  cassa={p.cassa?.nome ?? null}
                  credito={creditoPer(p)}
                  nonServe={nonServe(p)}
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
  if ((pagamento.status === 'DA_PAGARE' || pagamento.status === 'PARZIALE') && pagamento.dichiaratoIl) {
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
  credito,
  nonServe,
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
    allegatoPath?: string | null;
    allegatoTitolo?: string | null;
    rimborso: { id: string; status: string } | null;
    /** I movimenti del credito legati a questa quota: dicono quanto ne ha pagato. */
    crediti?: { importo: unknown }[];
  };
  metodi: {
    id: string;
    nome: string;
    descrizione: string | null;
    istruzioni: string | null;
    allegatoObbligatorio: boolean;
    titoloAllegato: string | null;
  }[];
  /** A chi va pagata, se non al club: il nome della sua cassa. */
  cassa?: string | null;
  /** Il credito disponibile nella cassa di questa quota. */
  credito: number;
  /** La quota non serve più (attività annullata, o non ci va): si può tenere come credito. */
  nonServe: boolean;
}) {
  // quota già versata: se non serve più si tiene come credito, oppure si
  // chiede indietro la parte pagata in contanti
  if (
    pagamento.status === 'PAGATO' &&
    pagamento.tipo !== 'RIMBORSO' &&
    Number(pagamento.pagato) > 0
  ) {
    const dalCredito = -(pagamento.crediti ?? []).reduce((t, c) => t + Number(c.importo), 0);
    const inContanti = Number(pagamento.pagato) - dalCredito > 0.001;
    const rimborsoAperto = pagamento.rimborso && pagamento.rimborso.status !== 'PAGATO';
    return (
      <span className="flex flex-wrap items-center justify-end gap-2">
        {!inContanti && <span className="text-xs text-nvg">pagata col credito</span>}
        {pagamento.rimborso && (
          <span className="text-xs text-warn">
            {pagamento.rimborso.status === 'PAGATO' ? 'rimborsato' : 'rimborso richiesto'}
          </span>
        )}
        {nonServe && (!pagamento.rimborso || rimborsoAperto) && (
          <AzioneBottone
            azione={trasformaInCredito}
            valori={{ id: pagamento.id }}
            icona="freccia"
            conferma={
              rimborsoAperto
                ? 'Tenere i soldi come credito invece del rimborso? Li spendi alla prossima quota.'
                : 'Tenere i soldi di questa quota come credito? Li spendi alla prossima quota.'
            }
            className="btn-ghost btn-sm"
          >
            Credito
          </AzioneBottone>
        )}
        {inContanti && !pagamento.rimborso && (
          <AzioneBottone
            azione={chiediRimborso}
            valori={{ id: pagamento.id }}
            icona="riapri"
            conferma="Chiedere il rimborso di questa quota?"
            className="btn-ghost btn-sm"
          >
            Chiedi rimborso
          </AzioneBottone>
        )}
      </span>
    );
  }

  if (pagamento.status === 'NON_GESTITO') {
    return <span className="text-xs text-muted">si paga fuori dal gestionale</span>;
  }
  if (pagamento.status === 'PAGATO' || pagamento.status === 'ANNULLATO') {
    return <span className="text-xs text-muted">—</span>;
  }
  if (pagamento.tipo === 'RIMBORSO') {
    return <span className="text-xs text-warn">in attesa di erogazione</span>;
  }
  if (metodi.length === 0 && credito <= 0) {
    return <span className="text-xs text-muted">Salda con {cassa ?? 'la segreteria'}</span>;
  }

  // I metodi con quello che serve per usarli: il link diventa «Paga con …»,
  // l'IBAN «Copia IBAN». Si pescano qui, sul server, e al browser arrivano già
  // pronti.
  const comePagare: MetodoDaMostrare[] = metodi.map((m) => ({
    id: m.id,
    nome: m.nome,
    descrizione: m.descrizione,
    istruzioni: m.istruzioni,
    link: primoLink(m.istruzioni),
    iban: primoIban(m.istruzioni),
  }));
  const giaSegnalato = !!pagamento.dichiaratoIl;

  // i metodi di sempre e la segnalazione: da soli, o come alternativa al credito
  const AltriMetodi = () => (
    <>
        {!giaSegnalato && (
        <div>
          <p className="titolo-sezione">Come pagare</p>
          <p className="mb-2 mt-0.5 text-[11px] text-muted">
            Tocca il metodo con cui paghi: lo trovi già scelto qui sotto.
          </p>
          <MetodiPagamento metodi={comePagare} campoMetodo={`metodo-${pagamento.id}`} />
        </div>
      )}

      <FormAzione azione={dichiaraPagamento} className="space-y-4 border-t border-line pt-4">
        <input type="hidden" name="id" value={pagamento.id} />
        <p className="titolo-sezione">{giaSegnalato ? 'La tua segnalazione' : 'Hai pagato? Segnalalo'}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Con quale metodo *">
            <select
              id={`metodo-${pagamento.id}`}
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

          <Campo label="Quando">
            <input
              type="date"
              name="quando"
              defaultValue={inputDate(pagamento.dichiaratoIl ?? new Date())}
              className="input"
            />
          </Campo>
        </div>

        {/* la ricevuta, quando il metodo scelto la chiede */}
        <AllegatoMetodo
          campoMetodo={`metodo-${pagamento.id}`}
          metodi={metodi.map((m) => ({
            id: m.id,
            obbligatorio: m.allegatoObbligatorio,
            titolo: m.titoloAllegato,
          }))}
          esistente={
            pagamento.allegatoPath
              ? {
                  titolo: pagamento.allegatoTitolo ?? 'Allegato',
                  url: `/api/pagamenti/${pagamento.id}/allegato`,
                }
              : null
          }
        />

        <Invia icona="incassa">Segnala il pagamento</Invia>
        <p className="text-xs text-muted">
          La quota risulterà saldata quando{' '}
          {cassa ? `chi gestisce «${cassa}»` : 'la segreteria'} avrà verificato l’incasso.
        </p>
      </FormAzione>
    </>
  );

  /*
   * Un pulsante solo, «Paga», che apre tutto quello che serve a chi paga:
   * prima come si paga, un metodo per scheda, e sotto il modulo per dire che
   * lo si è fatto. Prima il pulsante diceva «Ho pagato», e chi doveva ancora
   * pagare — cioè quasi tutti quelli che lo guardavano — non aveva motivo di
   * premerlo per scoprire come si fa.
   */
  return (
    <BottoneModale
      etichetta={giaSegnalato ? 'Correggi la segnalazione' : 'Paga'}
      icona="incassa"
      titolo={`${giaSegnalato ? 'Correggi la segnalazione' : 'Paga'} · ${pagamento.descrizione}`}
      className={giaSegnalato ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
    >
      {/* allineata a sinistra di suo: sul computer il pulsante sta in una
          cella di tabella allineata a destra, e la finestra se la portava
          dietro — nomi, istruzioni e importo finivano tutti sul bordo destro */}
      <div className="space-y-5 text-left">
        <div>
          <p className="titolo-sezione">Da pagare</p>
          <p className="num mt-1 text-2xl font-semibold text-ink">
            {fmtEuro(Number(pagamento.importo) - Number(pagamento.pagato))}
          </p>
          {Number(pagamento.pagato) > 0 && (
            <p className="text-xs text-muted">
              su {fmtEuro(Number(pagamento.importo))}: {fmtEuro(Number(pagamento.pagato))} già versati
            </p>
          )}
        </div>

        {credito > 0 && !giaSegnalato ? (
          <SceltaPagamento
            paymentId={pagamento.id}
            credito={credito}
            daPagare={Number(pagamento.importo) - Number(pagamento.pagato)}
          >
            {metodi.length > 0 ? (
              <AltriMetodi />
            ) : (
              <p className="text-sm text-muted">Il resto si salda con {cassa ?? 'la segreteria'}.</p>
            )}
          </SceltaPagamento>
        ) : (
          <AltriMetodi />
        )}
      </div>
    </BottoneModale>
  );
}
