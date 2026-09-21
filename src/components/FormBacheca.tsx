'use client';

import { useState } from 'react';
import type { PubblicoBacheca } from '@prisma/client';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Campo } from './ui';
import { salvaBacheca } from '@/actions/bacheche';
import { Icona } from './Icona';
import { ICONE_BACHECA, iconaBacheca } from '@/lib/icone-bacheca';

export type PersonaScelta = {
  id: string;
  nome: string;
  gruppo: string;
  /** Puo' scrivere o moderare: e' in squadra. I nuovi leggono e basta. */
  gestisce: boolean;
};

const PUBBLICI: { valore: PubblicoBacheca; testo: string; spiega: string }[] = [
  { valore: 'SQUADRA', testo: 'La squadra', spiega: 'Chi è in rosa, sospeso o da riconfermare.' },
  { valore: 'NUOVI', testo: 'I nuovi', spiega: 'I contatti che si stanno affacciando.' },
  { valore: 'TUTTI', testo: 'Squadra e nuovi', spiega: 'Tutti e due insieme.' },
  {
    valore: 'SELEZIONE',
    testo: 'Persone scelte',
    spiega: 'Solo chi spunti qui sotto: il direttivo, chi fa il marketing.',
  },
];

/** Un elenco di persone da spuntare, con la ricerca: in trenta non si scorre. */
function Spunta({
  nome,
  persone,
  scelti,
}: {
  nome: string;
  persone: PersonaScelta[];
  scelti: string[];
}) {
  const [q, setQ] = useState('');
  const [attivi, setAttivi] = useState(new Set(scelti));
  const testo = q.trim().toLowerCase();
  const visibili = persone.filter((p) => !testo || p.nome.toLowerCase().includes(testo));

  return (
    <div className="rounded-md border border-line bg-surface2 p-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cerca…"
        className="input mb-2"
        autoComplete="off"
      />
      {/* le spunte nascoste dalla ricerca viaggiano lo stesso nel modulo */}
      {[...attivi]
        .filter((id) => !visibili.some((p) => p.id === id))
        .map((id) => (
          <input key={id} type="hidden" name={nome} value={id} />
        ))}
      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {visibili.map((p) => (
          <label key={p.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-surface">
            <input
              type="checkbox"
              name={nome}
              value={p.id}
              checked={attivi.has(p.id)}
              onChange={(e) => {
                const n = new Set(attivi);
                if (e.target.checked) n.add(p.id);
                else n.delete(p.id);
                setAttivi(n);
              }}
            />
            <span className="min-w-0 flex-1 truncate">{p.nome}</span>
            <span className="text-[11px] text-muted">{p.gruppo}</span>
          </label>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted num">{attivi.size} scelti</p>
    </div>
  );
}

/**
 * Crea o configura una bacheca.
 *
 * Tre domande, nell'ordine in cui ci si pensa: **chi la legge**, **chi ci
 * scrive**, **chi la tiene in ordine**. Gli altri leggono, reagiscono e
 * rispondono sotto i messaggi.
 */
export function FormBacheca({
  bacheca,
  persone,
  moderatorePredefinito,
}: {
  bacheca?: {
    id: string;
    nome: string;
    descrizione: string | null;
    pubblico: PubblicoBacheca;
    icona: string;
    moderatoreId: string | null;
    lettori: string[];
    scrittori: string[];
  };
  persone: PersonaScelta[];
  moderatorePredefinito: string;
}) {
  const [pubblico, setPubblico] = useState<PubblicoBacheca>(bacheca?.pubblico ?? 'SQUADRA');
  const [icona, setIcona] = useState(iconaBacheca(bacheca?.icona));
  // chi scrive e chi modera: solo chi e' in squadra, un nuovo la bacheca la legge
  const gestori = persone.filter((p) => p.gestisce);

  return (
    <FormAzione azione={salvaBacheca}>
      {bacheca && <input type="hidden" name="id" value={bacheca.id} />}

      <Campo label="Nome *">
        <input name="nome" required defaultValue={bacheca?.nome} className="input" placeholder="Comunicazioni" />
      </Campo>
      <Campo label="A cosa serve">
        <input
          name="descrizione"
          defaultValue={bacheca?.descrizione ?? ''}
          className="input"
          placeholder="Gli avvisi ufficiali del club"
        />
      </Campo>

      {/* L'icona con cui la si riconosce nel menu, prima ancora del nome */}
      <div>
        <p className="label">Icona nel menu</p>
        <input type="hidden" name="icona" value={icona} />
        <div className="flex flex-wrap gap-1.5">
          {ICONE_BACHECA.map((i) => (
            <button
              key={i.nome}
              type="button"
              title={i.testo}
              aria-label={i.testo}
              aria-pressed={icona === i.nome}
              onClick={() => setIcona(i.nome)}
              className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                icona === i.nome
                  ? 'border-nvg bg-nvg/15 text-nvg'
                  : 'border-line text-muted hover:border-nvgdim hover:text-ink'
              }`}
            >
              <Icona nome={i.nome} size={17} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Chi la legge</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PUBBLICI.map((p) => (
            <label
              key={p.valore}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${
                pubblico === p.valore ? 'border-nvg bg-nvg/10' : 'border-line'
              }`}
            >
              <input
                type="radio"
                name="pubblico"
                value={p.valore}
                checked={pubblico === p.valore}
                onChange={() => setPubblico(p.valore)}
                className="mr-2"
              />
              <strong>{p.testo}</strong>
              <span className="block text-xs text-muted">{p.spiega}</span>
            </label>
          ))}
        </div>
      </div>

      {pubblico === 'SELEZIONE' && (
        <div>
          <p className="label">Le persone che la leggono</p>
          <Spunta nome="lettori" persone={persone} scelti={bacheca?.lettori ?? []} />
        </div>
      )}

      <div>
        <p className="label">Chi ci scrive</p>
        <Spunta
          nome="scrittori"
          persone={gestori}
          scelti={(bacheca?.scrittori ?? []).filter((id) => gestori.some((g) => g.id === id))}
        />
        <p className="mt-1 text-xs text-muted">
          Solo chi è in squadra: i nuovi leggono, mettono le reazioni e rispondono. L’admin e il
          moderatore scrivono sempre.
        </p>
      </div>

      <Campo label="Moderatore">
        <select
          name="moderatoreId"
          defaultValue={bacheca ? (bacheca.moderatoreId ?? '') : moderatorePredefinito}
          className="input"
        >
          <option value="">Nessuno: la modera l’admin</option>
          {gestori.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">
          Cancella messaggi e risposte di chiunque, quando serve rimettere ordine.
        </span>
      </Campo>

      <Invia icona="salva">{bacheca ? 'Salva' : 'Crea la bacheca'}</Invia>
    </FormAzione>
  );
}
