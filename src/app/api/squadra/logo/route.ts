import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { leggiMiaSquadra, PARTENZA } from '@/lib/mia-squadra';
import { percorsoAssoluto } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Il logo della squadra. È pubblico, al contrario delle foto: sta sulla pagina
 * di accesso, sull'invito che si manda alle altre squadre e, domani, sul badge
 * degli eventi nei gestionali delle squadre collegate.
 *
 * Senza un logo caricato si torna a quello di partenza, in public/.
 */
export async function GET() {
  const s = await leggiMiaSquadra();
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
