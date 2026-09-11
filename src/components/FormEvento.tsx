import type { ReactNode } from 'react';
import { Campo } from './ui';
import { inputDateTime } from '@/lib/format';
import { QuoteEvento } from './QuoteEvento';
import { CercaLuogo } from './CercaLuogo';
import type { VoceListino } from './CampiRichiesta';

type CampoGioco = { id: string; nome: string; citta: string | null; attivo?: boolean };
type Tipologia = { id: string; nome: string; attivo?: boolean };
type TipoGara = { id: string; nome: string; attivo?: boolean };

type Evento = {
  id: string;
  titolo: string;
  descrizione: string | null;
  tipoId: string | null;
  tipoGaraId: string | null;
  durataOre: number | null;
  inizio: Date;
  fine: Date | null;
  ritrovo: string | null;
  ritrovoLat: number | null;
  ritrovoLng: number | null;
  oraRitrovo: Date | null;
  fieldId: string | null;
  luogo: string | null;
  luogoLat: number | null;
  luogoLng: number | null;
  costo: unknown;
  costoEsterni: unknown;
  /** Le voci del tariffario spuntate nelle due card. */
  vociSquadra?: string[];
  vociEsterni?: string[];
  /** Le quote aggiunte con il +, solo per questa attività. */
  vociAttivita?: {
    id: string;
    perEsterni: boolean;
    nome: string;
    importo: unknown;
    cassaId: string | null;
    scelta: boolean;
    cassa: { nome: string } | null;
  }[];
  /** Le quote delle altre casse: servono solo a sapere se ce n'è. */
  quoteCasse?: unknown[];
  stagioneId: string | null;
  maxPartecipanti: number | null;
  chiusuraIscrizioni: Date | null;
  note: string | null;
  linkRiunione: string | null;
  /** Riservata alla squadra o aperta a tutti: decide se serve la quota esterni. */
  visibilita?: string | null;
  tipo?: { riunione: boolean } | null;
};

const numero = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/**
 * Un gruppo di campi, con il suo titolo.
 *
 * Il modulo di un'attività ha quindici caselle: tutte in fila diventano un
 * muro in cui non si trova più niente. Divise per argomento — cosa si fa, chi
 * ci sta, dove, quanto costa — si compila quello che serve e si salta il resto.
 */
