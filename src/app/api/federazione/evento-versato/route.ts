import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/**
 * Una squadra ospite collegata ci segnala un pagamento, o ritira una
 * segnalazione. Ognuno resta da confermare da chi tiene la cassa; uno già
 * confermato non si tocca da fuori.
 */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-versato');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const corpo = m.dati.corpo;
  if (typeof corpo.id !== 'string') {
    return NextResponse.json({ errore: 'Illeggibile.' }, { status: 400 });
  }
  const testo = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
  const cifra = (v: unknown) =>
    typeof v === 'number' && v > 0 && v < 1_000_000 ? Math.round(v * 100) / 100 : null;

  // Il formato di prima: un versamento solo, senza id, e importo nullo per ritirarlo
  const v =
    corpo.versamento && typeof corpo.versamento === 'object'
      ? (corpo.versamento as Record<string, unknown>)
      : { id: 'precedente', importo: corpo.importo, metodo: corpo.metodo, note: corpo.note };
  const idRemoto = testo(v.id, 64);
  const ritira = corpo.ritira === true || (!corpo.versamento && cifra(corpo.importo) === null);
  const ospite = await prisma.squadraOspite.findFirst({
    where: { eventId: corpo.id, collegamentoId: m.dati.collegamento.id },
    select: { id: true },
  });
  if (ospite && idRemoto) {
    if (ritira) {
      await prisma.versamentoSquadra.deleteMany({
        where: { squadraOspiteId: ospite.id, idRemoto, confermatoIl: null },
      });
    } else if (cifra(v.importo) !== null) {
      const dati = {
        importo: cifra(v.importo)!,
        metodo: testo(v.metodo, 80),
        note: testo(v.note, 300),
      };
      const c = await prisma.versamentoSquadra.findUnique({
        where: { squadraOspiteId_idRemoto: { squadraOspiteId: ospite.id, idRemoto } },
      });
      if (!c) {
        await prisma.versamentoSquadra.create({
          data: { squadraOspiteId: ospite.id, idRemoto, ...dati },
        });
      } else if (!c.confermatoIl) {
        await prisma.versamentoSquadra.update({ where: { id: c.id }, data: dati });
      }
    }
  }
  revalidatePath('/admin/pagamenti');
  revalidatePath('/cassa');
  revalidatePath(`/calendario/${corpo.id}`);
  return NextResponse.json({ ok: true });
}
