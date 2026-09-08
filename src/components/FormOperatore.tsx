import type { Role, StatoOperatore } from '@prisma/client';
import { Campo } from './ui';
import { etichettaRuolo, etichettaStato } from '@/lib/domain';

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
