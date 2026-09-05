import { Campo } from './ui';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { inputDate } from '@/lib/format';
import { compilaRichiesta } from '@/actions/iscrizioni';

type Anagrafica = {
  nome: string;
  cognome: string;
  callsign: string | null;
  telefono: string | null;
  dataNascita: Date | null;
  luogoNascita: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  citta: string | null;
  cap: string | null;
  provincia: string | null;
  emergenzaNome: string | null;
  emergenzaTel: string | null;
  gruppoSanguigno: string | null;
  allergie: string | null;
};

/**
 * Modulo di iscrizione: i campi già noti arrivano precompilati, all'operatore
 * resta da confermarli e completare quelli mancanti.
 */
export function ModuloIscrizione({
  iscrizioneId,
  utente,
}: {
  iscrizioneId: string;
  utente: Anagrafica;
}) {
  return (
    <div className="card">
      <p className="titolo-sezione mb-1">Modulo di iscrizione</p>
      <p className="mb-4 text-xs text-muted">
        Conferma i dati già presenti e completa quelli mancanti. Tutti i campi con l’asterisco
        servono per il tesseramento e l’assicurazione.
      </p>

      <FormAzione azione={compilaRichiesta}>
        <input type="hidden" name="id" value={iscrizioneId} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nome *">
            <input name="nome" required defaultValue={utente.nome} className="input" />
          </Campo>
          <Campo label="Cognome *">
            <input name="cognome" required defaultValue={utente.cognome} className="input" />
          </Campo>
          <Campo label="Callsign">
            <input name="callsign" defaultValue={utente.callsign ?? ''} className="input" />
          </Campo>
          <Campo label="Telefono *">
            <input name="telefono" required defaultValue={utente.telefono ?? ''} className="input" />
          </Campo>
          <Campo label="Data di nascita *">
            <input
              type="date"
              name="dataNascita"
              required
              defaultValue={inputDate(utente.dataNascita)}
              className="input"
            />
          </Campo>
          <Campo label="Luogo di nascita *">
            <input
              name="luogoNascita"
              required
              defaultValue={utente.luogoNascita ?? ''}
              className="input"
            />
          </Campo>
          <Campo label="Codice fiscale *" span>
            <input
              name="codiceFiscale"
              required
              minLength={16}
              maxLength={16}
              defaultValue={utente.codiceFiscale ?? ''}
              className="input uppercase"
            />
          </Campo>
          <Campo label="Indirizzo *" span>
            <input
              name="indirizzo"
              required
              defaultValue={utente.indirizzo ?? ''}
              className="input"
            />
          </Campo>
          <Campo label="Città *">
            <input name="citta" required defaultValue={utente.citta ?? ''} className="input" />
          </Campo>
          <Campo label="CAP / Provincia *">
            <div className="flex gap-2">
              <input
                name="cap"
                required
                maxLength={5}
                defaultValue={utente.cap ?? ''}
                className="input w-24"
                placeholder="CAP"
              />
              <input
                name="provincia"
                required
                maxLength={2}
                defaultValue={utente.provincia ?? ''}
                className="input w-20 uppercase"
                placeholder="PR"
              />
            </div>
          </Campo>
          <Campo label="Contatto di emergenza *">
            <input
              name="emergenzaNome"
              required
              defaultValue={utente.emergenzaNome ?? ''}
              className="input"
            />
          </Campo>
          <Campo label="Telefono emergenza *">
            <input
              name="emergenzaTel"
              required
              defaultValue={utente.emergenzaTel ?? ''}
              className="input"
            />
          </Campo>
          <Campo label="Gruppo sanguigno">
            <input
              name="gruppoSanguigno"
              defaultValue={utente.gruppoSanguigno ?? ''}
              className="input"
              placeholder="es. 0+"
            />
          </Campo>
          <Campo label="Allergie / note mediche">
            <input name="allergie" defaultValue={utente.allergie ?? ''} className="input" />
          </Campo>
          <Campo label="Note per l’amministrazione" span>
            <textarea name="note" rows={3} className="input" />
          </Campo>
        </div>

        <Invia icona="rilascia">
            Invia il modulo
          </Invia>
        <p className="text-xs text-muted">
          All’invio la richiesta passa in valutazione. Dopo l’accettazione riceverai la quota da
          versare e ti verrà richiesto il certificato medico.
        </p>
      </FormAzione>
    </div>
  );
}
