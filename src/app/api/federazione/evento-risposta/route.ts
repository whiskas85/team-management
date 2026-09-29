import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

const RISPOSTE = ['IN_ATTESA', 'ACCETTATA', 'RIFIUTATA'] as const;

/** La squadra collegata che abbiamo invitato ha accettato o rifiutato la nostra attività. */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-risposta');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const { id, risposta } = m.dati.corpo;
  if (typeof id !== 'string' || !RISPOSTE.includes(risposta as (typeof RISPOSTE)[number])) {
    return NextResponse.json({ errore: 'Risposta illeggibile.' }, { status: 400 });
  }
  await prisma.squadraOspite.updateMany({
    where: { eventId: id, collegamentoId: m.dati.collegamento.id },
    data: {
      risposta: risposta as (typeof RISPOSTE)[number],
      rispostoIl: new Date(),
      // chi dice di no non viene: il numero lo dice da sé
      ...(risposta === 'RIFIUTATA' ? { operatori: 0 } : {}),
    },
  });
  revalidatePath(`/calendario/${id}`);
  return NextResponse.json({ ok: true });
}
