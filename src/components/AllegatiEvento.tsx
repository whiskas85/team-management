import Link from 'next/link';
import { AzioneBottone } from './AzioneBottone';
import { BottoneModale } from './Modale';
import { ElencoOrdinabile } from './ElencoOrdinabile';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Icona } from './Icona';
import { Badge, Campo } from './ui';
import {
  ESTENSIONI_ALLEGATO,
  MAX_ALLEGATO_BYTES,
  etichettaGenere,
  genereAllegato,
  peso,
} from '@/lib/allegati';
import { aggiornaAllegato, caricaAllegato, ordinaAllegati, togliAllegato } from '@/actions/allegati';

export type Allegato = {
  id: string;
  titolo: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  pubblico: boolean;
  /** Già formattata: qui dentro non si fanno date. */
  aggiornatoIl: string;
  caricatoDa: string | null;
};

const ACCETTA = ESTENSIONI_ALLEGATO.join(',');
const MEGA = Math.round(MAX_ALLEGATO_BYTES / 1024 / 1024);

/**
 * Gli allegati dell'attività: il book di missione, e quello che gli sta intorno.
 *
 * **Si apre dentro il gestionale, non si scarica e basta.** Un book scaricato
 * è un file in mezzo ad altri file, che la domenica mattina nessuno ritrova, e
 * che resta fermo alla versione di quando l'hanno preso. Aperto da qui è
 * sempre quello giusto — se lo sostituiscono, cambia sotto lo stesso link.
 * Scaricarlo si può, e serve: in campo la rete non c'è.
 *
 * La spunta *anche fuori* è il motivo per cui questo riquadro esiste. Un book
 * si manda alle squadre che vengono a giocare, e finora lo si mandava per
 * WhatsApp: adesso compare nella **loro** pagina d'invito, senza dare loro
 * niente di più di quello che già vedevano.
 */
export function AllegatiEvento({
  eventId,
  allegati,
  puoGestire,
  conOspiti,
}: {
  eventId: string;
  allegati: Allegato[];
  puoGestire: boolean;
  /** Ci sono squadre invitate: allora «anche fuori» ha un destinatario vero. */
  conOspiti: boolean;
}) {
  if (!puoGestire && allegati.length === 0) return null;

  const righe = allegati.map((a) => ({
    id: a.id,
    contenuto: <Riga key={a.id} eventId={eventId} allegato={a} puoGestire={puoGestire} />,
  }));

  const fuori = allegati.filter((a) => a.pubblico).length;

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="titolo-sezione">Allegati</p>
        {allegati.length > 0 && (
          <p className="num text-xs text-muted">
            {allegati.length} {allegati.length === 1 ? 'documento' : 'documenti'}
            {fuori > 0 && <span className="text-nvg"> · {fuori} anche fuori</span>}
          </p>
        )}
      </div>

      {allegati.length === 0 ? (
        <p className="text-sm text-muted">
          Nessun allegato. Qui va il book di missione — in PDF, in Markdown o in HTML — e si legge
          aprendolo da qui, senza scaricarlo.
        </p>
      ) : puoGestire && allegati.length > 1 ? (
        /* l'ordine è una scelta di chi l'ha scritto: il book in cima, gli
           allegati dopo. Si dà trascinando dalla maniglia. */
        <ElencoOrdinabile azione={ordinaAllegati} valori={{ eventId }} elementi={righe} />
      ) : (
        <div className="space-y-2">{righe.map((r) => r.contenuto)}</div>
      )}

      {puoGestire && (
        <div className="mt-4 border-t border-line pt-3">
          <BottoneModale
            etichetta="Allega un documento"
            icona="carica"
            titolo="Allega un documento"
            larga
          >
            <FormAllegato eventId={eventId} conOspiti={conOspiti} />
          </BottoneModale>
        </div>
      )}
    </div>
  );
}

