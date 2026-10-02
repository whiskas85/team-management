'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icona } from './Icona';
import { Credenziali } from './Credenziali';
import { Foglio } from './Foglio';
import type { StatoForm } from '@/lib/form';

/**
 * La schermata di benvenuto di una persona appena creata.
 *
 * Sta nel guscio dell'applicazione e non dentro il modulo che la crea, per un
 * motivo pratico: quando un contatto diventa un nuovo esce dall'elenco dei
 * contatti, e la sua riga — con la finestra e il modulo dentro — sparisce
 * nello stesso istante in cui arriva la risposta. Il messaggio, password
 * compresa, sparirebbe con lei. Qui invece resta finché non lo si chiude.
 */

type Dati = NonNullable<StatoForm['credenziali']> & { indirizzo?: string };

let attuale: Dati | null = null;
const ascoltatori = new Set<(d: Dati | null) => void>();

/** Apre la schermata di benvenuto. Si chiama anche fuori da un componente. */
export function mostraBenvenuto(dati: Dati) {
  attuale = dati;
  ascoltatori.forEach((f) => f(attuale));
}

function chiudiBenvenuto() {
  attuale = null;
  ascoltatori.forEach((f) => f(null));
}

/** Va montato una volta sola, nel guscio dell'applicazione. */
export function ContenitoreBenvenuto() {
  const [dati, setDati] = useState<Dati | null>(null);

  useEffect(() => {
    ascoltatori.add(setDati);
    setDati(attuale);
    return () => {
      ascoltatori.delete(setDati);
    };
  }, []);

  if (!dati?.benvenuto) return null;

  return createPortal(
    // Si chiude solo da «Fatto» o dalla X: la password non si rivede, e un
    // tocco sul velo non deve farla sparire.
    <Foglio
      key={dati.userId}
      soloDaDentro
      z="z-[70]"
      onChiuso={chiudiBenvenuto}
      etichetta={`Benvenuto a ${dati.benvenuto.nome}`}
      foglio="sm:max-w-2xl"
      contenuto="space-y-3 p-5"
      testata={(chiudi) => (
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="min-w-0 truncate text-base font-semibold">
            {dati.benvenuto!.nome} è dentro: mandagli il benvenuto
          </h2>
          <button
            type="button"
            onClick={chiudi}
            className="shrink-0 -mr-1.5 rounded-md p-1.5 text-muted hover:text-ink"
            aria-label="Chiudi"
          >
            <Icona nome="chiudi" size={16} />
          </button>
        </div>
      )}
    >
      {(chiudi) => (
        <>
          <p className="text-sm text-muted">
            Qui sotto c’è il messaggio da mandargli: come entrare, la password provvisoria e cosa
            fare per cominciare. Copialo prima di chiudere: la password non si rivede.
          </p>
          <Credenziali
            utente={dati.utente}
            password={dati.password}
            link={dati.link}
            telefono={dati.telefono}
            userId={dati.userId}
            benvenuto={dati.benvenuto}
            indirizzo={
              dati.indirizzo ?? (typeof window !== 'undefined' ? window.location.origin : undefined)
            }
          />
          <button type="button" onClick={chiudi} className="btn-ghost btn-sm">
            <Icona nome="approva" size={15} /> Fatto, l’ho mandato
          </button>
        </>
      )}
    </Foglio>,
    document.body,
  );
}
