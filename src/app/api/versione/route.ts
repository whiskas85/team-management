import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Il dispositivo dice che versione di service worker ha.
 *
 * La versione del gestionale la scrive il server da solo, accanto all'ultima
 * attività: è quella che ha servito. Il service worker no — vive sul telefono
 * e si aggiorna quando decide il browser — e allora lo si chiede a lui.
 *
 * Il valore arriva dal dispositivo e quindi non è una verità: si tiene corto
 * e si scrive così com'è, perché serve solo a leggerlo in Operatori →
 * Avvisi quando una notifica non arriva e non si capisce perché.
 */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ errore: 'Non autenticato.' }, { status: 401 });

  let corpo: { sw?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ errore: 'Richiesta illeggibile.' }, { status: 400 });
  }

  const sw = typeof corpo.sw === 'string' ? corpo.sw.trim().slice(0, 20) : '';
  if (!sw) return NextResponse.json({ errore: 'Manca la versione.' }, { status: 400 });

  try {
    await prisma.user.update({
      where: { id: me.id },
      data: { versioneSw: sw, versioneSwIl: new Date() },
    });
  } catch {
    /* è un dato di comodo: se il database non risponde, pazienza */
  }
  return NextResponse.json({ ok: true });
}
