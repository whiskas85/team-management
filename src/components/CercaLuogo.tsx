'use client';

import { useState, useTransition } from 'react';
import { Campo } from './ui';
import { Icona } from './Icona';
import { Mappa } from './Mappa';
import { risolviLuogo } from '@/actions/mappe';

/**
 * Un posto che si cerca invece di digitarlo.
 *
 * Una casella di testo con scritto *«autogrill A4 uscita Bergamo»* si legge ma
 * non porta nessuno da nessuna parte: la domenica mattina serve un pulsante
 * che apre il navigatore. Qui si scrive il nome del posto **oppure** si incolla
 * un link di Google Maps, si preme Cerca, e le coordinate arrivano da sole con
 * l'anteprima sulla mappa.
 *
 * Il nome scritto resta comunque quello che si legge nella pagina: se la
 * ricerca non trova niente, non si perde il testo — si perde solo il pulsante
 * per farsi portare, che è esattamente quanto si aveva prima.
 */
export function CercaLuogo({
  nome,
  etichetta,
  valore,
  lat,
  lng,
  segnaposto,
  aiuto,
}: {
  /** Nome del campo di testo; le coordinate viaggiano come <nome>Lat e <nome>Lng. */
  nome: string;
  etichetta: string;
  valore?: string | null;
  lat?: number | null;
  lng?: number | null;
  segnaposto?: string;
  aiuto?: string;
}) {
  const [testo, setTesto] = useState(valore ?? '');
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null,
  );
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const cerca = () => {
    const query = testo.trim();
    if (!query) return;

    avvia(async () => {
      const trovato = await risolviLuogo(query);
      if (trovato.lat != null && trovato.lng != null) {
        setPunto({ lat: trovato.lat, lng: trovato.lng });
        // se il testo era un link, al suo posto resta il nome del posto: un
        // link lungo cinquanta caratteri non è una cosa da leggere in pagina
        if (trovato.nome && /^https?:\/\//i.test(query)) setTesto(trovato.nome);
        setEsito({ ok: true, testo: 'Trovato: guarda se è il posto giusto.' });
      } else {
        setEsito({
          ok: false,
          testo: trovato.errore ?? 'Non l’ho trovato. Il testo resta, ma senza il pulsante Naviga.',
        });
      }
    });
  };

  return (
    <div className="sm:col-span-2">
      <Campo label={etichetta}>
        <div className="flex gap-2">
          <input
            name={nome}
            value={testo}
            onChange={(e) => {
              setTesto(e.target.value);
              setEsito(null);
            }}
            onKeyDown={(e) => {
              // invio cerca invece di inviare tutto il modulo: qui dentro si
              // sta ancora scegliendo il posto, non si sta salvando l'attività
              if (e.key === 'Enter') {
                e.preventDefault();
                cerca();
              }
            }}
            className="input flex-1"
            placeholder={segnaposto}
          />
          <button
            type="button"
            onClick={cerca}
            disabled={inCorso || !testo.trim()}
            className="btn-ghost btn-sm shrink-0"
          >
            <Icona nome="cerca" size={15} />
            {inCorso ? 'Cerco…' : 'Cerca'}
          </button>
        </div>
      </Campo>

      {/* le coordinate viaggiano nascoste: nessuno le digita a mano */}
      <input type="hidden" name={`${nome}Lat`} value={punto?.lat ?? ''} />
      <input type="hidden" name={`${nome}Lng`} value={punto?.lng ?? ''} />

      {esito && (
        <p className={`mt-1 text-[11px] ${esito.ok ? 'text-nvg' : 'text-warn'}`}>{esito.testo}</p>
      )}
      {!esito && aiuto && <p className="mt-1 text-[11px] text-muted">{aiuto}</p>}

      {punto && (
        <div className="mt-2">
          <Mappa lat={punto.lat} lng={punto.lng} nome={testo || etichetta} altezza={170} />
          <div className="mt-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setPunto(null);
                setEsito(null);
              }}
              className="btn-ghost btn-sm"
            >
              <Icona nome="elimina" size={14} />
              Togli la posizione
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
