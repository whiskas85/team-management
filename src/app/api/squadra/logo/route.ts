import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { leggiMiaSquadra, logoIniziali, PARTENZA } from '@/lib/mia-squadra';
import { percorsoAssoluto } from '@/lib/storage';
import { leggiMiniatura, miniaturaPubblica, rispostaMiniatura } from '@/lib/miniature';

export const dynamic = 'force-dynamic';

/**
 * Il logo della squadra. È pubblico, al contrario delle foto: sta sulla pagina
 * di accesso, sull'invito che si manda alle altre squadre e, domani, sul badge
 * degli eventi nei gestionali delle squadre collegate.
 *
 * Senza un logo caricato si torna a quello di partenza, in public/; e se
 * nemmeno quello c'è (una squadra ospitata), le iniziali della squadra.
 */
export async function GET(req: Request) {
  const s = await leggiMiaSquadra();
  if (!s?.logoPath && !PARTENZA.logo) {
    // niente logo: le iniziali, in SVG — piccolo o grande è lo stesso disegno
    return new NextResponse(await logoIniziali(), {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' },
    });
  }
  // ?mini=1: la copia piccola, per l'intestazione e i badge
  if (new URL(req.url).searchParams.has('mini')) {
    const mini = s?.logoPath
      ? await leggiMiniatura(s.logoPath)
      : await miniaturaPubblica(PARTENZA.logo);
    if (mini) return rispostaMiniatura(mini, true);
  }
  if (s?.logoPath) {
    try {
      const buffer = await readFile(percorsoAssoluto(s.logoPath));
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': s.logoPath.endsWith('.png') ? 'image/png' : 'image/jpeg',
          // l'indirizzo cambia col logo (?v=): quello vecchio si può tenere
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch {
      // file sparito: meglio il logo di partenza che un'immagine rotta
    }
  }
  // relativo: dietro il proxy l'indirizzo della richiesta non è quello vero
  return new NextResponse(null, { status: 302, headers: { Location: PARTENZA.logo } });
}
