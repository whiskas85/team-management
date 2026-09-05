import { Icona } from './Icona';

/**
 * Mappa con il segnaposto. Usa OpenStreetMap: nessuna chiave da gestire e
 * nessun tracciamento, a differenza dell'incorporamento di Google.
 */
export function Mappa({
  lat,
  lng,
  nome,
  altezza = 220,
}: {
  lat: number;
  lng: number;
  nome?: string;
  altezza?: number;
}) {
  // un riquadro di poco più di mezzo chilometro attorno al punto
  const d = 0.004;
  const bbox = [lng - d, lat - d / 1.6, lng + d, lat + d / 1.6].join(',');
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  const google = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const osm = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <iframe
        title={nome ? `Mappa di ${nome}` : 'Mappa'}
        src={embed}
        height={altezza}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full border-0 bg-surface2"
      />
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface px-3 py-2">
        <span className="num text-[11px] text-muted">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <a
          href={google}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs text-nvg hover:underline"
        >
          <Icona nome="campi" size={13} /> Google Maps
        </a>
        <a href={osm} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-ink">
          OpenStreetMap
        </a>
      </div>
    </div>
  );
}
