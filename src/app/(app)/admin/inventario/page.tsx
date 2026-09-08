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
import { registraCarico } from '@/actions/magazzino';
import {
  aggiungiRigaRiordino,
  annullaRiordino,
  creaRiordino,
  eliminaRigaRiordino,
  eliminaRiordino,
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

  const [scorte, riordini, metodi, carichi, uscite] = await Promise.all([
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
        voce: { select: { titolo: true } },
        rigaRiordino: { select: { riordino: { select: { numero: true } } } },
      },
    }),
    // …e quello che è uscito, cioè consegnato a qualcuno
    prisma.rigaOrdine.findMany({
      where: { voce: { aMagazzino: true }, ordine: { stato: 'CONSEGNATO' } },
      orderBy: { ordine: { consegnatoIl: 'desc' } },
      take: 40,
      include: {
        ordine: {
          select: {
            numero: true,
            consegnatoIl: true,
            utente: { select: { nome: true, cognome: true, callsign: true } },
          },
        },
      },
    }),
  ]);

  const magazzino = scorte.map((v) => ({
    id: v.id,
    titolo: v.titolo,
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
      quando: c.compratoIl,
      quanti: c.quantita,
      cosa: c.voce.titolo,
      da: c.rigaRiordino
        ? `riordino ${c.rigaRiordino.riordino.numero}`
        : (c.note ?? 'rettifica a mano'),
    })),
    ...uscite.map((u) => ({
      id: `u${u.id}`,
      quando: u.ordine.consegnatoIl ?? new Date(0),
      quanti: -u.quantita,
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
          magazzino.length > 0 ? (
            <BottoneModale etichetta="Nuovo riordino" icona="aggiungi" titolo="Nuovo riordino" larga>
              <FormRiordino voci={magazzino} />
            </BottoneModale>
          ) : undefined
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
        <Vuoto testo="Niente a magazzino. Nel merchandising, sulla voce, spunta «La tengo in magazzino»." />
      ) : (
        <div className="mb-6 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="tabella">
            <thead>
              <tr>
                <th>Cosa</th>
                <th>Articolo</th>
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
                    <td className="font-medium">{v.titolo}</td>
                    <td>
                      <Link href={v.strada} className="text-muted hover:text-nvg">
                        {v.articolo}
                      </Link>
                    </td>
                    <td>
                      <Badge tono={v.conto.disponibili > 0 ? 'ok' : 'warn'}>
                        {v.conto.disponibili}
                      </Badge>
                    </td>
                    <td className="num">{v.conto.impegnate}</td>
                    <td className="num">
                      {v.conto.costoMedio === null ? '—' : fmtEuro(v.conto.costoMedio)}
                    </td>
                    <td className="num">{fmtEuro(v.prezzo)}</td>
                    <td className={`num ${margine !== null && margine < 0 ? 'text-danger' : ''}`}>
                      {margine === null ? '—' : fmtEuro(margine)}
                    </td>
                    <td>
                      <BottoneModale
                        etichetta="Rettifica"
                        titolo={`Rettifica · ${v.titolo}`}
                        className="btn-ghost btn-sm"
                      >
                        <FormRettifica voce={v} />
                      </BottoneModale>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                <th>Cosa</th>
                <th>Quanti</th>
                <th>Perché</th>
              </tr>
            </thead>
            <tbody>
              {registro.map((m) => (
                <tr key={m.id}>
                  <td className="num">{fmtDateTime(m.quando)}</td>
                  <td>{m.cosa}</td>
                  <td className={`num font-semibold ${m.quanti > 0 ? 'text-nvg' : 'text-warn'}`}>
                    {m.quanti > 0 ? `+${m.quanti}` : m.quanti}
                  </td>
                  <td className="text-muted">{m.da}</td>
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
    <Campo label="Cosa">
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
function FormRettifica({ voce }: { voce: { id: string; titolo: string } }) {
  return (
    <FormAzione azione={registraCarico}>
      <input type="hidden" name="voceId" value={voce.id} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Quanti pezzi">
          <input name="quantita" type="number" min="1" className="input" />
        </Campo>
        <Campo label="Costo di un pezzo (€)">
          <input name="costoUnitario" type="number" step="0.01" min="0" className="input" />
        </Campo>
        <Campo label="Da chi">
          <input name="fornitore" className="input" maxLength={80} />
        </Campo>
        <Campo label="Quando">
          <input name="compratoIl" type="date" className="input" />
        </Campo>
      </div>
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
