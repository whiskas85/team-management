'use client';

import { useRef, useState } from 'react';
import { Campo } from './ui';

/** I testi proposti per un'email nuova, secondo il momento. */
const PROPOSTE = {
  ACCETTATO: {
    oggetto: 'Certificato medico di {cognome} {nome}',
    testo: `Buongiorno,

in allegato il certificato medico {tipo} di {nome} {cognome} (codice fiscale {codiceFiscale}, nato il {dataNascita} a {luogoNascita}), rilasciato il {rilascio} e valido fino al {scadenza}.

Cordiali saluti,
{squadra}`,
  },
  SCADENZA: {
    oggetto: 'Il tuo certificato medico scade il {scadenza}',
    testo: `Ciao {nome},

il tuo certificato medico scade il {scadenza}: mancano {giorni} giorni.

Prenota la visita: fra il medico e l'approvazione ci vuole qualche giorno. Il nuovo si carica dal gestionale, in «Miei certificati».

{squadra}`,
  },
} as const;

type Valori = {
  quando: string;
  giorni: number | null;
  allInteressato: boolean;
  destinatari: string;
  oggetto: string;
  testo: string;
  allegato: boolean;
  attivo: boolean;
};

/**
 * Il modulo di un'email dei certificati.
 *
 * I segnaposto sono pulsanti: toccandone uno si scrive nel testo dove c'è il
 * cursore, così non si sbaglia a scriverne il nome. Per un'email nuova il
 * testo proposto cambia col momento, finché non lo si tocca.
 */
export function CampiEmailCertificato({
  valori,
  segnaposto,
}: {
  valori?: Valori;
  segnaposto: Record<string, string>;
}) {
  const [quando, setQuando] = useState<'ACCETTATO' | 'SCADENZA'>(
    valori?.quando === 'SCADENZA' ? 'SCADENZA' : 'ACCETTATO',
  );
  const [oggetto, setOggetto] = useState(valori?.oggetto ?? PROPOSTE.ACCETTATO.oggetto);
  const [testo, setTesto] = useState(valori?.testo ?? PROPOSTE.ACCETTATO.testo);
  const [allegato, setAllegato] = useState(valori?.allegato ?? true);
  const [toccato, setToccato] = useState(!!valori);
  const campoTesto = useRef<HTMLTextAreaElement>(null);
  const campoOggetto = useRef<HTMLInputElement>(null);
  const ultimo = useRef<'oggetto' | 'testo'>('testo');

  const cambiaQuando = (q: 'ACCETTATO' | 'SCADENZA') => {
    setQuando(q);
    if (!toccato) {
      setOggetto(PROPOSTE[q].oggetto);
      setTesto(PROPOSTE[q].testo);
      // l'allegato serve a chi archivia; all'avviso di scadenza di solito no
      setAllegato(q === 'ACCETTATO');
    }
  };

  const inserisci = (k: string) => {
    const tag = `{${k}}`;
    const nelOggetto = ultimo.current === 'oggetto';
    const el = nelOggetto ? campoOggetto.current : campoTesto.current;
    const attuale = nelOggetto ? oggetto : testo;
    const da = el?.selectionStart ?? attuale.length;
    const a = el?.selectionEnd ?? attuale.length;
    const nuovo = attuale.slice(0, da) + tag + attuale.slice(a);
    if (nelOggetto) setOggetto(nuovo);
    else setTesto(nuovo);
    setToccato(true);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(da + tag.length, da + tag.length);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Quando parte">
          <select
            name="quando"
            value={quando}
            onChange={(e) => cambiaQuando(e.target.value as 'ACCETTATO' | 'SCADENZA')}
            className="input"
          >
            <option value="ACCETTATO">Quando approvi il certificato</option>
            <option value="SCADENZA">Prima della scadenza</option>
          </select>
        </Campo>
        {quando === 'SCADENZA' && (
          <Campo label="Giorni prima della scadenza">
            <input
              type="number"
              name="giorni"
              min={0}
              max={365}
              required
              defaultValue={valori?.giorni ?? 30}
              className="input"
            />
            <span className="mt-1 block text-[11px] text-muted">
              0 è il giorno stesso. Per più avvisi (30, 10, 0) crea più email.
            </span>
          </Campo>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="label">A chi</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="allInteressato"
            defaultChecked={valori?.allInteressato ?? quando === 'SCADENZA'}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
          />
          <span>
            Alla persona del certificato
            <span className="block text-[11px] text-muted">
              Solo se ha verificato la sua email (dal profilo).
            </span>
          </span>
        </label>
        <textarea
          name="destinatari"
          rows={2}
          defaultValue={valori?.destinatari ?? ''}
          placeholder="segreteria@esempio.it, medico@esempio.it"
          className="input"
          aria-label="Altri indirizzi"
        />
        <span className="block text-[11px] text-muted">
          Altri indirizzi, separati da virgola. Ognuno riceve la sua email e non vede gli altri.
        </span>
      </fieldset>

      <Campo label="Oggetto">
        <input
          ref={campoOggetto}
          name="oggetto"
          required
          maxLength={200}
          value={oggetto}
          onFocus={() => (ultimo.current = 'oggetto')}
          onChange={(e) => {
            setOggetto(e.target.value);
            setToccato(true);
          }}
          className="input"
        />
      </Campo>

      <Campo label="Testo">
        <textarea
          ref={campoTesto}
          name="testo"
          required
          rows={10}
          value={testo}
          onFocus={() => (ultimo.current = 'testo')}
          onChange={(e) => {
            setTesto(e.target.value);
            setToccato(true);
          }}
          className="input"
        />
      </Campo>

      <div>
        <p className="mb-1 text-[11px] text-muted">
          Tocca un segnaposto per inserirlo dove sei (testo od oggetto): diventa il dato vero quando
          l’email parte. Quelli senza valore restano vuoti.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(segnaposto).map(([k, cosa]) => (
            <button
              key={k}
              type="button"
              title={cosa}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inserisci(k)}
              className="num rounded border border-line bg-surface2 px-1.5 py-0.5 text-[11px] text-ink hover:border-nvg/60 hover:text-nvg"
            >
              {`{${k}}`}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="allegato"
          checked={allegato}
          onChange={(e) => setAllegato(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>Allega il file del certificato</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={valori?.attivo ?? true}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          Attiva
          <span className="block text-[11px] text-muted">Spenta resta scritta ma non parte.</span>
        </span>
      </label>
    </div>
  );
}
