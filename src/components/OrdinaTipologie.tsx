'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { Elenco } from './ui';
import { riordinaTipologie } from '@/actions/tipologie';

export type RigaTipologia = {
  id: string;
  /** Contenuto della card su telefono. */
  card: ReactNode;
  /** Le celle della riga di tabella, senza la colonna della maniglia. */
  celle: ReactNode;
  attivo: boolean;
};

/**
 * L'elenco delle tipologie, riordinabile trascinando.
 *
 * Si trascina dalla maniglia, non da tutta la riga: dentro ci sono link e
 * pulsanti, e un trascinamento che parte ovunque se li mangia.
 *
 * Il trascinamento HTML non esiste sul telefono: lì l'ordine si cambia da un
 * altro dispositivo. È una scelta, non una dimenticanza.
 *
 * L'elenco si riordina subito sullo schermo e il salvataggio parte dopo: se il
 * server rifiuta si torna com'era, invece di lasciare a video un ordine che il
 * database non ha.
 */
export function OrdinaTipologie({ righe }: { righe: RigaTipologia[] }) {
  const [ordine, setOrdine] = useState(righe);
  const [preso, setPreso] = useState<string | null>(null);
  const [sopra, setSopra] = useState<string | null>(null);
  const [esito, setEsito] = useState<{ ok?: string; errore?: string }>({});
  const [inCorso, avvia] = useTransition();
  // l'ordine da cui si è partiti: serve a rimettere le cose a posto se il
  // salvataggio fallisce
  const precedente = useRef(righe);

  // la pagina si ricarica dopo ogni salvataggio: si riparte da quello che dice
  // il server, non da quello che si è trascinato
  useEffect(() => {
    setOrdine(righe);
    precedente.current = righe;
  }, [righe]);

  const salva = (nuovo: RigaTipologia[]) => {
    const prima = precedente.current;
    setOrdine(nuovo);
    setEsito({});
    avvia(async () => {
      const r = await riordinaTipologie(nuovo.map((x) => x.id));
      if (r.errore) {
        setOrdine(prima);
        setEsito({ errore: r.errore });
      } else {
        precedente.current = nuovo;
        setEsito({ ok: r.ok });
      }
    });
  };

  /** Sposta la riga `id` dove sta ora la riga `verso`. */
  const muovi = (id: string, verso: string) => {
    const da = ordine.findIndex((r) => r.id === id);
    const a = ordine.findIndex((r) => r.id === verso);
    if (da < 0 || a < 0 || da === a) return;

    const nuovo = [...ordine];
    const [riga] = nuovo.splice(da, 1);
    nuovo.splice(a, 0, riga);
    salva(nuovo);
  };

  /** La riga è solo il bersaglio: a trascinare è la maniglia. */
  const bersaglio = (r: RigaTipologia, i: number) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (preso && preso !== r.id) setSopra(r.id);
    },
    onDragLeave: () => setSopra((s) => (s === r.id ? null : s)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setSopra(null);
      if (preso && preso !== r.id) muovi(preso, r.id);
      setPreso(null);
    },
    'data-posizione': i,
  });

  const maniglia = (r: RigaTipologia) => (
    <Maniglia
      attiva={!inCorso}
      presa={preso === r.id}
      onPrendi={() => setPreso(r.id)}
      onLascia={() => {
        setPreso(null);
        setSopra(null);
      }}
    />
  );

  const evidenzia = (r: RigaTipologia) =>
    `${preso === r.id ? 'opacity-50' : ''} ${sopra === r.id ? 'border-nvg' : ''}`;

  return (
    <>
      <p className="mb-3 text-xs text-muted">
        Trascina la maniglia ⠿ per cambiare l’ordine con cui le tipologie compaiono nella tendina
        delle attività. Si salva da solo.
        {inCorso && <span className="ml-2 text-nvg">salvo…</span>}
        {esito.ok && !inCorso && <span className="ml-2 text-nvg">{esito.ok}</span>}
        {esito.errore && <span className="ml-2 text-danger">{esito.errore}</span>}
      </p>

      <Elenco
        cards={ordine.map((r, i) => (
          <div
            key={r.id}
            {...bersaglio(r, i)}
            className={`card border transition-colors ${evidenzia(r)} ${
              r.attivo ? '' : 'opacity-60'
            }`}
          >
            <div className="mb-2 flex items-center gap-2 border-b border-line pb-2">
              {maniglia(r)}
              <span className="num text-[11px] text-muted">{i + 1}</span>
            </div>
            {r.card}
          </div>
        ))}
        tabella={
          <table className="tabella">
            <thead>
              <tr>
                <th className="w-24">Ordine</th>
                <th>Tipologia</th>
                <th>Descrizione</th>
                <th>Quote generate</th>
                <th>Formazione</th>
                <th>Attività</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {ordine.map((r, i) => (
                <tr
                  key={r.id}
                  {...bersaglio(r, i)}
                  className={`${r.attivo ? '' : 'opacity-50'} ${evidenzia(r)} ${
                    sopra === r.id ? 'border-t-2 border-t-nvg' : ''
                  }`}
                >
                  <td>
                    <span className="flex items-center gap-2">
                      {maniglia(r)}
                      <span className="num text-xs text-muted">{i + 1}</span>
                    </span>
                  </td>
                  {r.celle}
                </tr>
              ))}
            </tbody>
          </table>
        }
      />
    </>
  );
}

function Maniglia({
  attiva,
  presa,
  onPrendi,
  onLascia,
}: {
  attiva: boolean;
  presa: boolean;
  onPrendi: () => void;
  onLascia: () => void;
}) {
  return (
    <span
      draggable={attiva}
      onDragStart={onPrendi}
      onDragEnd={onLascia}
      className={`cursor-grab select-none px-0.5 text-base leading-none text-muted hover:text-ink active:cursor-grabbing ${
        presa ? 'text-nvg' : ''
      }`}
      title="Trascina da qui per riordinare"
      role="button"
      aria-label="Trascina per riordinare"
    >
      ⠿
    </span>
  );
}
