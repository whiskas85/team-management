import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Diritto di accesso e portabilità (art. 15 e 20 GDPR): l'interessato scarica
 * tutto ciò che lo riguarda, in un formato leggibile da una macchina.
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return new NextResponse('Non autenticato', { status: 401 });

  const u = await prisma.user.findUnique({
    where: { id: me.id },
    include: {
      certificates: true,
      memberships: true,
      figtCards: true,
      payments: true,
      // gli annunci e gli ordini sono dati personali come gli altri: se non
      // finiscono qui l'esportazione diventa silenziosamente incompleta
      annunci: { include: { voci: true } },
      ordini: { include: { righe: true } },
      rsvps: { include: { event: { select: { titolo: true, inizio: true, tipo: { select: { nome: true } } } } } },
    },
  });
  if (!u) return new NextResponse('Non trovato', { status: 404 });

  // il resto del record (hash della password, note interne dello staff) non
  // rientra nella portabilità e non viene esportato
  const { passwordHash: _hash, ...anagrafica } = u;

  const dati = {
    esportatoIl: new Date().toISOString(),
    titolare: 'Zero Dark Team',
    anagrafica,
  };

  return new NextResponse(JSON.stringify(dati, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="zerodark-dati-${u.cognome.toLowerCase()}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
