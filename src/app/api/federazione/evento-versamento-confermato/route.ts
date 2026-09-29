import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/** Chi organizza ha visto arrivare un nostro pagamento, e l'ha messo in cassa. */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-versamento-confermato');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const id = typeof m.dati.corpo.id === 'string' ? m.dati.corpo.id : '';
  const e = id
    ? await prisma.event.findUnique({
        where: {
          origineCollegamentoId_origineIdRemoto: {
            origineCollegamentoId: m.dati.collegamento.id,
            origineIdRemoto: id,
          },
        },
        select: { id: true },
      })
    : null;
  if (e) {
    const v = m.dati.corpo.versamento;
    // senza id è il formato di prima: valeva per il versamento unico
    const quale =
      typeof v !== 'string' || v === 'precedente' ? `precedente-${e.id}` : v;
    await prisma.versamentoSquadra.updateMany({
      where: { id: quale, eventId: e.id, confermatoIl: null },
      data: { confermatoIl: new Date() },
    });
    revalidatePath(`/calendario/${e.id}`);
  }
  return NextResponse.json({ ok: true });
}
