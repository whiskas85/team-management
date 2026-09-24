'use client';

import { useState, useTransition } from 'react';
import { Icona } from './Icona';
import { vota } from '@/actions/sondaggi';

export type OpzioneVoto = {
  id: string;
  testo: string;
  voti: number;
  /** Ha vinto, ed è l'unica: a pari merito non vince nessuno. */
  vince: boolean;
  /** I nomi di chi l'ha scelta, per chi ha fatto la domanda. */
  chi: string[] | null;
};

/**
 * Le risposte, con il conto sotto.
 *
 * **Si vota e si vede insieme.** Il conto non si nasconde in attesa che tu ti
 * esponga: qui non si cerca l'opinione sincera di un campione, si cerca una
 * data in cui ci siano tutti — e per trovarla il quarto deve sapere che in tre
 * hanno già detto sabato.
 *
 * La barra sotto a ogni riga è lunga quanto i voti sul totale di chi ha
 * risposto, non sulla squadra intera: quello che si guarda è «di quelli che
 * hanno risposto, quanti dicono sabato».
 *
 * **Si salva al clic**, senza un pulsante «Rispondi» da trovare dopo: chi
 * sceglie ha già risposto, e un voto spuntato ma non inviato è un voto perso.
 * La spunta cambia subito; se il server non accetta, torna com'era e si dice
 * perché. Togliere l'ultima spunta ritira la risposta.
 */
export function VotoSondaggio({
  sondaggioId,
  opzioni,
  miei,
  aperto,
  sceltaMultipla,
  totale,
}: {
  sondaggioId: string;
  opzioni: OpzioneVoto[];
  /** Le opzioni che questa persona aveva già scelto. */
  miei: string[];
  aperto: boolean;
  sceltaMultipla: boolean;
  /** Quante persone hanno risposto: è il denominatore delle barre. */
  totale: number;
}) {
  const [scelte, setScelte] = useState<string[]>(miei);
  const [esito, setEsito] = useState<{ ok?: string; errore?: string }>({});
  const [inCorso, avvia] = useTransition();

  const spunta = (id: string) => {
    if (!aperto) return;
    const prima = scelte;
    const nuove = sceltaMultipla
      ? prima.includes(id)
        ? prima.filter((x) => x !== id)
        : [...prima, id]
      : [id];
    if (nuove.join() === prima.join()) return;

    setScelte(nuove);
    setEsito({});
    avvia(async () => {
      const r = await vota(sondaggioId, nuove);
      if (r.errore) setScelte(prima);
      setEsito(r);
    });
  };

  const righe = (
    <div className="space-y-2">
      {opzioni.map((o) => {
        const scelta = scelte.includes(o.id);
        const quota = totale > 0 ? Math.round((o.voti / totale) * 100) : 0;

        return (
          <label
            key={o.id}
            className={`block rounded-lg border px-3 py-2.5 transition-colors ${
              scelta ? 'border-nvg bg-nvg/10' : 'border-line bg-surface'
            } ${aperto ? 'cursor-pointer hover:border-nvgdim' : ''}`}
          >
            <span className="flex items-center gap-2.5">
              <input
                type={sceltaMultipla ? 'checkbox' : 'radio'}
                name="opzione"
                value={o.id}
                checked={scelta}
                onChange={() => spunta(o.id)}
                disabled={!aperto}
                className="h-4 w-4 shrink-0"
              />
              <span className="min-w-0 flex-1 break-words text-sm">
                {o.testo}
                {o.vince && (
                  <span className="ml-2 text-[11px] uppercase tracking-[0.06em] text-nvg">
                    più votata
                  </span>
                )}
              </span>
              <span className="num shrink-0 text-sm text-muted">{o.voti}</span>
            </span>

            <span className="mt-2 block h-1 rounded-full bg-surface2">
              <span
                className={`block h-1 rounded-full ${o.vince ? 'bg-nvg' : 'bg-nvgdim'}`}
                style={{ width: `${quota}%` }}
              />
            </span>

            {/* I nomi, per chi deve richiamare quelli che mancano. */}
            {o.chi && o.chi.length > 0 && (
              <span className="mt-1.5 block text-[11px] text-muted">{o.chi.join(' · ')}</span>
            )}
          </label>
        );
      })}
    </div>
  );

  if (!aperto) {
    return (
      <div>
        {righe}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Icona nome="concludi" size={14} />
          Il sondaggio è chiuso: il risultato resta, le risposte non si cambiano più.
        </p>
      </div>
    );
  }

  return (
    <div>
      {righe}
      <p className="mt-3 text-xs text-muted">
        {sceltaMultipla ? 'Puoi spuntarne più di una. ' : 'Si sceglie una risposta sola. '}
        Si salva appena tocchi, e finché il sondaggio è aperto puoi cambiare idea.
        {inCorso && <span className="ml-2">salvo…</span>}
        {!inCorso && esito.ok && <span className="ml-2 text-nvg">{esito.ok}</span>}
        {!inCorso && esito.errore && <span className="ml-2 text-danger">{esito.errore}</span>}
      </p>
    </div>
  );
}
