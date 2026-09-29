import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/** Una squadra ospite collegata ci dice di aver versato il dovuto (o lo ritira). */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-versato');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const { id, importo, metodo, note } = m.dati.corpo;
  if (typeof id !== 'string') return NextResponse.json({ errore: 'Illeggibile.' }, { status: 400 });
  const cifra = typeof importo === 'number' && importo >= 0 && importo < 1_000_000 ? importo : null;
  const testo = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
  // un incasso già confermato non si tocca da fuori
  await prisma.squadraOspite.updateMany({
    where: { eventId: id, collegamentoId: m.dati.collegamento.id, confermatoIl: null },
    data:
      cifra === null
        ? { versatoIl: null, versatoImporto: null, versatoMetodo: null, versatoNote: null }
        : {
            versatoIl: new Date(),
            versatoImporto: cifra,
            versatoMetodo: testo(metodo, 80),
            versatoNote: testo(note, 300),
          },
  });
  revalidatePath('/admin/pagamenti');
  revalidatePath('/cassa');
  revalidatePath(`/calendario/${id}`);
  return NextResponse.json({ ok: true });
}
