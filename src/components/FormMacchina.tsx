import { Campo } from './ui';
import { CercaLuogo } from './CercaLuogo';
import { inputDateTime } from '@/lib/format';

export type DatiMacchina = {
  modo: 'PRENDO' | 'RITROVO';
  posti: number | null;
  partenza: string | null;
  partenzaLat: number | null;
  partenzaLng: number | null;
  partenzaOra: Date | null;
  arrivo: string | null;
  arrivoLat: number | null;
  arrivoLng: number | null;
  arrivoOra: Date | null;
  note: string | null;
};

/**
 * I dati di una macchina: come si caricano i passeggeri, quanti posti, da dove
 * si parte e dove si arriva.
 *
 * Partenza e arrivo arrivano già scritti — casa dal profilo, il ritrovo o il
 * campo dall'attività — e sono **solo suggerimenti**: non è detto che si parta
 * da casa, né che si vada al ritrovo invece che dritti al campo.
 */
export function FormMacchina({
  valori,
  arrivoDa,
}: {
  valori: DatiMacchina;
  /** Da dove viene l'arrivo suggerito: «il ritrovo dell'attività». */
  arrivoDa?: string | null;
}) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="label">Come carichi i passeggeri</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              [
                'RITROVO',
                'Punto di ritrovo',
                'Ci si trova in uno o più posti: un parcheggio, un casello, un bar.',
              ],
              [
                'PRENDO',
                'Passo a prenderli',
                'Una tappa per ognuno, dove ti dice lui: le metti in fila tu.',
              ],
            ] as const
          ).map(([v, titolo, testo]) => (
            <label
              key={v}
              className="flex cursor-pointer gap-2.5 rounded-lg border border-line p-3 has-[:checked]:border-nvg has-[:checked]:bg-nvg/10"
            >
              <input
                type="radio"
                name="modo"
                value={v}
                defaultChecked={valori.modo === v}
                className="mt-0.5 accent-nvg"
              />
              <span>
                <span className="block text-sm font-medium">{titolo}</span>
                <span className="block text-xs text-muted">{testo}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Campo label="Posti per i passeggeri">
        <input
          type="number"
          name="posti"
          min={0}
          max={20}
          defaultValue={valori.posti ?? ''}
          className="input w-28"
          placeholder="es. 3"
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <CercaLuogo
          nome="partenza"
          etichetta="Partenza"
          valore={valori.partenza}
          lat={valori.partenzaLat}
          lng={valori.partenzaLng}
          segnaposto="Da dove parti"
          aiuto="La vedi solo tu. Dal profilo arriva casa tua: cambiala se parti da un'altra parte."
        />
        <Campo label="Parto alle">
          <input
            type="datetime-local"
            name="partenzaOra"
            defaultValue={inputDateTime(valori.partenzaOra)}
            className="input"
          />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <CercaLuogo
          nome="arrivo"
          etichetta="Arrivo"
          valore={valori.arrivo}
          lat={valori.arrivoLat}
          lng={valori.arrivoLng}
          segnaposto="Dove arrivate"
          aiuto={
            arrivoDa
              ? `Suggerito: ${arrivoDa}. Se andate dritti al campo, cambialo.`
              : 'Il ritrovo o il campo.'
          }
        />
        <Campo label="Arrivo alle">
          <input
            type="datetime-local"
            name="arrivoOra"
            defaultValue={inputDateTime(valori.arrivoOra)}
            className="input"
          />
        </Campo>
      </div>

      <Campo label="Note">
        <textarea
          name="note"
          rows={2}
          defaultValue={valori.note ?? ''}
          className="input"
          placeholder="es. bagagliaio pieno di repliche: zaini piccoli"
        />
      </Campo>
    </div>
  );
}
