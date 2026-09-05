import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  etichettaEvento,
  etichettaStato,
  isAdmin,
  tonoEvento,
  tonoFigt,
  tonoIscrizione,
  tonoStato,
} from '@/lib/domain';
import { ETICHETTA_VOCE } from '@/lib/stagioni';
import { fmtDate, fmtDateTime, fmtEuro, nomeCompleto, umanizza } from '@/lib/format';
import { Badge, Dato, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { RosaStorica } from '@/components/RosaStorica';
import { elencoOperatori } from '@/lib/query';
import { chiudiStagione } from '@/actions/stagioni';

/** Vedi la nota gemella nell'elenco: "programmata" vale solo per il futuro. */
function statoStagione(s: { corrente: boolean; chiusa: boolean; fine: Date }, ora: Date) {
  if (s.corrente) return { testo: 'In corso', tono: 'ok' as const };
  if (s.chiusa) return { testo: 'Chiusa', tono: 'neutro' as const };
  if (s.fine < ora) return { testo: 'Da chiudere', tono: 'warn' as const };
  return { testo: 'Programmata', tono: 'info' as const };
}

export default async function SchedaStagionePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermesso(isAdmin);
  const { id } = await params;
  const ora = new Date();

  const [stagione, operatori] = await Promise.all([
    prisma.stagione.findUnique({
      where: { id },
      include: {
        memberships: {
          orderBy: [{ status: 'asc' }, { invitataIl: 'desc' }],
          include: {
            user: { select: { id: true, nome: true, cognome: true, callsign: true, stato: true } },
            payments: { select: { importo: true, pagato: true, status: true, tipo: true } },
          },
        },
        figtCards: {
          orderBy: { codice: 'asc' },
          include: { user: { select: { id: true, nome: true, cognome: true, callsign: true } } },
        },
        eventi: {
          orderBy: { inizio: 'asc' },
          include: {
            tipo: { select: { nome: true } },
            field: { select: { nome: true } },
            _count: { select: { rsvps: { where: { status: 'PRESENTE' } } } },
            payments: { select: { importo: true, pagato: true, status: true, tipo: true } },
          },
        },
        tariffe: { orderBy: { nome: 'asc' } },
      },
    }),
    elencoOperatori(false),
  ]);

  if (!stagione) notFound();

  const stato = statoStagione(stagione, ora);

  // i soldi dell'anno: quote di iscrizione piu' quote delle attivita', al netto
  // dei rimborsi, che sono denaro che torna indietro
  const daIscrizioni = stagione.memberships.flatMap((m) => m.payments);
  const daAttivita = stagione.eventi.flatMap((e) => e.payments);
  const tutti = [...daIscrizioni, ...daAttivita];

  const incassato = tutti
    .filter((p) => p.tipo !== 'RIMBORSO')
    .reduce((t, p) => t + Number(p.pagato), 0);
  const rimborsato = tutti
    .filter((p) => p.tipo === 'RIMBORSO')
    .reduce((t, p) => t + Number(p.pagato), 0);
  const daIncassare = tutti
    .filter((p) => p.tipo !== 'RIMBORSO' && p.status !== 'ANNULLATO')
    .reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);

  const attive = stagione.memberships.filter((m) => m.status === 'ATTIVA').length;
  const inSospeso = stagione.memberships.filter(
    (m) => m.status === 'INVITATA' || m.status === 'COMPILATA',
  ).length;
  const svolte = stagione.eventi.filter((e) => e.inizio < ora).length;

  return (
    <>
      <Link
        href="/admin/stagioni"
        className="mb-4 inline-block text-xs text-muted hover:text-nvg"
      >
        &larr; Stagioni
      </Link>

      <Intestazione
        titolo={`Stagione ${stagione.nome}`}
        sottotitolo={`${fmtDate(stagione.inizio)} - ${fmtDate(stagione.fine)}`}
        azioni={
          <div className="flex flex-wrap gap-2">
            <BottoneModale
              etichetta="Rosa"
              icona="operatori"
              titolo={`Chi c'era nella stagione ${stagione.nome}`}
              className="btn-ghost btn-sm"
              larga
            >
              <RosaStorica
                stagioneId={stagione.id}
                nome={stagione.nome}
                operatori={operatori}
              />
            </BottoneModale>

            {!stagione.corrente && (
              <AzioneBottone
                azione={chiudiStagione}
                valori={{ id: stagione.id }}
                icona={stagione.chiusa ? 'rilascia' : 'concludi'}
                className="btn-ghost btn-sm"
              >
                {stagione.chiusa ? 'Riapri' : 'Chiudi'}
              </AzioneBottone>
            )}
          </div>
        }
      />

      {/* ------------------------------------------------------- riepilogo */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dato etichetta="Stato" valore={<Badge tono={stato.tono}>{stato.testo}</Badge>} />
          <Dato etichetta="Inizio" valore={fmtDate(stagione.inizio)} />
          <Dato etichetta="Fine" valore={fmtDate(stagione.fine)} />
          <Dato
            etichetta="Tariffe proprie"
            valore={stagione.tariffe.length === 0 ? 'nessuna' : String(stagione.tariffe.length)}
          />
        </div>
        {stagione.note && (
          <p className="mt-4 whitespace-pre-wrap border-t border-line pt-4 text-sm text-ink/90">
            {stagione.note}
          </p>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Iscritti"
          valore={attive}
          dettaglio={inSospeso > 0 ? `${inSospeso} ancora in sospeso` : 'tutti definiti'}
          tono="ok"
        />
        <Statistica
          etichetta="Attivit&agrave;"
          valore={stagione.eventi.length}
          dettaglio={`${svolte} già svolte`}
        />
        <Statistica
          etichetta="Incassato"
          valore={fmtEuro(incassato - rimborsato)}
          dettaglio={rimborsato > 0 ? `al netto di ${fmtEuro(rimborsato)} restituiti` : undefined}
          tono="ok"
        />
        <Statistica
          etichetta="Da incassare"
          valore={fmtEuro(daIncassare)}
          tono={daIncassare > 0 ? 'warn' : 'ok'}
        />
      </div>

      {/* ------------------------------------------------------------ rosa */}
      <h2 className="titolo-sezione mb-3">Rosa &middot; {stagione.memberships.length}</h2>

      {stagione.memberships.length === 0 ? (
        <div className="mb-8">
          <Vuoto testo="Nessuno risulta iscritto a questa stagione. Usa “Rosa” per ricostruire lo storico, o invia le richieste di iscrizione." />
        </div>
      ) : (
        <div className="mb-8">
          <Elenco
            cards={stagione.memberships.map((m) => {
              const dovuto = m.quota ? Number(m.quota) : 0;
              const versato = m.payments.reduce((t, p) => t + Number(p.pagato), 0);
              return (
                <div key={m.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/operatori/${m.user.id}`}
                        className="block truncate font-medium hover:text-nvg"
                      >
                        {nomeCompleto(m.user)}
                      </Link>
                      <p className="text-xs text-muted">
                        {umanizza(m.tipo)}
                        {m.dettaglioQuota ? ` · ${m.dettaglioQuota}` : ''}
                      </p>
                    </div>
                    <Badge tono={tonoIscrizione[m.status] ?? 'neutro'}>
                      {umanizza(m.status)}
                    </Badge>
                  </div>
                  {dovuto > 0 && (
                    <p className="num mt-2 border-t border-line pt-2 text-xs">
                      <span className={versato >= dovuto ? 'text-nvg' : 'text-warn'}>
                        {fmtEuro(versato)} / {fmtEuro(dovuto)}
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
            tabella={
              <table className="tabella">
                <thead>
                  <tr>
                    <th>Operatore</th>
                    <th>Tipo</th>
                    <th>Composizione</th>
                    <th className="text-right">Quota</th>
                    <th className="text-right">Versato</th>
                    <th>Iscrizione</th>
                    <th>Stato attuale</th>
                  </tr>
                </thead>
                <tbody>
                  {stagione.memberships.map((m) => {
                    const dovuto = m.quota ? Number(m.quota) : 0;
                    const versato = m.payments.reduce((t, p) => t + Number(p.pagato), 0);
                    return (
                      <tr key={m.id}>
                        <td>
                          <Link
                            href={`/admin/operatori/${m.user.id}`}
                            className="font-medium hover:text-nvg"
                          >
                            {m.user.cognome} {m.user.nome}
                          </Link>
                          {m.user.callsign && (
                            <span className="block text-[11px] text-nvg">{m.user.callsign}</span>
                          )}
                        </td>
                        <td className="text-muted">{umanizza(m.tipo)}</td>
                        <td className="text-[11px] text-muted">{m.dettaglioQuota ?? '-'}</td>
                        <td className="num whitespace-nowrap text-right">{fmtEuro(dovuto)}</td>
                        <td
                          className={`num whitespace-nowrap text-right ${
                            dovuto > 0 && versato < dovuto ? 'text-warn' : 'text-nvg'
                          }`}
                        >
                          {fmtEuro(versato)}
                        </td>
                        <td>
                          <Badge tono={tonoIscrizione[m.status] ?? 'neutro'}>
                            {umanizza(m.status)}
                          </Badge>
                        </td>
                        <td>
                          <Badge tono={tonoStato[m.user.stato]}>
                            {etichettaStato[m.user.stato]}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            }
          />
        </div>
      )}

      {/* ------------------------------------------------------- attivita' */}
      <h2 className="titolo-sezione mb-3">Attivit&agrave; &middot; {stagione.eventi.length}</h2>

      {stagione.eventi.length === 0 ? (
        <div className="mb-8">
          <Vuoto testo="Nessuna attivita' registrata in questa stagione." />
        </div>
      ) : (
        <div className="mb-8">
          <Elenco
            cards={stagione.eventi.map((e) => (
              <div key={e.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/calendario/${e.id}`}
                      className="block truncate font-medium hover:text-nvg"
                    >
                      {e.titolo}
                    </Link>
                    <p className="num text-xs text-muted">{fmtDateTime(e.inizio)}</p>
                    <p className="text-xs text-muted">
                      {e.tipo?.nome ?? 'Senza tipologia'}
                      {e.field ? ` · ${e.field.nome}` : ''}
                    </p>
                  </div>
                  <Badge tono={tonoEvento[e.status] ?? 'neutro'}>
                    {etichettaEvento[e.status] ?? umanizza(e.status)}
                  </Badge>
                </div>
                <p className="num mt-2 border-t border-line pt-2 text-xs text-muted">
                  {e._count.rsvps} presenti
                  {e.costo ? ` · ${fmtEuro(Number(e.costo))} a testa` : ''}
                </p>
              </div>
            ))}
            tabella={
              <table className="tabella">
                <thead>
                  <tr>
                    <th>Attivit&agrave;</th>
                    <th>Quando</th>
                    <th>Campo</th>
                    <th>Presenti</th>
                    <th className="text-right">Quota</th>
                    <th className="text-right">Incassato</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {stagione.eventi.map((e) => {
                    const reso = e.payments
                      .filter((p) => p.tipo === 'RIMBORSO')
                      .reduce((t, p) => t + Number(p.pagato), 0);
                    const preso =
                      e.payments
                        .filter((p) => p.tipo !== 'RIMBORSO')
                        .reduce((t, p) => t + Number(p.pagato), 0) - reso;
                    return (
                      <tr key={e.id}>
                        <td>
                          <Link href={`/calendario/${e.id}`} className="font-medium hover:text-nvg">
                            {e.titolo}
                          </Link>
                          <span className="block text-[11px] text-muted">
                            {e.tipo?.nome ?? 'Senza tipologia'}
                          </span>
                        </td>
                        <td className="num whitespace-nowrap text-muted">
                          {fmtDateTime(e.inizio)}
                        </td>
                        <td className="text-muted">{e.field?.nome ?? '-'}</td>
                        <td className="num text-muted">{e._count.rsvps}</td>
                        <td className="num whitespace-nowrap text-right text-muted">
                          {e.costo ? fmtEuro(Number(e.costo)) : '-'}
                        </td>
                        <td className="num whitespace-nowrap text-right text-nvg">
                          {fmtEuro(preso)}
                        </td>
                        <td>
                          <Badge tono={tonoEvento[e.status] ?? 'neutro'}>
                            {etichettaEvento[e.status] ?? umanizza(e.status)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            }
          />
        </div>
      )}

      {/* --------------------------------------------------------- tessere */}
      <h2 className="titolo-sezione mb-3">Tessere FIGT &middot; {stagione.figtCards.length}</h2>

      {stagione.figtCards.length === 0 ? (
        <div className="mb-8">
          <Vuoto testo="Nessuna tessera federale agganciata a questa stagione." />
        </div>
      ) : (
        <div className="mb-8 space-y-2">
          {stagione.figtCards.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/operatori/${t.user.id}`}
                  className="font-medium hover:text-nvg"
                >
                  {nomeCompleto(t.user)}
                </Link>
                <p className="num text-xs text-muted">
                  {t.codice ?? 'codice mancante'}
                  {t.anno ? ` · ${t.anno}` : ''}
                  {t.scadeIl ? ` · scade il ${fmtDate(t.scadeIl)}` : ''}
                </p>
              </div>
              <Badge tono={tonoFigt[t.status] ?? 'neutro'}>{umanizza(t.status)}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------- tariffe */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="titolo-sezione">Tariffe proprie di questa stagione</h2>
        <Link href="/admin/tariffe" className="text-xs text-nvg hover:underline">
          Tariffario completo &rarr;
        </Link>
      </div>

      {stagione.tariffe.length === 0 ? (
        <Vuoto testo="Nessuna tariffa scritta apposta per questa stagione: valgono quelle generiche del tariffario." />
      ) : (
        <div className="space-y-2">
          {stagione.tariffe.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="font-medium">{t.nome}</p>
                {t.usi.length > 0 && (
                  <p className="text-[11px] text-nvg">
                    auto: {t.usi.map((u) => ETICHETTA_VOCE[u]).join(', ')}
                  </p>
                )}
                {t.note && <p className="text-[11px] text-muted">{t.note}</p>}
              </div>
              <span className="num font-semibold text-nvg">{fmtEuro(Number(t.importo))}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
