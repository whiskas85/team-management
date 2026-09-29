import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';
import { salvaProfiloRicevuto } from '@/lib/federazione-coda';

export const dynamic = 'force-dynamic';

/** L'altra squadra ha accettato la nostra richiesta: il collegamento è attivo. */
export async function POST(req: Request) {
  const m = await mittente(req, 'accettata');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const c = m.dati.collegamento;
  if (c.stato !== 'ATTIVO') {
    if (c.stato !== 'RICHIESTO') {
      return NextResponse.json(
        { errore: 'Non avevamo chiesto questo collegamento.' },
        { status: 409 },
      );
    }
    await prisma.collegamentoSquadra.update({
      where: { id: c.id },
      data: { stato: 'ATTIVO', attivoDal: new Date(), chiusoIl: null },
    });
  }
  await salvaProfiloRicevuto(c, m.dati.corpo.profilo);
  return NextResponse.json({ ok: true });
}
