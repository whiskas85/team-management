import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoAmministrare } from '@/lib/domain';
import { percorsoAssoluto } from '@/lib/storage';

/**
 * Gli allegati non stanno sotto /public: passano da qui, dove controlliamo che
 * a leggerli sia il proprietario oppure lo staff.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });

  const { id } = await ctx.params;
  const cert = await prisma.medicalCertificate.findUnique({ where: { id } });
  if (!cert) return new NextResponse('Non trovato', { status: 404 });

  if (cert.userId !== me.id && !puoAmministrare(me.roles)) {
    return new NextResponse('Accesso negato', { status: 403 });
  }

  try {
    const buffer = await readFile(percorsoAssoluto(cert.filePath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': cert.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(cert.fileName)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }
}
