import { Campo } from './ui';
import { CercaLuogo } from './CercaLuogo';
import { GiornoOra } from './GiornoOra';
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
 * Come si caricano i passeggeri (ritrovo o passo a prenderli) non si sceglie
 * qui ma nell'itinerario, dove si vedono le tappe e chi ci sale.
 *
 * Partenza e arrivo arrivano già scritti — casa dal profilo, il ritrovo o il
 * campo dall'attività — e sono **solo suggerimenti**: non è detto che si parta
 * da casa, né che si vada al ritrovo invece che dritti al campo.
 */
export function FormMacchina({
  valori,
  arrivoDa,
  giorno,
}: {
  valori: DatiMacchina;
  /** Il giorno dell'attività (o del ritrovo): le date nascono lì, si sceglie l'ora. */
  giorno?: string;
  /** Da dove viene l'arrivo suggerito: «il ritrovo dell'attività». */
  arrivoDa?: string | null;
}) {
  return (
    <div className="space-y-4">
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

      <div className="space-y-3">
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
          <GiornoOra name="partenzaOra" valore={inputDateTime(valori.partenzaOra)} giorno={giorno} />
        </Campo>
      </div>

      <div className="space-y-3">
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
          <GiornoOra name="arrivoOra" valore={inputDateTime(valori.arrivoOra)} giorno={giorno} />
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
