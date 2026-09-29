import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { mittente, profiloDi } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/**
 * Una squadra collegata vuole proporci per un'attività di un'altra squadra
 * con cui non siamo ancora collegati: ci chiede un link di collegamento da
 * dare a quell'organizzatore. Il link fa solo arrivare la richiesta fra le
 * nostre **Richieste di collegamento**, dove decide un admin, come sempre.
 */
export async function POST(req: Request) {
  const m = await mittente(req, 'gettone-collegamento');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  if (m.dati.collegamento.stato !== 'ATTIVO') {
    return NextResponse.json({ errore: 'Non siamo collegati.' }, { status: 403 });
  }
  const testo = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
  const per = testo(m.dati.corpo.organizzatore, 120) ?? 'un’altra squadra';
  const attivita = testo(m.dati.corpo.attivita, 200);
  const link = await prisma.linkCollegamento.create({
    data: {
      token: randomBytes(18).toString('base64url'),
      scadeIl: new Date(Date.now() + 7 * 86_400_000),
      perConto: `${profiloDi(m.dati.collegamento).nome}, per invitarci con ${per}${
        attivita ? ` a «${attivita}»` : ''
      }`,
    },
  });
  revalidatePath('/admin/collegamenti');
  return NextResponse.json({ token: link.token });
}
