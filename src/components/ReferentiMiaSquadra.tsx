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
  const cambia = (chiave: number, dati: Partial<Referente>) =>
    setRighe((rr) => rr.map((r) => (r.chiave === chiave ? { ...r, ...dati } : r)));

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
            value={r.ruolo}
            onChange={(e) => cambia(r.chiave, { ruolo: e.target.value })}
            list="ruoli-mia-squadra"
            placeholder="Ruolo"
            aria-label="Ruolo"
            className="input"
          />
          <select
            name="referenteId"
            value={r.userId}
            onChange={(e) => cambia(r.chiave, { userId: e.target.value })}
            aria-label="Chi"
            className="input"
          >
            <option value="">— scegli —</option>
            {persone.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etichetta}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              name="mostraTelefono"
              value={i}
              checked={r.mostraTelefono}
              onChange={(e) => cambia(r.chiave, { mostraTelefono: e.target.checked })}
            />
            telefono
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              name="mostraEmail"
              value={i}
              checked={r.mostraEmail}
              onChange={(e) => cambia(r.chiave, { mostraEmail: e.target.checked })}
            />
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
