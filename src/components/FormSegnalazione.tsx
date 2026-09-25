'use client';

import { useState } from 'react';
import { Campo } from './ui';
import { Icona } from './Icona';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { CampoFile } from './CampoFile';
import { EditoreMarkdown } from './EditoreMarkdown';
import { inviaSegnalazione } from '@/actions/canali-segnalazioni';

type Persona = { id: string; maniglia: string; nome: string };

/**
 * Il modulo di una segnalazione: titolo, racconto, e come firmarla.
 *
 * **La firma si dice sempre, prima di inviare**: chi scrive deve sapere se
 * chi legge vedrà il suo nome. Dove il canale lascia scegliere, la scelta sta
 * sopra al pulsante, non in fondo a una tendina.
 */
export function FormSegnalazione({
  canaleId,
  firma,
  conAllegati,
  persone,
  nome,
}: {
  canaleId: string;
  firma: 'NOMINALE' | 'ANONIMA' | 'A_SCELTA';
  conAllegati: boolean;
  persone: Persona[];
  /** Il nome di chi scrive, com'è mostrato quando firma. */
  nome: string;
}) {
  const [anonima, setAnonima] = useState(firma === 'ANONIMA');

  return (
    <FormAzione azione={inviaSegnalazione}>
      <input type="hidden" name="canaleId" value={canaleId} />
      {anonima && <input type="hidden" name="anonima" value="on" />}

      <Campo label="Titolo *">
        <input
          name="titolo"
          required
          maxLength={200}
          className="input"
          placeholder="In due parole, di cosa si tratta"
        />
      </Campo>

      <div>
        <p className="label">Cosa vuoi segnalare *</p>
        <EditoreMarkdown
          nome="testo"
          righe={8}
          persone={persone}
          segnaposto="Racconta com'è andata. Con @ puoi nominare una persona: non riceve nessun avviso."
        />
      </div>

      {conAllegati && (
        <CampoFile
          label="Foto o documenti"
          name="allegati"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf,.md,.txt,.docx,.xlsx,.pptx"
          estensioni={[
            '.jpg',
            '.jpeg',
            '.png',
            '.webp',
            '.pdf',
            '.md',
            '.txt',
            '.docx',
            '.xlsx',
            '.pptx',
          ]}
          maxBytes={10 * 1024 * 1024}
          maxTotale={20 * 1024 * 1024}
          aiuto="Facoltativi: anche più di uno, fino a 10 MB l’uno e 20 MB in tutto. Le vede solo chi gestisce le segnalazioni."
        />
      )}

      {firma === 'A_SCELTA' ? (
        <div>
          <p className="label">Come la firmi</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { anonima: false, titolo: 'Col mio nome', sotto: `Chi la legge vede che è di ${nome}.` },
              {
                anonima: true,
                titolo: 'Anonima',
                sotto: 'Il tuo nome non lo vede nessuno, nemmeno l’admin. Le risposte arrivano a te lo stesso.',
              },
            ].map((o) => (
              <button
                key={o.titolo}
                type="button"
                onClick={() => setAnonima(o.anonima)}
                aria-pressed={anonima === o.anonima}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  anonima === o.anonima
                    ? 'border-nvg bg-nvg/10'
                    : 'border-line bg-surface2 hover:border-nvgdim'
                }`}
              >
                <span className="block text-sm font-medium">{o.titolo}</span>
                <span className="mt-0.5 block text-xs text-muted">{o.sotto}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="flex items-start gap-2 rounded-md border border-line bg-surface2 px-3 py-2 text-xs text-muted">
          <Icona nome={anonima ? 'scudo' : 'profilo'} size={14} />
          {anonima
            ? 'In questo canale le segnalazioni sono anonime: il tuo nome non lo vede nessuno, nemmeno l’admin. Le risposte arrivano a te lo stesso.'
            : `In questo canale le segnalazioni si firmano: chi la legge vede che è di ${nome}.`}
        </p>
      )}

      <Invia icona="rilascia">Invia la segnalazione</Invia>
    </FormAzione>
  );
}
