import { NextResponse } from 'next/server';
import { bruciaGettone, verificaGettone } from '@/lib/gettoni';
import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Il link del messaggio: un tocco e si è dentro.
 *
 * **È una rotta e non una pagina, ed è tutta la differenza.** Una pagina, in
 * Next, non può scrivere un cookie: il cookie di sessione si mette solo da
 * un'azione o da una rotta. Scritta come pagina — com'era nella 2.33.0 — la
 * sessione non nasceva, il link si bruciava lo stesso e chi lo apriva restava
 * fuori: «non mi autologga».
 *
 * L'ordine conta: prima si guarda se il gettone vale, poi si apre la
 * sessione, e **solo alla fine** lo si spegne. Se qualcosa va storto nel
 * mezzo, il link resta buono e si può riprovare.
 */
export async function GET(
  richiesta: Request,
  { params }: { params: Promise<{ gettone: string }> },
) {
  const { gettone } = await params;
  const esito = await verificaGettone(gettone);

  if (!esito.ok) {
    // Si dice cosa è successo, non di chi fosse: chi apre il link di un altro
    // non deve scoprire a chi apparteneva.
    return NextResponse.redirect(new URL(`/login?accesso=${esito.motivo}`, richiesta.url));
  }

  // Chi entra così deve comunque scegliersi una password: il link consegna le
  // chiavi, non tiene il posto di una password.
  await prisma.user.update({
    where: { id: esito.userId },
    data: { deveCambiarePassword: true, ultimoAccesso: new Date() },
  });
  await createSession(esito.userId, false);
  await bruciaGettone(esito.gettoneId);

  return NextResponse.redirect(new URL('/cambia-password', richiesta.url));
}
