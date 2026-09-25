import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { siApreNelBrowser } from '@/lib/bacheche';
import { vedeSegnalazione } from '@/lib/segnalazioni-canali';
import { percorsoAssoluto } from '@/lib/storage';

/**
 * Un allegato di una segnalazione, a chi la segnalazione la può aprire: chi
 * l'ha scritta e chi la gestisce. A tutti gli altri «non trovato» — dire che
 * c'è qualcosa sarebbe già dirne troppo.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });

  const { id } = await ctx.params;
  const a = await prisma.allegatoSegnalazione.findUnique({
    where: { id },
    include: { segnalazione: { select: { autoreId: true } } },
  });
  if (!a || !vedeSegnalazione(a.segnalazione, me)) {
    return new NextResponse('Non trovato', { status: 404 });
  }

  let buffer;
  try {
    buffer = await readFile(percorsoAssoluto(a.filePath));
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }

  const markdown = a.mimeType.startsWith('text/markdown');
  const tipo = markdown ? 'text/plain; charset=utf-8' : a.mimeType;
  const scarica =
    new URL(req.url).searchParams.get('scarica') === '1' ||
    !(markdown || siApreNelBrowser(a.mimeType));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': tipo,
      'Content-Disposition': `${scarica ? 'attachment' : 'inline'}; filename="${encodeURIComponent(a.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
