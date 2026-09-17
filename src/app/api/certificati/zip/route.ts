import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GIORNI_PREAVVISO_SCADENZA, puoAmministrare } from '@/lib/domain';
import { percorsoAssoluto } from '@/lib/storage';
import { nomeFileCertificato } from '@/lib/nome-certificato';

export const dynamic = 'force-dynamic';

/**
 * Tutti i certificati di una vista, in un file solo.
 *
 * Serve quando i file vanno consegnati fuori di qui — alla federazione, a
 * un'assicurazione, a chi organizza una gara — e scaricarli uno per uno
 * significa venti clic e venti nomi da rimettere a posto a mano.
 *
 * **Lo zip segue il filtro che si sta guardando**: «da vagliare» scarica
 * quelli, «validi» quelli. Chi ha in mente una selezione la fa sullo schermo,
 * e il pulsante porta via esattamente quello che vede.
 *
 * Dentro ci sono dati sanitari di persone vere: lo scarica solo chi
 * amministra, e il file non viene messo in cache da nessuna parte.
 */

const CONDIZIONI = {
  attesa: () => ({ status: 'IN_ATTESA' as const }),
  scadenza: () => ({
    status: 'VALIDO' as const,
    scadeIl: {
      gte: new Date(),
      lte: new Date(Date.now() + GIORNI_PREAVVISO_SCADENZA * 86400000),
    },
  }),
  scaduti: () => ({
    OR: [
      { status: 'SCADUTO' as const },
      { status: 'VALIDO' as const, scadeIl: { lt: new Date() } },
    ],
  }),
  validi: () => ({ status: 'VALIDO' as const, scadeIl: { gte: new Date() } }),
  tutti: () => ({}),
} as const;

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });
  if (!puoAmministrare(me.roles)) return new NextResponse('Accesso negato', { status: 403 });

  const chiesto = new URL(req.url).searchParams.get('filtro') ?? 'attesa';
  const filtro = (chiesto in CONDIZIONI ? chiesto : 'tutti') as keyof typeof CONDIZIONI;

  const certificati = await prisma.medicalCertificate.findMany({
    where: CONDIZIONI[filtro](),
    include: { user: { select: { nome: true, cognome: true } } },
    orderBy: [{ user: { cognome: 'asc' } }, { user: { nome: 'asc' } }],
  });

  if (certificati.length === 0) {
    return new NextResponse('Non c’è niente da scaricare in questa vista.', { status: 404 });
  }

  const zip = new JSZip();
  const usati = new Set<string>();
  let mancanti = 0;

  for (const cert of certificati) {
    try {
      const contenuto = await readFile(percorsoAssoluto(cert.filePath));

      // due certificati della stessa persona con la stessa scadenza
      // avrebbero lo stesso nome, e il secondo cancellerebbe il primo
      let nome = nomeFileCertificato(cert);
      for (let n = 2; usati.has(nome); n++) {
        nome = nomeFileCertificato(cert).replace(/(\.[^.]+)$/, `-${n}$1`);
      }
      usati.add(nome);

      zip.file(nome, contenuto);
    } catch {
      // un file sparito dal disco non deve far fallire tutto lo scarico: si
      // porta via quello che c'è e alla fine si dice quanti ne mancavano
      mancanti++;
    }
  }

  if (mancanti > 0) {
    zip.file(
      'MANCANTI.txt',
      `${mancanti} certificat${mancanti === 1 ? 'o' : 'i'} risultano in elenco ma il file non è più sul disco.\n` +
        'Chiedi a chi li ha caricati di rifarlo.\n',
    );
  }

  // arraybuffer e non uint8array: è quello che una Response accetta come
  // corpo senza contorsioni di tipi
  const contenuto = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  const oggi = new Date().toISOString().slice(0, 10);

  return new NextResponse(contenuto, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="certificati-${filtro}-${oggi}.zip"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
