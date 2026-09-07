import Link from 'next/link';
import { fmtDateTime } from '@/lib/format';
import type { Citabile } from '@/lib/note';
import { Markdown } from '@/components/Markdown';
import { Badge, Campo } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { EditoreMarkdown } from '@/components/EditoreMarkdown';
import { eliminaNota, salvaNota } from '@/actions/note';

/**
 * Le note e il modo di scriverle.
 *
 * Sono tre posti diversi che mostrano la stessa cosa — la scheda di una
 * persona, la pagina di un'attività, l'elenco generale — e tenere il pezzo in
 * un componente solo è ciò che impedisce che fra qualche mese si comportino in
 * tre modi diversi.
 */

export type NotaLetta = {
  id: string;
  titolo: string;
  testo: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  eventId: string | null;
  persona: { nome: string; cognome: string; callsign: string | null } | null;
  evento: { titolo: string } | null;
  citate: { utente: { id: string; nome: string; cognome: string; callsign: string | null } }[];
};

/** Il modulo: uguale per una nota nuova e per una da correggere. */
export function FormNota({
  persone,
  nota,
  userId,
  eventId,
  precedenti = [],
}: {
  persone: Citabile[];
  nota?: NotaLetta;
  /** A chi è appuntata, se nasce dalla scheda di una persona. */
  userId?: string;
  /** A quale attività, se nasce dalla pagina di un'attività. */
  eventId?: string;
  /** Quello che avevi già scritto su questa persona, da rileggere qui. */
  precedenti?: NotaLetta[];
}) {
  return (
    <FormAzione azione={salvaNota}>
      {nota && <input type="hidden" name="id" value={nota.id} />}
      {userId && <input type="hidden" name="userId" value={userId} />}
      {eventId && <input type="hidden" name="eventId" value={eventId} />}

      <Campo label="Titolo" span>
        <input
          name="titolo"
          defaultValue={nota?.titolo}
          className="input"
          maxLength={120}
          placeholder="Cos'è successo, in poche parole"
        />
      </Campo>

      <Campo label="Nota" span>
        <EditoreMarkdown
          nome="testo"
          valore={nota?.testo}
          persone={persone}
          righe={8}
          segnaposto={'Alla seconda partita @nome ha coperto bene il fianco destro…'}
        />
      </Campo>

      <p className="text-xs text-muted">
        La legge <strong className="text-ink">solo tu</strong>: nessun altro, admin compreso. Chi
        nomini con la chiocciola se la ritrova sulla propria scheda — ma sempre soltanto sotto i
        tuoi occhi.
      </p>

      <Invia icona="salva">{nota ? 'Salva' : 'Aggiungi la nota'}</Invia>

      {precedenti.length > 0 && <Precedenti note={precedenti} persone={persone} />}
    </FormAzione>
  );
}

/**
 * Quello che avevi già annotato su questa persona, da sfogliare mentre scrivi.
 *
 * Serve a non ripetersi e a ricordare com'era finita l'altra volta. Sono
 * riquadri apribili e non un elenco aperto: quindici note spalancate sopra il
 * modulo lo spingerebbero fuori schermo, che è il contrario di comodo. Si
 * legge e basta — per correggerne una si passa dall'elenco vero.
 */
