import { fmtDateTime, nomeCompleto } from '@/lib/format';
import { Badge } from '@/components/ui';
import { Campo } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { EditoreMarkdown } from '@/components/EditoreMarkdown';
import { Invia } from '@/components/Bottone';
import { eliminaDebriefing, salvaDebriefing } from '@/actions/debriefing';

export type DebriefingLetto = {
  titolo: string | null;
  testo: string;
  pubblicato: boolean;
  aggiornatoIl: Date;
  autore: { nome: string; cognome: string; callsign: string | null } | null;
};

/**
 * Il modulo del debriefing: uguale dovunque lo si apra.
 *
 * Si scrive dalla scheda dell'attività e si corregge anche dalla pagina che li
 * raccoglie: uno rilegge il proprio racconto lì, e lì gli viene voglia di
 * sistemare la frase storta.
 */
export function FormDebriefing({
  eventId,
  debriefing,
}: {
  eventId: string;
  debriefing: DebriefingLetto | null;
}) {
  return (
    <FormAzione azione={salvaDebriefing}>
      <input type="hidden" name="eventId" value={eventId} />

      <Campo label="Titolo" span>
        <input
          name="titolo"
          defaultValue={debriefing?.titolo ?? ''}
          className="input"
          maxLength={120}
          placeholder="es. Come è andata a Silent Ridge"
        />
      </Campo>

      <Campo label="Il racconto" span>
        <EditoreMarkdown
          nome="testo"
          valore={debriefing?.testo}
          righe={18}
          segnaposto={
            '## Come è andata\n\nIl piano, cosa ha funzionato, cosa no.\n\n## Da rifare\n\n## Da non rifare'
          }
        />
      </Campo>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="pubblicato"
          defaultChecked={debriefing?.pubblicato ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          Pubblicato
          <span className="block text-[11px] text-muted">
            Finché è in bozza lo vedi solo tu: si scrive a pezzi, la sera, e a metà non si legge.
            Pubblicato, lo trova anche chi quel giorno non c’era — nella pagina dei debriefing.
          </span>
        </span>
      </label>

      <Invia icona="salva">Salva</Invia>
    </FormAzione>
  );
}

/**
 * Il debriefing dentro la scheda dell’attività.
 *
 * Sta sotto ai partecipanti e sopra ai commenti, che è l’ordine in cui si
 * legge una giornata: chi c’era, com’è andata, cosa ne pensa la gente. In
 * bozza lo vede solo chi lo scrive — un resoconto a metà non si legge.
 */
export function Debriefing({
  eventId,
  debriefing,
  scrive,
  passata,
}: {
  eventId: string;
  debriefing: DebriefingLetto | null;
  /** Team leader e admin: sono loro a raccontare come è andata. */
  scrive: boolean;
  /** Prima che l'attività cominci non c'è niente da raccontare. */
  passata: boolean;
}) {
  if (!debriefing && (!scrive || !passata)) return null;
  if (debriefing && !debriefing.pubblicato && !scrive) return null;

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="titolo-sezione">Debriefing</p>
          {debriefing && (
            <p className="mt-0.5 text-[11px] text-muted">
              {debriefing.autore ? `scritto da ${nomeCompleto(debriefing.autore)} · ` : ''}
              aggiornato il {fmtDateTime(debriefing.aggiornatoIl)}
            </p>
          )}
        </div>

        <span className="flex flex-wrap items-center gap-2">
          {debriefing && !debriefing.pubblicato && <Badge tono="warn">bozza · la vedi solo tu</Badge>}
          {scrive && (
            <BottoneModale
              etichetta={debriefing ? 'Modifica' : 'Scrivi il debriefing'}
              icona={debriefing ? 'modifica' : 'bozza'}
              titolo="Debriefing"
              className={debriefing ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
              larga
            >
              <FormDebriefing eventId={eventId} debriefing={debriefing} />
            </BottoneModale>
          )}
          {scrive && debriefing && (
            <AzioneBottone
              azione={eliminaDebriefing}
              valori={{ eventId }}
              conferma="Eliminare il debriefing? Il testo non si recupera."
              className="text-[11px] text-muted transition-colors hover:text-danger"
            >
              elimina
            </AzioneBottone>
          )}
        </span>
      </div>

      {debriefing ? (
        <>
          {debriefing.titolo && <h3 className="mb-2 text-lg font-medium">{debriefing.titolo}</h3>}
          <Markdown testo={debriefing.testo} />
        </>
      ) : (
        <p className="text-sm text-muted">
          Non c’è ancora. Scrivi com’è andata finché ce l’hai in testa: fra un mese resta solo
          quello che è scritto.
        </p>
      )}
    </div>
  );
}
