'use client';

import { useState } from 'react';
import { Campo } from './ui';
import { Icona, type NomeIcona } from './Icona';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { creaSondaggio, modificaSondaggio } from '@/actions/sondaggi';

/**
 * Il modulo di un sondaggio, che comincia chiedendo **a cosa serve**.
 *
 * Una domanda vuota — «scrivi le opzioni» — costringe chi la fa a inventarsi
 * la forma ogni volta, e ogni volta viene diversa: chi chiede «quando
 * giochiamo» scrive tre date a mano nel testo, e poi dal risultato non nasce
 * niente perché quelle date sono parole. Chiedendo prima cosa si vuole
 * ottenere, il sondaggio nasce già della forma giusta, e alla fine sa
 * diventare un'attività.
 *
 * Tre strade, che sono le tre domande che si fanno davvero: quando ci si
 * trova, chi viene, e la scelta fra cose.
 */

type Forma = 'DATA' | 'PRESENZE' | 'TESTO';

const STRADE: { forma: Forma; titolo: string; sotto: string; icona: NomeIcona }[] = [
  {
    forma: 'DATA',
    titolo: 'Trovare una data',
    sotto: 'Si propone qualche giorno e si vede quando ci sono tutti. Dal risultato nasce l’attività, con dentro la data che ha vinto.',
    icona: 'calendario',
  },
  {
    forma: 'PRESENZE',
    titolo: 'Sapere chi viene',
    sotto: 'Ci sono, forse, non ci sono. Dal risultato nasce l’attività con già segnato chi ha detto di esserci.',
    icona: 'presente',
  },
  {
    forma: 'TESTO',
    titolo: 'Scegliere fra cose',
    sotto: 'Le risposte le scrivi tu: la maglia, il posto dove si mangia, quello che serve.',
    icona: 'bozza',
  },
];

/** Quello che il gestionale propone da sé, perché non si parta dal foglio bianco. */
const PRECABLATO: Record<Forma, { domanda: string; opzioni: string[]; multipla: boolean }> = {
  DATA: { domanda: 'Quando giochiamo?', opzioni: [], multipla: true },
  PRESENZE: {
    domanda: 'Chi viene?',
    opzioni: ['Ci sono', 'Forse', 'Non ci sono'],
    multipla: false,
  },
  TESTO: { domanda: '', opzioni: ['', ''], multipla: false },
};

/** Un sondaggio già aperto, da modificare. Le date arrivano come aaaa-mm-ggThh:mm. */
export type SondaggioDaModificare = {
  id: string;
  tipo: Forma;
  domanda: string;
  dettaglio: string | null;
  destinatari: string;
  sceltaMultipla: boolean;
  scadeIl: string;
  opzioni: { id: string; testo: string; quando: string }[];
};

/** Una risposta del modulo: con l'id se c'era già, senza se è nuova. */
type Riga = { id: string; valore: string };

