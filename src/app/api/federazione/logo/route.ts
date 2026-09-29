import { NextResponse } from 'next/server';
import { logoNostro } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/** Il nostro logo in byte, per i gestionali collegati che lo mettono sulla loro scheda. */
export async function GET() {
  const logo = await logoNostro();
  if (!logo) return new NextResponse('Nessun logo', { status: 404 });
  return new NextResponse(new Uint8Array(logo.dati), {
    headers: { 'Content-Type': logo.tipo, 'Cache-Control': 'public, max-age=300' },
  });
}
