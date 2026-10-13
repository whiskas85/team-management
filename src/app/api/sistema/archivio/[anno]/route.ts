import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { UPLOAD_DIR } from '@/lib/storage';
import { eDerivato, elencoAllegati } from '@/lib/sistema';

export const dynamic = 'force-dynamic';

/**
 * L'archivio di un anno: tutti gli allegati salvati quell'anno, cartella per
 * cartella, con l'indice in CSV. Serve a tenerne una copia fuori dal server
 * (un disco, il cloud della squadra). Le miniature restano fuori: si rifanno.
 *
 * Lo zip comprime poco PDF e foto, che sono già compressi: lo spazio vero lo
 * libera l'alleggerimento, non l'archivio.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ anno: string }> }) {
  const me = await getCurrentUser();
  if (!me || !isAdmin(me.roles)) return new NextResponse('Accesso negato', { status: 403 });

  const anno = Number((await ctx.params).anno);
  if (!Number.isInteger(anno)) return new NextResponse('Anno non valido', { status: 400 });

  const file = (await elencoAllegati()).filter((f) => f.anno === anno && !eDerivato(f));
  const zip = new JSZip();
  const righe = ['percorso;byte'];
  for (const f of file) {
    const contenuto = await readFile(path.join(UPLOAD_DIR, f.relativo)).catch(() => null);
    if (!contenuto) continue;
    zip.file(f.relativo, contenuto);
    righe.push(`${f.relativo};${f.byte}`);
  }
  zip.file('indice.csv', righe.join('\n'));

  const dati = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  return new NextResponse(dati, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="archivio-allegati-${anno}.zip"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
