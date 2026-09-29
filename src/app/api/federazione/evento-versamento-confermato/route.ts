import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { mittente, profiloDi } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/** Chi organizza ha visto arrivare un nostro pagamento, e l'ha messo in cassa. */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-versamento-confermato');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const id = typeof m.dati.corpo.id === 'string' ? m.dati.corpo.id : '';
  const e = id
    ? await prisma.event.findUnique({
        where: {
          origineCollegamentoId_origineIdRemoto: {
            origineCollegamentoId: m.dati.collegamento.id,
            origineIdRemoto: id,
          },
        },
        select: { id: true, titolo: true },
      })
    : null;
  if (e) {
    const richiesto = m.dati.corpo.versamento;
    // senza id è il formato di prima: valeva per il versamento unico
    const quale =
      typeof richiesto !== 'string' || richiesto === 'precedente' ? `precedente-${e.id}` : richiesto;
    const v = await prisma.versamentoSquadra.findFirst({
      where: { id: quale, eventId: e.id, confermatoIl: null },
    });
    if (v) {
      // Da noi è un'uscita della cassa del club: la si scrive nel registro
      // adesso, a pagamento confermato, come un'entrata la scrive chi incassa.
      const metodo = v.metodo
        ? await prisma.metodoPagamento.findFirst({
            where: { nome: v.metodo, cassaId: null },
            select: { id: true },
          })
        : null;
      const movimento = await prisma.movimentoCassa.create({
        data: {
          tipo: 'USCITA',
          descrizione: `${profiloDi(m.dati.collegamento).nome} · ${e.titolo}`,
          importo: v.importo,
          categoria: 'Altre squadre',
          note: v.note,
          metodoId: metodo?.id ?? null,
        },
      });
      await prisma.versamentoSquadra.update({
        where: { id: v.id },
        data: { confermatoIl: new Date(), movimentoCassaId: movimento.id },
      });
    }
    revalidatePath(`/calendario/${e.id}`);
    revalidatePath('/admin/pagamenti');
    revalidatePath('/admin/cassa');
  }
  return NextResponse.json({ ok: true });
}