function Precedenti({ note, persone }: { note: NotaLetta[]; persone: Citabile[] }) {
  const menzioni = Object.fromEntries(persone.map((p) => [p.maniglia, p.nome]));

  return (
    <div className="border-t border-line pt-3">
      <p className="mb-2 flex flex-wrap items-center gap-2">
        <span className="titolo-sezione">Note precedenti · {note.length}</span>
        <Badge tono="info">privato</Badge>
      </p>
      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
        {note.map((n) => (
          <details key={n.id} className="rounded-md border border-line bg-surface2">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm marker:content-none">
              <span className="font-medium">{n.titolo}</span>
              <span className="num ml-2 text-[11px] text-muted">
                {fmtDateTime(n.createdAt)}
                {n.evento ? ` · “${n.evento.titolo}”` : ''}
              </span>
            </summary>
            <div className="border-t border-line px-3 pb-2 [&>div]:max-w-none">
              <Markdown testo={n.testo} menzioni={menzioni} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Una nota già scritta. */
export function Nota({
  nota,
  persone,
  contesto = true,
}: {
  nota: NotaLetta;
  persone: Citabile[];
  /** Mostra a chi e a cosa è appuntata: superfluo dove si è già. */
  contesto?: boolean;
}) {
  const menzioni = Object.fromEntries(persone.map((p) => [p.maniglia, p.nome]));

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        {/* Il badge sta su ogni nota e non solo in cima all'elenco: una nota
            la si rilegge da sola, magari mesi dopo, e chi non ricorda la regola
            deve trovarla lì. Scrivere di qualcuno credendo che sia privato
            quando non lo è, è il modo peggiore di scoprirlo. */}
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {nota.titolo}
          <Badge tono="info">privato</Badge>
        </p>
        <span className="flex shrink-0 gap-2">
          <BottoneModale
            etichetta="Modifica"
            icona="modifica"
            titolo="Modifica la nota"
            className="btn-ghost btn-sm"
            larga
          >
            <FormNota persone={persone} nota={nota} />
          </BottoneModale>
          <AzioneBottone
            azione={eliminaNota}
            valori={{ id: nota.id }}
            icona="elimina"
            conferma="Eliminare la nota? Non la può recuperare nessuno."
            className="btn-danger btn-sm"
          >
            Elimina
          </AzioneBottone>
        </span>
      </div>

      {contesto && (nota.persona || nota.evento) && (
        <p className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <span>su</span>
          {nota.persona && (
            <Link href={`/admin/operatori/${nota.userId}`} className="hover:text-nvg">
              {nota.persona.callsign ?? `${nota.persona.nome} ${nota.persona.cognome}`}
            </Link>
          )}
          {/* una nota può riguardare una persona *durante* un'attività: si tiene
              il legame con tutte e due, così la si ritrova da entrambe le parti */}
          {nota.persona && nota.evento && <span>·</span>}
          {nota.evento && (
            <Link href={`/calendario/${nota.eventId}`} className="hover:text-nvg">
              “{nota.evento.titolo}”
            </Link>
          )}
        </p>
      )}

      <div className="[&>div]:max-w-none">
        <Markdown testo={nota.testo} menzioni={menzioni} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-2">
        <span className="num text-[11px] text-muted">
          {fmtDateTime(nota.createdAt)}
          {nota.updatedAt.getTime() - nota.createdAt.getTime() > 60_000 &&
            ` · corretta ${fmtDateTime(nota.updatedAt)}`}
        </span>
        {nota.citate.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {nota.citate.map((c) => (
              <Link key={c.utente.id} href={`/admin/operatori/${c.utente.id}`}>
                <Badge tono="info">
                  {c.utente.callsign ?? `${c.utente.nome} ${c.utente.cognome}`}
                </Badge>
              </Link>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

/** Il blocco intero: intestazione, pulsante e note. */
export function BloccoNote({
  note,
  persone,
  userId,
  eventId,
  titolo = 'Le tue note',
  contesto = false,
}: {
  note: NotaLetta[];
  persone: Citabile[];
  userId?: string;
  eventId?: string;
  titolo?: string;
  contesto?: boolean;
}) {
  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex flex-wrap items-center gap-2">
            <span className="titolo-sezione">{titolo}</span>
            <Badge tono="info">privato</Badge>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Le legge solo chi le ha scritte: nessun altro, admin compreso.
          </p>
        </div>
        <BottoneModale etichetta="Nuova nota" icona="aggiungi" titolo="Nuova nota" larga>
          <FormNota persone={persone} userId={userId} eventId={eventId} />
        </BottoneModale>
      </div>

      {note.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Nessuna nota tua qui.
        </p>
      ) : (
        <div className="space-y-2">
          {note.map((n) => (
            <Nota key={n.id} nota={n} persone={persone} contesto={contesto} />
          ))}
        </div>
      )}
    </div>
  );
}
