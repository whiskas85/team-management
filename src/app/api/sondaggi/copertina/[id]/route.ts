import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { percorsoAssoluto } from '@/lib/storage';
import { loRiguarda, puoFareSondaggi } from '@/lib/sondaggi';

/**
 * La copertina di un sondaggio.
 *
 * La vede chi può vedere il sondaggio — le stesse regole della sua pagina: chi
 * lo riceve, chi fa sondaggi, chi l'ha aperto. Agli altri non si dice nemmeno
 * che c'è.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });

  const { id } = await ctx.params;
  const s = await prisma.sondaggio.findUnique({
    where: { id },
    select: { copertinaPath: true, copertinaTipo: true, destinatari: true, creatoDaId: true },
  });
  if (!s?.copertinaPath) return new NextResponse('Non trovato', { status: 404 });

  const vede =
    loRiguarda(s.destinatari, me.stato) || puoFareSondaggi(me.roles) || s.creatoDaId === me.id;
  if (!vede) return new NextResponse('Non trovato', { status: 404 });

  let buffer;
  try {
    buffer = await readFile(percorsoAssoluto(s.copertinaPath));
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': s.copertinaTipo ?? 'image/jpeg',
      'X-Content-Type-Options': 'nosniff',
      // come le immagini delle bacheche: su un telefono condiviso chi entra
      // dopo non deve trovarla in cache
      'Cache-Control': 'private, no-store',
    },
  });
}
