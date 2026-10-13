'use client';

import { useMemo, useRef, useState } from 'react';
import { Campo } from './ui';
import {
  FORMATI,
  VALORI_ESEMPIO,
  componiCorpo,
  markdownInHtml,
  riempi,
  testoDaHtml,
  type FormatoEmail,
} from '@/lib/email-corpo';

/** I testi proposti per un'email nuova, secondo il momento. */
const PROPOSTE = {
  ACCETTATO: {
    oggetto: 'Certificato medico di {cognome} {nome}',
    testo: `Buongiorno,

in allegato il certificato medico {tipo} di **{nome} {cognome}**:

- codice fiscale {codiceFiscale}
- nato il {dataNascita} a {luogoNascita}
- rilasciato il {rilascio}, valido fino al **{scadenza}**

Cordiali saluti,
{squadra}`,
  },
  SCADENZA: {
    oggetto: 'Il tuo certificato medico scade il {scadenza}',
    testo: `Ciao {nome},

il tuo certificato medico scade il **{scadenza}**: mancano {giorni} giorni.

Prenota la visita: fra il medico e l'approvazione ci vuole qualche giorno. Il nuovo si carica dal gestionale, in «Miei certificati».

{squadra}`,
  },
} as const;

type Valori = {
  quando: string;
  formato: string;
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
  // le email nuove nascono in Markdown: si legge come testo e arriva impaginata
  const [formato, setFormato] = useState<FormatoEmail>(
    (valori?.formato as FormatoEmail | undefined) ?? 'MARKDOWN',
  );
  const [toccato, setToccato] = useState(!!valori);
  const campoTesto = useRef<HTMLTextAreaElement>(null);
  const campoOggetto = useRef<HTMLInputElement>(null);
  const ultimo = useRef<'oggetto' | 'testo'>('testo');

  /*
   * Cambiare formato porta con sé il testo: dal Markdown (o dal testo) all'HTML
   * si converte esatto, segnaposto compresi, e si parte da lì per abbellirlo;
   * dall'HTML indietro resta il testo, senza la grafica.
   */
  const cambiaFormato = (f: FormatoEmail) => {
    if (f === formato) return;
    if (f === 'HTML') {
      setTesto(
        formato === 'MARKDOWN'
          ? markdownInHtml(testo)
          : `<div style="white-space:pre-wrap">${testo.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</div>`,
      );
    } else if (formato === 'HTML') {
      setTesto(testoDaHtml(testo));
    }
    setFormato(f);
  };

  // l'anteprima: com'è fatta coi dati di una persona d'esempio
  const anteprima = useMemo(
    () => componiCorpo(formato, testo, VALORI_ESEMPIO).html,
    [formato, testo],
  );

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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
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

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="label mb-0">Testo</span>
              <input type="hidden" name="formato" value={formato} />
              <div
                role="radiogroup"
                aria-label="Formato"
                className="flex rounded-md border border-line p-0.5"
              >
                {(Object.keys(FORMATI) as FormatoEmail[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={formato === f}
                    onClick={() => cambiaFormato(f)}
                    className={`rounded px-2.5 py-1 text-xs ${
                      formato === f ? 'bg-nvg/15 font-medium text-nvg' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {FORMATI[f].nome}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              ref={campoTesto}
              name="testo"
              required
              rows={formato === 'HTML' ? 18 : 12}
              spellCheck={formato !== 'HTML'}
              value={testo}
              onFocus={() => (ultimo.current = 'testo')}
              onChange={(e) => {
                setTesto(e.target.value);
                setToccato(true);
              }}
              className={`input ${formato === 'HTML' ? 'num text-xs leading-relaxed' : ''}`}
            />
            <p className="mt-1 text-[11px] text-muted">{FORMATI[formato].spiega}</p>
          </div>

          <div>
            <p className="mb-1 text-[11px] text-muted">
              Tocca un segnaposto per inserirlo dove sei (testo od oggetto): diventa il dato vero
              quando l’email parte. Quelli senza valore restano vuoti.
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
        </div>

        {/* L'anteprima in una cornice chiusa: l'HTML scritto qui non tocca la
            pagina del gestionale, e gli script non partono */}
        <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
          <p className="label">Anteprima</p>
          <div className="overflow-hidden rounded-lg border border-line bg-white">
            <div className="border-b border-black/10 bg-[#f4f4f4] px-3 py-2 text-xs text-[#333]">
              <span className="text-[#888]">Oggetto: </span>
              <strong>{riempi(oggetto, VALORI_ESEMPIO)}</strong>
              {allegato && (
                <span className="block text-[#888]">
                  📎 rossi-mario-certificato-scade-2027-10-12.pdf
                </span>
              )}
            </div>
            <iframe
              title="Anteprima dell’email"
              sandbox=""
              srcDoc={anteprima}
              className="block h-[420px] w-full bg-white lg:h-[560px]"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Coi dati di una persona d’esempio. «Mandami una prova» la manda a te con un certificato
            vero.
          </p>
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
