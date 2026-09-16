import { Campo } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { cambiaStatoEvento } from '@/actions/eventi';

/**
 * «Questa non si fa più» — e perché.
 *
 * Gli altri cambi di stato sono un clic e una domanda di conferma: annullare
 * no, perché è l'unico che lascia una riga nello storico senza spiegarsi da
 * sé. Il motivo è obbligatorio, ma è una riga: serve a ricordare, non a
 * giustificarsi. Lo leggono tutti quelli che vedono l'attività — chi si era
 * segnato merita di sapere perché salta, e in fondo alla stagione quelle
 * righe raccontano se saltava per il tempo o per la gente che mancava.
 */
export function AnnullaEvento({
  id,
  titolo,
  compatto = false,
}: {
  id: string;
  titolo: string;
  /** Versione ridotta per le card e le righe di elenco. */
  compatto?: boolean;
}) {
  return (
    <BottoneModale
      etichetta="Annulla"
      icona="annulla"
      titolo={`Annullare “${titolo}”?`}
      className={`btn-danger ${compatto ? 'btn-sm' : ''}`}
    >
      <FormAzione azione={cambiaStatoEvento}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="ANNULLATA" />

        <p className="text-sm text-muted">
          L’attività resta visibile ma non accetta più adesioni. Il motivo si legge nella scheda
          e nello storico.
        </p>

        <Campo label="Perché è annullata" span>
          <textarea
            name="motivo"
            rows={3}
            required
            maxLength={300}
            className="input"
            placeholder="Pioggia, campo occupato, eravamo in quattro…"
          />
        </Campo>

        <Invia icona="annulla">Annulla l’attività</Invia>
      </FormAzione>
    </BottoneModale>
  );
}
