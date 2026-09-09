import type { Role, StatoOperatore } from '@prisma/client';
import { Campo } from './ui';
import { FormAzione } from './Form';
import { BottoneModale } from './Modale';
import { Invia } from './Bottone';
import { etichettaRuolo, etichettaStato } from '@/lib/domain';
import { creaOperatore } from '@/actions/operatori';

const RUOLI: Role[] = ['ATLETA', 'TL', 'MODERATORE', 'AMMINISTRAZIONE', 'SEGRETERIA', 'ADMIN'];

const DESCRIZIONE: Record<Role, string> = {
  ATLETA: 'Membro della squadra',
  TL: 'Compone squadra e riserve negli eventi',
  MODERATORE: 'Riceve le segnalazioni e toglie i messaggi fuori posto',
  AMMINISTRAZIONE: 'Iscrizioni, certificati medici, tessere',
  SEGRETERIA: 'Pagamenti e quote',
  ADMIN: 'Accesso completo',
};

const STATI: StatoOperatore[] = [
  'SQUADRA',
  'NUOVO',
  'ATTESA_COMPILAZIONE',
  'ATTESA_ACCETTAZIONE',
  'SOSPESO',
  'RIFIUTATO',
  'DISABILITATO',
];

/** Selezione dei ruoli: sono cumulabili, quindi caselle e non tendina. */
export function SceltaRuoli({ attuali = [] }: { attuali?: Role[] }) {
  return (
    <div>
      <p className="label">Ruoli (cumulabili)</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {RUOLI.map((r) => (
          <label
            key={r}
            className="flex items-start gap-2 rounded-md border border-line bg-surface2 px-3 py-2"
          >
            <input
              type="checkbox"
              name="roles"
              value={r}
              defaultChecked={attuali.includes(r)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
            />
            <span className="min-w-0">
              <span className="block text-sm">{etichettaRuolo[r]}</span>
              <span className="block text-[11px] text-muted">{DESCRIZIONE[r]}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function SceltaStato({ attuale = 'SQUADRA' }: { attuale?: StatoOperatore }) {
  return (
    <Campo label="Stato">
      <select name="stato" defaultValue={attuale} className="input">
        {STATI.map((s) => (
          <option key={s} value={s}>
            {etichettaStato[s]}
          </option>
        ))}
      </select>
    </Campo>
  );
}

/**
 * Il pulsante che crea una persona, con la sua finestra.
 *
 * Sta in due posti — «Operatori» e «Nuovi» — perché è da lì che si guarda
 * quando ci si accorge che qualcuno manca, e mandare a cercare l'altra pagina
 * è il modo di far rimandare l'inserimento a dopo. Cambia solo lo stato di
 * partenza: chi apre dai contatti sta registrando qualcuno che si è affacciato
 * a un'open, non un atleta, e la tendina lo dice già da sé.
 *
 * È un componente solo e non due copie: i campi obbligatori sono gli stessi, e
 * due moduli gemelli prima o poi divergono su quello che conta.
 */
export function BottoneCreaOperatore({ stato = 'SQUADRA' }: { stato?: StatoOperatore }) {
  return (
    <BottoneModale etichetta="Crea operatore" icona="operatori" titolo="Nuovo operatore" larga>
      <FormAzione azione={creaOperatore}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nome *">
            <input name="nome" required className="input" />
          </Campo>
          <Campo label="Cognome *">
            <input name="cognome" required className="input" />
          </Campo>
          <Campo label="Email *">
            <input name="email" type="email" required className="input" />
          </Campo>
          <Campo label="Callsign">
            <input name="callsign" className="input" />
          </Campo>
          <Campo label="Telefono *">
            <input name="telefono" required className="input" />
          </Campo>
          <Campo label="Data di nascita *">
            <input type="date" name="dataNascita" required className="input" />
          </Campo>
          <Campo label="Luogo di nascita *">
            <input name="luogoNascita" required className="input" />
          </Campo>
          <SceltaStato attuale={stato} />
          <Campo label="Password provvisoria *" span>
            <input name="password" type="text" minLength={8} required className="input" />
          </Campo>
        </div>

        {/* un contatto non è un atleta: l'incarico arriva quando entra in squadra */}
        <SceltaRuoli attuali={stato === 'SQUADRA' ? ['ATLETA'] : []} />

        <Invia icona="aggiungi">Crea operatore</Invia>
        <p className="text-xs text-muted">
          Comunica tu la password provvisoria: l’operatore potrà cambiarla dal suo profilo.
          Telefono, data e luogo di nascita servono per tesseramento e polizza: chiederli adesso
          costa un minuto, rincorrerli fra sei mesi molto di più.
        </p>
      </FormAzione>
    </BottoneModale>
  );
}
