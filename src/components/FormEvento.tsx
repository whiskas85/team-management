import { Campo } from './ui';
import { inputDateTime } from '@/lib/format';
import { QuoteEvento } from './QuoteEvento';
import type { VoceListino } from './CampiRichiesta';

type CampoGioco = { id: string; nome: string; citta: string | null; attivo?: boolean };
type Tipologia = { id: string; nome: string; attivo?: boolean };

type Evento = {
  id: string;
  titolo: string;
  descrizione: string | null;
  tipoId: string | null;
  inizio: Date;
  fine: Date | null;
  ritrovo: string | null;
  oraRitrovo: Date | null;
  fieldId: string | null;
  costo: unknown;
  costoEsterni: unknown;
  stagioneId: string | null;
  maxPartecipanti: number | null;
  chiusuraIscrizioni: Date | null;
  note: string | null;
};

const numero = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/**
 * Campi condivisi tra creazione e modifica. In versione `compatto` (dentro il
 * calendario) restano solo i campi essenziali, il resto si compila poi.
 */
export function FormEvento({
  campi,
  tipologie,
  listino,
  stagioneId,
  evento,
  inizioPredefinito,
  compatto = false,
}: {
  campi: CampoGioco[];
  tipologie: Tipologia[];
  /** Voci di tariffario con cui si compongono le due quote. */
  listino: VoceListino[];
  /** Stagione in cui l'attività vive: filtra il listino. */
  stagioneId: string | null;
  evento?: Evento;
  inizioPredefinito?: string;
  compatto?: boolean;
}) {
  return (
    <>
      {evento && <input type="hidden" name="id" value={evento.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <Campo label="Descrizione" span>
          <textarea
            name="descrizione"
            rows={compatto ? 2 : 3}
            defaultValue={evento?.descrizione ?? ''}
            className="input"
            placeholder="Cosa si fa, equipaggiamento richiesto, note logistiche…"
          />
        </Campo>

        {!compatto && (
          <>
        <Campo label="Punto di ritrovo">
          <input
            name="ritrovo"
            defaultValue={evento?.ritrovo ?? ''}
            className="input"
            placeholder="es. Autogrill A4 uscita Bergamo"
          />
        </Campo>

        <Campo label="Ora ritrovo">
          <input
            type="datetime-local"
            name="oraRitrovo"
            defaultValue={inputDateTime(evento?.oraRitrovo)}
            className="input"
          />
        </Campo>

        <QuoteEvento
          listino={listino}
          stagioneId={evento?.stagioneId ?? stagioneId}
          costo={numero(evento?.costo)}
          costoEsterni={numero(evento?.costoEsterni)}
          // su un'attività nuova la giocata degli esterni parte spuntata: è il
          // caso normale, e chi vuole regalarla scrive zero
          preselezionaEsterni={!evento}
        />

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

        <Campo label="Note interne" span>
          <textarea name="note" rows={2} defaultValue={evento?.note ?? ''} className="input" />
        </Campo>
          </>
        )}
      </div>
    </>
  );
}
