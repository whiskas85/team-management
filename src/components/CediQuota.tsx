'use client';

import { useMemo, useState } from 'react';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Campo } from './ui';
import { cediQuota } from '@/actions/eventi';
import { fmtEuro } from '@/lib/format';

export type Cedente = {
  id: string;
  nome: string;
  pagato: number;
  /** Dove è stato pagato: «40 € al club · 15 € a SAT & Gaming». */
  dettaglio: string;
};

export type Ricevente = {
  id: string;
  nome: string;
  gruppo: 'attivita' | 'squadra' | 'fuori';
};

const GRUPPI: { chiave: Ricevente['gruppo']; titolo: string }[] = [
  { chiave: 'attivita', titolo: 'Già fra le risposte' },
  { chiave: 'squadra', titolo: 'Squadra' },
  { chiave: 'fuori', titolo: 'Da fuori (pagano anche la polizza)' },
];

/**
 * Lo scambio di quota: chi ha pagato e non può venire la passa a un altro.
 *
 * Due scelte e un conto detto prima di confermare: quello che il primo ha
 * pagato diventa credito del secondo, nella stessa cassa, e paga la sua quota.
 * Se il secondo viene da fuori la sua quota costa di più — c'è la polizza — e
 * gli resta da versare solo la differenza.
 */
export function CediQuota({
  eventId,
  cedenti,
  riceventi,
}: {
  eventId: string;
  cedenti: Cedente[];
  riceventi: Ricevente[];
}) {
  const [da, setDa] = useState(cedenti.length === 1 ? cedenti[0].id : '');
  const [a, setA] = useState('');
  const [cerca, setCerca] = useState('');

  const chiDa = cedenti.find((c) => c.id === da);
  const scelti = useMemo(() => {
    const t = cerca.trim().toLowerCase();
    return riceventi.filter((r) => r.id !== da && (!t || r.nome.toLowerCase().includes(t)));
  }, [riceventi, cerca, da]);
  const chiA = riceventi.find((r) => r.id === a && r.id !== da);

  return (
    <FormAzione azione={cediQuota}>
      <input type="hidden" name="eventId" value={eventId} />

      <Campo label="Chi cede la quota *">
        <select
          name="daUserId"
          value={da}
          onChange={(e) => setDa(e.target.value)}
          className="input"
          required
        >
          <option value="">Scegli chi non può più venire…</option>
          {cedenti.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} · ha pagato {fmtEuro(c.pagato)}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="A chi la cede *">
        <input
          type="search"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder="Cerca per nome o nome di battaglia"
          className="input mb-2"
          aria-label="Cerca chi riceve la quota"
        />
        <select
          name="aUserId"
          value={chiA ? a : ''}
          onChange={(e) => setA(e.target.value)}
          className="input"
          required
        >
          <option value="">
            {scelti.length === 0 ? 'Nessuno con questo nome' : 'Scegli chi viene al suo posto…'}
          </option>
          {GRUPPI.map((g) => {
            const righe = scelti.filter((r) => r.gruppo === g.chiave);
            return righe.length === 0 ? null : (
              <optgroup key={g.chiave} label={g.titolo}>
                {righe.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </Campo>

      {chiDa && (
        <div className="space-y-1.5 rounded-lg border border-line bg-surface2 p-3 text-sm">
          <p>
            <strong>{chiDa.nome}</strong> ha pagato {fmtEuro(chiDa.pagato)}
            {chiDa.dettaglio ? ` (${chiDa.dettaglio})` : ''}: esce dall’attività e quei soldi
            diventano credito di <strong>{chiA?.nome ?? 'chi la riceve'}</strong>, nella stessa
            cassa.
          </p>
          <p className="text-muted">
            {chiA?.nome ?? 'Chi la riceve'} entra fra i presenti con la sua quota, al suo prezzo, e
            il credito la paga fin dove arriva.{' '}
            {chiA?.gruppo === 'fuori'
              ? 'Viene da fuori: la sua quota comprende la polizza, e gli resta da versare solo la differenza.'
              : 'Se la sua quota costa di più gli resta da versare la differenza; se costa meno, l’avanzo resta suo credito.'}
          </p>
        </div>
      )}

      <Invia icona="approva">Cedi la quota</Invia>
    </FormAzione>
  );
}
