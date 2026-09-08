'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import type { StatoForm } from '@/lib/form';

type Azione = (prev: StatoForm, fd: FormData) => Promise<StatoForm>;

/**
 * Un elenco che si riordina trascinando.
 *
 * **Si prende dalla maniglia e da nient'altro.** Una card trascinabile da
 * qualunque punto si sposta per sbaglio ogni volta che si prova a leggerla o a
 * premere un pulsante che sta dentro; la maniglia dice dove mettere le dita e
 * lascia il resto della riga alle sue cose.
 *
 * Funziona con i *pointer event* e non con il trascinamento nativo del
 * browser, che sul telefono non esiste: qui metà della squadra apre il
 * gestionale dal telefono, e un riordino che va solo col mouse è un riordino
 * che non c'è. Per chi naviga da tastiera la maniglia è un pulsante come gli
 * altri: freccia su e freccia giù spostano di uno.
 *
 * L'ordine si sistema subito sotto le dita e si salva quando si molla: mandare
 * una richiesta a ogni pixel di movimento vorrebbe dire venti scritture per
 * spostare una riga.
 */
export function ElencoOrdinabile({
  elementi,
  azione,
  valori,
  campo = 'ids',
}: {
  /** Le righe già impaginate: qui dentro si aggiunge solo la maniglia. */
  elementi: { id: string; contenuto: ReactNode }[];
  azione: Azione;
  /** Campi fissi da mandare insieme all'ordine (l'annuncio, di solito). */
  valori?: Record<string, string>;
  /** Come si chiama il campo con gli id in fila. */
  campo?: string;
}) {
  const daServer = elementi.map((e) => e.id);
  const [ordine, setOrdine] = useState(daServer);
  const [preso, setPreso] = useState<string | null>(null);
  const contenitore = useRef<HTMLDivElement>(null);
  const [stato, invia] = useActionState(azione, {} as StatoForm);

  // se l'elenco cambia dal server (una voce aggiunta, una tolta) ci si
  // riallinea: la verità dell'ordine sta nel database, non in questa pagina
  const firma = daServer.join(',');
  useEffect(() => {
    setOrdine(firma.split(','));
  }, [firma]);

  useEffect(() => {
    if (stato.errore) mostraToast(stato.errore, 'errore');
  }, [stato]);

  const salva = (nuovo: string[]) => {
    if (nuovo.join(',') === firma) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(valori ?? {})) fd.set(k, v);
    fd.set(campo, nuovo.join(','));
    invia(fd);
  };

  const sposta = (id: string, verso: number) => {
    const da = ordine.indexOf(id);
    const a = da + verso;
    if (da < 0 || a < 0 || a >= ordine.length) return;
    const nuovo = [...ordine];
    nuovo.splice(a, 0, ...nuovo.splice(da, 1));
    setOrdine(nuovo);
    salva(nuovo);
  };

  const durante = (e: React.PointerEvent) => {
    if (!preso || !contenitore.current) return;
    const righe = [...contenitore.current.children] as HTMLElement[];
    const da = ordine.indexOf(preso);

    // la riga sotto il dito: si scambia quando ci si entra dentro, e non
    // appena la si sfiora, così l'elenco non balla mentre si scende
    const a = righe.findIndex((el, i) => {
      if (i === da) return false;
      const r = el.getBoundingClientRect();
      return e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (a < 0 || a === da) return;

    const nuovo = [...ordine];
    nuovo.splice(a, 0, ...nuovo.splice(da, 1));
    setOrdine(nuovo);
  };

  const molla = (e: React.PointerEvent) => {
    if (!preso) return;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setPreso(null);
    salva(ordine);
  };

  const per = new Map(elementi.map((e) => [e.id, e.contenuto]));

  return (
    <div ref={contenitore} className="space-y-2">
      {ordine.map((id) => (
        <div
          key={id}
          className={`flex items-start gap-1.5 rounded-lg transition-opacity ${
            preso === id ? 'opacity-60 ring-1 ring-nvgdim' : ''
          }`}
        >
          <button
            type="button"
            aria-label="Trascina per riordinare"
            title="Trascina per riordinare"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              setPreso(id);
            }}
            onPointerMove={durante}
            onPointerUp={molla}
            onPointerCancel={molla}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                sposta(id, -1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                sposta(id, 1);
              }
            }}
            // senza questo il telefono scrolla la pagina invece di trascinare
            style={{ touchAction: 'none' }}
            className={`mt-3 shrink-0 rounded p-1 text-muted transition-colors hover:bg-surface2 hover:text-nvg ${
              preso === id ? 'cursor-grabbing text-nvg' : 'cursor-grab'
            }`}
          >
            <Icona nome="maniglia" size={16} />
          </button>

          <div className="min-w-0 flex-1">{per.get(id)}</div>
        </div>
      ))}
    </div>
  );
}
