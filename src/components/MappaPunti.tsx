/**
 * Una mappa sola con più segnaposti, ognuno col suo nome: «Parcheggio» e
 * «Ritrovo» sulla stessa cartina, invece di due mappe da confrontare a occhio.
 *
 * La mappa incorporata di OpenStreetMap ha un segnaposto solo, quindi questa
 * si disegna qui: le tessere di OpenStreetMap messe insieme in un SVG, con lo
 * zoom più vicino che tiene dentro tutti i punti, e sopra i segnaposti. Niente
 * librerie e niente script: si scala da sola con la larghezza della pagina.
 * Per farsi portare ci sono i pulsanti di «Come arrivare», subito sotto.
 */

export type PuntoMappa = {
  lat: number;
  lng: number;
  etichetta: string;
  /** La lettera dentro il segnaposto: «P», «R». */
  lettera: string;
  /**
   * Il colore del segnaposto. Fisso e non del tema: sulla mappa due punti
   * devono restare diversi qualunque accento abbia scelto la squadra. Blu e
   * arancio si distinguono anche per chi è daltonico, e la lettera dentro
   * dice lo stesso senza bisogno del colore.
   */
  colore: string;
};

const TESSERA = 256;
// stretta e alta abbastanza da restare leggibile anche sul telefono, dove
// l'SVG si rimpicciolisce
const L = 480;
const A = 300;
const MARGINE = 60;

/** Da coordinate a pixel del mondo, alla scala dello zoom (Web Mercator). */
function pixel(lat: number, lng: number, zoom: number) {
  const scala = TESSERA * 2 ** zoom;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scala,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scala,
  };
}

export function MappaPunti({ punti }: { punti: PuntoMappa[] }) {
  // lo zoom più vicino (fino a 17) a cui tutti i punti stanno dentro
  let zoom = 17;
  for (; zoom > 3; zoom--) {
    const px = punti.map((p) => pixel(p.lat, p.lng, zoom));
    const dx = Math.max(...px.map((p) => p.x)) - Math.min(...px.map((p) => p.x));
    const dy = Math.max(...px.map((p) => p.y)) - Math.min(...px.map((p) => p.y));
    if (dx <= L - 2 * MARGINE && dy <= A - 2 * MARGINE) break;
  }
  const px = punti.map((p) => pixel(p.lat, p.lng, zoom));
  const cx = (Math.max(...px.map((p) => p.x)) + Math.min(...px.map((p) => p.x))) / 2;
  const cy = (Math.max(...px.map((p) => p.y)) + Math.min(...px.map((p) => p.y))) / 2;
  // il segnaposto sta sopra il punto: si sposta un po' in giù il centro
  const ox = cx - L / 2;
  const oy = cy - A / 2 - 22;

  const n = 2 ** zoom;
  const tessere: { x: number; y: number; url: string }[] = [];
  for (let tx = Math.floor(ox / TESSERA); tx <= Math.floor((ox + L) / TESSERA); tx++) {
    for (let ty = Math.floor(oy / TESSERA); ty <= Math.floor((oy + A) / TESSERA); ty++) {
      if (ty < 0 || ty >= n) continue;
      const x = ((tx % n) + n) % n;
      tessere.push({
        x: tx * TESSERA - ox,
        y: ty * TESSERA - oy,
        url: `https://tile.openstreetmap.org/${zoom}/${x}/${ty}.png`,
      });
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <svg
        viewBox={`0 0 ${L} ${A}`}
        className="block w-full bg-surface2"
        role="img"
        aria-label={`Mappa: ${punti.map((p) => p.etichetta).join(' e ')}`}
      >
        {tessere.map((t) => (
          <image
            key={`${t.x}-${t.y}`}
            href={t.url}
            x={t.x}
            y={t.y}
            width={TESSERA}
            height={TESSERA}
          />
        ))}
        {punti.map((p, i) => {
          const x = px[i].x - ox;
          const y = px[i].y - oy;
          const largo = p.etichetta.length * 9 + 20;
          return (
            <g key={i}>
              {/* la goccia del segnaposto, con la punta sul posto */}
              <path
                d={`M${x} ${y} c-5 -11 -14 -16 -14 -26 a14 14 0 1 1 28 0 c0 10 -9 15 -14 26 z`}
                fill={p.colore}
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={x}
                y={y - 21}
                textAnchor="middle"
                fontSize={15}
                fontWeight={700}
                fill="#fff"
              >
                {p.lettera}
              </text>
              {/* il nome sopra, su fondo del suo colore: si legge su qualsiasi mappa */}
              <rect
                x={x - largo / 2}
                y={y - 72}
                width={largo}
                height={26}
                rx={6}
                fill={p.colore}
                stroke="#fff"
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={y - 54}
                textAnchor="middle"
                fontSize={16}
                fontWeight={700}
                fill="#fff"
              >
                {p.etichetta}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface px-3 py-2 text-xs">
        {punti.map((p, i) => (
          <a
            key={i}
            href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: p.colore }}
            >
              {p.lettera}
            </span>
            {p.etichetta}
          </a>
        ))}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-[11px] text-muted hover:text-ink"
        >
          © OpenStreetMap
        </a>
      </div>
    </div>
  );
}
