import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoGestirePagamenti } from '@/lib/domain';
import { puoGestireCassa } from '@/lib/casse';
import { percorsoAssoluto } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * L'allegato di un versamento a credito segnalato (la ricevuta). Lo vede chi
 * ha pagato e chi deve confermare: la segreteria per la cassa del club, chi
 * gestisce l'altra cassa per la sua.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });
  const { id } = await ctx.params;
  const p = await prisma.versamentoCredito.findUnique({
    where: { id },
    select: { userId: true, cassaId: true, allegatoPath: true, allegatoNome: true, allegatoTipo: true },
  });
  if (!p?.allegatoPath) return new NextResponse('Nessun allegato', { status: 404 });
  const puo =
    p.userId === me.id ||
    (p.cassaId ? await puoGestireCassa(me, p.cassaId) : puoGestirePagamenti(me.roles));
  if (!puo) return new NextResponse('Non autorizzato', { status: 403 });
  try {
    const dati = await readFile(percorsoAssoluto(p.allegatoPath));
    return new NextResponse(new Uint8Array(dati), {
      headers: {
        'Content-Type': p.allegatoTipo ?? 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(p.allegatoNome ?? 'allegato')}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }
}
