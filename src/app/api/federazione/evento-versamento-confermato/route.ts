import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/** Chi organizza ha visto arrivare il nostro versamento, e l'ha messo in cassa. */
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
    await prisma.event.update({
      where: { id: e.id },
      data: { origineVersatoConfermatoIl: new Date() },
    });
    revalidatePath(`/calendario/${e.id}`);
  }
  return NextResponse.json({ ok: true });
}
