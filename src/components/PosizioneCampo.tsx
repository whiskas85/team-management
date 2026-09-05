'use client';

import { useState, useTransition } from 'react';
import { Campo } from './ui';
import { Icona } from './Icona';
import { Mappa } from './Mappa';
import { risolviLuogo } from '@/actions/mappe';

type Posizione = {
  indirizzo: string | null;
  citta: string | null;
  provincia: string | null;
  lat: number | null;
  lng: number | null;
};

const SPIEGAZIONE: Record<string, string> = {
  link: 'coordinate lette dal link',
  pluscode: 'coordinate ricavate dal plus code',
  ricerca: 'posizione trovata cercando l’indirizzo',
};

/**
 * Blocco "dove si trova". Le coordinate non si digitano: si incolla il link di
 * Google Maps e vengono ricavate da lì, con l'anteprima sulla mappa. Restano
 * comunque modificabili a mano.
 */
export function PosizioneCampo({ posizione }: { posizione?: Posizione }) {
  const [indirizzo, setIndirizzo] = useState(posizione?.indirizzo ?? '');
  const [citta, setCitta] = useState(posizione?.citta ?? '');
  const [provincia, setProvincia] = useState(posizione?.provincia ?? '');
  const [lat, setLat] = useState(posizione?.lat?.toString() ?? '');
  const [lng, setLng] = useState(posizione?.lng?.toString() ?? '');

  const [link, setLink] = useState('');
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'avviso' | 'errore'; testo: string } | null>(
    null,
  );
  const [inCorso, avvia] = useTransition();

  const leggi = () => {
    const testo = link.trim();
    if (!testo) return;

    avvia(async () => {
      const luogo = await risolviLuogo(testo);

      if (luogo.errore) {
        setEsito({ tipo: 'errore', testo: luogo.errore });
        return;
      }

      if (luogo.nome && !indirizzo) setIndirizzo(luogo.nome);
      if (luogo.citta && !citta) setCitta(luogo.citta);
      if (luogo.provincia && !provincia) setProvincia(luogo.provincia);

      if (luogo.avviso) {
        setEsito({ tipo: 'avviso', testo: luogo.avviso });
        return;
      }

      if (luogo.lat !== undefined && luogo.lng !== undefined) {
        setLat(luogo.lat.toFixed(6));
        setLng(luogo.lng.toFixed(6));
        setEsito({
          tipo: 'ok',
          testo: `${luogo.nome ?? 'Posizione trovata'} · ${SPIEGAZIONE[luogo.fonte ?? 'link']}`,
        });
      }
    });
  };

  const colore =
    esito?.tipo === 'ok'
      ? 'border-nvg/40 bg-nvg/10 text-nvg'
      : esito?.tipo === 'avviso'
        ? 'border-warn/40 bg-warn/10 text-warn'
        : 'border-danger/40 bg-danger/10 text-danger';

  const nLat = Number(lat);
  const nLng = Number(lng);
  const mappaPronta =
    lat !== '' && lng !== '' && Number.isFinite(nLat) && Number.isFinite(nLng);

  return (
    <>
      <div className="sm:col-span-2">
        <label className="label">Cerca il posto</label>
        <div className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                leggi();
              }
            }}
            className="input flex-1"
            placeholder="Incolla il link di Google Maps, o le coordinate"
          />
          <button
            type="button"
            onClick={leggi}
            disabled={inCorso || !link.trim()}
            className="btn-ghost shrink-0"
          >
            <Icona nome="cerca" size={15} />
            {inCorso ? 'Cerco…' : 'Cerca'}
          </button>
        </div>

        {esito ? (
          <p className={`mt-2 rounded-md border px-3 py-2 text-xs ${colore}`}>{esito.testo}</p>
        ) : (
          <p className="mt-1 text-[11px] text-muted">
            Su Maps: tieni premuto sul punto, poi Condividi e copia il link. Vanno bene anche i
            link brevi, i plus code e le coordinate scritte a mano.
          </p>
        )}
      </div>

      <Campo label="Indirizzo" span>
        <input
          name="indirizzo"
          value={indirizzo}
          onChange={(e) => setIndirizzo(e.target.value)}
          className="input"
        />
      </Campo>

      <Campo label="Città">
        <input
          name="citta"
          value={citta}
          onChange={(e) => setCitta(e.target.value)}
          className="input"
        />
      </Campo>

      <Campo label="Provincia">
        <input
          name="provincia"
          maxLength={4}
          value={provincia}
          onChange={(e) => setProvincia(e.target.value)}
          className="input"
          placeholder="es. TO"
        />
      </Campo>

      <Campo label="Latitudine">
        <input
          name="lat"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="input num"
          placeholder="45.307812"
        />
      </Campo>

      <Campo label="Longitudine">
        <input
          name="lng"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          className="input num"
          placeholder="7.957562"
        />
      </Campo>

      {mappaPronta && (
        <div className="sm:col-span-2">
          <p className="label">Anteprima</p>
          <Mappa lat={nLat} lng={nLng} nome={indirizzo || undefined} altezza={200} />
        </div>
      )}
    </>
  );
}
