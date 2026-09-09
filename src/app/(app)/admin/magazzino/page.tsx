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
  aggiungiArticolo,
  aggiungiRigaRiordino,
  annullaRiordino,
  creaRiordino,
  eliminaArticolo,
  eliminaRigaRiordino,
  eliminaRiordino,
  pagaRiordino,
  riceviRiordino,
  salvaArticolo,
  scollegaDaMagazzino,
} from '@/actions/magazzino-riordini';

export const dynamic = 'force-dynamic';

/**
 * Il magazzino, per chi tiene i conti.
 *
 * Tre cose, in quest'ordine: **cosa c'è in casa**, **cosa è stato ordinato al
 * fornitore**, **cosa è entrato e uscito**.
 *
 * Il magazzino è un elenco di oggetti, e basta. Non è il catalogo visto da
 * un'altra angolazione: prima lo era, e da lì venivano tutti i guai — si
 * metteva in conto un generatore e ci si ritrovava un annuncio in bozza col
 * generatore dentro, e toglierlo dalla vendita sembrava dire che non lo si
 * teneva più. Cosa ho in casa e cosa vendo sono due domande diverse, e questa
 * pagina risponde solo alla prima. La colonna «in vetrina» dice se qualcuno
 * gli ha collegato una riga del merchandising, che è un fatto dell'altra
 * pagina.
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

export default async function MagazzinoPage() {
  await requirePermesso(puoGestirePagamenti);

  const [articoli, riordini, metodi, carichi, uscite] = await Promise.all([
    prisma.articoloMagazzino.findMany({
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
      include: {
        carichi: { select: { quantita: true, costoUnitario: true } },
        // le righe di vetrina che pescano da qui: sono la risposta a «questo
        // si vende?», e i pezzi promessi si contano su tutte insieme
        voci: {
          select: {
            id: true,
            titolo: true,
            prezzo: true,
            attiva: true,
            annuncio: { select: { id: true, titolo: true, ufficiale: true, stato: true } },
            righe: {
              where: { ordine: { stato: { not: 'ANNULLATO' } } },
              select: { quantita: true, ordine: { select: { stato: true } } },
            },
          },
        },
      },
    }),
    prisma.riordino.findMany({
      orderBy: { creatoIl: 'desc' },
      take: 40,
      include: {
        righe: { include: { articolo: { select: { nome: true } } } },
        creatoDa: { select: { nome: true, cognome: true, callsign: true } },
      },
    }),
    prisma.metodoPagamento.findMany({ where: { attivo: true }, orderBy: { ordine: 'asc' } }),
    // il registro: quello che è entrato…
    prisma.caricoMagazzino.findMany({
      orderBy: { compratoIl: 'desc' },
      take: 40,
      include: {
        articolo: { select: { nome: true, categoria: true } },
        rigaRiordino: { select: { riordino: { select: { numero: true } } } },
      },
    }),
    // …e quello che è uscito, cioè consegnato a qualcuno
    prisma.rigaOrdine.findMany({
      where: { voce: { articoloId: { not: null } }, ordine: { stato: 'CONSEGNATO' } },
      orderBy: { ordine: { consegnatoIl: 'desc' } },
      take: 40,
      include: {
        voce: { select: { articolo: { select: { nome: true, categoria: true } } } },
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

  const scaffale = articoli.map((a) => {
    // i pezzi promessi escono dalla stessa scatola, comunque siano stati
    // ordinati: si sommano le righe di tutte le voci collegate
    const righe = a.voci.flatMap((v) =>
      v.righe.map((r) => ({ quantita: r.quantita, stato: r.ordine.stato })),
    );
    return {
      id: a.id,
      nome: a.nome,
      categoria: a.categoria,
      note: a.note,
      conto: giacenzaDi(a.carichi, righe),
      vetrina: a.voci.map((v) => ({
        id: v.id,
        titolo: v.titolo,
        prezzo: Number(v.prezzo),
        attiva: v.attiva,
        articolo: v.annuncio.titolo,
        strada: stradaAnnuncio(v.annuncio),
        bozza: v.annuncio.stato === 'BOZZA',
      })),
    };
  });

  const valore = scaffale.reduce(
    (s, a) => s + Math.max(0, a.conto.disponibili) * (a.conto.costoMedio ?? 0),
    0,
  );
  const pezzi = scaffale.reduce((s, a) => s + Math.max(0, a.conto.disponibili), 0);
  const inVetrina = scaffale.filter((a) => a.vetrina.length > 0).length;
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
      cosa: c.articolo.nome,
      categoria: c.articolo.categoria,
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
      cosa: u.voce.articolo?.nome ?? u.titolo,
      categoria: u.voce.articolo?.categoria ?? null,
      da: `consegnato a ${nomeCompleto(u.ordine.utente)} · ordine ${u.ordine.numero}`,
    })),
  ]
    .sort((a, b) => b.quando.getTime() - a.quando.getTime())
    .slice(0, 40);

  return (
    <>
      <Intestazione
        titolo="Magazzino"
        sottotitolo="Quello che il team ha in casa, e quello che ha ordinato al fornitore"
        azioni={
          <>
            <BottoneModale
              etichetta="Aggiungi articolo"
              icona="aggiungi"
              titolo="Nuovo articolo in magazzino"
              className={scaffale.length > 0 ? 'btn-ghost' : 'btn-primary'}
              larga
            >
              <FormArticolo />
            </BottoneModale>
            {scaffale.length > 0 && (
              <BottoneModale
                etichetta="Nuovo riordino"
                icona="carrello"
                titolo="Nuovo riordino"
                larga
              >
                <FormRiordino articoli={scaffale} />
              </BottoneModale>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="Pezzi in casa" valore={pezzi} />
        <Statistica etichetta="Valore" valore={fmtEuro(valore)} dettaglio="al costo d’acquisto" />
        <Statistica
          etichetta="In vetrina"
          valore={`${inVetrina} di ${scaffale.length}`}
          dettaglio="il resto lo tieni e basta"
        />
        <Statistica
          etichetta="Da pagare"
          valore={daPagare.length}
          tono={daPagare.length > 0 ? 'warn' : 'neutro'}
          dettaglio={inArrivo.length > 0 ? `${inArrivo.length} in arrivo` : undefined}
        />
      </div>

      {/* ------------------------------------------------ giacenze */}
      <p className="titolo-sezione mb-2">Cosa c’è in casa</p>
      {scaffale.length === 0 ? (
        <Vuoto testo="Magazzino vuoto. Con «Aggiungi articolo» ci metti quello che il team tiene: patch, adesivi, bandiere, il generatore. Venderlo è un’altra decisione, e si prende dal merchandising." />
      ) : (
        <div className="mb-6 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="tabella">
            <thead>
              <tr>
                <th>Articolo</th>
                <th>Disponibili</th>
                <th>Impegnate</th>
                <th>Costo medio</th>
                <th>In vetrina</th>
                <th>Margine</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {scaffale.map((a) => {
                // il margine ha senso su quello che si vende: di un generatore
                // non c'è nessun prezzo da confrontare col costo
                const prezzo = a.vetrina.find((v) => v.attiva)?.prezzo ?? null;
                const margine =
                  a.conto.costoMedio === null || prezzo === null ? null : prezzo - a.conto.costoMedio;
                return (
                  <tr key={a.id}>
                    <td>
                      <span className="font-medium">{a.nome}</span>
                      {a.categoria && (
                        <span className="block text-[11px] text-muted">{a.categoria}</span>
                      )}
                    </td>
                    <td>
                      <Badge tono={a.conto.disponibili > 0 ? 'ok' : 'warn'}>
                        {a.conto.disponibili}
                      </Badge>
                    </td>
                    <td className="num">{a.conto.impegnate}</td>
                    <td className="num">
                      {a.conto.costoMedio === null ? '—' : fmtEuro(a.conto.costoMedio)}
                    </td>
                    {/* Non tutto quello che si tiene si vende, ed è il senso di
                        questa pagina: qui si legge se qualcuno gli ha collegato
                        una riga di vetrina, non lo si decide. */}
                    <td>
                      {a.vetrina.length === 0 ? (
                        <span className="text-[11px] text-muted">non in vendita</span>
                      ) : (
                        <span className="flex flex-col gap-0.5">
                          {a.vetrina.map((v) => (
                            <span key={v.id} className="flex items-center gap-1.5">
                              <Link href={v.strada} className="text-[11px] hover:text-nvg">
                                {v.articolo} — {v.titolo}
                              </Link>
                              {!v.attiva && <Badge tono="neutro">spenta</Badge>}
                              {v.bozza && <Badge tono="warn">bozza</Badge>}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className={`num ${margine !== null && margine < 0 ? 'text-danger' : ''}`}>
                      {margine !== null ? fmtEuro(margine) : '—'}
                    </td>
                    <td>
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        <BottoneModale
                          etichetta="Rettifica"
                          titolo={`Rettifica · ${a.nome}`}
                          className="btn-ghost btn-sm"
                        >
                          <FormRettifica articolo={a} />
                        </BottoneModale>
                        <BottoneModale
                          etichetta="Modifica"
                          titolo={`Modifica · ${a.nome}`}
                          className="btn-ghost btn-sm"
                        >
                          <FormArticolo articolo={a} />
                        </BottoneModale>
                        {/* staccare non è cancellare: l'articolo resta, la
                            voce resta in vendita, cambia solo da dove esce */}
                        {a.vetrina.map((v) => (
                          <AzioneBottone
                            key={v.id}
                            azione={scollegaDaMagazzino}
                            valori={{ voceId: v.id }}
                            conferma={`Staccare "${v.titolo}" dal magazzino? Resta in vendita, ma da ordinare al fornitore a ogni giro.`}
                            className="text-[11px] text-muted transition-colors hover:text-ink"
                          >
                            stacca
                          </AzioneBottone>
                        ))}
                        <AzioneBottone
                          azione={eliminaArticolo}
                          valori={{ id: a.id }}
                          conferma={`Eliminare "${a.nome}" dal magazzino? Se ne vanno anche i suoi carichi.`}
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

      <p className="mb-6 text-xs text-muted">
        Quello che sta qui è quello che il team <strong className="text-ink">ha in casa</strong>,
        che si venda o no. Per metterlo in vendita si apre il merchandising e si collega una voce a
        questo articolo: sono due decisioni, e restano due.
      </p>

      {/* ------------------------------------------------ riordini */}
      <p className="titolo-sezione mb-2">Ordinato al fornitore</p>
      {riordini.length === 0 ? (
        <Vuoto testo="Nessun riordino. È il giro con cui il team ricompra la merce: prima si apre, poi si paga, poi arriva." />
      ) : (
        <div className="mb-6 space-y-3">
          {riordini.map((r) => {
            const totale = totaleRiordino(r.righe);
            return (
              <div key={r.id} className="card">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="num font-medium">Riordino {r.numero}</span>
                    <Badge tono={TONO[r.stato]}>{ETICHETTA[r.stato]}</Badge>
                    {r.fornitore && <span className="text-xs text-muted">{r.fornitore}</span>}
                  </span>
                  <span className="num text-sm">{fmtEuro(totale)}</span>
                </div>

                <ul className="mb-3 space-y-1 text-sm">
                  {r.righe.map((riga) => (
                    <li key={riga.id} className="flex items-center justify-between gap-2">
                      <span>
                        {riga.quantita} × {riga.articolo.nome}
                        <span className="text-muted">
                          {' '}
                          a {fmtEuro(Number(riga.costoUnitario))}
                        </span>
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
                  {r.righe.length === 0 && (
                    <li className="text-xs text-muted">Nessuna riga: aggiungine una.</li>
                  )}
                </ul>

                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {r.stato === 'APERTO' && (
                    <>
                      <BottoneModale
                        etichetta="Aggiungi riga"
                        icona="aggiungi"
                        titolo={`Riga sul riordino ${r.numero}`}
                        className="btn-ghost btn-sm"
                        larga
                      >
                        <FormRigaRiordino riordinoId={r.id} articoli={scaffale} />
                      </BottoneModale>
                      <BottoneModale
                        etichetta="Paga"
                        icona="incassa"
                        titolo={`Paga il riordino ${r.numero}`}
                        className="btn-ghost btn-sm"
                      >
                        <FormPagamento riordinoId={r.id} totale={totale} metodi={metodi} />
                      </BottoneModale>
                    </>
                  )}
                  {r.stato !== 'RICEVUTO' && r.stato !== 'ANNULLATO' && (
                    <AzioneBottone
                      azione={riceviRiordino}
                      valori={{ id: r.id }}
                      icona="carica"
                      className="btn-ghost btn-sm"
                    >
                      Ricevi la merce
                    </AzioneBottone>
                  )}
                  {r.stato !== 'RICEVUTO' && r.stato !== 'ANNULLATO' && (
                    <AzioneBottone
                      azione={annullaRiordino}
                      valori={{ id: r.id }}
                      conferma="Annullare il riordino? Se era pagato se ne va anche l’uscita di cassa."
                      className="text-[11px] text-muted transition-colors hover:text-danger"
                    >
                      annulla
                    </AzioneBottone>
                  )}
                  {r.stato !== 'RICEVUTO' && !r.movimentoId && (
                    <AzioneBottone
                      azione={eliminaRiordino}
                      valori={{ id: r.id }}
                      conferma="Eliminare il riordino?"
                      className="text-[11px] text-muted transition-colors hover:text-danger"
                    >
                      elimina
                    </AzioneBottone>
                  )}
                  <span className="ml-auto text-[11px] text-muted">
                    aperto il {fmtDate(r.creatoIl)}
                    {r.creatoDa ? ` da ${nomeCompleto(r.creatoDa)}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------ registro */}
      <p className="titolo-sezione mb-2">Entrato e uscito</p>
      {registro.length === 0 ? (
        <Vuoto testo="Niente ancora. Qui finiscono i carichi e le consegne, in ordine di data." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="tabella">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Articolo</th>
                <th>Pezzi</th>
                <th>Perché</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {registro.map((m) => (
                <tr key={m.id}>
                  <td className="num text-muted">{fmtDateTime(m.quando)}</td>
                  <td>
                    {m.cosa}
                    {m.categoria && (
                      <span className="block text-[11px] text-muted">{m.categoria}</span>
                    )}
                  </td>
                  <td className={`num ${m.quanti < 0 ? 'text-warn' : 'text-nvg'}`}>
                    {m.quanti > 0 ? `+${m.quanti}` : m.quanti}
                  </td>
                  <td className="text-muted">{m.da}</td>
                  <td className="text-right">
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

type ArticoloInPagina = {
  id: string;
  nome: string;
  categoria: string | null;
  note: string | null;
  conto: { costoMedio: number | null };
};

/** Le voci fra cui scegliere, scritte come si riconoscono. */
function SceltaArticolo({ articoli }: { articoli: ArticoloInPagina[] }) {
  return (
    <Campo label="Articolo">
      <select name="articoloId" className="input">
        {articoli.map((a) => (
          <option key={a.id} value={a.id}>
            {a.categoria ? `${a.categoria} — ${a.nome}` : a.nome}
          </option>
        ))}
      </select>
    </Campo>
  );
}

/**
 * Un articolo di magazzino: nome, come si raggruppa, e basta.
 *
 * Niente prezzo e niente spunta «in vendita», ed è il punto di tutta la
 * correzione: qui si dice **cosa si ha**. Che si venda o no lo decide il
 * merchandising, collegando una sua voce a questo articolo, e quella decisione
 * si può prendere domani o mai.
 */
function FormArticolo({ articolo }: { articolo?: ArticoloInPagina }) {
  return (
    <FormAzione azione={articolo ? salvaArticolo : aggiungiArticolo}>
      {articolo && <input type="hidden" name="id" value={articolo.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Cosa">
          <input
            name="nome"
            defaultValue={articolo?.nome}
            className="input"
            maxLength={120}
            placeholder="Patch PVC, Generatore, Bandiera…"
          />
        </Campo>
        <Campo label="Categoria">
          <input
            name="categoria"
            defaultValue={articolo?.categoria ?? ''}
            className="input"
            maxLength={80}
            placeholder="Patch, Materiale di squadra…"
          />
        </Campo>
      </div>
      <Campo label="Note" span>
        <input
          name="note"
          defaultValue={articolo?.note ?? ''}
          className="input"
          maxLength={200}
          placeholder="Dove sta, a chi è affidato, il modello…"
        />
      </Campo>
      <p className="text-xs text-muted">
        Entra in magazzino e <strong className="text-ink">non va in vendita</strong>: metterlo in
        vetrina è un’altra decisione, e si prende dal merchandising collegandogli una voce. Quanti
        pezzi ci sono lo dirà il primo riordino ricevuto, o una rettifica.
      </p>
      <Invia icona="salva">{articolo ? 'Salva' : 'Aggiungi'}</Invia>
    </FormAzione>
  );
}

function FormRiordino({ articoli }: { articoli: ArticoloInPagina[] }) {
  return (
    <FormAzione azione={creaRiordino}>
      <SceltaArticolo articoli={articoli} />
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
  articoli,
}: {
  riordinoId: string;
  articoli: ArticoloInPagina[];
}) {
  return (
    <FormAzione azione={aggiungiRigaRiordino}>
      <input type="hidden" name="riordinoId" value={riordinoId} />
      <SceltaArticolo articoli={articoli} />
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
function FormRettifica({ articolo }: { articolo: ArticoloInPagina }) {
  return (
    <FormAzione azione={registraCarico}>
      <input type="hidden" name="articoloId" value={articolo.id} />
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
            defaultValue={articolo.conto.costoMedio?.toFixed(2) ?? ''}
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
