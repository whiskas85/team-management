'use client';

import { useMemo, useState } from 'react';
import { Campo } from './ui';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { registraRosaStorica } from '@/actions/stagioni';

type Operatore = { id: string; nome: string; cognome: string; callsign: string | null };

/**
 * Ricostruzione della rosa di una stagione passata: si spuntano le persone che
 * c'erano e le iscrizioni vengono scritte come gia' attive.
 *
 * Non manda inviti e non tocca lo stato di nessuno: serve solo a dare un
 * contenuto allo storico degli anni precedenti, che altrimenti resterebbe
 * vuoto per sempre.
 */
export function RosaStorica({
  stagioneId,
  nome,
  operatori,
}: {
  stagioneId: string;
  nome: string;
  operatori: Operatore[];
}) {
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');

  const visibili = useMemo(() => {
    const testo = q.trim().toLowerCase();
    if (!testo) return operatori;
    return operatori.filter((o) =>
      `${o.nome} ${o.cognome} ${o.callsign ?? ''}`.toLowerCase().includes(testo),
    );
  }, [operatori, q]);

  const commuta = (id: string) =>
    setScelti((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const tutti = visibili.length > 0 && visibili.every((o) => scelti.has(o.id));

  return (
    <FormAzione azione={registraRosaStorica} className="space-y-4">
      <input type="hidden" name="stagioneId" value={stagioneId} />
      {[...scelti].map((id) => (
        <input key={id} type="hidden" name="userIds" value={id} />
      ))}

      <p className="text-sm text-muted">
        Spunta chi faceva parte della squadra nella stagione {nome}. Le iscrizioni vengono scritte
        come gi&agrave; attive: nessun invito parte, e lo stato attuale degli operatori non cambia.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Tipo di iscrizione">
          <select name="tipo" defaultValue="REISCRIZIONE" className="input">
            <option value="REISCRIZIONE">Reiscrizione (rinnovo)</option>
            <option value="ISCRIZIONE">Iscrizione (primo tesseramento)</option>
          </select>
        </Campo>
        <Campo label="Quota versata (&euro;)">
          <input
            name="quota"
            type="number"
            step="0.01"
            min="0"
            className="input"
            placeholder="facoltativa"
          />
        </Campo>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="input"
        placeholder="Cerca per nome o callsign&hellip;"
        autoComplete="off"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setScelti(tutti ? new Set() : new Set(visibili.map((o) => o.id)))}
          className="btn-ghost btn-sm"
          disabled={visibili.length === 0}
        >
          {tutti ? 'Deseleziona tutti' : 'Seleziona tutti i visibili'}
        </button>
        {scelti.size > 0 && <span className="num text-xs text-nvg">{scelti.size} selezionati</span>}
      </div>

      <div className="max-h-72 space-y-1.5 overflow-y-auto">
        {visibili.map((o) => {
          const scelto = scelti.has(o.id);
          return (
            <label
              key={o.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                scelto ? 'border-nvg/50 bg-nvg/10' : 'border-line bg-surface2 hover:border-nvgdim'
              }`}
            >
              <input
                type="checkbox"
                checked={scelto}
                onChange={() => commuta(o.id)}
                className="h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {o.cognome} {o.nome}
                {o.callsign && <span className="text-nvg"> &middot; {o.callsign}</span>}
              </span>
            </label>
          );
        })}
        {visibili.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">Nessuno corrisponde.</p>
        )}
      </div>

      <Invia icona="salva" className="btn-primary w-full">
        {scelti.size === 0
          ? 'Seleziona chi c&rsquo;era'
          : `Registra ${scelti.size} iscrizioni su ${nome}`}
      </Invia>
    </FormAzione>
  );
}
