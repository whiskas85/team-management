import Link from 'next/link';
import {
  accettaInvitoEvento,
  apriSondaggioInvito,
  nascondiInvitoEvento,
  rifiutaInvitoEvento,
} from '@/actions/eventi-condivisi';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { BottoneModale } from './Modale';
import { Campo } from './ui';
import { Icona } from './Icona';

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
  costo,
  casse = [],
  sondaggioId,
}: {
  id: string;
  organizzatore: string;
  /** Dove tornare quando l'invito sparisce: dalla scheda, la pagina non c'è più. */
  ritorno?: string;
  /** Le nostre tipologie: accettando si sceglie la nostra, le loro possono essere altre. */
  tipologie: { id: string; nome: string }[];
  /** Come la chiamano loro: se ne abbiamo una uguale, è già scelta. */
  tipoLoro?: string | null;
  /** Quanto chiedono, se è a pagamento: accettando si imposta la quota per i nostri. */
  costo?: { importo: number; per: 'OPERATORE' | 'SQUADRA' } | null;
  /** Le nostre casse, oltre a quella del club, per la quota interna. */
  casse?: { id: string; nome: string }[];
  /** Il sondaggio «partecipiamo?» già aperto su questo invito. */
  sondaggioId?: string | null;
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
          {costo && (
            <div className="space-y-3 rounded-md border border-warn/40 bg-warn/5 p-3 sm:col-span-2">
              {/* due soldi diversi, da non confondere: quello che la squadra
                  versa a loro, e quello che i vostri versano alla squadra */}
              <div>
                <p className="titolo-sezione">Verso {organizzatore}</p>
                <p className="mt-0.5 text-sm text-warn">
                  Chiedono{' '}
                  <strong>
                    {costo.importo.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    {costo.per === 'SQUADRA' ? ' per la squadra' : ' a operatore'}
                  </strong>
                  , da versare come squadra. Il conto lo trovi nella scheda dell’attività, con
                  «Paga»: lo segnali a loro e lo confermano nella loro cassa.
                </p>
              </div>
              <p className="titolo-sezione border-t border-warn/30 pt-3">Per i vostri</p>
              <Campo label="Quota per operatore (€)" span>
                <input
                  name="quotaInterna"
                  type="number"
                  min="0"
                  step="0.5"
                  defaultValue={costo.per === 'OPERATORE' ? costo.importo : ''}
                  className="input"
                  placeholder="vuota = la decidi dopo"
                />
              </Campo>
              {casse.length > 0 && (
                <Campo label="In che cassa entra" span>
                  <select name="cassaQuota" defaultValue="" className="input">
                    <option value="">Cassa del club</option>
                    {casse.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </Campo>
              )}
              <p className="text-xs text-muted">
                È la quota che pagano i vostri, come per ogni attività: la cambi quando vuoi dalla
                modifica, scheda Pagamenti.
              </p>
            </div>
          )}
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

      {/* prima di rispondere, lo si può chiedere alla squadra */}
      {sondaggioId ? (
        <Link href={`/sondaggi/${sondaggioId}`} className="btn-ghost btn-sm">
          <Icona nome="grafici" size={15} /> Vedi il sondaggio
        </Link>
      ) : (
        <BottoneModale
          etichetta="Sondaggio"
          icona="grafici"
          titolo="Chiedi alla squadra se partecipa"
          className="btn-ghost btn-sm"
        >
          <FormAzione azione={apriSondaggioInvito}>
            <input type="hidden" name="id" value={id} />
            <p className="text-sm text-muted">
              Un sondaggio «Partecipiamo?» con ci sono, forse, non ci sono. Quando accetti
              l’invito, chi ha detto «ci sono» entra già presente e chi ha detto «forse» fra i
              forse.
            </p>
            <Campo label="Si chiude il">
              <input type="datetime-local" name="scadeIl" className="input" />
            </Campo>
            <Campo label="Una riga in più (facoltativa)" span>
              <input name="nota" maxLength={300} className="input" placeholder="es. decidiamo entro venerdì" />
            </Campo>
            <Invia icona="grafici">Apri il sondaggio</Invia>
          </FormAzione>
        </BottoneModale>
      )}

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