export function FormSondaggio({ sondaggio }: { sondaggio?: SondaggioDaModificare } = {}) {
  const modifica = !!sondaggio;
  const [forma, setForma] = useState<Forma | null>(sondaggio?.tipo ?? null);
  const [righe, setRighe] = useState<Riga[]>(
    sondaggio && sondaggio.tipo !== 'DATA'
      ? sondaggio.opzioni.map((o) => ({ id: o.id, valore: o.testo }))
      : [],
  );
  const [date, setDate] = useState<Riga[]>(
    sondaggio && sondaggio.tipo === 'DATA'
      ? sondaggio.opzioni.map((o) => ({ id: o.id, valore: o.quando }))
      : [
          { id: '', valore: '' },
          { id: '', valore: '' },
        ],
  );

  const scegli = (f: Forma) => {
    setForma(f);
    setRighe(PRECABLATO[f].opzioni.map((valore) => ({ id: '', valore })));
    setDate([
      { id: '', valore: '' },
      { id: '', valore: '' },
    ]);
  };

  if (!forma) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">Cosa vuoi ottenere?</p>
        {STRADE.map((s) => (
          <button
            key={s.forma}
            type="button"
            onClick={() => scegli(s.forma)}
            className="flex w-full items-start gap-3 rounded-lg border border-line bg-surface2 px-3 py-3 text-left transition-colors hover:border-nvg/50"
          >
            <span className="mt-0.5 shrink-0 text-nvg">
              <Icona nome={s.icona} size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{s.titolo}</span>
              <span className="mt-0.5 block text-xs text-muted">{s.sotto}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  const base = PRECABLATO[forma];

  return (
    <FormAzione azione={modifica ? modificaSondaggio : creaSondaggio}>
      <input type="hidden" name="tipo" value={forma} />
      {sondaggio && <input type="hidden" name="id" value={sondaggio.id} />}

      {/* il tipo non si cambia a sondaggio aperto: le risposte date a «chi
          viene?» non vogliono dire niente sotto «quando giochiamo?» */}
      {!modifica && (
        <button
          type="button"
          onClick={() => setForma(null)}
          className="text-xs text-muted hover:text-nvg"
        >
          ← cambia tipo di sondaggio
        </button>
      )}

      <Campo label="La domanda *" span>
        <input
          name="domanda"
          className="input"
          required
          maxLength={200}
          defaultValue={sondaggio?.domanda ?? base.domanda}
          placeholder="es. Quando giochiamo a ottobre?"
        />
        <p className="mt-1 text-xs text-muted">
          È quello che si legge nella notifica: scrivila come la diresti a voce.
        </p>
      </Campo>

      <Campo label="Qualche parola in più" span>
        <textarea
          name="dettaglio"
          rows={2}
          defaultValue={sondaggio?.dettaglio ?? ''}
          className="input"
          placeholder="Perché lo chiedi, cosa comporta rispondere"
        />
      </Campo>

      {/* --------------------------------------------------------- le risposte */}
      {forma === 'DATA' ? (
        <Campo label="Le date fra cui scegliere *" span>
          <div className="space-y-2">
            {date.map((r, i) => (
              <div key={r.id || `nuova-${i}`} className="flex gap-2">
                <input type="hidden" name="opzioneId" value={r.id} />
                <input
                  type="datetime-local"
                  name="opzioneQuando"
                  className="input"
                  value={r.valore}
                  onChange={(e) => {
                    const copia = [...date];
                    copia[i] = { ...r, valore: e.target.value };
                    setDate(copia);
                  }}
                />
                {/* il testo lo scrive il gestionale dalla data: chiederlo due
                    volte sarebbe una pignoleria */}
                <input type="hidden" name="opzioneTesto" value="" />
                {date.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setDate(date.filter((_, k) => k !== i))}
                    className="btn-ghost btn-sm shrink-0"
                    aria-label="Togli questa data"
                  >
                    <Icona nome="elimina" size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDate([...date, { id: '', valore: '' }])}
            className="btn-ghost btn-sm mt-2"
          >
            <Icona nome="aggiungi" size={15} /> Aggiungi una data
          </button>
        </Campo>
      ) : (
        <Campo label="Le risposte possibili *" span>
          <div className="space-y-2">
            {righe.map((r, i) => (
              <div key={r.id || `nuova-${i}`} className="flex gap-2">
                <input type="hidden" name="opzioneId" value={r.id} />
                <input
                  name="opzioneTesto"
                  className="input"
                  maxLength={120}
                  value={r.valore}
                  onChange={(e) => {
                    const copia = [...righe];
                    copia[i] = { ...r, valore: e.target.value };
                    setRighe(copia);
                  }}
                  placeholder={`Risposta ${i + 1}`}
                />
                <input type="hidden" name="opzioneQuando" value="" />
                {righe.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setRighe(righe.filter((_, k) => k !== i))}
                    className="btn-ghost btn-sm shrink-0"
                    aria-label="Togli questa risposta"
                  >
                    <Icona nome="elimina" size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRighe([...righe, { id: '', valore: '' }])}
            className="btn-ghost btn-sm mt-2"
          >
            <Icona nome="aggiungi" size={15} /> Aggiungi una risposta
          </button>
        </Campo>
      )}

      <Campo label="Chi risponde" span>
        <select
          name="destinatari"
          className="input"
          defaultValue={sondaggio?.destinatari ?? 'SQUADRA'}
        >
          <option value="SQUADRA">La squadra</option>
          <option value="NUOVI">I nuovi</option>
          <option value="TUTTI">Tutti, squadra e nuovi</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          Chi non è fra i destinatari non lo vede nemmeno in elenco.
        </p>
      </Campo>

      <Campo label="Entro quando" span>
        <input
          type="datetime-local"
          name="scadeIl"
          className="input"
          defaultValue={sondaggio?.scadeIl ?? ''}
        />
        <p className="mt-1 text-xs text-muted">
          Passata la scadenza il sondaggio si chiude da solo e scende nello storico. La notifica
          dice quanto manca.
        </p>
      </Campo>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="sceltaMultipla"
          defaultChecked={sondaggio?.sceltaMultipla ?? base.multipla}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          Si possono spuntare più risposte
          <span className="block text-xs text-muted">
            Su una domanda di date serve quasi sempre: uno può esserci sia sabato sia domenica.
          </span>
        </span>
      </label>

      {modifica ? (
        <>
          <p className="text-xs text-muted">
            Correggere una risposta tiene i voti che ha; toglierla li cancella. Salvare non
            manda un nuovo avviso.
          </p>
          <Invia icona="salva">Salva le modifiche</Invia>
        </>
      ) : (
        <Invia icona="aggiungi">Apri il sondaggio e avvisa</Invia>
      )}
    </FormAzione>
  );
}
