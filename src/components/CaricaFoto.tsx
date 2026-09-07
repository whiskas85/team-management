'use client';

import { useRef, useState } from 'react';
import { Icona } from './Icona';
import { caricaFoto } from '@/actions/mercatino';

/**
 * Caricamento di una foto per un annuncio.
 *
 * **Il ridimensionamento avviene qui, nel browser, prima di partire.** Una foto
 * da telefono pesa otto mega: mandarla intera e ridurla sul server vorrebbe
 * dire aspettare il caricamento due volte, una sulla rete di casa e una su
 * ZeroTier. Insieme all'immagine parte già la sua **miniatura**, che è quella
 * che la bacheca mostra nelle card — venti foto intere in una pagina sola sono
 * il modo più rapido per far sembrare rotto un sito che funziona.
 */

const LATO_GRANDE = 1600;
const LATO_PICCOLO = 480;

/** Disegna l'immagine dentro un quadrato di `lato` al massimo, e la comprime. */
function rimpicciolisci(img: HTMLImageElement, lato: number, qualita: number): Promise<Blob> {
  const scala = Math.min(1, lato / Math.max(img.width, img.height));
  const tela = document.createElement('canvas');
  tela.width = Math.round(img.width * scala);
  tela.height = Math.round(img.height * scala);

  const ctx = tela.getContext('2d');
  if (!ctx) throw new Error('Il browser non riesce a preparare l’immagine.');
  ctx.drawImage(img, 0, 0, tela.width, tela.height);

  return new Promise((risolvi, rifiuta) =>
    tela.toBlob(
      (b) => (b ? risolvi(b) : rifiuta(new Error('Immagine non convertibile.'))),
      'image/jpeg',
      qualita,
    ),
  );
}

export function CaricaFoto({ annuncioId, quante }: { annuncioId: string; quante: number }) {
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const scelta = useRef<HTMLInputElement>(null);

  const gestisci = async (file: File) => {
    setErrore(null);
    setInCorso(true);
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise((ok, ko) => {
        img.onload = ok;
        img.onerror = () => ko(new Error('Non riesco ad aprire questa immagine.'));
        img.src = url;
      });

      const [grande, piccola] = await Promise.all([
        rimpicciolisci(img, LATO_GRANDE, 0.82),
        rimpicciolisci(img, LATO_PICCOLO, 0.75),
      ]);
      URL.revokeObjectURL(url);

      const fd = new FormData();
      fd.set('annuncioId', annuncioId);
      fd.set('file', new File([grande], 'foto.jpg', { type: 'image/jpeg' }));
      fd.set('miniatura', new File([piccola], 'mini.jpg', { type: 'image/jpeg' }));

      const esito = await caricaFoto({}, fd);
      if (esito.errore) setErrore(esito.errore);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Caricamento non riuscito.');
    } finally {
      setInCorso(false);
      if (scelta.current) scelta.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={scelta}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void gestisci(f);
        }}
      />
      <button
        type="button"
        disabled={inCorso}
        onClick={() => scelta.current?.click()}
        className="btn-ghost btn-sm"
      >
        <Icona nome="carica" size={14} />
        {inCorso ? 'Carico…' : quante === 0 ? 'Aggiungi la prima foto' : 'Aggiungi foto'}
      </button>
      {errore && <p className="mt-1 text-xs text-danger">{errore}</p>}
    </div>
  );
}
