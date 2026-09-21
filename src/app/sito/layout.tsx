import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { INDIRIZZO_GESTIONALE, percorsoSito } from '@/lib/sito';
import { ASSOCIAZIONE, LINK_SOCIAL } from './contenuti';

/**
 * Il sito pubblico della squadra: la vetrina, non il gestionale.
 *
 * Stessi colori dell'applicazione — nero, verde del visore notturno, il
 * tricolore negli accenti — perché sono i colori del logo, e chi arriva dal
 * sito e poi entra nel gestionale deve sentirsi nello stesso posto.
 */
export const metadata: Metadata = {
  title: { default: 'Zero Dark Team · Softair tattico', template: '%s · Zero Dark Team' },
  description:
    'Zero Dark Team: squadra di softair tattico. Pattuglie a corto e lungo raggio, milsim, cartografia e ATAK. Vieni a provare una giornata con noi.',
  openGraph: {
    title: 'Zero Dark Team',
    description: 'Softair tattico: pattuglie, milsim, cartografia, ATAK. Going dark.',
    images: ['/logo.jpg'],
    locale: 'it_IT',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default async function LayoutSito({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get('host');
  const a = (p: string) => percorsoSito(host, p);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-bg text-ink">
      {/* ------------------------------------------------------------ testata */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-md">
        {/* Tutta la larghezza: a sinistra il marchio, a destra — nell'angolo,
            staccato da tutto il resto — l'ingresso a OPS. In mezzo il sito. */}
        <nav className="flex items-center gap-4 px-4 py-3 md:gap-6 md:px-8">
          <Link href={a('/')} className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Zero Dark Team" width={36} height={36} className="rounded-full" />
            <span className="hidden text-sm font-semibold uppercase tracking-[0.25em] sm:inline">Zero Dark</span>
          </Link>

          <div className="ml-auto hidden items-center gap-6 text-xs uppercase tracking-[0.2em] text-muted lg:flex">
            <a href={`${a('/')}#chi-siamo`} className="hover:text-nvg">Chi siamo</a>
            <a href={`${a('/')}#valori`} className="hover:text-nvg">Valori</a>
            <a href={`${a('/')}#ambizioni`} className="hover:text-nvg">Missioni</a>
            <a href={`${a('/')}#affiliazioni`} className="hover:text-nvg">Affiliazioni</a>
          </div>
          <Link
            href={a('/contatti')}
            className="ml-auto rounded-md border border-nvg bg-nvg/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-nvg transition-colors hover:bg-nvg hover:text-bg lg:ml-0"
          >
            Vuoi provare?
          </Link>

          {/* L'ingresso per chi è già dentro: il gestionale della squadra, da
              solo nell'angolo. Una riga verticale lo separa dal sito, perché
              è un'altra porta e non un'altra pagina. */}
          <span aria-hidden className="h-6 w-px bg-line" />
          <a
            href={`${INDIRIZZO_GESTIONALE}/login`}
            title="Entra in Zero Dark Ops, il portale della squadra"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink/85 transition-colors hover:border-nvg hover:text-nvg"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            <span className="hidden sm:inline">Entra in OPS</span>
            <span className="sm:hidden">OPS</span>
          </a>
        </nav>
      </header>

      <main>{children}</main>

      {/* -------------------------------------------------------- piè di pagina */}
      <footer className="border-t border-line bg-surface/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3 md:px-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Zero Dark Team" width={64} height={64} className="rounded-full" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sito/sat-gaming.webp" alt="SAT & Gaming" className="h-8 w-auto rounded-sm" />
          </div>
          <div className="text-sm text-muted">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-ink">Seguici</p>
            <ul className="space-y-1">
              {LINK_SOCIAL.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="hover:text-nvg">
                    {l.testo}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm text-muted md:text-right">
            <Link href={a('/contatti')} className="block hover:text-nvg">
              Vuoi provare una giornata?
            </Link>
            <a href={`${INDIRIZZO_GESTIONALE}/login`} className="mt-1 block hover:text-nvg">
              Area riservata ai soci
            </a>
            <p className="mt-4 text-xs">
              © {new Date().getFullYear()} Zero Dark Team · {ASSOCIAZIONE}
            </p>
          </div>
        </div>
        {/* il tricolore del logo, in fondo, come una firma */}
        <div className="flex h-1">
          <span className="flex-1 bg-itgreen" />
          <span className="flex-1 bg-ink" />
          <span className="flex-1 bg-itred" />
        </div>
      </footer>
    </div>
  );
}
