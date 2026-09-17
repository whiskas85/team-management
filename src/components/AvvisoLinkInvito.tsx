'use client';

import { useState } from 'react';
import { Icona } from './Icona';

/**
 * «Questo link è vostro»: la barra che non si può non vedere.
 *
 * Il link di un invito **è una chiave**: chi ce l'ha cambia il numero di
 * operatori di quella squadra, e loro se ne accorgerebbero solo in campo. È il
 * genere di cosa che si gira per comodità — nel gruppone, a un amico di un'altra
 * squadra — e che poi non si può più richiamare indietro.
 *
 * Per questo l'avviso sta **in basso, fisso, sempre in vista** finché non lo si
 * conferma, invece di essere un riquadro in mezzo alla pagina che si scorre via
 * senza leggerlo. Si toglie con **«Ho capito»** e non con una crocetta: una
 * crocetta la si preme per far sparire un fastidio, un pulsante con scritto
 * cosa si sta dicendo lo si preme dopo aver letto.
 *
 * **Non ci si ricorda di chi l'ha già letto.** Chi apre questa pagina non è
 * sempre la stessa persona — il link gira dentro la squadra ospite, ed è
 * giusto che giri lì — quindi l'avviso torna a ogni apertura. Chi l'ha capito
 * lo toglie in un tocco; chi lo vede per la prima volta lo vede.
 *
 * Confermato, non sparisce: scende in fondo alle card, dove resta leggibile per
 * chi torna a controllarlo senza tornare a ingombrare lo schermo.
 */
export function AvvisoLinkInvito({ squadra }: { squadra: string }) {
  const [capito, setCapito] = useState(false);

  const testo = (
    <>
      <p className="flex items-center gap-2 font-medium text-warn">
        <Icona nome="scudo" size={16} />
        Questo link è di {squadra}.
      </p>
      <p className="mt-1 text-sm text-ink/90">
        Non giratelo fuori dalla vostra squadra: chi ce l’ha può cambiare il numero di operatori
        che portate, e ve ne accorgereste solo in campo. Dentro la squadra passatelo a chi deve: il
        numero si aggiorna quante volte serve.
      </p>
    </>
  );

  if (capito) {
    return <div className="card mt-4 border-warn/40 bg-warn/10">{testo}</div>;
  }

  return (
    <>
      {/* Tiene libero, in fondo alla pagina, lo spazio che la barra copre:
          senza, l'ultima riga resta nascosta sotto e non si raggiunge. */}
      <div aria-hidden className="h-40 sm:h-32" />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-warn/60 bg-surface/95 shadow-[0_-8px_24px_rgba(0,0,0,0.55)] backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">{testo}</div>
          <button
            type="button"
            onClick={() => setCapito(true)}
            className="btn-primary btn-sm w-full justify-center sm:w-auto"
          >
            <Icona nome="approva" size={15} />
            Ho capito
          </button>
        </div>
      </div>
    </>
  );
}
