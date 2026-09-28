'use client';

import { useState } from 'react';
import { Icona } from './Icona';
import { CampoTelefono } from './CampoTelefono';

export type Contatto = {
  ruolo: string;
  nome: string;
  telefono: string | null;
  email: string | null;
};

/** Le cariche che ogni società ha: le righe ci sono già, basta riempirle. */
const PREDISPOSTE = ['Presidente', 'Vicepresidente', 'Segretario'];

/**
 * Le persone di una squadra esterna, ognuna con quello che fa lì.
 *
 * Presidente, vicepresidente e segretario sono già in fila anche vuoti; sotto
 * se ne aggiungono quanti se ne vuole, col ruolo scritto a mano (referente
 * campo, organizzatore…). Le righe senza nome non si salvano.
 */
export function ContattiSquadra({ contatti = [] }: { contatti?: Contatto[] }) {
  const [righe, setRighe] = useState<(Contatto & { chiave: number })[]>(() => {
    const iniziali = [
      ...PREDISPOSTE.map(
        (ruolo) =>
          contatti.find((c) => c.ruolo === ruolo) ?? { ruolo, nome: '', telefono: '', email: '' },
      ),
      ...contatti.filter((c) => !PREDISPOSTE.includes(c.ruolo)),
    ];
    return iniziali.map((c, i) => ({ ...c, chiave: i }));
  });

  const aggiungi = () =>
    setRighe((r) => [
      ...r,
      { ruolo: '', nome: '', telefono: '', email: '', chiave: Date.now() },
    ]);
  const togli = (chiave: number) => setRighe((r) => r.filter((x) => x.chiave !== chiave));

  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-xs font-medium text-muted">Contatti</p>
      <datalist id="ruoli-squadra">
        {[...PREDISPOSTE, 'Referente', 'Referente campo', 'Organizzatore', 'Tesoriere'].map(
          (r) => (
            <option key={r} value={r} />
          ),
        )}
      </datalist>
      {righe.map((c, i) => {
        const fissa = i < PREDISPOSTE.length;
        return (
          <div
            key={c.chiave}
            data-gruppo-contatto
            className="grid grid-cols-2 gap-2 rounded-md border border-line p-2 sm:grid-cols-[9rem_minmax(0,1fr)_9rem_minmax(0,1fr)_2rem]"
          >
            {fissa ? (
              <>
                <input type="hidden" name="contattoRuolo" value={c.ruolo} />
                <span className="self-center text-sm font-medium">{c.ruolo}</span>
              </>
            ) : (
              <input
                name="contattoRuolo"
                defaultValue={c.ruolo}
                list="ruoli-squadra"
                placeholder="Cosa fa"
                aria-label="Ruolo nella squadra"
                className="input"
              />
            )}
            <input
              name="contattoNome"
              defaultValue={c.nome}
              placeholder="Nome e cognome"
              aria-label={`Nome ${c.ruolo || 'contatto'}`}
              className="input"
            />
            <CampoTelefono
              name="contattoTelefono"
              defaultValue={c.telefono}
              placeholder="Telefono"
              ariaLabel={`Telefono ${c.ruolo || 'contatto'}`}
              campoNome="contattoNome"
            />
            <input
              name="contattoEmail"
              type="email"
              defaultValue={c.email ?? ''}
              placeholder="Email"
              aria-label={`Email ${c.ruolo || 'contatto'}`}
              className="input"
            />
            {fissa ? (
              <span className="hidden sm:block" />
            ) : (
              <button
                type="button"
                onClick={() => togli(c.chiave)}
                className="btn-ghost btn-sm justify-self-end px-1.5"
                aria-label="Togli il contatto"
              >
                <Icona nome="elimina" size={15} />
              </button>
            )}
          </div>
        );
      })}
      <button type="button" onClick={aggiungi} className="btn-ghost btn-sm">
        <Icona nome="aggiungi" size={15} /> Aggiungi contatto
      </button>
    </div>
  );
}
