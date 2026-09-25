'use client';

import { useState } from 'react';
import { Campo } from './ui';
import { Icona } from './Icona';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { EditoreMarkdown } from './EditoreMarkdown';
import { ICONE_BACHECA, iconaBacheca } from '@/lib/icone-bacheca';
import { salvaCanale } from '@/actions/canali-segnalazioni';

type Firma = 'NOMINALE' | 'ANONIMA' | 'A_SCELTA';
type Pubblico = 'SQUADRA' | 'NUOVI' | 'TUTTI';

export type CanaleDaModificare = {
  id: string;
  titolo: string;
  descrizione: string | null;
  icona: string;
  firma: Firma;
  pubblico: Pubblico;
  conAllegati: boolean;
  attivo: boolean;
};

const FIRME: { valore: Firma; titolo: string; sotto: string }[] = [
  {
    valore: 'A_SCELTA',
    titolo: 'Decide chi segnala',
    sotto: 'Ogni volta sceglie se firmarla o renderla anonima.',
  },
  { valore: 'NOMINALE', titolo: 'Sempre col nome', sotto: 'Chi gestisce sa chi l’ha scritta.' },
  {
    valore: 'ANONIMA',
    titolo: 'Sempre anonime',
    sotto: 'Il nome non lo vede nessuno, nemmeno l’admin. La risposta arriva lo stesso.',
  },
];

/**
 * Crea o configura un canale di segnalazione.
 *
 * La descrizione è il foglio che si legge prima di scrivere: cosa si segnala
 * qui, cosa succede dopo. Si scrive in Markdown, come le segnalazioni.
 */
export function FormCanale({ canale }: { canale?: CanaleDaModificare }) {
  const [icona, setIcona] = useState(iconaBacheca(canale?.icona ?? 'scudo'));
  const [firma, setFirma] = useState<Firma>(canale?.firma ?? 'A_SCELTA');

  return (
    <FormAzione azione={salvaCanale}>
      {canale && <input type="hidden" name="id" value={canale.id} />}

      <Campo label="Titolo *">
        <input
          name="titolo"
          required
          maxLength={120}
          defaultValue={canale?.titolo}
          className="input"
          placeholder="Tornei, Comportamenti scorretti, Idee e feedback…"
        />
      </Campo>

      <div>
        <p className="label">Cosa si segnala qui</p>
        <EditoreMarkdown
          nome="descrizione"
          valore={canale?.descrizione ?? ''}
          righe={5}
          aiuto={false}
          segnaposto="Spiega a chi sta per scrivere cosa raccontare, e cosa succede dopo."
        />
      </div>

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
        <p className="label">Come si firma</p>
        <input type="hidden" name="firma" value={firma} />
        <div className="grid gap-2 sm:grid-cols-3">
          {FIRME.map((f) => (
            <button
              key={f.valore}
              type="button"
              onClick={() => setFirma(f.valore)}
              aria-pressed={firma === f.valore}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                firma === f.valore
                  ? 'border-nvg bg-nvg/10'
                  : 'border-line bg-surface2 hover:border-nvgdim'
              }`}
            >
              <span className="block text-sm font-medium">{f.titolo}</span>
              <span className="mt-0.5 block text-xs text-muted">{f.sotto}</span>
            </button>
          ))}
        </div>
      </div>

      <Campo label="Chi può segnalare">
        <select name="pubblico" defaultValue={canale?.pubblico ?? 'TUTTI'} className="input">
          <option value="TUTTI">Tutti, squadra e nuovi</option>
          <option value="SQUADRA">La squadra</option>
          <option value="NUOVI">I nuovi</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          Le segnalazioni le leggono sempre e solo l’admin e i moderatori; chi scrive vede solo le
          sue.
        </p>
      </Campo>

      <label className="flex min-w-0 items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="conAllegati"
          defaultChecked={canale?.conAllegati ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          Si possono allegare foto e documenti
          <span className="block text-xs text-muted">
            Foto (JPG, PNG, WEBP), PDF e documenti: fino a 10 MB l’uno, 20 MB in tutto.
          </span>
        </span>
      </label>

      {canale && (
        <label className="flex min-w-0 items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="attivo"
            defaultChecked={canale.attivo}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
          />
          <span className="min-w-0">
            Attivo
            <span className="block text-xs text-muted">
              Spento non accetta segnalazioni nuove e sparisce dal menu; quelle fatte restano.
            </span>
          </span>
        </label>
      )}

      <Invia icona="salva">{canale ? 'Salva' : 'Crea il canale'}</Invia>
    </FormAzione>
  );
}
