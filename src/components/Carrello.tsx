'use client';

import { useActionState, useEffect, useState } from 'react';
import { fmtEuro } from '@/lib/format';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import { inviaOrdine } from '@/actions/ordini';
import type { StatoForm } from '@/lib/form';

type Voce = {
  id: string;
  titolo: string;
  prezzo: number;
  /** Quanti pezzi ne ha già ordinati chi sta guardando. */
  gia: number;
};

/**
 * Il carrello del merchandising.
 *
 * Si ordina in un colpo solo perché così si compra davvero: due magliette, una
 * patch e un cappellino sono **un** ordine e **una** quota, non quattro. Con un
 * pulsante per voce si finirebbe con quattro righe nei pagamenti della stessa
 * persona, e la segreteria a incassarle una per una.
 *
 * Quello che c'è dentro resta nella pagina finché non si manda: nessuna bozza
 * salvata da nessuna parte, nessun carrello dimenticato da recuperare tre
 * settimane dopo con i prezzi cambiati.
 */
export function Carrello({ annuncioId, voci }: { annuncioId: string; voci: Voce[] }) {
  const [quantita, setQuantita] = useState<Record<string, number>>({});
  const [stato, azione, inCorso] = useActionState(inviaOrdine, {} as StatoForm);

  useEffect(() => {
    if (stato.errore) mostraToast(stato.errore, 'errore');
    else if (stato.ok) {
      mostraToast(stato.ok, 'ok');
      setQuantita({});
    }
  }, [stato]);

  const cambia = (id: string, di: number) =>
    setQuantita((q) => {
      const n = Math.max(0, Math.min(50, (q[id] ?? 0) + di));
      const nuovo = { ...q };
      if (n === 0) delete nuovo[id];
      else nuovo[id] = n;
      return nuovo;
    });

  const scelte = voci.filter((v) => (quantita[v.id] ?? 0) > 0);
  const pezzi = scelte.reduce((s, v) => s + quantita[v.id], 0);
  const totale = scelte.reduce((s, v) => s + v.prezzo * quantita[v.id], 0);

  return (
    <form action={azione} className="card">
      <input type="hidden" name="annuncioId" value={annuncioId} />
      <input
        type="hidden"
        name="carrello"
        value={JSON.stringify(scelte.map((v) => ({ voceId: v.id, quantita: quantita[v.id] })))}
      />

      <div className="mb-3 flex items-center gap-2 border-b border-line pb-3">
        <Icona nome="carrello" size={16} />
        <p className="titolo-sezione">Ordina</p>
      </div>

      <div className="space-y-2">
        {voci.map((v) => {
          const n = quantita[v.id] ?? 0;
          return (
            <div
              key={v.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                n > 0 ? 'border-nvgdim bg-nvg/5' : 'border-line'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{v.titolo}</p>
                <p className="num text-[11px] text-muted">
                  {fmtEuro(v.prezzo)}
                  {/* senza questo, il secondo ordine per sbaglio è questione di giorni */}
                  {v.gia > 0 && ` · ne hai già ordinate ${v.gia}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => cambia(v.id, -1)}
                  disabled={n === 0}
                  aria-label={`Togli un ${v.titolo}`}
                  className="h-7 w-7 rounded border border-line text-muted transition-colors hover:border-nvgdim hover:text-ink disabled:opacity-30"
                >
                  −
                </button>
                <span className="num w-6 text-center text-sm">{n}</span>
                <button
                  type="button"
                  onClick={() => cambia(v.id, 1)}
                  aria-label={`Aggiungi un ${v.titolo}`}
                  className="h-7 w-7 rounded border border-line text-muted transition-colors hover:border-nvgdim hover:text-ink"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted">
            {pezzi === 0 ? 'Carrello vuoto' : pezzi === 1 ? '1 pezzo' : `${pezzi} pezzi`}
          </span>
          <span className="num text-lg font-semibold text-nvg">{fmtEuro(totale)}</span>
        </div>

        <textarea
          name="note"
          rows={2}
          maxLength={500}
          className="input mb-2"
          placeholder="Una nota per chi raccoglie l’ordine (facoltativa)"
        />

        <button
          type="submit"
          disabled={pezzi === 0 || inCorso}
          className="btn-primary w-full justify-center"
        >
          <Icona nome="carrello" size={15} />
          {inCorso ? 'Invio…' : 'Invia l’ordine'}
        </button>

        <p className="mt-2 text-[11px] text-muted">
          Inviandolo nasce una quota fra i tuoi pagamenti: la incassa la segreteria, come le altre.
          Puoi ritirarlo finché non è stata incassata.
        </p>
      </div>
    </form>
  );
}
