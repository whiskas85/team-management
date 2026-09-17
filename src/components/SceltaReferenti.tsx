'use client';

import { useState } from 'react';
import { Icona } from './Icona';
import { Campo } from './ui';

export type Candidabile = {
  id: string;
  nome: string;
  cognome: string;
  callsign: string | null;
};

/** Senza accenti e in minuscolo: «Nicolò» si deve trovare scrivendo «nicolo». */
const piatto = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/**
 * I referenti dell'attività, scelti da una rosa che si cerca.
 *
 * In elenco ci sono solo gli **atleti**: il referente è il nome a cui si
 * chiede com'è la giornata — come ci si veste, a che ora si parte, dove si
 * parcheggia — e sono risposte che sa chi in campo ci va.
 *
 * La casella di ricerca serve perché una rosa cresce: a trenta nomi lo scorrere
 * dentro un riquadro alto quattro righe è già un mestiere, e chi compila il
 * modulo il sabato sera dal telefono deve poter scrivere tre lettere e
 * spuntare. **Chi è già spuntato resta in cima e non sparisce mai**, qualunque
 * cosa si stia cercando: un elenco in cui la ricerca nasconde una scelta già
 * fatta è un elenco che fa togliere i referenti per sbaglio, senza che nessuno
 * se ne accorga fino alla domenica.
 */
export function SceltaReferenti({
  squadra,
  scelti: iniziali,
}: {
  squadra: Candidabile[];
  scelti: string[];
}) {
  const [scelti, setScelti] = useState<string[]>(iniziali);
  const [cerca, setCerca] = useState('');

  const ago = piatto(cerca.trim());
  const combacia = (o: Candidabile) =>
    !ago || piatto(`${o.callsign ?? ''} ${o.nome} ${o.cognome}`).includes(ago);

  // gli spuntati in cima, e sempre visibili: la ricerca non deve poter
  // nascondere una scelta già fatta
  const presi = squadra.filter((o) => scelti.includes(o.id));
  const altri = squadra.filter((o) => !scelti.includes(o.id) && combacia(o));

  const cambia = (id: string, dentro: boolean) =>
    setScelti((p) => (dentro ? [...p, id] : p.filter((x) => x !== id)));

  return (
    <Campo label="Referenti" span>
      {/* Il modulo mostra questa scelta: senza questa riga, togliere l'ultimo
          referente non arriverebbe da nessuna parte. Le caselle non spuntate
          non mandano niente, quindi «nessuno scelto» e «di referenti non si
          parlava» arriverebbero identici, e chi salva vedrebbe il nome tolto
          tornare al proprio posto. */}
      <input type="hidden" name="referentiScelta" value="1" />

      <p className="mb-1.5 text-xs text-muted">
        Chi tiene in mano questa attività. Si scelgono fra gli atleti: sono le domande di chi in
        campo ci va. Nella scheda si legge il loro callsign, e lo vedono tutti — nuovi compresi.
      </p>

      <div className="relative mb-2">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
          <Icona nome="cerca" size={15} />
        </span>
        <input
          type="search"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          // dentro un modulo, Invio su una casella di ricerca manderebbe tutto:
          // qui si sta cercando un nome, non salvando l'attività
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder="Cerca per callsign, nome o cognome"
          aria-label="Cerca un referente"
          className="input pl-8"
        />
      </div>

      <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-line p-2">
        {presi.map((o) => (
          <Voce key={o.id} operatore={o} scelto onCambia={cambia} />
        ))}

        {presi.length > 0 && altri.length > 0 && <div className="my-1 border-t border-line" />}

        {altri.map((o) => (
          <Voce key={o.id} operatore={o} scelto={false} onCambia={cambia} />
        ))}

        {presi.length === 0 && altri.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted">
            {squadra.length === 0
              ? 'Nessun atleta in rosa: i referenti si scelgono fra loro.'
              : 'Nessuno con questo nome.'}
          </p>
        )}
      </div>

      <p className="mt-1 text-[11px] text-muted">
        {scelti.length === 0
          ? 'Nessun referente: chi ha una domanda non sa a chi farla.'
          : `${scelti.length} ${scelti.length === 1 ? 'referente scelto' : 'referenti scelti'}.`}
      </p>
    </Campo>
  );
}

function Voce({
  operatore: o,
  scelto,
  onCambia,
}: {
  operatore: Candidabile;
  scelto: boolean;
  onCambia: (id: string, dentro: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 px-1 py-0.5 text-sm">
      <input
        type="checkbox"
        name="referenti"
        value={o.id}
        checked={scelto}
        onChange={(e) => onCambia(o.id, e.target.checked)}
        className="accent-nvg"
      />
      <span className="truncate">
        {o.callsign ? (
          <>
            <span className="text-nvg">{o.callsign}</span>{' '}
            <span className="text-muted">
              · {o.nome} {o.cognome}
            </span>
          </>
        ) : (
          <>
            {o.nome} {o.cognome} <span className="text-warn">· senza callsign</span>
          </>
        )}
      </span>
    </label>
  );
}
