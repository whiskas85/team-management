'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import { salvaOraViaggio } from '@/actions/macchine';

/**
 * L'orario di un punto dell'itinerario, che si cambia direttamente lì e si
 * salva da solo: niente pulsante «Salva» per una casella sola. Si salva quando
 * l'orario è intero e smette di cambiare per un attimo, così le frecce della
 * casella non mandano dieci salvataggi.
 */
export function OraItinerario({
  macchinaId,
  dove,
  giorno,
  valore,
}: {
  macchinaId: string;
  /** «partenza», «arrivo» o l'id della tappa. */
  dove: string;
  /** Il giorno a cui appartiene l'orario: «aaaa-mm-gg». */
  giorno: string;
  /** «hh:mm», o vuoto. */
  valore: string;
}) {
  const [ora, setOra] = useState(valore);
  const [salvato, setSalvato] = useState(false);
  const [inCorso, avvia] = useTransition();
  const ultimo = useRef(valore);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // un orario nuovo dal server (la pianificazione) prende il posto di quello scritto
  useEffect(() => {
    setOra(valore);
    ultimo.current = valore;
  }, [valore]);

  const salva = (nuova: string) => {
    if (nuova === ultimo.current) return;
    avvia(async () => {
      const fd = new FormData();
      fd.set('id', macchinaId);
      fd.set('dove', dove);
      fd.set('giorno', giorno);
      fd.set('ora', nuova);
      const esito = await salvaOraViaggio({}, fd);
      if (esito.errore) {
        mostraToast(esito.errore, 'errore');
        setOra(ultimo.current);
        return;
      }
      ultimo.current = nuova;
      setSalvato(true);
      setTimeout(() => setSalvato(false), 1500);
    });
  };

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="time"
        value={ora}
        aria-label="Orario"
        onChange={(e) => {
          const v = e.target.value;
          setOra(v);
          if (timer.current) clearTimeout(timer.current);
          // vuoto vuol dire «nessun orario»: si salva anche quello
          if (v === '' || /^\d{2}:\d{2}$/.test(v)) timer.current = setTimeout(() => salva(v), 700);
        }}
        onBlur={() => {
          if (timer.current) clearTimeout(timer.current);
          salva(ora);
        }}
        className={`input h-8 w-[6.5rem] px-2 py-1 text-sm ${inCorso ? 'opacity-60' : ''}`}
      />
      {salvato && (
        <span className="text-nvg" title="Salvato">
          <Icona nome="approva" size={14} />
        </span>
      )}
    </span>
  );
}
