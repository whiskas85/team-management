import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elencoOperatori } from '@/lib/query';
import { puoGestirePagamenti, tonoPagamento } from '@/lib/domain';
import { fmtDate, fmtEuro, inputDate, nomeCompleto, umanizza } from '@/lib/format';
import { Badge, Campo, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { Conferma, Fisarmonica, FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import {
  eliminaPagamento,
  salvaPagamento,
  segnaNonGestito,
  segnaPagato,
  tornaDaGestire,
} from '@/actions/pagamenti';
import { AzioneBottone } from '@/components/AzioneBottone';
import { raggruppaPerAttivita, TitoloGruppo } from '@/components/GruppiAttivita';

const FILTRI = {
  dagestire: 'Da gestire',
  aperti: 'Da incassare',
  scaduti: 'Scaduti',
  rimborsi: 'Rimborsi',
  pagati: 'Incassati',
  fuori: 'Gestiti fuori',
  tutti: 'Tutti',
} as const;

type Filtro = keyof typeof FILTRI;

/**
 * Ciò che aspetta una mossa della segreteria: incassi che l'operatore dice di
 * aver versato e rimborsi ancora da restituire. È lo stesso insieme contato
 * dal badge nel menu, così cliccandolo si arriva esattamente su queste righe.
 */
const DA_GESTIRE: Prisma.PaymentWhereInput = {
  // solo il club: quelli delle altre casse li gestisce chi ne è responsabile
  cassaId: null,
  OR: [
    { status: { not: 'PAGATO' }, dichiaratoIl: { not: null } },
    { tipo: 'RIMBORSO', status: { notIn: ['PAGATO', 'ANNULLATO'] } },
  ],
};

export default async function AdminPagamentiPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; tipo?: string }>;
}) {
  await requirePermesso(puoGestirePagamenti);
  const sp = await searchParams;

  // senza un filtro scelto si apre su ciò che va gestito, se c'è qualcosa:
  // altrimenti si arriverebbe su un elenco generico in cui cercare a mano
  const inSospeso = await prisma.payment.count({ where: DA_GESTIRE });
  const filtro = (
    Object.keys(FILTRI).includes(sp.filtro ?? '')
      ? sp.filtro
      : inSospeso > 0
        ? 'dagestire'
        : 'aperti'
  ) as Filtro;

  const dove: Prisma.PaymentWhereInput =
    filtro === 'dagestire'
      ? DA_GESTIRE
      : filtro === 'aperti'
        ? { status: { in: ['DA_PAGARE', 'PARZIALE'] }, tipo: { not: 'RIMBORSO' } }
      : filtro === 'scaduti'
        ? {
            status: { in: ['DA_PAGARE', 'PARZIALE'] },
            tipo: { not: 'RIMBORSO' },
            scadenza: { lt: new Date() },
          }
        : filtro === 'rimborsi'
          ? { tipo: 'RIMBORSO' }
          : filtro === 'pagati'
            ? { status: 'PAGATO' }
            : filtro === 'fuori'
              ? { status: 'NON_GESTITO' }
              : {};

  const [pagamenti, tutti, operatori, eventi] = await Promise.all([
    prisma.payment.findMany({
      where: { ...dove, cassaId: null, ...(sp.tipo ? { tipo: sp.tipo as 'ALTRO' } : {}) },
      orderBy: [{ scadenza: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, nome: true, cognome: true, callsign: true } },
        // l'attività fa da titolo al gruppo: nome e data
        event: { select: { id: true, titolo: true, inizio: true } },
        metodo: { select: { nome: true } },
      },
    }),
    prisma.payment.findMany({
      where: { cassaId: null },
      select: {
        importo: true,
        pagato: true,
        status: true,
        tipo: true,
        dichiaratoIl: true,
      },
    }),
    elencoOperatori(false),
    prisma.event.findMany({
      where: { inizio: { gte: new Date(Date.now() - 180 * 86400000) } },
      orderBy: { inizio: 'desc' },
      select: { id: true, titolo: true },
    }),
  ]);

  const metodi = await prisma.metodoPagamento.findMany({
    // solo quelli del club: questa è la sua segreteria
    where: { attivo: true, cassaId: null },
    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true },
  });

  // le altre casse, per registrare una quota che non è del club
  const casse = await prisma.cassa.findMany({
    where: { attiva: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  });

  const aperti = tutti.filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE');
  const daIncassare = aperti.reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);
  const incassato = tutti.reduce((t, p) => t + Number(p.pagato), 0);
  const daConfermare = tutti.filter((p) => p.status !== 'PAGATO' && p.dichiaratoIl).length;
  const rimborsiAperti = tutti.filter(
    (p) => p.tipo === 'RIMBORSO' && p.status !== 'PAGATO' && p.status !== 'ANNULLATO',
  );
  const daRimborsare = rimborsiAperti.reduce(
    (t, p) => t + Number(p.importo) - Number(p.pagato),
    0,
  );

  const perTipo = Object.entries(
    tutti.reduce<Record<string, number>>((acc, p) => {
      acc[p.tipo] = (acc[p.tipo] ?? 0) + Number(p.pagato);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Intestazione
        titolo="Pagamenti"
        sottotitolo="Quote associative, tessere, tornei, gare e allenamenti"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Da incassare"
          valore={fmtEuro(daIncassare)}
          dettaglio={`${aperti.length} voci aperte`}
          tono={daIncassare > 0 ? 'warn' : 'ok'}
        />
        <Statistica etichetta="Incassato" valore={fmtEuro(incassato)} tono="ok" />
        <Statistica etichetta="Movimenti" valore={tutti.length} />
        <Statistica
          etichetta="Voce principale"
          valore={perTipo[0] ? umanizza(perTipo[0][0]) : '—'}
          dettaglio={perTipo[0] ? fmtEuro(perTipo[0][1]) : undefined}
        />
      </div>

      <Fisarmonica titolo="Registra pagamento">
        <FormAzione azione={salvaPagamento}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="Operatore *">
              <select name="userId" required className="input" defaultValue="">
                <option value="">— seleziona —</option>
                {operatori.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.cognome} {g.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Tipo">
              <select name="tipo" className="input" defaultValue="EVENTO">
                <option value="ISCRIZIONE">Iscrizione</option>
                <option value="TESSERA_FIGT">Tessera FIGT</option>
                <option value="TORNEO">Torneo</option>
                <option value="GARA">Gara</option>
                <option value="ALLENAMENTO">Allenamento</option>
                <option value="EVENTO">Evento</option>
                <option value="ALTRO">Altro</option>
              </select>
            </Campo>
            <Campo label="Evento collegato">
              <select name="eventId" className="input" defaultValue="">
                <option value="">— nessuno —</option>
                {eventi.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titolo}
                  </option>
                ))}
              </select>
            </Campo>
            {/* una quota può andare in un'altra cassa: nasce da incassare, e
                la conferma chi la gestisce */}
            {casse.length > 0 && (
              <Campo label="Cassa">
                <select name="cassaId" className="input" defaultValue="">
                  <option value="">del club</option>
                  {casse.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
            <Campo label="Descrizione *" span>
              <input name="descrizione" required className="input" />
            </Campo>
            <Campo label="Importo (€) *">
              <input name="importo" type="number" step="0.01" min="0" required className="input" />
            </Campo>
            <Campo label="Già incassato (€)">
              <input name="pagato" type="number" step="0.01" min="0" className="input" />
            </Campo>
            <Campo label="Metodo">
              <select name="metodoId" className="input" defaultValue="">
                <option value="">— non indicato —</option>
                {metodi.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Scadenza">
              <input type="date" name="scadenza" className="input" />
            </Campo>
            <Campo label="Note" span>
              <input name="note" className="input" />
            </Campo>
          </div>
          <Invia icona="salva">
            Registra
          </Invia>
        </FormAzione>
      </Fisarmonica>

      {daConfermare > 0 && filtro !== 'dagestire' && (
        <div className="mb-5 flex flex-col gap-2 rounded-md border border-sky-400/40 bg-sky-400/10 px-4 py-3 text-sm text-sky-300 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {daConfermare === 1
              ? 'Un operatore ha segnalato un pagamento'
              : `${daConfermare} operatori hanno segnalato un pagamento`}
            : va verificato e confermato.
          </span>
          <Link
            href="/admin/pagamenti?filtro=dagestire"
            className="shrink-0 font-medium underline underline-offset-4"
          >
            Vedi le segnalazioni →
          </Link>
        </div>
      )}

      {rimborsiAperti.length > 0 && filtro !== 'rimborsi' && filtro !== 'dagestire' && (
        <div className="mb-5 flex flex-col gap-2 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn sm:flex-row sm:items-center sm:justify-between">
          <span>
            {rimborsiAperti.length === 1
              ? 'Un rimborso è stato richiesto'
              : `${rimborsiAperti.length} rimborsi sono stati richiesti`}
            : {fmtEuro(daRimborsare)} da restituire.
          </span>
          <Link
            href="/admin/pagamenti?filtro=rimborsi"
            className="shrink-0 font-medium underline underline-offset-4"
          >
            Vedi i rimborsi →
          </Link>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(FILTRI) as Filtro[]).map((f) => (
          <Link
            key={f}
            href={`/admin/pagamenti?filtro=${f}`}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              filtro === f ? 'border-nvg/40 bg-nvg/10 text-nvg' : 'border-line text-muted'
            }`}
          >
            {FILTRI[f]}
            {f === 'dagestire' && inSospeso > 0 && (
              <span className="num ml-1.5 rounded-full bg-warn/25 px-1.5 text-[10px] text-warn">
                {inSospeso}
              </span>
            )}
          </Link>
        ))}
      </div>

      {pagamenti.length === 0 ? (
        <Vuoto testo="Nessun pagamento in questa vista." />
      ) : (
        // divisi per attività: di una giornata si vede subito chi manca
        <div className="space-y-6">
          {raggruppaPerAttivita(pagamenti).map((g) => (
            <section key={g.chiave}>
              <TitoloGruppo gruppo={g} />
        <Elenco
          cards={g.righe.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{nomeCompleto(p.user)}</h3>
                  <p className="truncate text-xs text-muted">{p.descrizione}</p>
                  {/* di cosa è fatta la quota, quando è composta da più voci */}
                  {p.note && <p className="truncate text-[11px] text-muted">{p.note}</p>}
                  <p className="text-xs text-muted">
                    {umanizza(p.tipo)}
                    {p.scadenza && ` · scadenza ${fmtDate(p.scadenza)}`}
                  </p>
                </div>
                {p.status !== 'PAGATO' && p.dichiaratoIl ? (
                  <Badge tono="info">Da confermare</Badge>
                ) : (
                  <Badge tono={tonoPagamento[p.status] ?? 'neutro'}>{umanizza(p.status)}</Badge>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="num text-sm">
                  {fmtEuro(Number(p.pagato))} / {fmtEuro(Number(p.importo))}
                </span>
                <AzioniPagamento pagamento={p} metodi={metodi} />
              </div>
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Giocatore</th>
                  <th>Voce</th>
                  <th>Tipo</th>
                  <th>Scadenza</th>
                  <th>Importo</th>
                  <th>Incassato</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {g.righe.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/admin/operatori/${p.user.id}`}
                        className="font-medium hover:text-nvg"
                      >
                        {p.user.cognome} {p.user.nome}
                      </Link>
                    </td>
                    <td>{p.descrizione}</td>
                    <td className="text-muted">
                      {umanizza(p.tipo)}
                      {p.metodo && <span className="block text-[11px]">{p.metodo.nome}</span>}
                    </td>
                    <td className="whitespace-nowrap text-muted">{fmtDate(p.scadenza)}</td>
                    <td className="whitespace-nowrap num">{fmtEuro(Number(p.importo))}</td>
                    <td className="whitespace-nowrap num text-muted">
                      {fmtEuro(Number(p.pagato))}
                    </td>
                    <td>
                      {p.status !== 'PAGATO' && p.dichiaratoIl ? (
                        <>
                          <Badge tono="info">Da confermare</Badge>
                          <span className="num mt-0.5 block text-[11px] text-muted">
                            segnalato {fmtDate(p.dichiaratoIl)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Badge tono={tonoPagamento[p.status] ?? 'neutro'}>
                            {umanizza(p.status)}
                          </Badge>
                          {p.pagatoIl && (
                            <span className="num mt-0.5 block text-[11px] text-muted">
                              il {fmtDate(p.pagatoIl)}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <AzioniPagamento pagamento={p} metodi={metodi} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
            </section>
          ))}
        </div>
      )}
    </>
  );
}

type Riga = {
  id: string;
  tipo: string;
  status: string;
  importo: unknown;
  pagato: unknown;
  descrizione: string;
  dichiaratoIl: Date | null;
  metodoId: string | null;
};

/**
 * Incasso e cancellazione. L'incasso apre una finestra dove si conferma
 * importo, data e metodo: se l'operatore ha segnalato il pagamento i campi
 * arrivano già compilati con quello che ha dichiarato.
 */
function AzioniPagamento({
  pagamento,
  metodi,
}: {
  pagamento: Riga;
  metodi: { id: string; nome: string }[];
}) {
  // gestita fuori è chiusa come una pagata: niente «Incassa»
  const saldato = pagamento.status === 'PAGATO' || pagamento.status === 'NON_GESTITO';
  const dovuto = Number(pagamento.importo);
  const rimborso = pagamento.tipo === 'RIMBORSO';

  return (
    <div className="flex items-center gap-2">
      {!saldato && (
        <BottoneModale
          etichetta={rimborso ? 'Eroga' : 'Incassa'}
          icona="incassa"
          titolo={`${rimborso ? 'Eroga il rimborso' : 'Registra l’incasso'} · ${pagamento.descrizione}`}
          className="btn-ghost btn-sm"
        >
          <FormAzione azione={segnaPagato}>
            <input type="hidden" name="id" value={pagamento.id} />

            {pagamento.dichiaratoIl && (
              <p className="rounded-md border border-sky-400/40 bg-sky-400/10 px-3 py-2 text-xs text-sky-300">
                L’operatore ha segnalato il pagamento il {fmtDate(pagamento.dichiaratoIl)}.
                Controlla che sia arrivato e conferma.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Campo label={rimborso ? 'Erogato (€)' : 'Incassato (€)'}>
                <input
                  name="pagato"
                  type="number"
                  step="0.01"
                  min="0"
                  max={dovuto}
                  defaultValue={dovuto}
                  className="input"
                />
              </Campo>

              <Campo label="Data">
                <input
                  type="date"
                  name="pagatoIl"
                  defaultValue={inputDate(pagamento.dichiaratoIl ?? new Date())}
                  className="input"
                />
              </Campo>

              <Campo label="Metodo">
                <select
                  name="metodoId"
                  defaultValue={pagamento.metodoId ?? ''}
                  className="input"
                >
                  <option value="">— non indicato —</option>
                  {metodi.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            <Campo label="Note" span>
              <input name="note" className="input" placeholder="Riferimento, numero ricevuta…" />
            </Campo>

            <Invia icona="incassa">{rimborso ? 'Registra l’erogazione' : 'Registra l’incasso'}</Invia>
            <p className="text-xs text-muted">
              Un importo inferiore al dovuto resta come acconto. A saldo completo il movimento non
              sarà più modificabile.
            </p>
          </FormAzione>
        </BottoneModale>
      )}

      <FuoriGestionale pagamento={pagamento} />

      <FormAzione azione={eliminaPagamento} className="">
        <input type="hidden" name="id" value={pagamento.id} />
        <Conferma
          messaggio="Eliminare questo movimento?"
          className="text-xs text-muted hover:text-danger"
          icona="elimina"
        >
          elimina
        </Conferma>
      </FormAzione>
    </div>
  );
}

/**
 * «Non gestito» e il suo ripensamento. Solo su una quota ancora tutta da
 * pagare: su un acconto già registrato non si mescolano le due cose.
 */
function FuoriGestionale({
  pagamento,
}: {
  pagamento: { id: string; tipo: string; status: string; pagato: unknown };
}) {
  if (pagamento.status === 'NON_GESTITO') {
    return (
      <AzioneBottone
        azione={tornaDaGestire}
        valori={{ id: pagamento.id }}
        className="text-xs text-muted hover:text-nvg"
      >
        torna da gestire
      </AzioneBottone>
    );
  }
  if (
    pagamento.status !== 'DA_PAGARE' ||
    pagamento.tipo === 'RIMBORSO' ||
    Number(pagamento.pagato) > 0
  ) {
    return null;
  }
  return (
    <AzioneBottone
      azione={segnaNonGestito}
      valori={{ id: pagamento.id }}
      conferma="Segnarla come gestita fuori dal gestionale? Conterà come pagata, ma in cassa non entrerà niente."
      className="text-xs text-muted hover:text-nvg"
    >
      non gestito
    </AzioneBottone>
  );
}
