'use client';

import { useState } from 'react';
import { Icona } from './Icona';

/**
 * La chiave appena creata, pronta da incollare.
 *
 * Si vede una volta sola — nel gestionale ne resta solo l'impronta — quindi
 * qui non basta mostrarla: va copiata. E siccome quasi nessuno saprebbe cosa
 * farsene da sola, accanto c'è già il comando intero con dentro l'indirizzo
 * giusto, quello da cui si sta guardando la pagina.
 */
export function ChiaveMcp({
  nome,
  token,
  indirizzo,
}: {
  nome: string;
  token: string;
  /** L'indirizzo del gestionale, per scrivere il comando già completo. */
  indirizzo?: string;
}) {
  const [copiato, setCopiato] = useState<string | null>(null);
  const [fallito, setFallito] = useState(false);

  const base = indirizzo ?? 'https://IL-TUO-INDIRIZZO';
  const comando = `claude mcp add --transport http zero-dark ${base}/api/mcp --header "Authorization: Bearer ${token}"`;

  const copia = async (cosa: string, che: string) => {
    try {
      await navigator.clipboard.writeText(cosa);
      setCopiato(che);
      setFallito(false);
      setTimeout(() => setCopiato((c) => (c === che ? null : c)), 2000);
    } catch {
      // gli appunti richiedono una pagina sicura: dove non si può, il testo
      // resta selezionabile a mano e lo si dice invece di fingere
      setFallito(true);
    }
  };

  return (
    <div className="rounded-lg border border-nvg/40 bg-nvg/5 p-3">
      <p className="mb-2 text-xs text-nvg">
        Chiave <strong>{nome}</strong> creata. Copiala adesso: chiusa questa finestra non si può
        più rileggere, si può solo farne un’altra.
      </p>

      <code className="num block select-all break-all rounded bg-surface2 px-2 py-2 text-xs text-ink">
        {token}
      </code>

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => copia(token, 'chiave')} className="btn-ghost btn-sm">
          <Icona nome="carica" size={14} />
          {copiato === 'chiave' ? 'Copiata' : 'Copia la chiave'}
        </button>
        <button type="button" onClick={() => copia(comando, 'comando')} className="btn-ghost btn-sm">
          <Icona nome="carica" size={14} />
          {copiato === 'comando' ? 'Copiato' : 'Copia il comando pronto'}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        Il comando aggiunge il gestionale a Claude Code già collegato a te.
      </p>

      {fallito && (
        <p className="mt-2 text-[11px] text-warn">
          Gli appunti non sono disponibili qui: seleziona il testo e copialo a mano.
        </p>
      )}
    </div>
  );
}
