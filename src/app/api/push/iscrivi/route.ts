import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Un dispositivo dice «avvisami».
 *
 * L'iscrizione è legata a chi ha fatto l'accesso adesso: se su quel telefono
 * entra un'altra persona, il browser gli darà lo stesso endpoint, e la riga
 * cambia padrone invece di sdoppiarsi — le notifiche di qualcun altro non
 * devono squillare a chi sta usando il telefono ora.
 */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ errore: 'Non autenticato.' }, { status: 401 });

  let corpo: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ errore: 'Richiesta illeggibile.' }, { status: 400 });
  }

  const { endpoint, keys } = corpo;
  if (!endpoint || !keys?.p256dh || !keys.auth) {
    return NextResponse.json({ errore: 'Iscrizione incompleta.' }, { status: 400 });
  }

  const dispositivo = req.headers.get('user-agent')?.slice(0, 200) ?? null;

  await prisma.iscrizionePush.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: me.id, dispositivo },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: me.id, dispositivo },
  });

  return NextResponse.json({ ok: true });
}

/** «Basta avvisi su questo dispositivo.» */
export async function DELETE(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ errore: 'Non autenticato.' }, { status: 401 });

  let endpoint: string | undefined;
  try {
    ({ endpoint } = await req.json());
  } catch {
    return NextResponse.json({ errore: 'Richiesta illeggibile.' }, { status: 400 });
  }
  if (!endpoint) return NextResponse.json({ errore: 'Manca l’indirizzo.' }, { status: 400 });

  await prisma.iscrizionePush.deleteMany({ where: { endpoint, userId: me.id } });
  return NextResponse.json({ ok: true });
}
