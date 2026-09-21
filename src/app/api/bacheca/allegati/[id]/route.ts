import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { siApreNelBrowser, vedeBacheca } from '@/lib/bacheche';
import { percorsoAssoluto } from '@/lib/storage';

/**
 * Un documento di bacheca, a chi la bacheca la vede.
 *
 * È il link su cui porta la chiocciola: le stesse regole della pagina, scritte
 * qui perché un indirizzo passato di mano in mano non deve aprire quello che
 * la pagina non mostra. A chi non la vede si risponde «non trovato», non «non
 * puoi»: dire che c'è qualcosa è già dirne troppo.
 *
 * Quello che il browser sa mostrare — PDF, immagini, testo — si apre lì; il
 * resto si scarica. Il Markdown esce come testo semplice: si legge com'è
 * scritto, senza che il browser provi a salvarlo.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });

  const { id } = await ctx.params;
  const a = await prisma.allegatoBacheca.findUnique({
    where: { id },
    include: {
      bacheca: {
        include: { lettori: { select: { userId: true } }, scrittori: { select: { userId: true } } },
      },
    },
  });
  if (!a || !vedeBacheca(a.bacheca, me)) return new NextResponse('Non trovato', { status: 404 });

  let buffer;
  try {
    buffer = await readFile(percorsoAssoluto(a.filePath));
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }

  const markdown = a.mimeType.startsWith('text/markdown');
  const tipo = markdown ? 'text/plain; charset=utf-8' : a.mimeType;
  const scarica =
    new URL(req.url).searchParams.get('scarica') === '1' || !(markdown || siApreNelBrowser(a.mimeType));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': tipo,
      'Content-Disposition': `${scarica ? 'attachment' : 'inline'}; filename="${encodeURIComponent(a.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
