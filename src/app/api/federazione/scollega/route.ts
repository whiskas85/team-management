import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/**
 * L'altra squadra ha tolto il collegamento (o ritirato la richiesta): da qui
 * non si manda più niente. La squadra resta nell'anagrafica, com'era.
 */
export async function POST(req: Request) {
  const m = await mittente(req, 'scollega');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const c = m.dati.collegamento;
  if (c.stato !== 'SCOLLEGATO') {
    await prisma.$transaction([
      prisma.collegamentoSquadra.update({
        where: { id: c.id },
        data: { stato: 'SCOLLEGATO', chiusoIl: new Date(), decisoDa: null },
      }),
      prisma.messaggioFederazione.deleteMany({
        where: { collegamentoId: c.id, tipo: { notIn: ['scollega', 'rifiutata'] } },
      }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
