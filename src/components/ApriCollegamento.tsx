'use client';

import { useEffect, useState } from 'react';
import { Icona } from './Icona';

const CHIAVE = 'zd-mio-gestionale';

/**
 * Da un link di collegamento al proprio gestionale: si scrive una volta
 * l'indirizzo (resta ricordato su questo dispositivo) e si continua di là, dove
 * si sceglie la squadra e si manda la richiesta.
 */
export function ApriCollegamento() {
  const [indirizzo, setIndirizzo] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    try {
      const salvato = localStorage.getItem(CHIAVE);
      if (salvato) setIndirizzo(salvato);
    } catch {
      // niente memoria: si riscrive
    }
  }, []);

  const continua = (e: React.FormEvent) => {
    e.preventDefault();
    let origine: string;
    try {
      const testo = /^https?:\/\//i.test(indirizzo.trim())
        ? indirizzo.trim()
        : `https://${indirizzo.trim()}`;
      origine = new URL(testo).origin;
    } catch {
      setErrore('Scrivi l’indirizzo del tuo gestionale, per esempio ops.lamiasquadra.it');
      return;
    }
    if (origine === window.location.origin) {
      setErrore('Questo è il gestionale di chi ti ha mandato il link: serve l’indirizzo del tuo.');
      return;
    }
    try {
      localStorage.setItem(CHIAVE, origine);
    } catch {
      // pazienza
    }
    window.location.href = `${origine}/admin/collegamenti/nuovo?link=${encodeURIComponent(window.location.href)}`;
  };

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setErrore('Non riesco a copiare: seleziona l’indirizzo dalla barra del browser.');
    }
  };

  return (
    <form onSubmit={continua} className="space-y-3">
      <label className="label" htmlFor="mio-gestionale">
        L’indirizzo del tuo gestionale
      </label>
      <input
        id="mio-gestionale"
        value={indirizzo}
        onChange={(e) => {
          setIndirizzo(e.target.value);
          setErrore(null);
        }}
        placeholder="https://ops.lamiasquadra.it"
        inputMode="url"
        autoComplete="url"
        className="input"
        required
      />
      {errore && <p className="text-xs text-danger">{errore}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary">
          <Icona nome="collegamento" size={15} /> Continua nel mio gestionale
        </button>
        <button type="button" onClick={copia} className="btn-ghost">
          <Icona nome="condividi" size={15} /> {copiato ? 'Copiato' : 'Copia il link'}
        </button>
      </div>
      <p className="text-xs text-muted">
        Oppure incolla il link nel tuo gestionale, in Comando → Collegamenti.
      </p>
    </form>
  );
}
