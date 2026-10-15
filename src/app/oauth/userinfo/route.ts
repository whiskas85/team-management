import { NextResponse } from 'next/server';
import { CORS, datiPersona, tokenValido } from '@/lib/oidc';

export const dynamic = 'force-dynamic';

/** I dati della persona, con il token di accesso dato all'app. */
async function rispondi(req: Request) {
  const h = req.headers.get('authorization');
  const t = await tokenValido(h?.startsWith('Bearer ') ? h.slice(7).trim() : null);
  if (!t) {
    return NextResponse.json(
      { error: 'invalid_token' },
      { status: 401, headers: { ...CORS, 'WWW-Authenticate': 'Bearer error="invalid_token"' } },
    );
  }
  const dati = await datiPersona(t.userId, t.scope.split(' '));
  if (!dati) return NextResponse.json({ error: 'invalid_token' }, { status: 401, headers: CORS });
  return NextResponse.json(dati, { headers: CORS });
}

export const GET = rispondi;
export const POST = rispondi;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
