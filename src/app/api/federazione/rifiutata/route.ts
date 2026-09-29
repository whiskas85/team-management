import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/** L'altra squadra non ha accettato la nostra richiesta. */
export async function POST(req: Request) {
  const m = await mittente(req, 'rifiutata');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const c = m.dati.collegamento;
  if (c.stato === 'RICHIESTO') {
    await prisma.collegamentoSquadra.update({
      where: { id: c.id },
      data: { stato: 'RIFIUTATO', chiusoIl: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
