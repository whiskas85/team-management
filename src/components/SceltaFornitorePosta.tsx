'use client';

import { useRef, useState } from 'react';

type Fornitore = {
  id: string;
  nome: string;
  host: string;
  porta: number;
  sicuro: boolean;
  nota: string;
};

/**
 * Il fornitore della casella: scegliendolo, server, porta e SSL del modulo si
 * riempiono da soli, e sotto compare quello che con lui si sbaglia sempre (la
 * «password per le app» di Gmail, l'SMTP spento di Microsoft). «Altro» lascia
 * i campi come sono, da scrivere a mano.
 */
export function SceltaFornitorePosta({
  fornitori,
  iniziale,
}: {
  fornitori: readonly Fornitore[];
  /** Il fornitore riconosciuto dal server salvato, o «altro». */
  iniziale: string;
}) {
  const [scelto, setScelto] = useState(iniziale);
  const radice = useRef<HTMLDivElement>(null);
  const f = fornitori.find((x) => x.id === scelto);

  const scegli = (id: string) => {
    setScelto(id);
    const nuovo = fornitori.find((x) => x.id === id);
    const form = radice.current?.closest('form');
    if (!nuovo || !form) return;
    const campo = (n: string) => form.elements.namedItem(n) as HTMLInputElement | null;
    const host = campo('host');
    const porta = campo('porta');
    const sicuro = campo('sicuro');
    if (host) host.value = nuovo.host;
    if (porta) porta.value = String(nuovo.porta);
    if (sicuro) sicuro.checked = nuovo.sicuro;
  };

  return (
    <div ref={radice} className="sm:col-span-2">
      <label className="label" htmlFor="fornitore">
        Fornitore della casella
      </label>
      <select
        id="fornitore"
        value={scelto}
        onChange={(e) => scegli(e.target.value)}
        className="input"
      >
        {fornitori.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nome}
          </option>
        ))}
        <option value="altro">Altro (scrivo io server e porta)</option>
      </select>
      <p className="mt-1 text-[11px] text-muted">
        {f
          ? f.nota
          : 'Cerca «SMTP» nelle istruzioni del tuo fornitore: server, porta (465 con SSL, o 587 senza) e le credenziali della casella.'}
      </p>
    </div>
  );
}
