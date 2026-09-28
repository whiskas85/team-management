import { Campo } from './ui';
import { ContattiSquadra, type Contatto } from './ContattiSquadra';
import type { StatoSquadra } from '@prisma/client';
import { CampoTelefono } from './CampoTelefono';

export type Squadra = {
  id: string;
  nome: string;
  telefono: string | null;
  email: string | null;
  sito: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  disciplina: string | null;
  settoreGiovanile: boolean;
  note: string | null;
  stato: StatoSquadra;
  contatti?: Contatto[];
};

/** I campi del modulo di una squadra esterna: nuova o da modificare. */
export function CampiSquadra({ squadra }: { squadra?: Squadra }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome *">
        <input name="nome" required defaultValue={squadra?.nome} className="input" />
      </Campo>

      <Campo label="Stato">
        <select name="stato" defaultValue={squadra?.stato ?? 'ATTIVA'} className="input">
          <option value="PREFERITA">★ Preferita · in cima a tutto</option>
          <option value="ATTIVA">Attiva</option>
          <option value="DISATTIVATA">Disattivata · sparisce dalle scelte</option>
        </select>
      </Campo>

      <Campo label="Telefono della società">
        <CampoTelefono name="telefono" defaultValue={squadra?.telefono} />
      </Campo>

      <Campo label="Email della società">
        <input name="email" type="email" defaultValue={squadra?.email ?? ''} className="input" />
      </Campo>

      <Campo label="Sito / pagina">
        <input name="sito" defaultValue={squadra?.sito ?? ''} className="input" />
      </Campo>

      <Campo label="Indirizzo">
        <input name="indirizzo" defaultValue={squadra?.indirizzo ?? ''} className="input" />
      </Campo>

      <Campo label="Città">
        <input name="citta" defaultValue={squadra?.citta ?? ''} className="input" />
      </Campo>

      <div className="grid grid-cols-2 gap-4">
        <Campo label="CAP">
          <input name="cap" maxLength={5} defaultValue={squadra?.cap ?? ''} className="input" />
        </Campo>
        <Campo label="Provincia">
          <input
            name="provincia"
            maxLength={4}
            defaultValue={squadra?.provincia ?? ''}
            className="input uppercase"
            placeholder="es. TO"
          />
        </Campo>
      </div>

      <Campo label="Disciplina">
        <input
          name="disciplina"
          defaultValue={squadra?.disciplina ?? ''}
          className="input"
          placeholder="es. Air soft"
        />
      </Campo>

      <label className="flex min-w-0 items-center gap-2 self-end pb-2 text-sm">
        <input
          type="checkbox"
          name="settoreGiovanile"
          defaultChecked={squadra?.settoreGiovanile ?? false}
          className="h-4 w-4 accent-[color:var(--nvg)]"
        />
        Settore giovanile
      </label>

      <ContattiSquadra contatti={squadra?.contatti} />

      <Campo label="Note" span>
        <textarea name="note" rows={3} defaultValue={squadra?.note ?? ''} className="input" />
      </Campo>
    </div>
  );
}
