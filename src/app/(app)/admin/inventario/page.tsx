import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoGestirePagamenti } from '@/lib/domain';
import { fmtDate, fmtDateTime, fmtEuro, nomeCompleto } from '@/lib/format';
import { giacenzaDi, stradaAnnuncio, totaleRiordino } from '@/lib/mercatino';
import { Badge, Campo, Dato, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { eliminaCarico, registraCarico } from '@/actions/magazzino';
import {
  aggiungiMerce,
  aggiungiRigaRiordino,
  annullaRiordino,
  creaRiordino,
  tieniAMagazzino,
  eliminaRigaRiordino,
  eliminaRiordino,
  eliminaVoceMagazzino,
  pagaRiordino,
  riceviRiordino,
} from '@/actions/inventario';

export const dynamic = 'force-dynamic';

/**
 * L'inventario, per chi tiene i conti.
 *
 * Tre cose, in quest'ordine: **cosa c'è in casa**, **cosa è stato ordinato al
 * fornitore**, **cosa è entrato e uscito**. Il magazzino è quello del
 * merchandising — la roba che il team compra in blocco e consegna man mano — e
 * non un secondo elenco da tenere allineato al catalogo.
 *
 * I riordini hanno due pulsanti separati perché la realtà ha due momenti: si
 * paga quando si paga, la merce arriva quando arriva. Il primo fa uscire i
 * soldi dalla cassa, il secondo fa entrare i pezzi in magazzino.
 */

const TONO: Record<string, 'warn' | 'info' | 'ok' | 'neutro'> = {
  APERTO: 'warn',
  PAGATO: 'info',
  RICEVUTO: 'ok',
  ANNULLATO: 'neutro',
};

const ETICHETTA: Record<string, string> = {
  APERTO: 'da pagare',
  PAGATO: 'pagato, in arrivo',
  RICEVUTO: 'ricevuto',
  ANNULLATO: 'annullato',
};

export default async function InventarioPage() {
  await requirePermesso(puoGestirePagamenti);

  const [scorte, riordini, metodi, carichi, uscite, articoli, fuori] = await Promise.all([
    prisma.voceAnnuncio.findMany({
      where: { aMagazzino: true },
      orderBy: [{ annuncio: { titolo: 'asc' } }, { ordine: 'asc' }],
      include: {
        annuncio: { select: { id: true, titolo: true, ufficiale: true } },
        carichi: { select: { quantita: true, costoUnitario: true } },
        righe: {
          where: { ordine: { stato: { not: 'ANNULLATO' } } },
          select: { quantita: true, ordine: { select: { stato: true } } },
        },
      },
    }),
    prisma.riordino.findMany({
      orderBy: { creatoIl: 'desc' },
      take: 40,
      include: {
        righe: { include: { voce: { select: { titolo: true } } } },
        creatoDa: { select: { nome: true, cognome: true, callsign: true } },
      },
    }),
    prisma.metodoPagamento.findMany({ where: { attivo: true }, orderBy: { ordine: 'asc' } }),
    // il registro: quello che è entrato…
    prisma.caricoMagazzino.findMany({
      orderBy: { compratoIl: 'desc' },
      take: 40,
      include: {
        voce: { select: { titolo: true, annuncio: { select: { titolo: true } } } },
        rigaRiordino: { select: { riordino: { select: { numero: true } } } },
      },
    }),
    // …e quello che è uscito, cioè consegnato a qualcuno
    prisma.rigaOrdine.findMany({
      where: { voce: { aMagazzino: true }, ordine: { stato: 'CONSEGNATO' } },
      orderBy: { ordine: { consegnatoIl: 'desc' } },
      take: 40,
      include: {
        voce: { select: { annuncio: { select: { titolo: true } } } },
        ordine: {
          select: {
            numero: true,
            consegnatoIl: true,
            utente: { select: { nome: true, cognome: true, callsign: true } },
          },
        },
      },
    }),
    // gli articoli del catalogo, per appendere la merce nuova a uno di loro
    prisma.annuncio.findMany({
      where: { ufficiale: true },
      orderBy: { titolo: 'asc' },
      select: { id: true, titolo: true },
    }),
    // la roba del catalogo che il magazzino non segue: si ordina al fornitore a
    // ogni giro e non finisce mai. Sta qui perché è da qui che uno se ne
    // accorge — "questa dovrei tenerla in casa" — e con un clic la sposta.
    prisma.voceAnnuncio.findMany({
      where: { aMagazzino: false, natura: 'RIORDINABILE', annuncio: { ufficiale: true } },
      orderBy: [{ annuncio: { titolo: 'asc' } }, { ordine: 'asc' }],
      select: { id: true, titolo: true, annuncio: { select: { titolo: true } } },
    }),
  ]);

  const magazzino = scorte.map((v) => ({
    id: v.id,
    titolo: v.titolo,
    inVendita: v.attiva,
    articolo: v.annuncio.titolo,
    strada: stradaAnnuncio(v.annuncio),
    prezzo: Number(v.prezzo),
    conto: giacenzaDi(
      v.carichi,
      v.righe.map((r) => ({ quantita: r.quantita, stato: r.ordine.stato })),
    ),
  }));

  const valore = magazzino.reduce(
    (s, v) => s + Math.max(0, v.conto.disponibili) * (v.conto.costoMedio ?? 0),
    0,
  );
  const pezzi = magazzino.reduce((s, v) => s + Math.max(0, v.conto.disponibili), 0);
  const daPagare = riordini.filter((r) => r.stato === 'APERTO');
  const inArrivo = riordini.filter((r) => r.stato === 'PAGATO');

  // il registro, entrate e uscite mescolate in ordine di data: è così che si
  // legge un magazzino, non in due elenchi da confrontare a mano
  const registro = [
    ...carichi.map((c) => ({
      id: `c${c.id}`,
      // solo le righe entrate si disfano: un'uscita è la consegna a una
      // persona, e si annulla dal suo ordine, non da qui
      caricoId: c.id,
      daRiordino: c.rigaRiordino ? c.rigaRiordino.riordino.numero : null,
      quando: c.compratoIl,
      quanti: c.quantita,
      articolo: c.voce.annuncio.titolo,
      cosa: c.voce.titolo,
      da: c.rigaRiordino
        ? `riordino ${c.rigaRiordino.riordino.numero}`
        : (c.note ?? 'rettifica a mano'),
    })),
    ...uscite.map((u) => ({
      id: `u${u.id}`,
      caricoId: null as string | null,
      daRiordino: null as number | null,
      quando: u.ordine.consegnatoIl ?? new Date(0),
      quanti: -u.quantita,
      articolo: u.voce.annuncio.titolo,
      cosa: u.titolo,
      da: `consegnato a ${nomeCompleto(u.ordine.utente)} · ordine ${u.ordine.numero}`,
    })),
  ]
    .sort((a, b) => b.quando.getTime() - a.quando.getTime())
    .slice(0, 40);

  return (
    <>
      <Intestazione
        titolo="Inventario"
        sottotitolo="Quello che il team ha in casa, e quello che ha ordinato al fornitore"
        azioni={
          <>
            <BottoneModale
              etichetta="Aggiungi merce"
              icona="aggiungi"
              titolo="Nuova merce a magazzino"
              className={magazzino.length > 0 ? 'btn-ghost' : 'btn-primary'}
              larga
            >
              <FormMerce articoli={articoli} />
            </BottoneModale>
            {magazzino.length > 0 && (
              <BottoneModale
                etichetta="Nuovo riordino"
                icona="carrello"
                titolo="Nuovo riordino"
                larga
              >
                <FormRiordino voci={magazzino} />
              </BottoneModale>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="Pezzi in casa" valore={pezzi} />
        <Statistica etichetta="Valore" valore={fmtEuro(valore)} dettaglio="al costo d’acquisto" />
        <Statistica
          etichetta="Da pagare"
          valore={daPagare.length}
          tono={daPagare.length > 0 ? 'warn' : 'neutro'}
        />
        <Statistica
          etichetta="In arrivo"
          valore={inArrivo.length}
          tono={inArrivo.length > 0 ? 'info' : 'neutro'}
        />
      </div>

      {/* ------------------------------------------------ giacenze */}
      <p className="titolo-sezione mb-2">Cosa c’è in casa</p>
      {magazzino.length === 0 ? (
        <Vuoto testo="Niente a magazzino. Con «Aggiungi merce» ci metti la roba che il team compra in blocco: patch, adesivi, magliette." />
      ) : (
        <div className="mb-6 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="tabella">
            <thead>
              <tr>
                {/* prima l'articolo e poi la specifica: la roba si chiama
                    "Maglietta del Club", e S o XL dicono quale */}
                <th>Articolo</th>
                <th>Specifica</th>
                <th>Disponibili</th>
                <th>Impegnate</th>
                <th>Costo medio</th>
                <th>Prezzo</th>
                <th>Margine</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {magazzino.map((v) => {
                const margine = v.conto.costoMedio === null ? null : v.prezzo - v.conto.costoMedio;
                return (
                  <tr key={v.id}>
                    <td>
                      <Link href={v.strada} className="font-medium hover:text-nvg">
                        {v.articolo}
                      </Link>
                    </td>
                    <td className="text-muted">{v.titolo}</td>
                    <td>
                      <Badge tono={v.conto.disponibili > 0 ? 'ok' : 'warn'}>
                        {v.conto.disponibili}
                      </Badge>
                    </td>
                    <td className="num">{v.conto.impegnate}</td>
                    <td className="num">
                      {v.conto.costoMedio === null ? '—' : fmtEuro(v.conto.costoMedio)}
                    </td>
                    {/* la roba che non si vende non ha un prezzo da chiedere
                        né un margine da fare: contarla basta */}
                    <td className="num">
                      {v.inVendita ? fmtEuro(v.prezzo) : <Badge tono="neutro">non in vendita</Badge>}
                    </td>
                    <td className={`num ${v.inVendita && margine !== null && margine < 0 ? 'text-danger' : ''}`}>
                      {v.inVendita && margine !== null ? fmtEuro(margine) : '—'}
                    </td>
                    <td>
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        <BottoneModale
                          etichetta="Rettifica"
                          titolo={`Rettifica · ${v.articolo} ${v.titolo}`}
                          className="btn-ghost btn-sm"
                        >
                          <FormRettifica voce={v} />
                        </BottoneModale>
                        {/* due modi di toglierla di mezzo: uno la lascia nel
                            catalogo senza giacenza, l'altro la cancella */}
                        <AzioneBottone
                          azione={tieniAMagazzino}
                          valori={{ id: v.id, verso: 'fuori' }}
                          conferma="Toglierla dal magazzino? Resta nel catalogo, ma senza giacenza."
                          className="text-[11px] text-muted transition-colors hover:text-ink"
                        >
                          non la tengo
                        </AzioneBottone>
                        <AzioneBottone
                          azione={eliminaVoceMagazzino}
                          valori={{ id: v.id }}
                          conferma={`Eliminare "${v.titolo}"? Se ne vanno anche i suoi carichi.`}
                          className="text-[11px] text-muted transition-colors hover:text-danger"
                        >
                          elimina
                        </AzioneBottone>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------ non a magazzino */}
      {fuori.length > 0 && (
        <div className="mb-6">
          <p className="titolo-sezione mb-2">Nel catalogo, ma non in casa</p>
          <div className="flex flex-wrap gap-2">
            {fuori.map((v) => (
              <span
                key={v.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
              >
                <span>
                  {v.annuncio.titolo} — <strong className="font-medium">{v.titolo}</strong>
                </span>
                <AzioneBottone
                  azione={tieniAMagazzino}
                  valori={{ id: v.id, verso: 'dentro' }}
                  className="text-[11px] text-muted transition-colors hover:text-nvg"
                >
                  tieni a magazzino
                </AzioneBottone>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Questa roba si ordina al fornitore a ogni giro e non finisce mai. Portala a magazzino
            se invece la comprate in blocco e la consegnate man mano.
          </p>
        </div>
      )}

      {/* ------------------------------------------------ riordini */}
      <p className="titolo-sezione mb-2">Riordini al fornitore</p>
      {riordini.length === 0 ? (
        <Vuoto testo="Nessun riordino. Quando la merce sta finendo, se ne apre uno." />
      ) : (
        <div className="mb-6 space-y-3">
          {riordini.map((r) => {
            const totale = totaleRiordino(r.righe);
            return (
              <div
                key={r.id}
                className={`card ${r.stato === 'APERTO' ? 'border-l-2 border-l-warn' : ''}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      Riordino {r.numero}
                      {r.fornitore && <span className="text-muted"> · {r.fornitore}</span>}
                    </p>
                    <p className="num mt-0.5 text-[11px] text-muted">
                      aperto il {fmtDate(r.creatoIl)}
                      {r.creatoDa && ` da ${nomeCompleto(r.creatoDa)}`}
                      {r.pagatoIl && ` · pagato il ${fmtDate(r.pagatoIl)}`}
                      {r.ricevutoIl && ` · ricevuto il ${fmtDate(r.ricevutoIl)}`}
                    </p>
                    {r.note && <p className="mt-1 text-sm">«{r.note}»</p>}
                  </div>
                  <p className="num shrink-0 text-lg font-semibold text-nvg">{fmtEuro(totale)}</p>
                </div>

                <ul className="mt-2 space-y-0.5 text-sm">
                  {r.righe.map((riga) => (
                    <li key={riga.id} className="flex flex-wrap items-baseline gap-2">
                      <span>
                        {riga.quantita}× {riga.voce.titolo}
                      </span>
                      <span className="num text-[11px] text-muted">
                        {fmtEuro(Number(riga.costoUnitario))} l’uno ·{' '}
                        {fmtEuro(riga.quantita * Number(riga.costoUnitario))}
                      </span>
                      {r.stato === 'APERTO' && (
                        <AzioneBottone
                          azione={eliminaRigaRiordino}
                          valori={{ id: riga.id }}
                          className="text-[11px] text-muted transition-colors hover:text-danger"
                        >
                          togli
                        </AzioneBottone>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Badge tono={TONO[r.stato]}>{ETICHETTA[r.stato]}</Badge>
                  {r.stato === 'RICEVUTO' && !r.pagatoIl && (
                    <Badge tono="warn">mai passato in cassa</Badge>
                  )}

                  <span className="ml-auto flex flex-wrap items-center gap-2">
                    {r.stato === 'APERTO' && (
                      <BottoneModale
                        etichetta="Aggiungi riga"
                        icona="aggiungi"
                        titolo={`Riordino ${r.numero} · nuova riga`}
                        className="btn-ghost btn-sm"
                        larga
                      >
                        <FormRigaRiordino riordinoId={r.id} voci={magazzino} />
                      </BottoneModale>
                    )}

                    {!r.pagatoIl && r.stato !== 'ANNULLATO' && (
                      <BottoneModale
                        etichetta="Paga"
                        icona="incassa"
                        titolo={`Riordino ${r.numero} · uscita di cassa`}
                        className="btn-ghost btn-sm"
                      >
                        <FormPagamento riordinoId={r.id} totale={totale} metodi={metodi} />
                      </BottoneModale>
                    )}

                    {r.stato !== 'RICEVUTO' && r.stato !== 'ANNULLATO' && (
                      <AzioneBottone
                        azione={riceviRiordino}
                        valori={{ id: r.id }}
                        icona="carica"
                        conferma="La merce è arrivata? Entra in magazzino con le quantità di queste righe."
                        className="btn-primary btn-sm"
                      >
                        Ricevi
                      </AzioneBottone>
                    )}

                    {r.stato !== 'RICEVUTO' && r.stato !== 'ANNULLATO' && (
                      <AzioneBottone
                        azione={r.pagatoIl ? annullaRiordino : eliminaRiordino}
                        valori={{ id: r.id }}
                        conferma={
                          r.pagatoIl
                            ? 'Annullare il riordino? Se ne va anche l’uscita di cassa.'
                            : 'Eliminare il riordino?'
                        }
                        className="text-[11px] text-muted transition-colors hover:text-danger"
                      >
                        {r.pagatoIl ? 'annulla' : 'elimina'}
                      </AzioneBottone>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------ registro */}
      <p className="titolo-sezione mb-2">Registro</p>
      {registro.length === 0 ? (
        <Vuoto testo="Ancora niente: il registro si riempie quando la merce entra o esce." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="tabella">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Articolo</th>
                <th>Specifica</th>
                <th>Quanti</th>
                <th>Perché</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {registro.map((m) => (
                <tr key={m.id}>
                  <td className="num">{fmtDateTime(m.quando)}</td>
                  <td>{m.articolo}</td>
                  <td className="text-muted">{m.cosa}</td>
                  <td className={`num font-semibold ${m.quanti > 0 ? 'text-nvg' : 'text-warn'}`}>
                    {m.quanti > 0 ? `+${m.quanti}` : m.quanti}
                  </td>
                  <td className="text-muted">{m.da}</td>
                  <td>
                    {m.caricoId && (
                      <AzioneBottone
                        azione={eliminaCarico}
                        valori={{ id: m.caricoId }}
                        conferma={
                          m.daRiordino
                            ? `Annullare questa entrata? Il riordino ${m.daRiordino} torna in attesa della merce.`
                            : 'Eliminare la riga? La giacenza si ricalcola.'
                        }
                        className="text-[11px] text-muted transition-colors hover:text-danger"
                      >
                        elimina
                      </AzioneBottone>
                    )}
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

type VoceMagazzino = { id: string; titolo: string; articolo: string };

/** Le voci fra cui scegliere, scritte come si riconoscono: articolo e taglia. */
function SceltaVoce({ voci }: { voci: VoceMagazzino[] }) {
  return (
    <Campo label="Merce">
      <select name="voceId" className="input">
        {voci.map((v) => (
          <option key={v.id} value={v.id}>
            {v.articolo} — {v.titolo}
          </option>
        ))}
      </select>
    </Campo>
  );
}

/**
 * Merce nuova, creata da qui.
 *
 * Resta una voce del catalogo — è la stessa cosa vista da due parti: qui
 * quante ce ne sono, nel merchandising come si comprano — ma nasce già segnata
 * come roba da tenere in casa, che è il motivo per cui uno apre l'inventario.
 */
function FormMerce({ articoli }: { articoli: { id: string; titolo: string }[] }) {
  return (
    <FormAzione azione={aggiungiMerce}>
      <Campo label="Articolo" span>
        <input
          name="articolo"
          className="input"
          maxLength={120}
          list="articoli-del-team"
          placeholder="Maglietta del Club"
          autoComplete="off"
        />
        {/* i nomi che ci sono già sono un suggerimento, non una gabbia: se
            scrivi qualcosa di nuovo, l'articolo nasce insieme alla merce */}
        <datalist id="articoli-del-team">
          {articoli.map((a) => (
            <option key={a.id} value={a.titolo} />
          ))}
        </datalist>
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Specifica">
          <input name="titolo" className="input" maxLength={80} placeholder="XL, nera, PVC…" />
        </Campo>
        <Campo label="A quanto la vendi (€)">
          <input name="prezzo" type="number" step="0.01" min="0" className="input" />
        </Campo>
      </div>
      <Campo label="Dettagli" span>
        <input name="descrizione" className="input" maxLength={200} />
      </Campo>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="inVendita"
          defaultChecked
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          La vendo alla squadra
          <span className="block text-[11px] text-muted">
            Togli la spunta per la roba che vuoi solo tenere contata — un generatore, una radio di
            servizio, il materiale del team. Niente prezzo, niente carrello: resta qui dentro con
            la sua giacenza e i suoi costi.
          </span>
        </span>
      </label>
      <p className="text-xs text-muted">
        Nasce come merce <strong className="text-ink">tenuta in casa</strong>: da qui si riordina e
        si conta. Se l’articolo non esiste ancora lo creo io, <strong className="text-ink">in
        bozza</strong> — il magazzino c’è, e metterlo in vendita nel merchandising resta una
        decisione a parte. Quanti pezzi ci sono lo dirà il primo riordino ricevuto, o una
        rettifica.
      </p>
      <Invia icona="salva">Aggiungi</Invia>
    </FormAzione>
  );
}

function FormRiordino({ voci }: { voci: VoceMagazzino[] }) {
  return (
    <FormAzione azione={creaRiordino}>
      <SceltaVoce voci={voci} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Quanti pezzi">
          <input name="quantita" type="number" min="1" className="input" placeholder="100" />
        </Campo>
        <Campo label="Costo di un pezzo (€)">
          <input
            name="costoUnitario"
            type="number"
            step="0.01"
            min="0"
            className="input"
            placeholder="1.50"
          />
        </Campo>
      </div>
      <Campo label="Fornitore" span>
        <input name="fornitore" className="input" maxLength={80} />
      </Campo>
      <Campo label="Note" span>
        <input name="note" className="input" maxLength={200} />
      </Campo>
      <p className="text-xs text-muted">
        Nasce senza toccare né i soldi né il magazzino: l’uscita di cassa la fai con{' '}
        <strong className="text-ink">Paga</strong>, i pezzi entrano con{' '}
        <strong className="text-ink">Ricevi</strong>. Altre righe si aggiungono finché è aperto.
      </p>
      <Invia icona="salva">Apri il riordino</Invia>
    </FormAzione>
  );
}

function FormRigaRiordino({
  riordinoId,
  voci,
}: {
  riordinoId: string;
  voci: VoceMagazzino[];
}) {
  return (
    <FormAzione azione={aggiungiRigaRiordino}>
      <input type="hidden" name="riordinoId" value={riordinoId} />
      <SceltaVoce voci={voci} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Quanti pezzi">
          <input name="quantita" type="number" min="1" className="input" />
        </Campo>
        <Campo label="Costo di un pezzo (€)">
          <input name="costoUnitario" type="number" step="0.01" min="0" className="input" />
        </Campo>
      </div>
      <Invia icona="aggiungi">Aggiungi</Invia>
    </FormAzione>
  );
}

function FormPagamento({
  riordinoId,
  totale,
  metodi,
}: {
  riordinoId: string;
  totale: number;
  metodi: { id: string; nome: string }[];
}) {
  return (
    <FormAzione azione={pagaRiordino}>
      <input type="hidden" name="id" value={riordinoId} />
      <Dato etichetta="Esce dalla cassa" valore={fmtEuro(totale)} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Quando">
          <input name="data" type="date" className="input" />
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
      </div>
      <p className="text-xs text-muted">
        Si scrive un’uscita in cassa con l’importo del riordino, nella categoria{' '}
        <strong className="text-ink">Merchandising</strong>. Annullando il riordino se ne va anche
        quella.
      </p>
      <Invia icona="incassa">Registra l’uscita</Invia>
    </FormAzione>
  );
}

/**
 * La rettifica: quello che entra in magazzino senza un ordine dietro.
 *
 * Serve per la roba arrivata in regalo, per un avanzo trovato in cantina, o
 * per correggere una giacenza sbagliata. La strada normale resta il riordino.
 */
function FormRettifica({
  voce,
}: {
  voce: { id: string; titolo: string; conto: { costoMedio: number | null } };
}) {
  return (
    <FormAzione azione={registraCarico}>
      <input type="hidden" name="voceId" value={voce.id} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Quanti pezzi">
          <input name="quantita" type="number" step="1" className="input" placeholder="50 · -12" />
        </Campo>
        <Campo label="Costo di un pezzo (€)">
          <input
            name="costoUnitario"
            type="number"
            step="0.01"
            min="0"
            defaultValue={voce.conto.costoMedio?.toFixed(2) ?? ''}
            className="input"
          />
        </Campo>
        <Campo label="Da chi">
          <input name="fornitore" className="input" maxLength={80} />
        </Campo>
        <Campo label="Quando">
          <input name="compratoIl" type="date" className="input" />
        </Campo>
      </div>

      <p className="text-xs text-muted">
        Un numero <strong className="text-ink">negativo toglie</strong>: −12 se ne sono spariti
        dodici, o se ne hai caricati troppi. Per disfare del tutto una riga sbagliata, c’è{' '}
        <em>elimina</em> nel registro qui sotto.
      </p>
      <Campo label="Perché" span>
        <input
          name="note"
          className="input"
          maxLength={140}
          placeholder="Avanzo dell’anno scorso, regalo, conteggio sbagliato…"
        />
      </Campo>
      <Invia icona="carica">Carica</Invia>
    </FormAzione>
  );
}
