import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mittente, profiloDi } from '@/lib/federazione';
import {
  descriviCosto,
  eventoRicevuto,
  numeriRicevuti,
  riceviEvento,
} from '@/lib/eventi-condivisi';

export const dynamic = 'force-dynamic';

/**
 * Una squadra collegata ci invita a una sua attività, o la cambia. La prima
 * volta finisce fra le attività invitate, e chi gestisce il calendario riceve
 * un avviso.
 */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const c = m.dati.collegamento;
  if (c.stato !== 'ATTIVO') {
    return NextResponse.json({ errore: 'Il collegamento non è attivo.' }, { status: 409 });
  }
  const evento = eventoRicevuto(m.dati.corpo.evento);
  if (!evento) return NextResponse.json({ errore: 'Attività illeggibile.' }, { status: 400 });
  const accesso = m.dati.corpo.accesso === 'GESTIONE' ? 'GESTIONE' : 'VISUALIZZAZIONE';

  const esito = await riceviEvento(
    c,
    evento,
    accesso,
    m.dati.corpo.invitaAltri === true,
    numeriRicevuti(m.dati.corpo.numeri),
  );

  if (esito.nuovo) {
    // a chi decide del calendario: c'è un invito che aspetta una risposta
    const { avvisa } = await import('@/lib/push');
    const admin = await prisma.user.findMany({
      where: { roles: { has: 'ADMIN' }, stato: { not: 'DISABILITATO' } },
      select: { id: true },
    });
    void avvisa(
      admin.map((a) => a.id),
      {
        titolo: `Invito da ${profiloDi(c).nome}`,
        // a pagamento lo si dice subito: è la prima cosa da sapere per decidere
        testo: evento.costo
          ? `${evento.titolo} · a pagamento: ${descriviCosto(evento.costo)}`
          : evento.titolo,
        url: `/calendario/${esito.id}`,
        tag: `invito-${esito.id}`,
      },
    ).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
