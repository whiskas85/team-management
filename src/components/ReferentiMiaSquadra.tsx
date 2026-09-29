'use client';

import { useState } from 'react';
import { Icona } from './Icona';

type Persona = { id: string; etichetta: string };
export type Referente = {
  userId: string;
  ruolo: string;
  mostraTelefono: boolean;
  mostraEmail: boolean;
};

const RUOLI = ['Presidente', 'Vicepresidente', 'Segretario', 'Referente', 'Referente eventi'];

/**
 * Chi rappresenta la squadra verso fuori. Si sceglie fra gli operatori, e per
 * ognuno si decide quali recapiti far vedere: fuori compare col callsign, mai
 * col nome.
 *
 * I campi non sono controllati apposta: finita l'azione React riporta il
 * modulo ai valori di partenza, e con i campi controllati le tendine tornavano
 * vuote — al salvataggio dopo si mandava una lista vuota, e i referenti
 * sparivano. Così ripartono da quelli salvati.
 */
export function ReferentiMiaSquadra({
  persone,
  referenti,
}: {
  persone: Persona[];
  referenti: Referente[];
}) {
  const [righe, setRighe] = useState(() =>
    (referenti.length > 0
      ? referenti
      : [{ userId: '', ruolo: 'Presidente', mostraTelefono: true, mostraEmail: false }]
    ).map((r, i) => ({ ...r, chiave: i })),
  );

  return (
    <div className="space-y-2">
      <datalist id="ruoli-mia-squadra">
        {RUOLI.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      {righe.map((r, i) => (
        <div
          key={r.chiave}
          className="grid grid-cols-2 items-center gap-2 rounded-md border border-line p-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto_auto_2rem]"
        >
          <input
            name="referenteRuolo"
            defaultValue={r.ruolo}
            list="ruoli-mia-squadra"
            placeholder="Ruolo"
            aria-label="Ruolo"
            className="input"
          />
          <select name="referenteId" defaultValue={r.userId} aria-label="Chi" className="input">
            <option value="">— scegli —</option>
            {persone.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etichetta}
              </option>
            ))}
          </select>
          {/* il valore è il numero della riga: la persona si può cambiare dopo */}
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              name="mostraTelefono"
              value={i}
              defaultChecked={r.mostraTelefono}
            />
            telefono
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" name="mostraEmail" value={i} defaultChecked={r.mostraEmail} />
            email
          </label>
          <button
            type="button"
            onClick={() => setRighe((rr) => rr.filter((x) => x.chiave !== r.chiave))}
            className="btn-ghost btn-sm justify-self-end px-1.5"
            aria-label="Togli il referente"
          >
            <Icona nome="elimina" size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setRighe((rr) => [
            ...rr,
            { userId: '', ruolo: '', mostraTelefono: true, mostraEmail: false, chiave: Date.now() },
          ])
        }
        className="btn-ghost btn-sm"
      >
        <Icona nome="aggiungi" size={15} /> Aggiungi referente
      </button>
    </div>
  );
}
