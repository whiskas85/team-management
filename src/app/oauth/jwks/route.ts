import { NextResponse } from 'next/server';
import { CORS, jwks } from '@/lib/oidc';

export const dynamic = 'force-dynamic';

/** Le chiavi pubbliche con cui le app verificano gli id_token. */
export async function GET() {
  return NextResponse.json(await jwks(), {
    headers: { ...CORS, 'Cache-Control': 'public, max-age=3600' },
  });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
