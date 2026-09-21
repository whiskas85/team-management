import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { scriveInBacheca, vedeBacheca } from '@/lib/bacheche';
import { percorsoAssoluto } from '@/lib/storage';

/**
 * L'immagine in cima a un messaggio.
 *
 * Quella di un messaggio rilasciato la vede chi vede la bacheca; quella di una
 * bozza solo chi ci scrive — la bozza non esiste ancora per gli altri, e
 * nemmeno la sua foto.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });

  const { id } = await ctx.params;
  const m = await prisma.messaggioBacheca.findUnique({
    where: { id },
    include: {
      bacheca: {
        include: { lettori: { select: { userId: true } }, scrittori: { select: { userId: true } } },
      },
    },
  });
  if (!m?.bannerPath) return new NextResponse('Non trovato', { status: 404 });

  const puo = m.pubblicatoIl ? vedeBacheca(m.bacheca, me) : scriveInBacheca(m.bacheca, me);
  if (!puo) return new NextResponse('Non trovato', { status: 404 });

  let buffer;
  try {
    buffer = await readFile(percorsoAssoluto(m.bannerPath));
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': m.bannerTipo ?? 'image/jpeg',
      'X-Content-Type-Options': 'nosniff',
      // niente cache nemmeno sul telefono: su un dispositivo condiviso, chi
      // entra dopo vedrebbe l'immagine di una bacheca che non e' sua
      'Cache-Control': 'private, no-store',
    },
  });
}
