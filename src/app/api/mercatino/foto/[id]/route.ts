import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { percorsoAssoluto } from '@/lib/storage';
import { puoVedereMerchandising } from '@/lib/mercatino';

/**
 * Le foto degli annunci. Come le foto profilo stanno fuori da `public/`: le
 * vede chi ha fatto l'accesso, non il primo che indovina l'indirizzo.
 *
 * Con `?m` si chiede la miniatura, ed è quella che usa la bacheca: venti card
 * con la foto intera, da telefono dentro ZeroTier, danno una pagina che sembra
 * rotta senza esserlo.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });

  const { id } = await ctx.params;
  const foto = await prisma.fotoAnnuncio.findUnique({
    where: { id },
    select: {
      file: true,
      miniatura: true,
      annuncio: { select: { stato: true, venditoreId: true, ufficiale: true } },
    },
  });
  if (!foto) return new NextResponse('Nessuna foto', { status: 404 });

  // la bozza è di chi la scrive: finché non la pubblica non esiste per nessuno
  if (foto.annuncio.stato === 'BOZZA' && foto.annuncio.venditoreId !== me.id) {
    return new NextResponse('Nessuna foto', { status: 404 });
  }
  // e il catalogo del club non si sfoglia da fuori, nemmeno per immagini
  if (foto.annuncio.ufficiale && !puoVedereMerchandising(me.stato)) {
    return new NextResponse('Nessuna foto', { status: 404 });
  }

  const piccola = new URL(req.url).searchParams.has('m');

  try {
    const buffer = await readFile(percorsoAssoluto(piccola ? foto.miniatura : foto.file));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        // le foto di un annuncio non cambiano mai: si sostituiscono
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }
}
