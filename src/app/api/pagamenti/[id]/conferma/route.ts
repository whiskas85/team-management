import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoGestireCassa } from '@/lib/casse';
import { fmtEuro, nomeCompleto } from '@/lib/format';
import { AZIONE_CONFERMA } from '@/lib/avviso-pagamento';
import { segnaPagato } from '@/actions/pagamenti';

/**
 * «Conferma» dalla notifica del pagamento da confermare.
 *
 * La chiama il service worker col gestionale chiuso. Registra l'incasso come
 * l'ha dichiarato chi ha pagato — tutto il dovuto, il giorno e il metodo
 * indicati — passando dalla stessa azione del pulsante «Incassa»: stesse
 * regole, stessi effetti (il convocato che passa titolare, il credito).
 *
 * **Chi conferma lo dice il cookie di sessione**, come per il voto: avere in
 * mano il telefono non basta, serve essere dentro come chi gestisce quella
 * cassa. Se qualcuno l'ha già confermato, o la segnalazione è stata ritirata,
 * lo si dice e il telefono apre la pagina.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ errore: 'Sessione scaduta.' }, { status: 401 });

  const corpo = (await req.json().catch(() => ({}))) as { azione?: unknown };
  if (corpo.azione !== AZIONE_CONFERMA) {
    return NextResponse.json({ errore: 'Azione sconosciuta.' }, { status: 400 });
  }

  const { id } = await params;
  const p = await prisma.payment.findUnique({
    where: { id },
    select: {
      cassaId: true,
      status: true,
      dichiaratoIl: true,
      metodoId: true,
      importo: true,
      descrizione: true,
      user: { select: { nome: true, cognome: true, callsign: true } },
    },
  });
  if (!p) return NextResponse.json({ errore: 'Pagamento non trovato.' }, { status: 404 });
  if (!(await puoGestireCassa(me, p.cassaId))) {
    return NextResponse.json({ errore: 'Non gestisci questa cassa.' }, { status: 403 });
  }
  if (!p.dichiaratoIl || (p.status !== 'DA_PAGARE' && p.status !== 'PARZIALE')) {
    return NextResponse.json({ errore: 'Non c’è più niente da confermare.' }, { status: 409 });
  }

  const fd = new FormData();
  fd.set('id', id);
  if (p.metodoId) fd.set('metodoId', p.metodoId);
  const esito = await segnaPagato({}, fd);
  if (esito.errore) return NextResponse.json({ errore: esito.errore }, { status: 409 });

  return NextResponse.json({
    ok: true,
    titolo: 'Pagamento confermato',
    testo:
      `${nomeCompleto(p.user)} · ${fmtEuro(Number(p.importo))} per «${p.descrizione}». ${esito.ok ?? ''}`.trim(),
    tag: `incasso-${id}`,
  });
}
