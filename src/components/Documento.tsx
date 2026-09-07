import { fmtDateTime, nomeCompleto } from '@/lib/format';
import { Markdown } from '@/components/Markdown';
import { Campo, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { EditoreMarkdown } from '@/components/EditoreMarkdown';
import { Invia } from '@/components/Bottone';
import { salvaDocumento } from '@/actions/documenti';

/**
 * Un documento e il modo di scriverlo.
 *
 * Statuto e regolamenti sono la stessa cosa vista in due sezioni: il pezzo che
 * li mostra e quello che li corregge stanno qui, così non si comportano in due
 * modi diversi a seconda di dove si aprono.
 */

export type DocumentoLetto = {
  id: string;
  slug: string;
  titolo: string;
  sottotitolo: string | null;
  testo: string;
  ordine: number;
  aggiornatoIl: Date;
  aggiornatoDa: { nome: string; cognome: string; callsign: string | null } | null;
};

/** Il modulo: uguale per un documento nuovo e per uno da correggere. */
export function FormDocumento({
  documento,
  tipo,
}: {
  documento?: DocumentoLetto;
  /** Serve solo alla creazione: dice in quale sezione nasce. */
  tipo?: 'STATUTO' | 'REGOLAMENTO';
}) {
  return (
    <FormAzione azione={salvaDocumento}>
      {documento && <input type="hidden" name="id" value={documento.id} />}
      {!documento && tipo && <input type="hidden" name="tipo" value={tipo} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo label="Titolo">
          <input
            name="titolo"
            defaultValue={documento?.titolo}
            className="input"
            maxLength={80}
            placeholder="Regolamento del mercatino"
          />
        </Campo>
        <Campo label="Sottotitolo">
          <input
            name="sottotitolo"
            defaultValue={documento?.sottotitolo ?? ''}
            className="input"
            maxLength={140}
            placeholder="In una riga, di cosa parla"
          />
        </Campo>
        <Campo label="Ordine">
          <input
            name="ordine"
            type="number"
            defaultValue={documento?.ordine ?? 0}
            className="input"
          />
        </Campo>
      </div>

      <Campo label="Testo" span>
        <EditoreMarkdown
          nome="testo"
          valore={documento?.testo}
          righe={22}
          segnaposto={'# Titolo\n\nTesto del documento…'}
        />
      </Campo>

      <Invia icona="salva">{documento ? 'Salva' : 'Crea'}</Invia>
    </FormAzione>
  );
}

/** Il documento come lo legge la squadra. */
export function LeggiDocumento({
  documento,
  vuoto,
}: {
  documento: DocumentoLetto;
  /** Cosa dire se non è ancora stato scritto. */
  vuoto: string;
}) {
  if (!documento.testo.trim()) return <Vuoto testo={vuoto} />;

  return (
    <div className="card">
      <Markdown testo={documento.testo} />
      <p className="num mt-6 border-t border-line pt-3 text-xs text-muted">
        Ultima modifica {fmtDateTime(documento.aggiornatoIl)}
        {documento.aggiornatoDa ? ` · ${nomeCompleto(documento.aggiornatoDa)}` : ''}
      </p>
    </div>
  );
}
