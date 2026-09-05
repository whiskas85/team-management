import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { percorsoAssoluto } from '@/lib/storage';

/**
 * Foto profilo. Sta fuori da `public/` come gli altri allegati: la vede solo
 * chi ha fatto l'accesso, non il primo che indovina l'indirizzo.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });

  const { id } = await ctx.params;
  const utente = await prisma.user.findUnique({
    where: { id },
    select: { fotoPath: true },
  });
  if (!utente?.fotoPath) return new NextResponse('Nessuna foto', { status: 404 });

  try {
    const buffer = await readFile(percorsoAssoluto(utente.fotoPath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }
}
