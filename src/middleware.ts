import { NextResponse, type NextRequest } from 'next/server';
import { INDIRIZZO_GESTIONALE, eHostSito } from '@/lib/sito';

/**
 * Lo smistamento fra sito e gestionale, fatto dall'indirizzo.
 *
 * Su `www.zerodarkteam.it` si vedono le pagine del sito, che nel codice stanno
 * sotto `/sito`: chi le visita vede `/` e `/contatti`, senza il prefisso. Tutto
 * il resto su `www` è il gestionale, che lì non esiste: chi scrive
 * `www.zerodarkteam.it/login` viene mandato su `ops`, dove il login c'è.
 *
 * Su `ops` non si tocca niente. Le pagine del sito restano raggiungibili sotto
 * `/sito`: servono a vederlo prima che il dominio punti qui, e nel test.
 */
const PAGINE_SITO: Record<string, string> = {
  '/': '/sito',
  '/contatti': '/sito/contatti',
};

export function middleware(req: NextRequest) {
  if (!eHostSito(req.headers.get('host'))) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  // i file che le pagine del sito si portano dietro
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/sito') ||
    /\.(?:png|jpe?g|webp|svg|ico|txt|xml|webmanifest)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const pagina = PAGINE_SITO[pathname];
  if (pagina) {
    const url = req.nextUrl.clone();
    url.pathname = pagina;
    return NextResponse.rewrite(url);
  }

  return NextResponse.redirect(`${INDIRIZZO_GESTIONALE}${pathname}${search}`, 307);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
