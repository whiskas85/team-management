import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoAmministrare } from '@/lib/domain';
import { percorsoAssoluto } from '@/lib/storage';
import { nomeFileCertificato } from '@/lib/nome-certificato';

/**
 * Gli allegati non stanno sotto /public: passano da qui, dove controlliamo che
 * a leggerli sia il proprietario oppure lo staff.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });

  const { id } = await ctx.params;
  const cert = await prisma.medicalCertificate.findUnique({
    where: { id },
    include: { user: { select: { nome: true, cognome: true } } },
  });
  if (!cert) return new NextResponse('Non trovato', { status: 404 });

  if (cert.userId !== me.id && !puoAmministrare(me.roles)) {
    return new NextResponse('Accesso negato', { status: 403 });
  }

  // Aprire e scaricare sono due gesti diversi: si apre per guardare se il
  // certificato è quello giusto, si scarica per tenerselo. Con `?scarica=1` il
  // browser lo mette fra i file invece di mostrarlo, e con un nome che si
  // legge — `rossi-mario-certificato-scade-2027-03-14.pdf` — perché dentro una
  // cartella di scaricati `IMG_4471.jpg` non dice niente a nessuno.
  const scarica = new URL(req.url).searchParams.get('scarica') === '1';
  const nome = scarica ? nomeFileCertificato(cert) : cert.fileName;

  try {
    const buffer = await readFile(percorsoAssoluto(cert.filePath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': cert.mimeType,
        'Content-Disposition': `${scarica ? 'attachment' : 'inline'}; filename="${encodeURIComponent(nome)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }
}
