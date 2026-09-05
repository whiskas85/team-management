'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Avatar, Badge } from './ui';
import { Icona } from './Icona';
import type { StatoForm } from '@/lib/form';
import { iscriviOperatori } from '@/actions/eventi';

export type Candidato = {
  id: string;
  /** Come va chiamato: già ridotto a "Mario R." se chi guarda non deve saperne di più. */
  etichetta: string;
  iniziali: string;
  callsign: string | null;
  /** Stato del certificato: chi non è in regola non può essere schierato. */
  certificatoOk: boolean;
  motivo: string | null;
};

/**
 * Selezione dei partecipanti da aggiungere. Niente tendina: un elenco con la
 * ricerca, dove si vede subito chi non può essere aggiunto e perché, e si
 * possono spuntare più operatori in una volta.
 */
export function ScegliPartecipanti({
  eventId,
  candidati,
}: {
  eventId: string;
  candidati: Candidato[];
}) {
  const [stato, azione] = useActionState(iscriviOperatori, {} as StatoForm);
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');

  const visibili = useMemo(() => {
    const testo = q.trim().toLowerCase();
    if (!testo) return candidati;
    return candidati.filter((c) =>
      `${c.etichetta} ${c.callsign ?? ''}`.toLowerCase().includes(testo),
    );
  }, [candidati, q]);

  const selezionabili = visibili.filter((c) => c.certificatoOk);
  const tutti = selezionabili.length > 0 && selezionabili.every((c) => scelti.has(c.id));

  const commuta = (id: string) =>
    setScelti((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const senzaCertificato = candidati.filter((c) => !c.certificatoOk).length;

  return (
    <form action={azione} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      {[...scelti].map((id) => (
        <input key={id} type="hidden" name="userIds" value={id} />
      ))}

      {stato.errore && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {stato.errore}
        </div>
      )}
      {stato.ok && (
        <div className="rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-sm text-nvg">
          {stato.ok}
        </div>
      )}

      {candidati.length === 0 ? (
        <p className="text-sm text-muted">Hanno già risposto tutti.</p>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input"
            placeholder="Cerca per nome o callsign…"
            autoComplete="off"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setScelti(tutti ? new Set() : new Set(selezionabili.map((c) => c.id)))
              }
              className="btn-ghost btn-sm"
              disabled={selezionabili.length === 0}
            >
              {tutti ? 'Deseleziona tutti' : 'Seleziona tutti i disponibili'}
            </button>
            {scelti.size > 0 && (
              <span className="num text-xs text-nvg">{scelti.size} selezionati</span>
            )}
            {senzaCertificato > 0 && (
              <span className="text-xs text-danger">
                {senzaCertificato} non selezionabili per il certificato
              </span>
            )}
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {visibili.map((c) => {
              const scelto = scelti.has(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                    !c.certificatoOk
                      ? 'cursor-not-allowed border-danger/30 bg-danger/5 opacity-70'
                      : scelto
                        ? 'cursor-pointer border-nvg/50 bg-nvg/10'
                        : 'cursor-pointer border-line bg-surface2 hover:border-nvgdim'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={scelto}
                    disabled={!c.certificatoOk}
                    onChange={() => commuta(c.id)}
                    className="h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
                  />
                  <Avatar iniziali={c.iniziali} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{c.etichetta}</span>
                    {c.motivo && (
                      <span className="block text-[11px] text-danger">{c.motivo}</span>
                    )}
                  </span>
                  {c.certificatoOk ? (
                    <Badge tono="ok">idoneo</Badge>
                  ) : (
                    <Badge tono="danger">non idoneo</Badge>
                  )}
                </label>
              );
            })}
            {visibili.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">Nessuno corrisponde.</p>
            )}
          </div>

          <Aggiungi quanti={scelti.size} />
        </>
      )}
    </form>
  );
}

function Aggiungi({ quanti }: { quanti: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || quanti === 0} className="btn-primary w-full">
      <Icona nome="aggiungi" size={15} />
      {pending
        ? 'Aggiungo…'
        : quanti === 0
          ? 'Seleziona chi aggiungere'
          : `Aggiungi ${quanti} ${quanti === 1 ? 'operatore' : 'operatori'}`}
    </button>
  );
}
