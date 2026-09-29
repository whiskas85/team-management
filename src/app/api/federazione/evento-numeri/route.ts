import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';
import { segnalaNumeri } from '@/lib/eventi-condivisi';

export const dynamic = 'force-dynamic';

const intero = (v: unknown) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 10_000 ? v : null;

/**
 * Una squadra collegata che abbiamo invitato ci dice quanti ne porta: i
 * presenti, e i «forse» se ha scelto di mandarli. Prende il posto del numero
 * scritto a mano, e il riepilogo nuovo riparte verso tutte le squadre invitate.
 */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-numeri');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const { id, presenti, forse } = m.dati.corpo;
  if (typeof id !== 'string' || intero(presenti) === null) {
    return NextResponse.json({ errore: 'Numeri illeggibili.' }, { status: 400 });
  }
  const aggiornati = await prisma.squadraOspite.updateMany({
    where: { eventId: id, collegamentoId: m.dati.collegamento.id },
    data: { operatori: intero(presenti), operatoriForse: intero(forse), rispostoIl: new Date() },
  });
  if (aggiornati.count > 0) {
    await segnalaNumeri(id).catch(() => null);
    revalidatePath(`/calendario/${id}`);
    revalidatePath('/calendario');
  }
  return NextResponse.json({ ok: true });
}
