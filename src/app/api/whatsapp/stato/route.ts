import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { statoPonte } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * Com'è messo il ponte, chiesto dalla pagina mentre si collega il telefono.
 *
 * Serve perché **il codice QR di WhatsApp scade in una ventina di secondi** e
 * poi ne arriva un altro: disegnato una volta sola dal server, quello che si
 * inquadra è già vecchio e non succede niente. Da qui la pagina se lo
 * riprende ogni pochi secondi, finché il telefono non è collegato.
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me || !isAdmin(me.roles)) {
    return NextResponse.json({ errore: 'Non autorizzato.' }, { status: 403 });
  }

  return NextResponse.json(await statoPonte());
}
