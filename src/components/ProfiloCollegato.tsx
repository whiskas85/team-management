import { conMiniatura } from '@/lib/miniature-url';
/* eslint-disable @next/next/no-img-element */
import type { Profilo } from '@/lib/federazione';
import { Icona } from './Icona';

/** Lo stemma di una squadra: il logo se c'è, altrimenti le iniziali. */
export function StemmaSquadra({
  nome,
  logo,
  size = 40,
}: {
  nome: string;
  logo?: string | null;
  size?: number;
}) {
  if (logo) {
    return (
      <img
        src={size <= 96 ? conMiniatura(logo) : logo}
        alt={nome}
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const iniziali = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      className="num flex shrink-0 items-center justify-center rounded-full border border-line bg-surface2 text-xs font-semibold text-muted"
      style={{ width: size, height: size }}
    >
      {iniziali}
    </span>
  );
}

/** L'icona «collegata»: questa squadra ha il suo gestionale collegato al nostro. */
export function IconaCollegata({ titolo = 'Gestionale collegato' }: { titolo?: string }) {
  return (
    <span
      title={titolo}
      aria-label={titolo}
      className="inline-flex shrink-0 items-center rounded border border-nvg/40 bg-nvg/10 px-1 py-px text-nvg"
    >
      <Icona nome="collegamento" size={12} />
    </span>
  );
}

/** Quello che una squadra collegata ci dice di sé: città, recapiti, referenti. */
export function DettagliProfilo({ profilo }: { profilo: Profilo }) {
  return (
    <div className="space-y-2 text-sm">
      {profilo.descrizione && <p className="text-muted">{profilo.descrizione}</p>}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {(profilo.citta || profilo.provincia) && (
          <span>
            {profilo.citta}
            {profilo.provincia ? ` (${profilo.provincia})` : ''}
          </span>
        )}
        {profilo.telefono && <a href={`tel:${profilo.telefono}`}>{profilo.telefono}</a>}
        {profilo.email && <a href={`mailto:${profilo.email}`}>{profilo.email}</a>}
        {profilo.sito && (
          <a href={profilo.sito} target="_blank" rel="noreferrer" className="hover:text-nvg">
            {profilo.sito.replace(/^https?:\/\//, '')}
          </a>
        )}
      </p>
      {profilo.referenti.length > 0 && (
        <ul className="space-y-1">
          {profilo.referenti.map((r, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-3 text-xs">
              <span className="text-muted">{r.ruolo}</span>
              <span className="font-medium text-ink">{r.callsign ?? '—'}</span>
              {r.telefono && <a href={`tel:${r.telefono}`}>{r.telefono}</a>}
              {r.email && <a href={`mailto:${r.email}`}>{r.email}</a>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