function Riga({
  eventId,
  allegato: a,
  puoGestire,
}: {
  eventId: string;
  allegato: Allegato;
  puoGestire: boolean;
}) {
  const genere = genereAllegato(a.mimeType);
  const indirizzo = `/calendario/${eventId}/allegati/${a.id}`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-muted">
        <Icona nome="allegato" size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <Link href={indirizzo} className="block truncate font-medium hover:text-nvg">
          {a.titolo}
        </Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          <span className="num">{etichettaGenere[genere]}</span>
          <span className="num">{peso(a.fileSize)}</span>
          <span>agg. {a.aggiornatoIl}</span>
          {a.caricatoDa && <span>· {a.caricatoDa}</span>}
          {a.pubblico && <Badge tono="info">anche fuori</Badge>}
        </span>
      </span>

      <span className="flex flex-wrap items-center gap-2">
        <Link href={indirizzo} className="btn-ghost btn-sm">
          <Icona nome="apri" size={15} />
          Apri
        </Link>
        {/* in campo la rete non c'è: il book portato via serve */}
        <a href={`/api/allegati/${a.id}?scarica=1`} className="btn-ghost btn-sm" download>
          <Icona nome="scarica" size={15} />
          Scarica
        </a>

        {puoGestire && (
          <>
            <BottoneModale
              etichetta="Modifica"
              icona="modifica"
              titolo={`Modifica «${a.titolo}»`}
              className="btn-ghost btn-sm"
              larga
            >
              <FormAllegato allegato={a} />
            </BottoneModale>
            <AzioneBottone
              azione={togliAllegato}
              valori={{ id: a.id }}
              icona="elimina"
              conferma={`Togliere «${a.titolo}»? Il file non si recupera.`}
              className="btn-danger btn-sm"
            >
              Togli
            </AzioneBottone>
          </>
        )}
      </span>
    </div>
  );
}

/**
 * Lo stesso modulo per caricare e per sostituire.
 *
 * Sostituire non è caricarne un altro accanto: il file nuovo prende il posto
 * del vecchio sulla stessa riga, con lo stesso titolo e lo stesso link. Chi ha
 * mandato quell'indirizzo a una squadra ospite non deve rimandarlo a ogni
 * correzione, e nessuno deve trovarsi davanti a un «book v2» chiedendosi quale
 * dei due sia quello di oggi.
 */
function FormAllegato({
  eventId,
  allegato,
  conOspiti = false,
}: {
  eventId?: string;
  allegato?: Allegato;
  conOspiti?: boolean;
}) {
  const modifica = !!allegato;

  return (
    <FormAzione azione={modifica ? aggiornaAllegato : caricaAllegato}>
      {allegato ? (
        <input type="hidden" name="id" value={allegato.id} />
      ) : (
        <input type="hidden" name="eventId" value={eventId} />
      )}

      <Campo label="Come si chiama" span>
        <input
          name="titolo"
          className="input"
          required
          maxLength={120}
          defaultValue={allegato?.titolo ?? ''}
          placeholder="es. Book di missione"
        />
        <p className="mt-1 text-xs text-muted">
          Il nome che si legge nell’elenco. «Book di missione», non il nome che gli ha dato il
          computer di chi l’ha fatto.
        </p>
      </Campo>

      <Campo label={modifica ? 'Sostituisci il file' : 'Il file'} span>
        <input
          type="file"
          name="file"
          accept={ACCETTA}
          required={!modifica}
          className="input file:mr-3 file:rounded file:border-0 file:bg-surface2 file:px-3 file:py-1 file:text-ink"
        />
        <p className="mt-1 text-xs text-muted">
          PDF, Markdown (.md) o HTML, fino a {MEGA} MB.
          {allegato && (
            <>
              {' '}
              Lasciandolo vuoto resta <span className="text-ink">{allegato.fileName}</span>: si
              cambiano solo il nome e la spunta.
            </>
          )}
        </p>
      </Campo>

      <Campo label="Chi lo vede" span>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="pubblico"
            defaultChecked={allegato?.pubblico ?? false}
            className="mt-0.5 accent-nvg"
          />
          <span>
            Anche le squadre ospiti, dalla loro pagina d’invito.
            <span className="mt-0.5 block text-xs text-muted">
              Senza la spunta lo vede solo chi ha un accesso qui dentro.
              {conOspiti
                ? ' Le squadre già invitate lo trovano subito, sullo stesso link di sempre.'
                : ' Finché non si invita nessuno la spunta non cambia niente: resta pronta per quando servirà.'}
            </span>
          </span>
        </label>
      </Campo>

      <Invia icona={modifica ? 'salva' : 'carica'}>{modifica ? 'Salva' : 'Allega'}</Invia>
    </FormAzione>
  );
}
