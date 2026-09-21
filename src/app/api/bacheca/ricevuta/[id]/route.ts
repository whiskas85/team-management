import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { firmaValida } from '@/lib/segreti';

/**
 * La seconda spunta: il telefono dice di aver ricevuto la notifica.
 *
 * La chiama il service worker appena ha mostrato la notifica di un messaggio
 * in bacheca. Chi l'ha ricevuta lo dice **la firma che viaggia dentro la
 * notifica**, non la sessione: la notifica è cifrata per quel telefono, e
 * solo lui conosce la firma. Prima si guardava il cookie, e chi aveva la
 * sessione scaduta — dodici ore, senza «ricordami» — riceveva la notifica
 * senza poterlo dire.
 *
 * La sessione resta come ripiego, per le notifiche partite prima che le
 * ricevute avessero la firma.
 *
 * Si segna una volta sola: la prima ricevuta è quella che conta, e un telefono
 * e un computer che la ricevono tutti e due non la spostano in avanti.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const u = url.searchParams.get('u');
  const f = url.searchParams.get('f');

  let userId: string | null = null;
  if (u && f) {
    if (!firmaValida(`ricevuta:${id}:${u}`, f)) return new NextResponse(null, { status: 403 });
    userId = u;
  } else {
    userId = (await getCurrentUser())?.id ?? null;
  }
  if (!userId) return new NextResponse(null, { status: 401 });

  const adesso = new Date();
  await prisma.consegnaBacheca.updateMany({
    where: { messaggioId: id, userId, ricevutaIl: null },
    data: { ricevutaIl: adesso },
  });
  // se arriva la ricevuta, la notifica era per forza partita: capita che
  // l'invio sia stato accettato ma la risposta del servizio sia andata persa
  await prisma.consegnaBacheca.updateMany({
    where: { messaggioId: id, userId, inviataIl: null },
    data: { inviataIl: adesso },
  });

  return new NextResponse(null, { status: 204 });
}
