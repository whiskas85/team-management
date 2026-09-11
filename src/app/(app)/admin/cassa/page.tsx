import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, puoGestirePagamenti } from '@/lib/domain';
import { fmtDate, fmtEuro, inputDate, umanizza } from '@/lib/format';
import { Badge, Campo, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { eliminaMovimento, salvaMovimento } from '@/actions/cassa';
import { GiacenzaPolizze } from '@/components/GiacenzaPolizze';

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
};

type Metodo = { id: string; nome: string };

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

  const [movimenti, pagamenti, metodi, scorte] = await Promise.all([
    prisma.movimentoCassa.findMany({
      orderBy: { data: 'desc' },
      include: {
        metodo: { select: { nome: true } },
        registratoBy: { select: { nome: true, cognome: true } },
        // serve al modulo di modifica: senza, riaprirlo e salvare toglierebbe
        // in silenzio la merce entrata con quella spesa
        carico: { select: { articoloId: true, quantita: true } },
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
  ]);

  const merci: Merce[] = scorte;

  // quello che entra dalle attività, al netto di ciò che è stato restituito
  const incassiQuote = pagamenti
    .filter((p) => p.tipo !== 'RIMBORSO')
    .reduce((t, p) => t + Number(p.pagato), 0);
  const rimborsiErogati = pagamenti
    .filter((p) => p.tipo === 'RIMBORSO')
    .reduce((t, p) => t + Number(p.pagato), 0);
  const rimborsiDaErogare = pagamenti
    .filter((p) => p.tipo === 'RIMBORSO' && p.status !== 'PAGATO')
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

  const saldo = incassiQuote - rimborsiErogati + entrateManuali - usciteManuali;

  // registro unico: i movimenti a mano e le quote realmente incassate, messi in
  // ordine di data. Un rimborso erogato è denaro che esce, quindi va in uscita.
  const daMano: Voce[] = movimenti.map((m) => ({
    chiave: `m-${m.id}`,
    data: m.data,
    entrata: m.tipo === 'ENTRATA',
    importo: Number(m.importo),
    descrizione: m.descrizione,
    dettaglio: m.note,
    categoria: m.categoria,
    metodo: m.metodo?.nome ?? null,
    registratoDa: m.registratoBy ? `${m.registratoBy.nome} ${m.registratoBy.cognome}` : null,
    link: null,
    movimento: m,
  }));

  const daAttivita: Voce[] = pagamenti
    .filter((p) => Number(p.pagato) > 0)
    .map((p) => ({
      chiave: `p-${p.id}`,
      data: p.pagatoIl ?? p.updatedAt,
      entrata: p.tipo !== 'RIMBORSO',
      importo: Number(p.pagato),
      descrizione: p.descrizione,
      dettaglio: `${p.user.cognome} ${p.user.nome}${p.user.callsign ? ` · ${p.user.callsign}` : ''}`,
      categoria: umanizza(p.tipo),
      metodo: p.metodo?.nome ?? null,
      registratoDa: p.recordedBy ? `${p.recordedBy.nome} ${p.recordedBy.cognome}` : null,
      link: p.eventId ? `/calendario/${p.eventId}` : '/admin/pagamenti?filtro=pagati',
      movimento: null,
    }));

  const voci = [
    ...(origine === 'attivita' ? [] : daMano),
    ...(origine === 'mano' ? [] : daAttivita),
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
                <CampiMovimento metodi={metodi} merci={merci} />
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
          dettaglio="incassi + entrate − uscite − rimborsi"
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
            <div key={v.chiave} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">
                    {v.link ? (
                      <Link href={v.link} className="hover:text-nvg">
                        {v.descrizione}
                      </Link>
                    ) : (
                      v.descrizione
                    )}
                  </h3>
                  {v.dettaglio && <p className="truncate text-xs text-muted">{v.dettaglio}</p>}
                  <p className="num text-xs text-muted">
                    {fmtDate(v.data)}
                    {v.categoria && ` · ${v.categoria}`}
                    {v.metodo && ` · ${v.metodo}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`num whitespace-nowrap text-sm font-semibold ${
                      v.entrata ? 'text-nvg' : 'text-danger'
                    }`}
                  >
                    {v.entrata ? '+' : '−'}
                    {fmtEuro(v.importo)}
                  </span>
                  <Badge tono={v.movimento ? 'neutro' : 'info'}>
                    {v.movimento ? 'a mano' : 'attività'}
                  </Badge>
                </div>
              </div>
              {admin && v.movimento && (
                <div className="mt-3 flex gap-2 border-t border-line pt-3">
                  <Azioni movimento={v.movimento} metodi={metodi} merci={merci} />
                </div>
              )}
            </div>
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
              <tbody>
                {voci.map((v) => (
                  <tr key={v.chiave}>
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
                          <div className="flex gap-2">
                            <Azioni movimento={v.movimento} metodi={metodi} merci={merci} />
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted">dal pagamento</span>
                        )}
                      </td>
                    )}
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

function Azioni({
  movimento,
  metodi,
  merci,
}: {
  movimento: Movimento;
  metodi: Metodo[];
  merci: Merce[];
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
          />
          <Invia icona="salva">Salva</Invia>
        </FormAzione>
      </BottoneModale>

      <AzioneBottone
        azione={eliminaMovimento}
        valori={{ id: movimento.id }}
        icona="elimina"
        conferma={`Eliminare "${movimento.descrizione}" dalla cassa?`}
        className="btn-danger btn-sm"
      >
        Elimina
      </AzioneBottone>
    </>
  );
}

function CampiMovimento({
  metodi,
  movimento,
  merci,
}: {
  metodi: Metodo[];
  movimento?: Movimento;
  /** Solo sulle uscite: se la spesa è un acquisto, entra in magazzino. */
  merci?: Merce[];
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

      <Campo label="Note" span>
        <textarea name="note" rows={2} defaultValue={movimento?.note ?? ''} className="input" />
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
