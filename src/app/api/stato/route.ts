import { NextResponse } from 'next/server';
import { VERSIONE } from '@/lib/versione';

export const dynamic = 'force-dynamic';

/**
 * Che versione gira qui: la legge il portale ZeroDark per sapere chi va
 * aggiornato, e se un aggiornamento è arrivato davvero.
 *
 * Pubblica e minima apposta: la versione e basta, niente nomi né numeri.
 */
export async function GET() {
  return NextResponse.json(
    { version: VERSIONE },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
