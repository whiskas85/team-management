import Link from 'next/link';
import {
  apriSondaggioInvito,
  nascondiInvitoEvento,
  rifiutaInvitoEvento,
} from '@/actions/eventi-condivisi';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { BottoneModale } from './Modale';
import { Campo } from './ui';
import { Icona } from './Icona';
import { ModuloAccettaInvito, type TipologiaInvito } from './ModuloAccettaInvito';
import type { VoceListino } from './CampiRichiesta';

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
  listino = [],
  stagioneId = null,
  giorni = 1,
}: {
  id: string;
  organizzatore: string;
  /** Dove tornare quando l'invito sparisce: dalla scheda, la pagina non c'è più. */
  ritorno?: string;
  /** Le nostre tipologie: accettando si sceglie la nostra, le loro possono essere altre. */
  tipologie: TipologiaInvito[];
  /** Come la chiamano loro: se ne abbiamo una uguale, è già scelta. */
  tipoLoro?: string | null;
  /** Quanto chiedono, se è a pagamento: accettando si imposta la quota per i nostri. */
  costo?: { importo: number; per: 'OPERATORE' | 'SQUADRA' } | null;
  /** Le nostre casse, oltre a quella del club, per la quota interna. */
  casse?: { id: string; nome: string }[];
  /** Il sondaggio «partecipiamo?» già aperto su questo invito. */
  sondaggioId?: string | null;
  /** Il listino e la stagione, per le quote come nella scheda Pagamenti. */
  listino?: VoceListino[];
  stagioneId?: string | null;
  /** Quanti giorni occupa: le voci «al giorno» contano per ognuno. */
  giorni?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BottoneModale
        etichetta="Accetta"
        icona="approva"
        titolo={`Accetta l’invito di ${organizzatore}`}
        className="btn-primary btn-sm"
      >
        <ModuloAccettaInvito
          id={id}
          organizzatore={organizzatore}
          tipologie={tipologie}
          tipoLoro={tipoLoro}
          costo={costo}
          casse={casse}
          listino={listino}
          stagioneId={stagioneId}
          giorni={giorni}
        />
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
