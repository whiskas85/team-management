import { Campo } from './ui';
import { CercaLuogo } from './CercaLuogo';

type Tipologia = { id: string; nome: string };

/**
 * Il modulo di una riunione, che è volutamente corto.
 *
 * Una riunione non ha un punto di ritrovo da raggiungere in macchina, non ha
 * posti contati e non si paga: mostrare quei campi vuol dire far leggere
 * quindici caselle per compilarne tre. Qui restano il quando, il dove — che
 * può essere un indirizzo **oppure** un collegamento — e due righe di ordine
 * del giorno.
 */
export function FormRiunione({
  tipologie,
  daEventId,
  titoloPredefinito,
  inizioPredefinito,
}: {
  /** Solo le tipologie segnate come riunione. Se è una sola non si chiede. */
  tipologie: Tipologia[];
  /** L'attività da cui nasce: da lì arrivano le persone da convocare. */
  daEventId?: string;
  titoloPredefinito: string;
  inizioPredefinito?: string;
}) {
  return (
    <div className="space-y-4">
      {daEventId && <input type="hidden" name="daEventId" value={daEventId} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Titolo *" span>
          <input name="titolo" required defaultValue={titoloPredefinito} className="input" />
        </Campo>

        {/* la scelta si chiede solo se c'è davvero qualcosa da scegliere */}
        {tipologie.length > 1 && (
          <Campo label="Tipo di riunione" span>
            <select name="tipoId" defaultValue={tipologie[0]?.id} className="input">
              {tipologie.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>
        )}
        {tipologie.length === 1 && <input type="hidden" name="tipoId" value={tipologie[0].id} />}

        <Campo label="Quando *">
          <input
            type="datetime-local"
            name="inizio"
            required
            defaultValue={inizioPredefinito}
            className="input"
          />
        </Campo>

        <Campo label="Fine">
          <input type="datetime-local" name="fine" className="input" />
        </Campo>

        <Campo label="Collegamento da remoto" span>
          <input
            name="linkRiunione"
            className="input"
            placeholder="https://meet.google.com/… — lascia vuoto se ci si vede di persona"
          />
        </Campo>

        <CercaLuogo
          nome="luogo"
          etichetta="Oppure dove ci si trova"
          segnaposto="es. Sede, oppure un link di Maps"
          aiuto="Servono l'uno o l'altro: chi partecipa deve sapere dove andare o dove collegarsi."
        />

        <Campo label="Ordine del giorno" span>
          <textarea
            name="descrizione"
            rows={3}
            className="input"
            placeholder="Di cosa si parla"
          />
        </Campo>
      </div>

      <p className="text-xs text-muted">
        Nasce già <strong className="text-ink">rilasciata alla squadra</strong>: una riunione che
        nessuno vede non serve a niente.
      </p>
    </div>
  );
}
