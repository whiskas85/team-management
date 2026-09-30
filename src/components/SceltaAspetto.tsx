'use client';

import { useState } from 'react';
import { salvaAspetto } from '@/actions/operatori';
import { tavolozza, TEMI_PERSONALI, type TemaPersonale, type TemaSquadra } from '@/lib/tema';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { AnteprimaTema } from './AnteprimaTema';

/**
 * L'aspetto del gestionale, per sé: il tema della squadra, o uno pensato per
 * chi vede poco o distingue male i colori. Quelli non si colorano: seguono le
 * linee guida (contrasto WCAG, tavolozze sicure per i daltonici) e restano
 * come sono. In più, il testo più grande.
 */
export function SceltaAspetto({
  squadra,
  tema,
  testoGrande,
}: {
  squadra: TemaSquadra;
  tema: TemaPersonale;
  testoGrande: boolean;
}) {
  const [scelto, setScelto] = useState<TemaPersonale>(tema);
  return (
    <FormAzione azione={salvaAspetto} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">Tema</legend>
        {(Object.keys(TEMI_PERSONALI) as TemaPersonale[]).map((k) => (
          <label
            key={k}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
              scelto === k ? 'border-nvg bg-nvg/5' : 'border-line hover:border-nvgdim'
            }`}
          >
            <input
              type="radio"
              name="tema"
              value={k}
              checked={scelto === k}
              onChange={() => setScelto(k)}
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{TEMI_PERSONALI[k].nome}</span>
              <span className="block text-xs text-muted">{TEMI_PERSONALI[k].descrizione}</span>
            </span>
            <AnteprimaTema t={tavolozza(squadra, k)} compatta />
          </label>
        ))}
      </fieldset>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="testoGrande"
          defaultChecked={testoGrande}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          Testo più grande
          <span className="block text-xs text-muted">
            Tutto un po’ più grande, pulsanti compresi. Si somma a qualunque tema.
          </span>
        </span>
      </label>
      <div>
        <p className="label">Anteprima</p>
        <AnteprimaTema t={tavolozza(squadra, scelto)} />
      </div>
      <Invia icona="salva">Salva l’aspetto</Invia>
    </FormAzione>
  );
}
