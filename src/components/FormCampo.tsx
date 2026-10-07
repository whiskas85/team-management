import { Campo } from './ui';
import { PosizioneCampo } from './PosizioneCampo';
import { CampoTelefono } from './CampoTelefono';

type Squadra = { id: string; nome: string; stato?: string };

type CampoGioco = {
  id: string;
  nome: string;
  tipo: string;
  indirizzo: string | null;
  citta: string | null;
  provincia: string | null;
  lat: number | null;
  lng: number | null;
  referente: string | null;
  telefono: string | null;
  sito: string | null;
  costo: unknown;
  note: string | null;
  attivo: boolean;
  squadraId: string | null;
  nostro: boolean;
};

export function FormCampo({
  campo,
  squadre,
  squadraPredefinita,
  nostro = false,
}: {
  campo?: CampoGioco;
  squadre: Squadra[];
  /** Per un campo nuovo aggiunto dal profilo di una squadra: è già suo. */
  squadraPredefinita?: string;
  /**
   * Un campo nostro, del team (la configurazione del primo accesso): niente
   * squadra che lo gestisce, referente, telefono, sito e costo, che servono
   * per i campi degli altri.
   */
  nostro?: boolean;
}) {
  return (
    <>
      {campo && <input type="hidden" name="id" value={campo.id} />}
      {/* il modulo ridotto è sempre per un campo nostro */}
      {nostro && <input type="hidden" name="squadraId" value="" />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nome *">
          <input name="nome" required defaultValue={campo?.nome} className="input" />
        </Campo>

        <Campo label="Tipologia">
          <select name="tipo" defaultValue={campo?.tipo ?? 'BOSCHIVO'} className="input">
            <option value="BOSCHIVO">Boschivo</option>
            <option value="URBANO">Urbano</option>
            <option value="CQB">CQB</option>
            <option value="INDOOR">Indoor</option>
            <option value="MISTO">Misto</option>
          </select>
        </Campo>

        <PosizioneCampo
          posizione={
            campo && {
              indirizzo: campo.indirizzo,
              citta: campo.citta,
              provincia: campo.provincia,
              lat: campo.lat,
              lng: campo.lng,
            }
          }
        />

        {!nostro && (
          <>
            <Campo label="Di chi è">
          <select
            name="squadraId"
            defaultValue={
              campo
                ? (campo.squadraId ?? (campo.nostro ? '' : 'terzi'))
                : (squadraPredefinita ?? '')
            }
            className="input"
          >
            <option value="">Nostro</option>
            <option value="terzi">Di nessuna squadra (struttura, privato…)</option>
            {squadre.length > 0 && (
              <optgroup label="Di un’altra squadra">
                {squadre.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.stato === 'PREFERITA' ? '★ ' : ''}
                    {s.nome}
                    {s.stato === 'DISATTIVATA' ? ' (disattivata)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Campo>

            <Campo label="Referente">
              <input name="referente" defaultValue={campo?.referente ?? ''} className="input" />
            </Campo>

            <Campo label="Telefono">
              <CampoTelefono name="telefono" defaultValue={campo?.telefono} campoNome="referente" />
            </Campo>

            <Campo label="Sito / pagina">
              <input name="sito" defaultValue={campo?.sito ?? ''} className="input" />
            </Campo>

            <Campo label="Costo indicativo (€)">
              <input
                name="costo"
                type="number"
                step="0.01"
                min="0"
                defaultValue={campo?.costo ? Number(campo.costo) : ''}
                className="input"
              />
            </Campo>
          </>
        )}

        <Campo label="Note" span>
          <textarea name="note" rows={3} defaultValue={campo?.note ?? ''} className="input" />
        </Campo>

        <label className="flex min-w-0 items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="attivo"
            defaultChecked={campo ? campo.attivo : true}
            className="h-4 w-4 accent-[color:var(--nvg)]"
          />
          Campo attivo (selezionabile negli eventi)
        </label>
      </div>
    </>
  );
}
