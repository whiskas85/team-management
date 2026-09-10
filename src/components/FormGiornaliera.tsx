import { Campo } from './ui';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { attivaGiornaliera, emettiGiornaliera } from '@/actions/assicurazione';
import { etichettaGiorno } from '@/lib/assicurazione';

/**
 * I due modi di coprire un ospite con la giornaliera.
 *
 * **Uno solo è la strada normale**: il portale federale rilascia la polizza e
 * qui si registra da sola. L'altro è per quando la pratica è già stata fatta a
 * mano di là — capita, e senza un posto dove scrivere il numero la persona
 * risulterebbe scoperta pur essendo coperta davvero.
 *
 * Sta in un componente suo perché lo aprono due pagine: la scheda
 * dell'attività, dove se ne accorge chi porta la squadra in campo, e l'elenco
 * delle polizze, dove ci passa chi amministra. Scritto due volte, l'avviso che
 * conta — *ogni attivazione consuma una polizza vera* — prima o poi sarebbe
 * rimasto aggiornato in una sola delle due.
 */
export function FormGiornaliera({
  userId,
  eventId,
  nome,
  giorno,
}: {
  userId: string;
  eventId: string;
  nome: string;
  /** «2026-09-12»: la giornaliera vale un giorno, e va detto quale. */
  giorno: string;
}) {
  return (
    <>
      <p className="mb-3 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
        Ogni attivazione consuma una polizza vera e non si può annullare. Prima di chiamare il
        portale controllo che la persona non sia già coperta, che la quota della giornata sia
        saldata o dichiarata, che abbia almeno 12 anni e che il giorno rientri nella finestra ammessa.
      </p>

      <FormAzione azione={attivaGiornaliera}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="giorno" value={giorno} />
        <p className="mb-3 text-sm text-muted">
          Attiva la polizza prova sul portale federale per{' '}
          <strong className="text-ink">{nome}</strong>, giorno{' '}
          <strong className="text-ink">{etichettaGiorno(giorno)}</strong>. Servono data e luogo di
          nascita nella sua scheda.
        </p>
        <Invia icona="tessera" className="btn-primary w-full" attesa="Parlo col portale…">
          Attiva la polizza sul portale
        </Invia>
      </FormAzione>

      <details className="mt-4 border-t border-line pt-4">
        <summary className="cursor-pointer text-xs text-muted">
          L’ho già attivata a mano sul portale
        </summary>
        <FormAzione azione={emettiGiornaliera} className="mt-3">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="giorno" value={giorno} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Numero polizza *">
              <input name="codice" required className="input" placeholder="es. 2793" />
            </Campo>
            <Campo label="Id pratica sul portale">
              <input name="idPortale" className="input" />
            </Campo>
          </div>
          <Invia icona="salva">Registra il numero</Invia>
        </FormAzione>
      </details>
    </>
  );
}
