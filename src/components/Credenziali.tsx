'use client';

import { useState } from 'react';
import { Icona } from './Icona';

/**
 * Le credenziali appena generate, pronte da consegnare.
 *
 * Ricopiare a mano una password di dodici caratteri, con i trattini, davanti a
 * qualcuno che aspetta, è il modo più sicuro per sbagliarla e far tornare la
 * persona a chiedere. Qui si copia: il singolo campo se serve solo quello,
 * oppure il messaggio già scritto da incollare in chat.
 *
 * La scrittura negli appunti richiede una pagina sicura (https o localhost).
 * Dove non è possibile il testo resta comunque selezionabile a mano, e lo si
 * dice invece di lasciare un pulsante che non fa niente.
 */
export function Credenziali({
  utente,
  password,
  indirizzo,
}: {
  utente: string;
  password: string;
  /** L'indirizzo a cui collegarsi, se lo si vuole nel messaggio. */
  indirizzo?: string;
}) {
  const [copiato, setCopiato] = useState<string | null>(null);
  const [fallito, setFallito] = useState(false);

  const messaggio = [
    'Accesso a Zero Dark Ops',
    indirizzo ? `Indirizzo: ${indirizzo}` : null,
    `Utente: ${utente}`,
    `Password: ${password}`,
    'Al primo accesso ti verrà chiesto di sceglierne una tua.',
  ]
    .filter(Boolean)
    .join('\n');

  const copia = async (testo: string, cosa: string) => {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(cosa);
      setFallito(false);
      setTimeout(() => setCopiato((c) => (c === cosa ? null : c)), 2000);
    } catch {
      setFallito(true);
    }
  };

  const Riga = ({ etichetta, valore }: { etichetta: string; valore: string }) => (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-[0.06em] text-muted">
        {etichetta}
      </span>
      <code className="num min-w-0 flex-1 select-all truncate rounded bg-surface2 px-2 py-1 text-sm text-ink">
        {valore}
      </code>
      <button
        type="button"
        onClick={() => copia(valore, etichetta)}
        className="btn-ghost btn-sm shrink-0"
        title={`Copia ${etichetta.toLowerCase()}`}
      >
        {copiato === etichetta ? 'copiato' : 'copia'}
      </button>
    </div>
  );

  return (
    <div className="space-y-2 rounded-md border border-nvg/40 bg-nvg/5 p-3">
      <Riga etichetta="Utente" valore={utente} />
      <Riga etichetta="Password" valore={password} />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
        <button
          type="button"
          onClick={() => copia(messaggio, 'Messaggio')}
          className="btn-primary btn-sm"
        >
          <Icona nome="carica" size={15} />
          {copiato === 'Messaggio' ? 'Messaggio copiato' : 'Copia il messaggio pronto'}
        </button>
        <span className="text-[11px] text-muted">da incollare in chat</span>
      </div>

      {fallito && (
        <p className="text-[11px] text-warn">
          Il browser non lascia scrivere negli appunti da questa pagina: seleziona il testo e copia
          a mano.
        </p>
      )}
    </div>
  );
}
