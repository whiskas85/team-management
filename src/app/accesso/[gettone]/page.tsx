import Link from 'next/link';
import { redirect } from 'next/navigation';
import { consumaGettone } from '@/lib/gettoni';
import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Logo } from '@/components/Logo';

export const dynamic = 'force-dynamic';

/**
 * Il link del messaggio: un tocco e si è dentro.
 *
 * Sta fuori dal gruppo (app) perché qui la sessione non c'è ancora — è questa
 * pagina a crearla. Subito dopo si finisce sulla scelta della password, che è
 * la sola cosa da fare: il gettone apre la porta, non tiene il posto di una
 * password.
 *
 * Quando non vale più si dice **cosa** è successo — scaduto, già usato — senza
 * dire di chi fosse: chi apre un link altrui non deve scoprire a chi
 * apparteneva.
 */
export default async function AccessoConGettone({
  params,
}: {
  params: Promise<{ gettone: string }>;
}) {
  const { gettone } = await params;
  const esito = await consumaGettone(gettone);

  if (esito.ok) {
    // Chi entra così deve comunque scegliersi una password: il link è un modo
    // di consegnare le chiavi, non una password che dura.
    await prisma.user.update({
      where: { id: esito.userId },
      data: { deveCambiarePassword: true, ultimoAccesso: new Date() },
    });
    await createSession(esito.userId, false);
    redirect('/cambia-password');
  }

  const spiegazione = {
    sconosciuto: 'Questo link non è valido: forse è stato copiato a metà.',
    usato: 'Questo link è già stato usato una volta, e vale una volta sola.',
    scaduto: 'Questo link è scaduto: valeva pochi giorni.',
  }[esito.motivo];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <Logo size={64} />
      <h1 className="mt-4 text-xl font-semibold">Il link non apre più</h1>
      <p className="mt-2 text-sm text-muted">{spiegazione}</p>
      <p className="mt-4 text-sm text-muted">
        Se hai già la tua password, entra normalmente. Altrimenti chiedi che te ne mandino un altro:
        ci vuole un momento.
      </p>
      <Link href="/login" className="btn-primary mt-6">
        Vai all’accesso
      </Link>
    </main>
  );
}
