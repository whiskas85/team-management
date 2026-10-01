import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoGestirePagamenti } from '@/lib/domain';
import { percorsoAssoluto } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** Lo scontrino o la fattura di un movimento di cassa: lo vede chi tiene la cassa. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });
  if (!puoGestirePagamenti(me.roles)) return new NextResponse('Non autorizzato', { status: 403 });
  const { id } = await ctx.params;
  const m = await prisma.movimentoCassa.findUnique({
    where: { id },
    select: { allegatoPath: true, allegatoNome: true, allegatoTipo: true },
  });
  if (!m?.allegatoPath) return new NextResponse('Nessun allegato', { status: 404 });
  try {
    const dati = await readFile(percorsoAssoluto(m.allegatoPath));
    return new NextResponse(new Uint8Array(dati), {
      headers: {
        'Content-Type': m.allegatoTipo ?? 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(m.allegatoNome ?? 'allegato')}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }
}
