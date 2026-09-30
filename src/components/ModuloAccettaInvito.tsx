'use client';

import { useState } from 'react';
import { accettaInvitoEvento } from '@/actions/eventi-condivisi';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Campo } from './ui';
import { QuoteEvento } from './QuoteEvento';
import type { VoceListino } from './CampiRichiesta';

export type TipologiaInvito = {
  id: string;
  nome: string;
  /** Solo per la squadra: ai nuovi non si rilascia, e la quota esterni non serve. */
  soloInterno: boolean;
};

/**
 * Accettare un invito: la tipologia nostra, e le quote per i nostri — le
 * stesse card della scheda Pagamenti, con le stesse voci del listino filtrate
 * allo stesso modo. La quota esterni compare se la tipologia scelta si può
 * rilasciare anche ai nuovi.
 *
 * Quello che chiede l'organizzatore **non** si propone come quota: finirebbe
 * nel dettaglio che leggono tutti, e il prezzo d'acquisto lo sa solo l'admin.
 */
export function ModuloAccettaInvito({
  id,
  organizzatore,
  tipologie,
  tipoLoro,
  costo,
  casse,
  listino,
  stagioneId,
  giorni,
}: {
  id: string;
  organizzatore: string;
  tipologie: TipologiaInvito[];
  tipoLoro?: string | null;
  costo?: { importo: number; per: 'OPERATORE' | 'SQUADRA' } | null;
  casse: { id: string; nome: string }[];
  listino: VoceListino[];
  stagioneId: string | null;
  giorni: number;
}) {
  const proposta = tipoLoro
    ? tipologie.find((t) => t.nome.localeCompare(tipoLoro, 'it', { sensitivity: 'base' }) === 0)
    : undefined;
  const [tipoId, setTipoId] = useState(proposta?.id ?? '');
  const tipo = tipologie.find((t) => t.id === tipoId);
  // finché non si sceglie la tipologia non si sa: la si mostra
  const conNuovi = !tipo || !tipo.soloInterno;

  return (
    <FormAzione azione={accettaInvitoEvento} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-muted">
        Diventa un’attività nostra, in bozza: posti e rilascio li decidi dopo. {organizzatore} vede
        che l’avete accettata.
      </p>
      <Campo label="Tipologia *" span>
        <select
          name="tipoId"
          required
          value={tipoId}
          onChange={(e) => setTipoId(e.target.value)}
          className="input"
        >
          <option value="" disabled>
            — scegli fra le nostre —
          </option>
          {tipologie.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        {tipoLoro && (
          <span className="mt-1 block text-[11px] text-muted">
            Per {organizzatore} è «{tipoLoro}».
          </span>
        )}
      </Campo>

      {costo && (
        // due soldi diversi, da non confondere: quello che la squadra versa a
        // loro, e quello che i vostri versano alla squadra (qui sotto)
        <div className="rounded-md border border-warn/40 bg-warn/5 p-3">
          <p className="titolo-sezione">Verso {organizzatore}</p>
          <p className="mt-0.5 text-sm text-warn">
            Chiedono{' '}
            <strong>
              {costo.importo.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              {costo.per === 'SQUADRA' ? ' per la squadra' : ' a operatore'}
            </strong>
            , da versare come squadra. Il conto lo trovi nella scheda dell’attività, con «Paga».
          </p>
        </div>
      )}

      <div>
        <p className="titolo-sezione mb-2">Quote per i vostri</p>
        <QuoteEvento
          listino={listino}
          stagioneId={stagioneId}
          casse={casse}
          // la giocata dei nuovi parte spuntata, come su un'attività nuova
          preselezionaEsterni
          mostraEsterni={conNuovi}
          giorni={giorni}
        />
        <p className="mt-2 text-xs text-muted">
          Come nella scheda Pagamenti: le cambi quando vuoi dalla modifica dell’attività.
        </p>
      </div>

      <Invia icona="approva">Accetta</Invia>
    </FormAzione>
  );
}
