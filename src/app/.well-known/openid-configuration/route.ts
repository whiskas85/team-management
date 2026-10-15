import { NextResponse } from 'next/server';
import { CORS, configurazione } from '@/lib/oidc';

export const dynamic = 'force-dynamic';

/** Dove sono le porte del fornitore di identità: le app la leggono da sole. */
export function GET() {
  return NextResponse.json(configurazione(), {
    headers: { ...CORS, 'Cache-Control': 'public, max-age=3600' },
  });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
