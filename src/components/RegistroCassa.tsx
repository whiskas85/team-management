import Link from 'next/link';
import { fmtDate, fmtEuro, inputDate } from '@/lib/format';
import { Badge, Campo, Elenco, Vuoto } from './ui';
import { FormAzione } from './Form';
import { BottoneModale } from './Modale';
import { Invia } from './Bottone';
import { BottoneElimina, CardRiga } from './CardRiga';
import { SceltaBeneficiario, TendinaMetodi } from './TendinaMetodi';
import { eliminaMovimento, salvaMovimento } from '@/actions/cassa';
import type { Merce, Metodo, Movimento, Operatore, Voce } from '@/lib/registro-cassa';

/*
 * Il registro di una cassa e i suoi movimenti a mano: gli stessi pezzi per la
 * cassa del club e per le altre (lib/registro-cassa). Cambia solo di quale
 * cassa si parla, e chi può correggere.
 */

/** Il link allo scontrino di un movimento, se c'è. */
const urlAllegato = (m: Movimento | null) =>
  m?.allegatoPath ? `/api/cassa/movimenti/${m.id}/allegato` : null;

export const ORIGINI = { tutte: 'Tutti i movimenti', attivita: 'Dalle attività', mano: 'A mano' } as const;
export type Origine = keyof typeof ORIGINI;

/** «Registra entrata» e «Registra uscita», per questa cassa. */
export function PulsantiMovimento({
  cassaId,
  metodi,
  merci,
  operatori,
}: {
  cassaId: string | null;
  metodi: Metodo[];
  /** Solo la cassa del club: le sue spese possono essere acquisti di magazzino. */
  merci?: Merce[];
  operatori: Operatore[];
}) {
  return (
    <>
      <BottoneModale etichetta="Registra entrata" icona="incassa" titolo="Nuova entrata">
        <FormAzione azione={salvaMovimento}>
          <input type="hidden" name="tipo" value="ENTRATA" />
          {cassaId && <input type="hidden" name="cassaId" value={cassaId} />}
          <CampiMovimento metodi={metodi} />
          <Invia icona="salva">Registra entrata</Invia>
        </FormAzione>
      </BottoneModale>

      <BottoneModale etichetta="Registra uscita" icona="pagamenti" titolo="Nuova uscita" className="btn-ghost">
        <FormAzione azione={salvaMovimento}>
          <input type="hidden" name="tipo" value="USCITA" />
          {cassaId && <input type="hidden" name="cassaId" value={cassaId} />}
          <CampiMovimento metodi={metodi} merci={merci} operatori={operatori} />
          <Invia icona="salva">Registra uscita</Invia>
        </FormAzione>
      </BottoneModale>
    </>
  );
}

/** Il registro: movimenti a mano e soldi arrivati dalle attività, per data. */
export function RegistroCassa({
  voci,
  origine,
  indirizzo,
  modificabile,
  metodi,
  merci = [],
  operatori,
}: {
  voci: Voce[];
  origine: Origine;
  /** L'indirizzo di questa vista con un'altra origine. */
  indirizzo: (o: Origine) => string;
  /** Chi può correggere ed eliminare i movimenti a mano. */
  modificabile: boolean;
  metodi: Metodo[];
  merci?: Merce[];
  operatori: Operatore[];
}) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="titolo-sezione">Movimenti di cassa</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ORIGINI) as Origine[]).map((o) => (
            <Link
              key={o}
              href={indirizzo(o)}
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
              elimina={
                modificabile &&
                v.movimento && (
                  // sul telefono la matita sta accanto al cestino, solo icona
                  <span className="flex items-center gap-1.5">
                    <ModificaMovimento
                      movimento={v.movimento}
                      metodi={metodi}
                      merci={merci}
                      operatori={operatori}
                      soloIcona
                    />
                    <EliminaMovimento movimento={v.movimento} />
                  </span>
                )
              }
              fascia={
                !!v.movimento?.beneficiario?.metodiPersonali.length && (
                  <TendinaMetodi
                    nome={`${v.movimento.beneficiario.nome} ${v.movimento.beneficiario.cognome}`}
                    metodi={v.movimento.beneficiario.metodiPersonali}
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
                  {modificabile && <th>Azioni</th>}
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
                    {modificabile && (
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
                      <td colSpan={modificabile ? 8 : 7} className="!pt-0 !pb-3">
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

export function ModificaMovimento({
  movimento,
  metodi,
  merci,
  operatori,
  soloIcona = false,
}: {
  movimento: Movimento;
  metodi: Metodo[];
  merci: Merce[];
  operatori: Operatore[];
  /** Nella card del telefono: la matita accanto al cestino. */
  soloIcona?: boolean;
}) {
  return (
    <>
      <BottoneModale
        etichetta="Modifica"
        icona="modifica"
        titolo={`Modifica "${movimento.descrizione}"`}
        className="btn-ghost btn-sm"
        soloIcona={soloIcona}
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

export function CampiMovimento({
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
