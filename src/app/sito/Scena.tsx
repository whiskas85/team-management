import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Le curve di livello di una carta topografica, disegnate al volo.
 *
 * Ogni scena ha il suo «terreno», ricavato dal nome: sempre lo stesso per la
 * stessa sezione, diverso da una all'altra. Niente caso vero: la pagina si
 * genera sul server, e un disegno che cambia a ogni visita farebbe
 * sfarfallare la pagina.
 */
function seme(testo: string) {
  let h = 2166136261;
  for (const c of testo) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function curve(nome: string, w: number, h: number) {
  const caso = seme(nome);
  const cime = [0, 1].map(() => ({ x: w * (0.2 + caso() * 0.6), y: h * (0.2 + caso() * 0.6) }));
  const tratti: string[] = [];
  for (const c of cime) {
    const fasi = [caso() * 6, caso() * 6, caso() * 6];
    for (let livello = 1; livello <= 9; livello++) {
      const r = livello * (Math.min(w, h) / 11);
      const punti: string[] = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const onda =
          1 +
          0.18 * Math.sin(a * 2 + fasi[0]) +
          0.1 * Math.sin(a * 3 + fasi[1] + livello * 0.3) +
          0.05 * Math.sin(a * 5 + fasi[2]);
        punti.push(`${(c.x + Math.cos(a) * r * onda).toFixed(1)},${(c.y + Math.sin(a) * r * onda * 0.8).toFixed(1)}`);
      }
      tratti.push(`M${punti.join('L')}Z`);
    }
  }
  return { tratti, cime };
}

/**
 * Una foto della squadra, o una carta al suo posto.
 *
 * Se in `public/sito/` c'è il file, si vede la foto. Altrimenti una carta
 * topografica con la griglia, il mirino sull'obiettivo e la sigla della
 * missione: sta bene da sola, e il giorno che arriva la foto basta mettere il
 * file, senza toccare il codice.
 */
export function Scena({
  foto,
  nome,
  codice,
  alt,
  className = '',
}: {
  foto?: string;
  nome: string;
  codice?: string;
  alt: string;
  className?: string;
}) {
  // Chi la usa come sfondo le passa `absolute`: allora non deve essere anche
  // `relative`, che vincerebbe e la lascerebbe alta zero, invisibile.
  const posizione = className.split(/\s+/).includes('absolute') ? '' : 'relative';

  if (foto && existsSync(path.join(process.cwd(), 'public', 'sito', foto))) {
    return (
      <div className={`${posizione} overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/sito/${foto}`} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        {/* la foto passa sotto un velo verde notturno, per stare coi colori */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
        {codice && (
          <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.25em] text-nvg">
            {codice}
          </span>
        )}
      </div>
    );
  }

  const w = 600;
  const h = 400;
  const { tratti, cime } = curve(nome, w, h);
  const obiettivo = cime[0];

  return (
    <div className={`${posizione} overflow-hidden bg-[#070a07] ${className}`} role="img" aria-label={alt}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {/* la griglia chilometrica */}
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={h} stroke="#4cff00" strokeOpacity="0.07" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`o${i}`} x1={0} y1={i * 50} x2={w} y2={i * 50} stroke="#4cff00" strokeOpacity="0.07" />
        ))}
        {/* le curve di livello */}
        {tratti.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#4cff00" strokeOpacity={i % 3 === 0 ? 0.35 : 0.14} strokeWidth={i % 3 === 0 ? 1.2 : 0.8} />
        ))}
        {/* la rotta tratteggiata verso l'obiettivo */}
        <path
          d={`M20,${h - 30} C${w * 0.3},${h * 0.8} ${w * 0.35},${obiettivo.y + 60} ${obiettivo.x},${obiettivo.y}`}
          fill="none"
          stroke="#e7ede7"
          strokeOpacity="0.5"
          strokeDasharray="6 6"
          strokeWidth="1.5"
        />
        {/* il mirino sull'obiettivo */}
        <g transform={`translate(${obiettivo.x} ${obiettivo.y})`} stroke="#4cff00" fill="none">
          <circle r="16" strokeWidth="1.5" />
          <circle r="3" fill="#4cff00" />
          <line x1="-28" y1="0" x2="-20" y2="0" strokeWidth="1.5" />
          <line x1="20" y1="0" x2="28" y2="0" strokeWidth="1.5" />
          <line x1="0" y1="-28" x2="0" y2="-20" strokeWidth="1.5" />
          <line x1="0" y1="20" x2="0" y2="28" strokeWidth="1.5" />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-bg/20" />
      {/* la sigla solo sulle carte delle missioni: come sfondo sarebbe una
          scritta a caso in un angolo */}
      {codice && (
        <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.25em] text-nvg/80">
          {nome}
        </span>
      )}
      {codice && (
        <span className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-[0.25em] text-ink/70">
          {codice}
        </span>
      )}
    </div>
  );
}
