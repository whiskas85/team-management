'use client';

import { useState } from 'react';
import { impostaPolizzeEvento } from '@/actions/assicurazione';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { BottoneModale } from './Modale';

type Scelta = '' | 'si' | 'no';

/**
 * Il pulsante delle polizze automatiche sulla card di un'attività: tre scelte,
 * con scritto cosa vuol dire «come l'impostazione generale» adesso.
 */
export function PolizzeEvento({
  id,
  titolo,
  valore,
  generale,
}: {
  id: string;
  titolo: string;
  valore: boolean | null;
  /** L'interruttore generale, per dire cosa succede seguendolo. */
  generale: boolean;
}) {
  const [scelta, setScelta] = useState<Scelta>(valore === null ? '' : valore ? 'si' : 'no');
  const voci: { v: Scelta; nome: string; nota: string }[] = [
    {
      v: '',
      nome: 'Come l’impostazione generale',
      nota: generale
        ? 'Adesso è accesa: si assicura da sola.'
        : 'Adesso è spenta: si assicura a mano.',
    },
    { v: 'si', nome: 'Da sola, poco prima', nota: 'Vale anche con l’impostazione generale spenta.' },
    { v: 'no', nome: 'Solo a mano', nota: 'Vale anche con l’impostazione generale accesa.' },
  ];
  return (
    <BottoneModale
      etichetta="Automatiche"
      icona="impostazioni"
      titolo={`Polizze automatiche · ${titolo}`}
      className="btn-ghost btn-sm"
    >
      <FormAzione azione={impostaPolizzeEvento} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <fieldset className="space-y-2">
          <legend className="sr-only">Polizze automatiche per questa attività</legend>
          {voci.map((x) => (
            <label
              key={x.v || 'generale'}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                scelta === x.v ? 'border-nvg bg-nvg/5' : 'border-line hover:border-nvgdim'
              }`}
            >
              <input
                type="radio"
                name="scelta"
                value={x.v}
                checked={scelta === x.v}
                onChange={() => setScelta(x.v)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                <span className="block text-sm font-medium">{x.nome}</span>
                <span className="block text-xs text-muted">{x.nota}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-muted">
          Da sola: poco prima dell’attività il gestionale copre chi ha detto «ci sono», ha la quota
          saldata o dichiarata e i dati a posto. Chi non è pronto resta da fare a mano.
        </p>
        <Invia icona="salva">Salva</Invia>
      </FormAzione>
    </BottoneModale>
  );
}
