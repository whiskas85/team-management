import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { percorsoAssoluto } from '@/lib/storage';

/**
 * Il logo di una squadra esterna, arrivato dal suo gestionale quando ci si è
 * collegati. Lo vede chi ha fatto l'accesso: sta sulle card del calendario.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new NextResponse('Non autenticato', { status: 401 });
  const { id } = await ctx.params;
  const s = await prisma.squadraEsterna.findUnique({ where: { id }, select: { logoPath: true } });
  if (!s?.logoPath) return new NextResponse('Nessun logo', { status: 404 });
  try {
    const dati = await readFile(percorsoAssoluto(s.logoPath));
    return new NextResponse(new Uint8Array(dati), {
      headers: {
        'Content-Type': s.logoPath.endsWith('.png') ? 'image/png' : 'image/jpeg',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }
}
