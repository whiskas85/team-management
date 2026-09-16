import Link from 'next/link';
import { verificaGettone } from '@/lib/gettoni';
import { entraConGettone } from '@/actions/auth';
import { Logo } from '@/components/Logo';

export const dynamic = 'force-dynamic';

/**
 * Il link del messaggio: si apre, e poi si preme un pulsante.
 *
 * **Il pulsante non è una formalità: è tutto il punto.** Quando un link viene
 * incollato in chat, WhatsApp lo apre dal proprio server per costruire
 * l'anteprima — e lo stesso fanno antivirus, filtri aziendali e certe app di
 * messaggistica. Se bastasse aprirlo per entrare, quel giro di visite
 * brucerebbe il gettone prima che la persona lo tocchi: è esattamente quello
 * che è successo il 16 settembre 2026, con mezza squadra che si trovava
 * davanti a «link già usato» senza averlo mai usato.
 *
 * Aprire questa pagina non consuma niente: si guarda soltanto se il gettone
 * vale. A entrare — sessione, gettone speso — è l'azione dietro al pulsante,
 * e i robot i pulsanti non li premono.
 */
export default async function AccessoConGettone({
  params,
}: {
  params: Promise<{ gettone: string }>;
}) {
  const { gettone } = await params;
  const esito = await verificaGettone(gettone);

  if (!esito.ok) {
    const spiegazione = {
      sconosciuto: 'Questo link non è valido: forse è stato copiato a metà.',
      usato: 'Questo link è già stato usato, e vale una volta sola.',
      scaduto: 'Questo link è scaduto: valeva pochi giorni.',
    }[esito.motivo];

    return (
      <Schermo titolo="Il link non apre più" testo={spiegazione}>
        <p className="mt-4 text-sm text-muted">
          Se hai già la tua password entra normalmente, altrimenti chiedi che te ne mandino un
          altro: ci vuole un momento.
        </p>
        <Link href="/login" className="btn-primary mt-6">
          Vai all’accesso
        </Link>
      </Schermo>
    );
  }

  return (
    <Schermo
      titolo="Bentornato"
      testo="Premi il pulsante per entrare: poi ti verrà chiesto di scegliere la tua password."
    >
      <form action={entraConGettone} className="mt-6 w-full">
        <input type="hidden" name="gettone" value={gettone} />
        <button type="submit" className="btn-primary w-full justify-center">
          Entra in Zero Dark Ops
        </button>
      </form>
      <p className="mt-4 text-xs text-muted">
        Il link si spegne appena entri: vale una volta sola.
      </p>
    </Schermo>
  );
}

function Schermo({
  titolo,
  testo,
  children,
}: {
  titolo: string;
  testo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <Logo size={64} />
      <h1 className="mt-4 text-xl font-semibold">{titolo}</h1>
      <p className="mt-2 text-sm text-muted">{testo}</p>
      {children}
    </main>
  );
}
