import { rifiutaSegnalazione } from '@/actions/pagamenti';
import { BottoneModale } from './Modale';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Campo } from './ui';

/**
 * Accanto a un pagamento «da confermare»: la segnalazione si annulla — i soldi
 * non sono arrivati, o non come detto. Il perché è obbligatorio: resta nelle
 * note della quota e arriva alla persona con l'avviso, che altrimenti si
 * vedrebbe tornare la quota da pagare senza capire.
 */
export function AnnullaSegnalazione({ id, descrizione }: { id: string; descrizione: string }) {
  return (
    <BottoneModale
      etichetta="Annulla"
      icona="annulla"
      titolo="Annulla il pagamento"
      className="btn-ghost btn-sm whitespace-nowrap"
    >
      <FormAzione azione={rifiutaSegnalazione} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <p className="text-sm font-medium">{descrizione}</p>
        <p className="text-sm text-muted">
          La segnalazione si toglie, con la ricevuta allegata: la quota torna da pagare e la
          persona riceve un avviso con il motivo.
        </p>
        <Campo label="Perché lo annulli *" span>
          <textarea
            name="motivo"
            rows={3}
            required
            maxLength={300}
            className="input"
            placeholder="Il bonifico non è arrivato, l’importo non torna, ricevuta illeggibile…"
          />
        </Campo>
        <Invia icona="annulla">Annulla il pagamento</Invia>
      </FormAzione>
    </BottoneModale>
  );
}
