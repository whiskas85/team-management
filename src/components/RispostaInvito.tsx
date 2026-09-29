import {
  accettaInvitoEvento,
  nascondiInvitoEvento,
  rifiutaInvitoEvento,
} from '@/actions/eventi-condivisi';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { BottoneModale } from './Modale';
import { Campo } from './ui';

/**
 * I tre gesti su un invito di un'altra squadra, sulla card e nella scheda.
 *
 * - **Accetta**: diventa un'attività nostra (una bozza, da rilasciare), e
 *   l'organizzatore lo sa.
 * - **Rifiuta**: sparisce, e l'organizzatore sa che non veniamo — col perché,
 *   se lo si scrive.
 * - **Cancella**: sparisce dalla nostra vista e basta. L'organizzatore non ne
 *   sa niente: per lui resta «invitato».
 */
export function RispostaInvito({
  id,
  organizzatore,
  ritorno,
  tipologie,
  tipoLoro,
}: {
  id: string;
  organizzatore: string;
  /** Dove tornare quando l'invito sparisce: dalla scheda, la pagina non c'è più. */
  ritorno?: string;
  /** Le nostre tipologie: accettando si sceglie la nostra, le loro possono essere altre. */
  tipologie: { id: string; nome: string }[];
  /** Come la chiamano loro: se ne abbiamo una uguale, è già scelta. */
  tipoLoro?: string | null;
}) {
  const proposta = tipoLoro
    ? tipologie.find((t) => t.nome.localeCompare(tipoLoro, 'it', { sensitivity: 'base' }) === 0)
    : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BottoneModale
        etichetta="Accetta"
        icona="approva"
        titolo={`Accetta l’invito di ${organizzatore}`}
        className="btn-primary btn-sm"
      >
        <FormAzione azione={accettaInvitoEvento}>
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-muted">
            Diventa un’attività nostra, in bozza: quote, posti e rilascio li decidi dopo.{' '}
            {organizzatore} vede che l’avete accettata.
          </p>
          <Campo label="Tipologia *" span>
            <select name="tipoId" required defaultValue={proposta?.id ?? ''} className="input">
              <option value="" disabled>
                — scegli fra le nostre —
              </option>
              {tipologie.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
            {tipoLoro && (
              <span className="mt-1 block text-[11px] text-muted">
                Per {organizzatore} è «{tipoLoro}».
              </span>
            )}
          </Campo>
          <Invia icona="approva">Accetta</Invia>
        </FormAzione>
      </BottoneModale>

      <BottoneModale
        etichetta="Rifiuta"
        icona="rifiuta"
        titolo={`Rifiuta l’invito di ${organizzatore}`}
        className="btn-ghost btn-sm"
      >
        <FormAzione azione={rifiutaInvitoEvento}>
          <input type="hidden" name="id" value={id} />
          {ritorno && <input type="hidden" name="ritorno" value={ritorno} />}
          <p className="text-sm text-muted">
            L’invito sparisce dal calendario, e {organizzatore} vede che non venite.
          </p>
          <Campo label="Perché (lo leggono loro)" span>
            <textarea
              name="motivo"
              rows={3}
              maxLength={500}
              className="input"
              placeholder="es. quel giorno abbiamo già una gara"
            />
          </Campo>
          <Invia icona="rifiuta">Rifiuta l’invito</Invia>
        </FormAzione>
      </BottoneModale>

      <FormAzione azione={nascondiInvitoEvento} className="contents">
        <input type="hidden" name="id" value={id} />
        {ritorno && <input type="hidden" name="ritorno" value={ritorno} />}
        <Invia icona="elimina" className="btn-ghost btn-sm">
          Cancella
        </Invia>
      </FormAzione>
      <span className="w-full text-[11px] text-muted">
        Cancella lo toglie dalla vista senza dirlo a {organizzatore}.
      </span>
    </div>
  );
}
