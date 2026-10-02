import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, puoGestirePagamenti, vedeAttivitaSquadra } from '@/lib/domain';
import { fmtDate, fmtEuro, inputDate, umanizza } from '@/lib/format';
import { Badge, Campo, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { eliminaMovimento, salvaMovimento } from '@/actions/cassa';
import { GiacenzaPolizze } from '@/components/GiacenzaPolizze';
import { BottoneElimina, CardRiga } from '@/components/CardRiga';
import { SceltaBeneficiario, TendinaMetodi } from '@/components/TendinaMetodi';

type Movimento = {
  id: string;
  tipo: string;
  descrizione: string;
  importo: unknown;
  data: Date;
  categoria: string | null;
  note: string | null;
  metodoId: string | null;
  /** Se la spesa era un acquisto: la merce entrata e quanti pezzi. */
  carico?: { articoloId: string; quantita: number } | null;
  /** A chi va un'uscita, se è un operatore: con i suoi metodi per pagarlo. */
  beneficiarioId?: string | null;
  beneficiario?: {
    nome: string;
    cognome: string;
    metodiPersonali: { id: string; nome: string; istruzioni: string | null }[];
  } | null;
  /** Scontrino, fattura o ricevuta: foto o PDF. */
  allegatoPath?: string | null;
  allegatoNome?: string | null;
};

/** Il link allo scontrino di un movimento, se c'è. */
const urlAllegato = (m: Movimento | null) =>
  m?.allegatoPath ? `/api/cassa/movimenti/${m.id}/allegato` : null;

type Metodo = { id: string; nome: string };
type Operatore = {
  id: string;
  nome: string;
  metodi: { id: string; nome: string; istruzioni: string | null }[];
};

/** Un articolo di magazzino, come si sceglie: categoria e nome. */
type Merce = { id: string; nome: string; categoria: string | null };

/**
 * Una riga del registro di cassa. Ci finiscono sia i movimenti scritti a mano
 * sia le quote effettivamente incassate dalle attività: prima queste ultime
 * pesavano sul saldo senza comparire da nessuna parte, e non si capiva da dove
 * venissero i soldi.
 */
type Voce = {
  chiave: string;
  data: Date;
  entrata: boolean;
  importo: number;
  descrizione: string;
  dettaglio: string | null;
  categoria: string | null;
  metodo: string | null;
  registratoDa: string | null;
  link: string | null;
  /** Valorizzato solo sulle voci a mano: le altre si correggono dal pagamento. */
  movimento: Movimento | null;
};

const ORIGINI = { tutte: 'Tutti i movimenti', attivita: 'Dalle attività', mano: 'A mano' } as const;
type Origine = keyof typeof ORIGINI;

export default async function CassaPage({
  searchParams,
}: {
  searchParams: Promise<{ origine?: string }>;
}) {
  const me = await requirePermesso(puoGestirePagamenti);
  const admin = isAdmin(me.roles);
  const sp = await searchParams;
  const origine = (Object.keys(ORIGINI).includes(sp.origine ?? '') ? sp.origine : 'tutte') as Origine;

  const [movimenti, pagamenti, metodi, scorte, crediti] = await Promise.all([
    prisma.movimentoCassa.findMany({
      orderBy: { data: 'desc' },
      include: {
        metodo: { select: { nome: true } },
        registratoBy: { select: { nome: true, cognome: true } },
        // serve al modulo di modifica: senza, riaprirlo e salvare toglierebbe
        // in silenzio la merce entrata con quella spesa
        carico: { select: { articoloId: true, quantita: true } },
        beneficiario: {
          select: {
            nome: true,
            cognome: true,
            metodiPersonali: {
              orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
              select: { id: true, nome: true, istruzioni: true },
            },
          },
        },
      },
    }),
    // solo i soldi del club: quelli delle altre casse non ci passano, nemmeno
    // come riga informativa
    prisma.payment.findMany({
      where: { cassaId: null },
      orderBy: { pagatoIl: 'desc' },
      select: {
        id: true,
        tipo: true,
        descrizione: true,
        pagato: true,
        importo: true,
        status: true,
        pagatoIl: true,
        updatedAt: true,
        eventId: true,
        note: true,
        user: { select: { nome: true, cognome: true, callsign: true } },
        metodo: { select: { nome: true } },
        recordedBy: { select: { nome: true, cognome: true } },
      },
    }),
    prisma.metodoPagamento.findMany({
      where: { attivo: true, cassaId: null },
      orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true },
    }),
    // il magazzino: una spesa può essere l'acquisto di uno di questi articoli
    prisma.articoloMagazzino.findMany({
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, categoria: true },
    }),
    // il registro dei crediti del club: versamenti, usi sulle quote, resi
    prisma.movimentoCredito.findMany({
      where: { cassaId: null },
      include: {
        user: { select: { nome: true, cognome: true, callsign: true } },
        metodo: { select: { nome: true } },
        registratoDa: { select: { nome: true, cognome: true } },
      },
    }),
  ]);

  // Quanto di ogni quota è stato pagato col credito: quei soldi sono entrati
  // col versamento, e nel registro non si contano una seconda volta.
  const dalCredito = new Map<string, number>();
  for (const c of crediti) {
    if (c.paymentId) dalCredito.set(c.paymentId, (dalCredito.get(c.paymentId) ?? 0) - Number(c.importo));
  }
  // il credito che la cassa tiene ancora per conto delle persone
  const creditoResiduo = crediti.reduce((t, c) => t + Number(c.importo), 0);

  const merci: Merce[] = scorte;

  // a chi può andare un'uscita: gli operatori, non i nuovi
  const operatori: Operatore[] = (
    await prisma.user.findMany({
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        cognome: true,
        callsign: true,
        stato: true,
        metodiPersonali: {
          orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, nome: true, istruzioni: true },
        },
      },
    })
  )
    .filter((u) => vedeAttivitaSquadra(u.stato))
    .map((u) => ({
      id: u.id,
      nome: `${u.cognome} ${u.nome}${u.callsign ? ` · ${u.callsign}` : ''}`,
      metodi: u.metodiPersonali,
    }));

  // quello che entra dalle attività, al netto di ciò che è stato restituito
  const incassiQuote = pagamenti
    .filter((p) => p.tipo !== 'RIMBORSO')
    .reduce((t, p) => t + Number(p.pagato), 0);
  const rimborsiErogati = pagamenti
    .filter((p) => p.tipo === 'RIMBORSO')
    .reduce((t, p) => t + Number(p.pagato), 0);
  const rimborsiDaErogare = pagamenti
    .filter((p) => p.tipo === 'RIMBORSO' && p.status !== 'PAGATO' && p.status !== 'ANNULLATO')
    .reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);
  const quoteDaIncassare = pagamenti
    .filter(
      (p) =>
        p.tipo !== 'RIMBORSO' &&
        p.status !== 'PAGATO' &&
        p.status !== 'ANNULLATO' &&
        p.status !== 'NON_GESTITO',
    )
    .reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);

  const entrateManuali = movimenti
    .filter((m) => m.tipo === 'ENTRATA')
    .reduce((t, m) => t + Number(m.importo), 0);
  const entrateN = movimenti.filter((m) => m.tipo === 'ENTRATA').length;
  const usciteN = movimenti.filter((m) => m.tipo === 'USCITA').length;
  const usciteManuali = movimenti
    .filter((m) => m.tipo === 'USCITA')
    .reduce((t, m) => t + Number(m.importo), 0);

  // il credito è denaro in cassa: quello usato è già dentro le quote, quello
  // che resta si aggiunge qui
  const saldo = incassiQuote - rimborsiErogati + entrateManuali - usciteManuali + creditoResiduo;

  // registro unico: i movimenti a mano e le quote realmente incassate, messi in
  // ordine di data. Un rimborso erogato è denaro che esce, quindi va in uscita.
  const daMano: Voce[] = movimenti.map((m) => ({
    chiave: `m-${m.id}`,
    data: m.data,
    entrata: m.tipo === 'ENTRATA',
    importo: Number(m.importo),
    descrizione: m.descrizione,
    dettaglio:
      [m.beneficiario ? `a ${m.beneficiario.nome} ${m.beneficiario.cognome}` : null, m.note]
        .filter(Boolean)
        .join(' · ') || null,
    categoria: m.categoria,
    metodo: m.metodo?.nome ?? null,
    registratoDa: m.registratoBy ? `${m.registratoBy.nome} ${m.registratoBy.cognome}` : null,
    link: null,
    movimento: m,
  }));

  const daAttivita: Voce[] = pagamenti
    .filter((p) => Number(p.pagato) - (dalCredito.get(p.id) ?? 0) > 0.001)
    .map((p) => ({
      chiave: `p-${p.id}`,
      data: p.pagatoIl ?? p.updatedAt,
      entrata: p.tipo !== 'RIMBORSO',
      importo: Number(p.pagato) - (dalCredito.get(p.id) ?? 0),
      descrizione: p.descrizione,
      dettaglio: `${p.user.cognome} ${p.user.nome}${p.user.callsign ? ` · ${p.user.callsign}` : ''}`,
      categoria: umanizza(p.tipo),
      metodo: p.metodo?.nome ?? null,
      registratoDa: p.recordedBy ? `${p.recordedBy.nome} ${p.recordedBy.cognome}` : null,
      link: p.eventId ? `/calendario/${p.eventId}` : '/admin/pagamenti?filtro=pagati',
      movimento: null,
    }));

  // i versamenti a credito sono soldi che entrano, i resi soldi che escono;
  // l'uso su una quota no, è un passaggio interno
  const daCrediti: Voce[] = crediti
    .filter((c) => c.tipo === 'VERSAMENTO' || c.tipo === 'DA_QUOTA' || c.tipo === 'RESO')
    .map((c) => ({
      chiave: `c-${c.id}`,
      data: c.data,
      entrata: c.tipo !== 'RESO',
      importo: Math.abs(Number(c.importo)),
      descrizione:
        c.tipo === 'VERSAMENTO'
          ? 'Versamento a credito'
          : c.tipo === 'DA_QUOTA'
            ? `Credito da «${c.descrizione}»`
            : 'Credito restituito',
      dettaglio: `${c.user.cognome} ${c.user.nome}${c.user.callsign ? ` · ${c.user.callsign}` : ''}${c.note ? ` · ${c.note}` : ''}`,
      categoria: 'Credito',
      metodo: c.metodo?.nome ?? null,
      registratoDa: c.registratoDa ? `${c.registratoDa.nome} ${c.registratoDa.cognome}` : null,
      link: '/admin/pagamenti',
      movimento: null,
    }));

  const voci = [
    ...(origine === 'attivita' ? [] : daMano),
    ...(origine === 'mano' ? [] : [...daAttivita, ...daCrediti]),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  return (
    <>
      <Intestazione
        titolo="Cassa"
        sottotitolo="Registro unico: le quote incassate dalle attività e i movimenti scritti a mano"
        azioni={
          <div className="flex flex-wrap gap-2">
            <BottoneModale etichetta="Registra entrata" icona="incassa" titolo="Nuova entrata">
              <FormAzione azione={salvaMovimento}>
                <input type="hidden" name="tipo" value="ENTRATA" />
                <CampiMovimento metodi={metodi} />
                <Invia icona="salva">Registra entrata</Invia>
              </FormAzione>
            </BottoneModale>

            <BottoneModale
              etichetta="Registra uscita"
              icona="pagamenti"
              titolo="Nuova uscita"
              className="btn-ghost"
            >
              <FormAzione azione={salvaMovimento}>
                <input type="hidden" name="tipo" value="USCITA" />
                <CampiMovimento metodi={metodi} merci={merci} operatori={operatori} />
                <Invia icona="salva">Registra uscita</Invia>
              </FormAzione>
            </BottoneModale>
          </div>
        }
      />

      {/* ------------------------------------------------ saldo */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Statistica
          etichetta="Saldo di cassa"
          valore={fmtEuro(saldo)}
          dettaglio={
            creditoResiduo > 0.001
              ? `di cui ${fmtEuro(creditoResiduo)} di crediti delle persone`
              : 'incassi + entrate − uscite − rimborsi'
          }
          tono={saldo >= 0 ? 'ok' : 'danger'}
        />
        <Statistica
          etichetta="Quote incassate"
          valore={fmtEuro(incassiQuote)}
          dettaglio={`${fmtEuro(quoteDaIncassare)} ancora da incassare`}
          tono="ok"
        />
        <Statistica
          etichetta="Entrate a mano"
          valore={fmtEuro(entrateManuali)}
          dettaglio={`${entrateN} ${entrateN === 1 ? 'voce' : 'voci'} a mano`}
        />
        <Statistica
          etichetta="Uscite"
          valore={fmtEuro(usciteManuali)}
          dettaglio={`${usciteN} ${usciteN === 1 ? 'voce' : 'voci'} a mano`}
          tono={usciteManuali > 0 ? 'warn' : 'neutro'}
        />
        <GiacenzaPolizze />
      </div>

      {(rimborsiDaErogare > 0 || rimborsiErogati > 0) && (
        <div className="mb-6 flex flex-col gap-2 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn sm:flex-row sm:items-center sm:justify-between">
          <span>
            Rimborsi: <span className="num">{fmtEuro(rimborsiErogati)}</span> già restituiti
            {rimborsiDaErogare > 0 && (
              <>
                , <span className="num">{fmtEuro(rimborsiDaErogare)}</span> da erogare
              </>
            )}
            .
          </span>
          <Link
            href="/admin/pagamenti?filtro=rimborsi"
            className="shrink-0 font-medium underline underline-offset-4"
          >
            Vedi i rimborsi →
          </Link>
        </div>
      )}

      {/* ------------------------------------------------ registro */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="titolo-sezione">Movimenti di cassa</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ORIGINI) as Origine[]).map((o) => (
            <Link
              key={o}
              href={o === 'tutte' ? '/admin/cassa' : `/admin/cassa?origine=${o}`}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                origine === o ? 'border-nvg/40 bg-nvg/10 text-nvg' : 'border-line text-muted'
              }`}
            >
              {ORIGINI[o]}
            </Link>
          ))}
        </div>
      </div>

      {voci.length === 0 ? (
        <Vuoto
          testo={
            origine === 'mano'
              ? 'Nessun movimento registrato a mano.'
              : origine === 'attivita'
                ? 'Nessuna quota ancora incassata.'
                : 'Cassa vuota: non ci sono né quote incassate né movimenti a mano.'
          }
        />
      ) : (
        <Elenco
          cards={voci.map((v) => (
            <CardRiga
              key={v.chiave}
              card
              titolo={
                v.link ? (
                  <Link href={v.link} className="hover:text-nvg">
                    {v.descrizione}
                  </Link>
                ) : (
                  v.descrizione
                )
              }
              sottotitolo={
                <>
                  {v.dettaglio && <span className="block">{v.dettaglio}</span>}
                  {urlAllegato(v.movimento) && (
                    <a
                      href={urlAllegato(v.movimento)!}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-nvg hover:underline"
                    >
                      📎 {v.movimento?.allegatoNome ?? 'Allegato'}
                    </a>
                  )}
                  <span className="num">
                    {fmtDate(v.data)}
                    {v.categoria && ` · ${v.categoria}`}
                    {v.metodo && ` · ${v.metodo}`}
                  </span>
                </>
              }
              elimina={admin && v.movimento && <EliminaMovimento movimento={v.movimento} />}
              fascia={
                !!v.movimento?.beneficiario?.metodiPersonali.length && (
                  <TendinaMetodi
                    nome={`${v.movimento.beneficiario.nome} ${v.movimento.beneficiario.cognome}`}
                    metodi={v.movimento.beneficiario.metodiPersonali}
                  />
                )
              }
              azioni={
                admin &&
                v.movimento && (
                  <ModificaMovimento
                    movimento={v.movimento}
                    metodi={metodi}
                    merci={merci}
                    operatori={operatori}
                  />
                )
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tono={v.movimento ? 'neutro' : 'info'}>
                  {v.movimento ? 'a mano' : 'attività'}
                </Badge>
                <span
                  className={`num text-sm font-semibold ${v.entrata ? 'text-nvg' : 'text-danger'}`}
                >
                  {v.entrata ? '+' : '−'}
                  {fmtEuro(v.importo)}
                </span>
              </div>
            </CardRiga>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrizione</th>
                  <th>Origine</th>
                  <th>Categoria</th>
                  <th>Metodo</th>
                  <th>Registrato da</th>
                  <th className="text-right">Importo</th>
                  {admin && <th>Azioni</th>}
                </tr>
              </thead>
                {voci.map((v) => (
                  <tbody
                    key={v.chiave}
                    // l'uscita e i suoi metodi sono una cosa sola: si accendono insieme
                    className="[&:hover>tr]:bg-surface2/70"
                  >
                  <tr
                    className={
                      v.movimento?.beneficiario?.metodiPersonali.length
                        ? '[&>td]:!border-b-0'
                        : undefined
                    }
                  >
                    <td className="num whitespace-nowrap text-muted">{fmtDate(v.data)}</td>
                    <td>
                      {v.link ? (
                        <Link href={v.link} className="font-medium hover:text-nvg">
                          {v.descrizione}
                        </Link>
                      ) : (
                        <span className="font-medium">{v.descrizione}</span>
                      )}
                      {v.dettaglio && (
                        <span className="block text-[11px] text-muted">{v.dettaglio}</span>
                      )}
                      {urlAllegato(v.movimento) && (
                        <a
                          href={urlAllegato(v.movimento)!}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-[11px] text-nvg hover:underline"
                        >
                          📎 {v.movimento?.allegatoNome ?? 'Allegato'}
                        </a>
                      )}
                    </td>
                    <td>
                      <Badge tono={v.movimento ? 'neutro' : 'info'}>
                        {v.movimento ? 'a mano' : 'attività'}
                      </Badge>
                    </td>
                    <td className="text-muted">{v.categoria ?? '—'}</td>
                    <td className="text-muted">{v.metodo ?? '—'}</td>
                    <td className="text-xs text-muted">{v.registratoDa ?? '—'}</td>
                    <td
                      className={`num whitespace-nowrap text-right font-semibold ${
                        v.entrata ? 'text-nvg' : 'text-danger'
                      }`}
                    >
                      {v.entrata ? '+' : '−'}
                      {fmtEuro(v.importo)}
                    </td>
                    {admin && (
                      <td className="whitespace-nowrap">
                        {v.movimento ? (
                          <div className="flex items-center gap-2">
                            <ModificaMovimento
                              movimento={v.movimento}
                              metodi={metodi}
                              merci={merci}
                              operatori={operatori}
                            />
                            <EliminaMovimento movimento={v.movimento} />
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted">dal pagamento</span>
                        )}
                      </td>
                    )}
                  </tr>
                  {!!v.movimento?.beneficiario?.metodiPersonali.length && (
                    // appesa sotto la sua uscita: nessuna riga fra le due, e
                    // spazio prima della riga dopo
                    <tr>
                      <td colSpan={admin ? 8 : 7} className="!pt-0 !pb-3">
                        <TendinaMetodi
                          nome={`${v.movimento.beneficiario.nome} ${v.movimento.beneficiario.cognome}`}
                          metodi={v.movimento.beneficiario.metodiPersonali}
                          riquadro
                        />
                      </td>
                    </tr>
                  )}
                  </tbody>
                ))}
            </table>
          }
        />
      )}
    </>
  );
}

function ModificaMovimento({
  movimento,
  metodi,
  merci,
  operatori,
}: {
  movimento: Movimento;
  metodi: Metodo[];
  merci: Merce[];
  operatori: Operatore[];
}) {
  return (
    <>
      <BottoneModale
        etichetta="Modifica"
        icona="modifica"
        titolo={`Modifica "${movimento.descrizione}"`}
        className="btn-ghost btn-sm"
      >
        <FormAzione azione={salvaMovimento}>
          <input type="hidden" name="id" value={movimento.id} />
          <input type="hidden" name="tipo" value={movimento.tipo} />
          <CampiMovimento
            metodi={metodi}
            movimento={movimento}
            merci={movimento.tipo === 'USCITA' ? merci : undefined}
            operatori={movimento.tipo === 'USCITA' ? operatori : undefined}
          />
          <Invia icona="salva">Salva</Invia>
        </FormAzione>
      </BottoneModale>
    </>
  );
}

/** Il cestino di un movimento: in alto a destra della sua card. */
function EliminaMovimento({ movimento }: { movimento: Movimento }) {
  return (
    <BottoneElimina
      azione={eliminaMovimento}
      valori={{ id: movimento.id }}
      conferma={`Eliminare "${movimento.descrizione}" dalla cassa?`}
      etichetta={`Elimina ${movimento.descrizione}`}
    />
  );
}

function CampiMovimento({
  metodi,
  movimento,
  merci,
  operatori,
}: {
  metodi: Metodo[];
  movimento?: Movimento;
  /** Solo sulle uscite: se la spesa è un acquisto, entra in magazzino. */
  merci?: Merce[];
  /** Solo sulle uscite: a quale operatore vanno i soldi, se a qualcuno. */
  operatori?: Operatore[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Descrizione *" span>
        <input
          name="descrizione"
          required
          defaultValue={movimento?.descrizione}
          className="input"
          placeholder="es. Acquisto bersagli, contributo sponsor"
        />
      </Campo>

      <Campo label="Importo (€) *">
        <input
          name="importo"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={movimento ? Number(movimento.importo) : ''}
          className="input"
        />
      </Campo>

      <Campo label="Data">
        <input
          type="date"
          name="data"
          defaultValue={inputDate(movimento?.data ?? new Date())}
          className="input"
        />
      </Campo>

      <Campo label="Categoria">
        <input
          name="categoria"
          defaultValue={movimento?.categoria ?? ''}
          className="input"
          placeholder="es. Materiale, Campo, Sponsor"
        />
      </Campo>

      <Campo label="Metodo">
        <select name="metodoId" defaultValue={movimento?.metodoId ?? ''} className="input">
          <option value="">— non indicato —</option>
          {metodi.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </Campo>

      {operatori && (
        <Campo label="A chi (operatore)" span>
          <SceltaBeneficiario operatori={operatori} iniziale={movimento?.beneficiarioId ?? null} />
          <span className="mt-1 block text-[11px] text-muted">
            Un rimborso, una spesa anticipata: scelta la persona, la tendina mostra i suoi metodi
            per pagarla. La ritrovi anche nel registro.
          </span>
        </Campo>
      )}

      <Campo label="Note" span>
        <textarea name="note" rows={2} defaultValue={movimento?.note ?? ''} className="input" />
      </Campo>

      <Campo label="Scontrino, fattura o ricevuta" span>
        <input
          type="file"
          name="allegato"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="input file:mr-3 file:rounded file:border-0 file:bg-surface file:px-2 file:py-1 file:text-xs file:text-ink"
        />
        <span className="mt-1 block text-[11px] text-muted">
          Foto o PDF, fino a 10 MB. Dal telefono si può scattare direttamente.
        </span>
        {movimento?.allegatoPath && (
          <span className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <a
              href={urlAllegato(movimento)!}
              target="_blank"
              rel="noreferrer"
              className="text-nvg hover:underline"
            >
              📎 {movimento.allegatoNome ?? 'Allegato'}
            </a>
            <label className="flex items-center gap-1.5 text-muted">
              <input type="checkbox" name="togliAllegato" className="h-3.5 w-3.5" />
              toglilo
            </label>
            <span className="text-muted">· sceglierne un altro lo sostituisce</span>
          </span>
        )}
      </Campo>

      {/* Se la spesa è un acquisto di magazzino, i pezzi entrano da soli e il
          costo del pezzo esce dalla divisione: sono gli stessi soldi, e
          scriverli due volte è il modo più sicuro perché un giorno non
          tornino. */}
      {merci && merci.length > 0 && (
        <>
          <Campo label="È un acquisto di magazzino?" span>
            <select
              name="articoloId"
              defaultValue={movimento?.carico?.articoloId ?? ''}
              className="input"
            >
              <option value="">— no, è una spesa e basta —</option>
              {merci.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.categoria ? `${m.categoria} — ${m.nome}` : m.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Quanti pezzi">
            <input
              name="quantita"
              type="number"
              min="1"
              step="1"
              defaultValue={movimento?.carico?.quantita ?? ''}
              className="input"
            />
          </Campo>

          <p className="self-end text-[11px] text-muted sm:col-span-1">
            La giacenza sale di quei pezzi, e il costo di uno si ricava dividendo l’importo per i
            pezzi.
          </p>
        </>
      )}
    </div>
  );
}
