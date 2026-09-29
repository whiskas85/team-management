import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/** Una squadra ospite collegata ci dice di aver versato il dovuto (o lo ritira). */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-versato');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const { id, importo } = m.dati.corpo;
  if (typeof id !== 'string') return NextResponse.json({ errore: 'Illeggibile.' }, { status: 400 });
  const cifra = typeof importo === 'number' && importo >= 0 && importo < 1_000_000 ? importo : null;
  await prisma.squadraOspite.updateMany({
    where: { eventId: id, collegamentoId: m.dati.collegamento.id },
    data: cifra === null ? { versatoIl: null, versatoImporto: null } : { versatoIl: new Date(), versatoImporto: cifra },
  });
  revalidatePath(`/calendario/${id}`);
  return NextResponse.json({ ok: true });
}
