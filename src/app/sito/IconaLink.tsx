export type TipoLink = 'instagram' | 'youtube' | 'facebook' | 'sito' | 'documenti';

/**
 * Le icone dei link: Instagram, YouTube, Facebook, un sito, dei documenti.
 *
 * Disegnate a tratto come le altre icone del gestionale, non con i colori dei
 * marchi: accanto al verde del visore, il blu di Facebook e il rosso di
 * YouTube tutti insieme farebbero una fila di bandierine. Si riconoscono dalla
 * forma, e al passaggio del mouse dicono dove portano.
 */
const TRATTI: Record<TipoLink, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.2 9.2v5.6l4.8-2.8-4.8-2.8Z" fill="currentColor" />
    </>
  ),
  facebook: <path d="M14 8.5V6.8c0-.8.5-1.3 1.3-1.3H17V2.5h-2.6C11.9 2.5 10.5 4 10.5 6.4v2.1H8v3h2.5v10h3.5v-10h2.6l.4-3H14Z" />,
  sito: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </>
  ),
  documenti: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
};

export const NOME_LINK: Record<TipoLink, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  sito: 'Sito',
  documenti: 'Documenti',
};

/** Un link fatto solo d'icona: il nome sta nel titolo e per chi usa un lettore di schermo. */
export function LinkIcona({
  tipo,
  url,
  descrizione,
  grande = false,
}: {
  tipo: TipoLink;
  url: string;
  /** Di chi è il link, per il titolo: «Instagram · FIGT». */
  descrizione?: string;
  grande?: boolean;
}) {
  const etichetta = descrizione ? `${NOME_LINK[tipo]} · ${descrizione}` : NOME_LINK[tipo];
  const lato = grande ? 22 : 18;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={etichetta}
      aria-label={etichetta}
      className={`inline-flex items-center justify-center rounded-md border border-line text-ink/80 transition-colors hover:border-nvg hover:text-nvg ${
        grande ? 'h-12 w-12' : 'h-9 w-9'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={lato}
        height={lato}
        fill={tipo === 'facebook' ? 'currentColor' : 'none'}
        stroke={tipo === 'facebook' ? 'none' : 'currentColor'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {TRATTI[tipo]}
      </svg>
    </a>
  );
}
