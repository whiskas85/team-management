import Link from 'next/link';
import { BottoneElimina, CardRiga } from './CardRiga';
import { BottoneModale } from './Modale';
import { ElencoOrdinabile } from './ElencoOrdinabile';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Icona } from './Icona';
import { Badge, Campo } from './ui';
import { CampoFile } from './CampoFile';
import {
  ESTENSIONI_ALLEGATO,
  MAX_ALLEGATO_BYTES,
  etichettaGenere,
  genereAllegato,
  peso,
} from '@/lib/allegati';
import {
  aggiornaAllegato,
  caricaAllegato,
  ordinaAllegati,
  leggiAllegatoScritto,
  salvaAllegatoScritto,
  togliAllegato,
} from '@/actions/allegati';
import { EditoreMarkdown } from './EditoreMarkdown';

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
  /**
   * Il link firmato per aprirlo fuori, in una pagina nuova (PDF e HTML).
   * Vuoto per i Markdown, che si leggono nella pagina del gestionale.
   */
  aperturaEsterna?: string | null;
};

const ACCETTA = ESTENSIONI_ALLEGATO.join(',');
const MEGA = Math.round(MAX_ALLEGATO_BYTES / 1024 / 1024);

/**
 * Gli allegati dell'attività: il book di missione, e quello che gli sta intorno.
 *
 * **Si apre da qui, non si scarica e basta.** Un book scaricato è un file in
 * mezzo ad altri file, che la domenica mattina nessuno ritrova, e che resta
 * fermo alla versione di quando l'hanno preso. Aperto da qui è sempre quello
 * giusto — se lo sostituiscono, cambia sotto lo stesso link. Scaricarlo si
 * può, e serve: in campo la rete non c'è.
 *
 * PDF e HTML si aprono **fuori dall'applicazione, in una pagina nuova**: il
 * lettore del telefono ingrandisce e scorre meglio di una pagina di OPS, e
 * chiudendolo si torna dove si era invece di dover risalire indietro. Il
 * Markdown resta dentro: è un documento scritto qui, e la pagina del
 * gestionale è il suo lettore.
 *
 * La spunta *anche fuori* è il motivo per cui questo riquadro esiste. Un book
 * si manda alle squadre che vengono a giocare, e finora lo si mandava per
 * WhatsApp: adesso compare nella **loro** pagina d'invito, senza dare loro
 * niente di più di quello che già vedevano.
 */