function Sezione({
  titolo,
  sottotitolo,
  evidenzia,
  children,
}: {
  titolo: string;
  sottotitolo?: string;
  /** Barra colorata sul bordo: si usa dove ci sono di mezzo dei soldi. */
  evidenzia?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border border-line bg-surface/40 p-3 ${
        evidenzia ? 'border-l-2 border-l-warn' : ''
      }`}
    >
      <p className="titolo-sezione">{titolo}</p>
      {sottotitolo && <p className="mb-2 mt-0.5 text-[11px] text-muted">{sottotitolo}</p>}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${sottotitolo ? '' : 'mt-2'}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Campi condivisi tra creazione e modifica.
 *
 * In versione `compatto` (dentro il calendario) restano i campi essenziali, il
 * resto si compila poi. Con `soloLogistica` il modulo si riduce a quello che
 * può toccare un team leader: il titolo, dove si gioca e dove ci si trova —
 * quote, posti e destinatari restano di chi gestisce il calendario.
 */
export function FormEvento({
  campi,
  tipologie,
  tipiGara = [],
  listino,
  stagioneId,
  stagioni = [],
  evento,
  inizioPredefinito,
  compatto = false,
  soloLogistica = false,
  giorni = 1,
  conNuovi = false,
  casse = [],
}: {
  campi: CampoGioco[];
  tipologie: Tipologia[];
  /** Che gara è: l'anagrafica dei formati. Vuota, i due campi non compaiono. */
  tipiGara?: TipoGara[];
  /** Voci di tariffario con cui si compongono le due quote. */
  listino: VoceListino[];
  /** Stagione in cui l'attività vive: filtra il listino. */
  stagioneId: string | null;
  /** Le stagioni in cui si può metterla: la corrente e quelle che verranno. */
  stagioni?: { id: string; nome: string; corrente: boolean }[];
  evento?: Evento;
  inizioPredefinito?: string;
  compatto?: boolean;
  soloLogistica?: boolean;
  /** Giorni che l'attività occupa: le voci «al giorno» della quota contano per ognuno. */
  giorni?: number;
  /** Fra i partecipanti c'è un nuovo: la quota esterni serve anche sull'attività di squadra. */
  conNuovi?: boolean;
  /** Le casse a cui l'attività può chiedere una quota, oltre al club. */
  casse?: { id: string; nome: string }[];
}) {
  const conQuota =
    numero(evento?.costo) !== null ||
    numero(evento?.costoEsterni) !== null ||
    (evento?.quoteCasse?.length ?? 0) > 0;
  // le quote aggiunte con il +, divise per card
  const aggiunte = (perEsterni: boolean) =>
    (evento?.vociAttivita ?? [])
      .filter((v) => v.perEsterni === perEsterni)
      .map((v) => ({
        id: v.id,
        chiave: v.id,
        nome: v.nome,
        importo: Number(v.importo),
        cassaId: v.cassaId,
        cassa: v.cassa?.nome ?? null,
        scelta: v.scelta,
      }));

  // Su una riunione metà del modulo non c'entra: non c'è un punto di ritrovo da
  // raggiungere in macchina, non ci sono posti contati, non si paga. Nasconderli
  // non è togliere possibilità: è non far leggere quindici caselle per
  // compilarne quattro.
  const eRiunione = evento?.tipo?.riunione ?? false;

  const dove = (
    <Sezione
      titolo="Dove"
      sottotitolo="Il campo dall'elenco, oppure un indirizzo qualsiasi. E dove ci si trova prima."
    >
      <Campo label="Campo">
        <select name="fieldId" defaultValue={evento?.fieldId ?? ''} className="input">
          <option value="">— nessuno —</option>
          {campi.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
              {c.citta ? ` · ${c.citta}` : ''}
              {c.attivo === false ? ' (archiviato)' : ''}
            </option>
          ))}
        </select>
      </Campo>

      <CercaLuogo
        nome="luogo"
        etichetta="Oppure un indirizzo"
        valore={evento?.luogo}
        lat={evento?.luogoLat}
        lng={evento?.luogoLng}
        segnaposto="es. Fiera di Chieri, oppure un link di Maps"
        aiuto="Per quando non è un campo dell'elenco: una fiera, un parcheggio, la sede di un'altra squadra."
      />

      {eRiunione ? (
        <Campo label="Collegamento da remoto" span>
          <input
            name="linkRiunione"
            defaultValue={evento?.linkRiunione ?? ''}
            className="input"
            placeholder="https://meet.google.com/… — vuoto se ci si vede di persona"
          />
        </Campo>
      ) : (
        <>
          <CercaLuogo
            nome="ritrovo"
            etichetta="Punto di ritrovo"
            valore={evento?.ritrovo}
            lat={evento?.ritrovoLat}
            lng={evento?.ritrovoLng}
            segnaposto="es. Autogrill A4 uscita Bergamo"
            aiuto="Scrivi il posto e premi Cerca, oppure incolla un link di Google Maps."
          />

          <Campo label="Ora del ritrovo">
            <input
              type="datetime-local"
              name="oraRitrovo"
              defaultValue={inputDateTime(evento?.oraRitrovo)}
              className="input"
            />
          </Campo>
        </>
      )}
    </Sezione>
  );

  if (soloLogistica) {
    return (
      <>
        {evento && <input type="hidden" name="id" value={evento.id} />}
        <div className="space-y-4">
          <Sezione titolo="Cos'è">
            <Campo label="Titolo *" span>
              <input
                name="titolo"
                required
                defaultValue={evento?.titolo}
                className="input"
                placeholder="es. Op. Silent Ridge"
              />
            </Campo>
          </Sezione>
          {dove}
        </div>
      </>
    );
  }

  return (
    <>
      {evento && <input type="hidden" name="id" value={evento.id} />}

      <div className="space-y-4">
        <Sezione titolo="Cos'è">
          <Campo label="Titolo *" span>
            <input
              name="titolo"
              required
              defaultValue={evento?.titolo}
              className="input"
              placeholder="es. Op. Silent Ridge"
            />
          </Campo>

          <Campo label="Tipologia">
            <select name="tipoId" defaultValue={evento?.tipoId ?? ''} className="input">
              <option value="">— nessuna —</option>
              {tipologie.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                  {t.attivo === false ? ' (disattivata)' : ''}
                </option>
              ))}
            </select>
          </Campo>

          {/* Che gara è, e quanto dura sul volantino.
              Su una riunione non vogliono dire niente, quindi lì non
              compaiono: il modulo è già lungo. */}
          {!eRiunione && tipiGara.length > 0 && (
            <Campo label="Tipo di gara">
              <select
                name="tipoGaraId"
                defaultValue={evento?.tipoGaraId ?? ''}
                className="input"
              >
                <option value="">— non è una gara —</option>
                {tipiGara.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                    {t.attivo === false ? ' (disattivato)' : ''}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          {!eRiunione && (
            <Campo label="Durata dichiarata (ore)">
              <input
                type="number"
                name="durataOre"
                min="1"
                max="240"
                defaultValue={evento?.durataOre ?? ''}
                className="input"
                placeholder="24"
              />
              {/* Il punto di questo campo è che **non** deve tornare con le
                  date, e chi compila deve saperlo prima di cominciare a
                  dubitarne: una 24 ore si tiene occupata dal venerdì alla
                  domenica, perché quello spazio serve tutto. */}
              <span className="mt-1 block text-[11px] text-muted">
                Quella del volantino. Non deve tornare con inizio e fine: una 24h si blocca
                dal venerdì alla domenica, e va bene così.
              </span>
            </Campo>
          )}

          <Campo label="Inizio *">
            <input
              type="datetime-local"
              name="inizio"
              required
              defaultValue={inputDateTime(evento?.inizio) || (inizioPredefinito ?? '')}
              className="input"
            />
          </Campo>

          <Campo label="Fine">
            <input
              type="datetime-local"
              name="fine"
              defaultValue={inputDateTime(evento?.fine)}
              className="input"
            />
          </Campo>

          {/* La stagione: di solito quella in corso, ma la gara di settembre
              si organizza a giugno e appartiene all'anno dopo. Da qui dipendono
              anche le voci di listino con cui si compongono le quote. */}
          {stagioni.length > 0 && (
            <Campo label="Stagione">
              <select
                name="stagioneId"
                defaultValue={
                  evento?.stagioneId ??
                  stagioneId ??
                  stagioni.find((s) => s.corrente)?.id ??
                  stagioni[0].id
                }
                className="input"
              >
                {stagioni.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                    {s.corrente ? ' (in corso)' : ''}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <Campo label="Descrizione" span>
            <textarea
              name="descrizione"
              rows={compatto ? 2 : 3}
              defaultValue={evento?.descrizione ?? ''}
              className="input"
              placeholder="Cosa si fa, equipaggiamento richiesto, note logistiche…"
            />
          </Campo>
        </Sezione>

        {!compatto && (
          <>
            {dove}

            {!eRiunione && (
            <Sezione
              titolo="Chi ci sta"
              sottotitolo="I posti non chiudono le adesioni: chi avanza va in riserva."
            >
              <Campo label="Posti massimi">
                <input
                  name="maxPartecipanti"
                  type="number"
                  min="1"
                  defaultValue={evento?.maxPartecipanti ?? ''}
                  className="input"
                />
              </Campo>

              <Campo label="Chiusura adesioni">
                <input
                  type="datetime-local"
                  name="chiusuraIscrizioni"
                  defaultValue={inputDateTime(evento?.chiusuraIscrizioni)}
                  className="input"
                />
              </Campo>
            </Sezione>
            )}

            {/* La barra sul bordo si accende quando c'è una quota: aprendo
                un'attività già scritta si vede a colpo d'occhio se qualcuno
                dovrà pagare, senza scorrere fino in fondo. */}
            {!eRiunione && (
            <Sezione
              titolo="Pagamenti"
              sottotitolo={
                conQuota
                  ? 'Questa attività ha una quota: chi si segna se la vedrà addebitata.'
                  : 'Lasciando vuoto, l’attività è gratuita.'
              }
              evidenzia={conQuota}
            >
              <div className="sm:col-span-2">
                <QuoteEvento
                  listino={listino}
                  stagioneId={evento?.stagioneId ?? stagioneId}
                  // riaprendo il modulo lo si ritrova com'era: le voci
                  // spuntate e le quote aggiunte con il +
                  vociSquadra={evento?.vociSquadra}
                  vociEsterni={evento?.vociEsterni}
                  vociAttivitaSquadra={aggiunte(false)}
                  vociAttivitaEsterni={aggiunte(true)}
                  casse={casse}
                  // su un'attività nuova la giocata degli esterni parte
                  // spuntata: è il caso normale, e chi vuole regalarla scrive
                  // zero
                  preselezionaEsterni={!evento}
                  // rilasciata alla sola squadra la quota esterni non serve, e
                  // tenerla lì si presta solo a sbagliare casella — a meno che
                  // non ci sia un nuovo forzato: allora è il suo prezzo
                  mostraEsterni={evento?.visibilita !== 'TEAM' || conNuovi}
                  giorni={giorni}
                />
              </div>
            </Sezione>
            )}

            <Sezione titolo="Note interne" sottotitolo="Le legge chi gestisce il calendario.">
              <Campo label="Note" span>
                <textarea
                  name="note"
                  rows={2}
                  defaultValue={evento?.note ?? ''}
                  className="input"
                />
              </Campo>
            </Sezione>
          </>
        )}
      </div>
    </>
  );
}
