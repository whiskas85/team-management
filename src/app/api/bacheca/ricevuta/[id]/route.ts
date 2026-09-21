import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * La seconda spunta: il telefono dice di aver ricevuto la notifica.
 *
 * La chiama il service worker appena ha mostrato la notifica di un messaggio
 * in bacheca. Chi l'ha ricevuta lo dice il cookie di sessione, non il
 * messaggio: se la sessione è scaduta la spunta non arriva, e non si inventa
 * — resta la prima, che è la verità di quello che sappiamo.
 *
 * Si segna una volta sola: la prima ricevuta è quella che conta, e un telefono
 * e un computer che la ricevono tutti e due non la spostano in avanti.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse(null, { status: 401 });

  const { id } = await ctx.params;
  const adesso = new Date();
  await prisma.consegnaBacheca.updateMany({
    where: { messaggioId: id, userId: me.id, ricevutaIl: null },
    // se arriva la ricevuta, la notifica era per forza partita: capita che
    // l'invio sia stato accettato ma la risposta del servizio sia andata persa
    data: { ricevutaIl: adesso },
  });
  await prisma.consegnaBacheca.updateMany({
    where: { messaggioId: id, userId: me.id, inviataIl: null },
    data: { inviataIl: adesso },
  });

  return new NextResponse(null, { status: 204 });
}
