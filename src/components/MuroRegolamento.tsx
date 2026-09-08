import type { regolamentoDaAccettare } from '@/lib/documenti';
import { fmtDate } from '@/lib/format';
import { Avviso, Intestazione } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { accettaRegolamento } from '@/actions/documenti';

type Dovuto = NonNullable<Awaited<ReturnType<typeof regolamentoDaAccettare>>>;

/**
 * La porta del mercatino: prima le regole, poi la bacheca.
 *
 * Altrove i regolamenti si leggono se si vuole. Qui no, e la differenza è
 * concreta: nel mercatino due persone si scambiano soldi e roba, e le regole
 * non sono un cartello ma il patto su cui poi si discuterà se qualcosa va
 * storto. Farle scorrere una volta costa un minuto; scoprirle dopo costa una
 * lite.
 *
 * Non è un pannellino con la spunta: c'è il testo intero, e il pulsante sta in
 * fondo. Se il regolamento cambia si ripassa di qui, perché aver accettato la
 * versione di prima non è aver accettato questa.
 */
export function MuroRegolamento({ dovuto }: { dovuto: Dovuto }) {
  const { documento, cambiato } = dovuto;

  return (
    <>
      <Intestazione
        titolo={documento.titolo}
        sottotitolo="Il mercatino si apre dopo che l’hai letto"
      />

      <Avviso tono={cambiato ? 'warn' : 'info'}>
        {cambiato
          ? `Il regolamento è cambiato il ${fmtDate(documento.aggiornatoIl)}: leggilo e accettalo di nuovo.`
          : 'Qui dentro ci si scambiano soldi e roba fra soci. Le regole valgono per tutti, e si accettano una volta sola.'}
      </Avviso>

      <div className="card mt-4">
        <Markdown testo={documento.testo} />

        <FormAzione azione={accettaRegolamento} className="mt-6 border-t border-line pt-4">
          <input type="hidden" name="id" value={documento.id} />
          <p className="mb-3 text-sm text-muted">
            Premendo il pulsante dichiari di aver letto il regolamento e di accettarlo.
          </p>
          <Invia icona="approva">Ho letto e accetto</Invia>
        </FormAzione>
      </div>
    </>
  );
}
