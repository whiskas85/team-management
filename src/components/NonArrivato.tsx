import { rifiutaSegnalazione } from '@/actions/pagamenti';
import { AzioneBottone } from './AzioneBottone';

/**
 * Accanto a un pagamento «da confermare»: la segnalazione era sbagliata, i
 * soldi non sono arrivati. La quota torna da pagare e la persona lo sa.
 */
export function NonArrivato({ id, descrizione }: { id: string; descrizione: string }) {
  return (
    <AzioneBottone
      azione={rifiutaSegnalazione}
      valori={{ id }}
      conferma={`Il pagamento segnalato per «${descrizione}» non è arrivato? La segnalazione si toglie, la quota torna da pagare e la persona viene avvisata.`}
      icona="annulla"
      className="btn-ghost btn-sm whitespace-nowrap"
    >
      Non arrivato
    </AzioneBottone>
  );
}
