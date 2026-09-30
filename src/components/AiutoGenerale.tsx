'use client';

import { useMemo, useState } from 'react';
import { AIUTO, cercaAiuto, type VoceAiuto } from '@/lib/aiuto';
import { Icona } from './Icona';
import { VoceAiutoVista } from './VoceAiutoVista';

const AREE: VoceAiuto['area'][] = [
  'Primi passi',
  'Operativo',
  'Squadra',
  'Soldi',
  'Comunicazione',
  'Altre squadre',
  'Amministrazione',
  'Account',
];

/**
 * Tutto l'aiuto in una pagina: la ricerca in cima, e sotto le voci divise per
 * argomento, con l'indice per saltare. Ogni voce ha un suo indirizzo
 * (/aiuto#chiave) da mandare a chi fa una domanda.
 */
export function AiutoGenerale() {
  const [cerca, setCerca] = useState('');
  const trovate = useMemo(() => cercaAiuto(cerca), [cerca]);
  return (
    <div className="space-y-6">
      <label className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <Icona nome="cerca" size={16} />
        </span>
        <input
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          className="input py-3 pl-10 text-base"
          placeholder="Cosa vuoi fare? Es. pagare una quota, invitare una squadra, tema scuro…"
          aria-label="Cerca nell’aiuto"
        />
      </label>

      {cerca.trim() ? (
        trovate.length > 0 ? (
          <div className="space-y-4">
            {trovate.map((v) => (
              <div key={v.chiave} className="card">
                <VoceAiutoVista voce={v} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Niente per «{cerca}»: prova con un’altra parola.</p>
        )
      ) : (
        <>
          <nav aria-label="Argomenti" className="flex flex-wrap gap-2">
            {AREE.map((a) => (
              <a key={a} href={`#area-${a}`} className="btn-ghost btn-sm">
                {a}
              </a>
            ))}
          </nav>
          {AREE.map((a) => (
            <section key={a} id={`area-${a}`} className="scroll-mt-24">
              <p className="titolo-sezione mb-3">{a}</p>
              <div className="space-y-4">
                {AIUTO.filter((v) => v.area === a).map((v) => (
                  <div key={v.chiave} id={v.chiave} className="card scroll-mt-24">
                    <VoceAiutoVista voce={v} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