export async function AllegatiEvento({
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

  /*
   * Il testo dei documenti scritti qui, per poterli riaprire nell'editore.
   *
   * Si legge solo per chi li gestisce e solo per i Markdown: a chi legge e
   * basta non serve, e un PDF da venti mega non si carica in memoria per
   * mostrare un pulsante che quella persona non vedrebbe comunque.
   */
  const testi = puoGestire
    ? Object.fromEntries(
        await Promise.all(
          allegati
            .filter((a) => genereAllegato(a.mimeType) === 'md')
            .map(async (a) => [a.id, await leggiAllegatoScritto(a.id)] as const),
        ),
      )
    : {};

  const righe = allegati.map((a) => ({
    id: a.id,
    contenuto: (
      <Riga
        key={a.id}
        eventId={eventId}
        allegato={a}
        puoGestire={puoGestire}
        testo={testi[a.id] ?? undefined}
      />
    ),
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
        <div className="piede mt-4">
          {/* Due strade per la stessa cosa, e sono due gesti diversi: uno ha
              gia' il file e lo attacca, l'altro il documento lo scrive adesso
              -- il book di missione si finisce la sera prima, e farlo scrivere
              altrove vuol dire che la versione buona sta da un'altra parte. */}
          <BottoneModale
            etichetta="Scrivi un documento"
            icona="bozza"
            titolo="Scrivi un documento"
            className="btn-ghost btn-sm"
            larga
          >
            <FormScritto eventId={eventId} conOspiti={conOspiti} />
          </BottoneModale>

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

/**
 * Il documento scritto qui dentro, in Markdown.
 *
 * **Non e' un allegato di serie B**: finisce nello stesso elenco, con lo stesso
 * link e lo stesso ordine, e chi lo legge non sa se e' nato qui o e' arrivato
 * da fuori. Quello che cambia e' che si puo' riaprire e correggere, e questo
 * cambia cosa ci si scrive: un book che si corregge lo si scrive il mercoledi'
 * invece che la domenica mattina.
 *
 * L'editore e' lo stesso dei regolamenti, con la sua anteprima: quello che si
 * vede scrivendo e' quello che leggera' chi apre il documento.
 */
function FormScritto({
  eventId,
  allegato,
  testo,
  conOspiti = false,
}: {
  eventId?: string;
  allegato?: Allegato;
  /** Il testo di prima, quando si sta correggendo. */
  testo?: string;
  conOspiti?: boolean;
}) {
  return (
    <FormAzione azione={salvaAllegatoScritto}>
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
      </Campo>

      <Campo label="Il documento" span>
        <EditoreMarkdown nome="testo" valore={testo ?? ''} righe={18} />
      </Campo>

      <Campo label="Chi lo vede" span>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="pubblico"
            defaultChecked={allegato?.pubblico ?? false}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>
            Anche le squadre ospiti
            <span className="block text-xs text-muted">
              {conOspiti
                ? 'Lo vedranno aprendo il loro link d\u2019invito.'
                : 'Serve quando inviterai qualcuno da fuori: senza spunta resta nostro.'}
            </span>
          </span>
        </label>
      </Campo>

      <Invia icona="salva">{allegato ? 'Salva le modifiche' : 'Allega il documento'}</Invia>
    </FormAzione>
  );
}

function Riga({
  eventId,
  allegato: a,
  puoGestire,
  testo,
}: {
  eventId: string;
  allegato: Allegato;
  puoGestire: boolean;
  /** Il testo, se e' un documento scritto qui: allora si corregge invece di sostituirlo. */
  testo?: string;
}) {
  const genere = genereAllegato(a.mimeType);
  const indirizzo = `/calendario/${eventId}/allegati/${a.id}`;

  /** Il collegamento che apre l'allegato: fuori in una pagina nuova, o qui dentro. */
  const Apri = ({ className, children }: { className: string; children: React.ReactNode }) =>
    a.aperturaEsterna ? (
      <a href={a.aperturaEsterna} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    ) : (
      <Link href={indirizzo} className={className}>
        {children}
      </Link>
    );

  return (
    <CardRiga
      titolo={
        <Apri className="inline-flex items-start gap-2 hover:text-nvg">
          <span className="mt-0.5 shrink-0 text-muted">
            <Icona nome="allegato" size={16} />
          </span>
          <span>{a.titolo}</span>
        </Apri>
      }
      sottotitolo={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="num">{etichettaGenere[genere]}</span>
          <span className="num">{peso(a.fileSize)}</span>
          <span>agg. {a.aggiornatoIl}</span>
          {a.caricatoDa && <span>· {a.caricatoDa}</span>}
          {a.pubblico && <Badge tono="info">anche fuori</Badge>}
        </span>
      }
      elimina={
        puoGestire && (
          <BottoneElimina
            azione={togliAllegato}
            valori={{ id: a.id }}
            conferma={`Togliere «${a.titolo}»? Il file non si recupera.`}
            etichetta={`Togli ${a.titolo}`}
          />
        )
      }
      azioni={
        <>
          <Apri className="btn-ghost btn-sm">
            <Icona nome="apri" size={15} />
            Apri
          </Apri>
          {/* in campo la rete non c'è: il book portato via serve */}
          <a href={`/api/allegati/${a.id}?scarica=1`} className="btn-ghost btn-sm" download>
            <Icona nome="scarica" size={15} />
            Scarica
          </a>
          {/* Un documento scritto qui si corregge, non si sostituisce: il
              file da caricare non ce l'ha nessuno, sta in queste righe. */}
          {puoGestire && testo !== undefined && (
            <BottoneModale
              etichetta="Modifica"
              icona="modifica"
              titolo={`Modifica «${a.titolo}»`}
              className="btn-ghost btn-sm"
              larga
            >
              <FormScritto allegato={a} testo={testo} />
            </BottoneModale>
          )}

          {puoGestire && testo === undefined && (
            <BottoneModale
              etichetta="Modifica"
              icona="modifica"
              titolo={`Modifica «${a.titolo}»`}
              className="btn-ghost btn-sm"
              larga
            >
              <FormAllegato allegato={a} />
            </BottoneModale>
          )}
        </>
      }
    />
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

      <CampoFile
        label={modifica ? 'Sostituisci il file' : 'Il file'}
        span
        accept={ACCETTA}
        estensioni={ESTENSIONI_ALLEGATO}
        maxBytes={MAX_ALLEGATO_BYTES}
        required={!modifica}
        className="input file:mr-3 file:rounded file:border-0 file:bg-surface2 file:px-3 file:py-1 file:text-ink"
        aiuto={
          <>
            PDF, Markdown (.md) o HTML, fino a {MEGA} MB.
            {allegato && (
              <>
                {' '}
                Lasciandolo vuoto resta <span className="text-ink">{allegato.fileName}</span>: si
                cambiano solo il nome e la spunta.
              </>
            )}
          </>
        }
      />

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
