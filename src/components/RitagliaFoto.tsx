'use client';

import { useRef, useState, useTransition } from 'react';
import { Icona } from './Icona';
import { salvaFotoProfilo } from '@/actions/foto';

const LATO = 512; // la foto viene salvata quadrata a questa dimensione

/**
 * Ritaglio della foto profilo, tutto nel browser: si sposta e si ingrandisce
 * l'immagine dentro una maschera tonda, e al server arriva già il quadrato
 * finito. Così non serve nessuna libreria e non si caricano file enormi.
 */
export function RitagliaFoto({ fotoAttuale }: { fotoAttuale: string | null }) {
  const [sorgente, setSorgente] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const immagine = useRef<HTMLImageElement | null>(null);
  const trascina = useRef<{ x: number; y: number } | null>(null);

  const scegli = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEsito({ tipo: 'errore', testo: 'Serve un file immagine (JPG, PNG o WEBP).' });
      return;
    }
    const lettore = new FileReader();
    lettore.onload = () => {
      setSorgente(lettore.result as string);
      setZoom(1);
      setPos({ x: 0, y: 0 });
      setEsito(null);
    };
    lettore.readAsDataURL(file);
  };

  /** Disegna la porzione visibile sul canvas e la manda al server. */
  const salva = () => {
    const img = immagine.current;
    if (!img) return;

    const tela = document.createElement('canvas');
    tela.width = LATO;
    tela.height = LATO;
    const ctx = tela.getContext('2d');
    if (!ctx) return;

    // l'anteprima è un quadrato di 256px: replichiamo la stessa inquadratura
    const anteprima = 256;
    const scala = LATO / anteprima;
    const base = Math.max(anteprima / img.naturalWidth, anteprima / img.naturalHeight);
    const fattore = base * zoom * scala;

    const larghezza = img.naturalWidth * fattore;
    const altezza = img.naturalHeight * fattore;
    const x = (LATO - larghezza) / 2 + pos.x * scala;
    const y = (LATO - altezza) / 2 + pos.y * scala;

    ctx.fillStyle = '#0e110e';
    ctx.fillRect(0, 0, LATO, LATO);
    ctx.drawImage(img, x, y, larghezza, altezza);

    const dati = tela.toDataURL('image/jpeg', 0.88);

    avvia(async () => {
      const risposta = await salvaFotoProfilo(dati);
      if (risposta.errore) setEsito({ tipo: 'errore', testo: risposta.errore });
      else {
        setEsito({ tipo: 'ok', testo: 'Foto aggiornata.' });
        setSorgente(null);
      }
    });
  };

  const rimuovi = () =>
    avvia(async () => {
      const risposta = await salvaFotoProfilo(null);
      if (risposta.errore) setEsito({ tipo: 'errore', testo: risposta.errore });
      else setEsito({ tipo: 'ok', testo: 'Foto rimossa.' });
    });

  return (
    <div className="space-y-3">
      {esito && (
        <p
          className={`rounded-md border px-3 py-2 text-xs ${
            esito.tipo === 'ok'
              ? 'border-nvg/40 bg-nvg/10 text-nvg'
              : 'border-danger/40 bg-danger/10 text-danger'
          }`}
        >
          {esito.testo}
        </p>
      )}

      {!sorgente ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface2">
            {fotoAttuale ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoAttuale} alt="Foto profilo" className="h-full w-full object-cover" />
            ) : (
              <Icona nome="profilo" size={32} />
            )}
          </span>

          <div className="flex flex-wrap gap-2">
            <label className="btn-ghost cursor-pointer">
              <Icona nome="carica" size={15} />
              {fotoAttuale ? 'Cambia foto' : 'Carica una foto'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => scegli(e.target.files?.[0])}
              />
            </label>

            {fotoAttuale && (
              <button
                type="button"
                onClick={rimuovi}
                disabled={inCorso}
                className="btn-danger btn-sm"
              >
                <Icona nome="elimina" size={15} /> Rimuovi
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* maschera tonda: si trascina l'immagine sotto */}
          <div
            className="relative mx-auto h-64 w-64 cursor-move touch-none overflow-hidden rounded-full border-2 border-nvg/50 bg-surface2"
            onPointerDown={(e) => {
              trascina.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!trascina.current) return;
              setPos({ x: e.clientX - trascina.current.x, y: e.clientY - trascina.current.y });
            }}
            onPointerUp={() => {
              trascina.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={immagine}
              src={sorgente}
              alt="Da ritagliare"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
                width: 256,
                height: 256,
                objectFit: 'cover',
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <Icona nome="cerca" size={14} />
            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[color:var(--nvg)]"
            />
            <span className="num w-12 text-right text-xs text-muted">{zoom.toFixed(1)}×</span>
          </div>

          <p className="text-center text-[11px] text-muted">
            Trascina per spostare, usa il cursore per ingrandire.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={salva}
              disabled={inCorso}
              className="btn-primary flex-1"
            >
              <Icona nome="salva" size={15} />
              {inCorso ? 'Salvo…' : 'Salva la foto'}
            </button>
            <button
              type="button"
              onClick={() => setSorgente(null)}
              className="btn-ghost"
              disabled={inCorso}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
