import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { inAttesaDiApprovazione } from '@/lib/domain';
import { fmtDate } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Icona } from '@/components/Icona';
import { GRUPPO_WHATSAPP } from '@/lib/squadra';
import { esci } from '@/actions/auth';

export const dynamic = 'force-dynamic';

/**
 * Il gradino fra «mi sono registrato» e «sono dentro».
 *
 * Sta fuori dal gruppo (app) come i consensi e il cambio password, e per la
 * stessa ragione: il controllo che porta qui vive in quel layout, e una pagina
 * dentro allo stesso gruppo si rimanderebbe a sé stessa all'infinito.
 *
 * Mostra i dati appena mandati, e non per gentilezza: chi ha sbagliato a
 * scrivere il proprio indirizzo se ne accorge qui, non dopo tre giorni di
 * attesa di una risposta arrivata altrove.
 */
export default async function InAttesaPage() {
  const me = await requireUser();
  // approvato — o respinto e poi registrato di nuovo: chi non è più in attesa
  // qui non ha niente da fare
  if (!inAttesaDiApprovazione(me.stato)) redirect('/dashboard');

  const io = await prisma.user.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      nome: true,
      cognome: true,
      callsign: true,
      email: true,
      telefono: true,
      dataNascita: true,
      createdAt: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size={64} />
        <h1 className="mt-4 text-xl font-semibold">Richiesta inviata</h1>
        <p className="mt-2 text-sm text-muted">
          Il tuo accesso è in attesa di approvazione: non devi fare altro. Qualcuno della squadra
          guarda la richiesta e decide. Quando è accolta, al primo accesso entri direttamente.
        </p>
      </div>

      {/* Il gruppo si propone subito, non dopo l'approvazione: è lì che si
          vede se una squadra è viva, e due giorni di attesa senza nessuno con
          cui parlare spengono chiunque si fosse fatto avanti. */}
      <div className="card mb-4 space-y-3 border-nvg/40 bg-nvg/5">
        <div>
          <h2 className="font-medium">Intanto entra nel gruppo dei nuovi</h2>
          <p className="mt-1 text-sm text-muted">
            È il posto dove fare domande — come funziona, cosa serve, come ci si veste — e dove si
            raccontano le uscite in programma. Entra pure adesso, senza aspettare la risposta:
            nessuno ti chiede niente.
          </p>
        </div>
        <a
          href={GRUPPO_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full justify-center"
        >
          <Icona nome="whatsapp" size={16} />
          Entra nel gruppo dei nuovi
        </a>
      </div>

      <div className="card space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Quello che hai mandato
        </p>
        <Riga etichetta="Nome" valore={`${io.nome} ${io.cognome}`} />
        {io.callsign && <Riga etichetta="Callsign" valore={io.callsign} />}
        <Riga etichetta="Email" valore={io.email} />
        {io.telefono && <Riga etichetta="Telefono" valore={io.telefono} />}
        {io.dataNascita && <Riga etichetta="Nato il" valore={fmtDate(io.dataNascita)} />}
        <Riga etichetta="Richiesta del" valore={fmtDate(io.createdAt)} />
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        C’è un errore nei dati? Scrivilo a chi ti ha fatto conoscere il team: si corregge in un
        momento, prima o dopo l’approvazione.
      </p>

      <form action={esci} className="mt-6 flex justify-center">
        <button type="submit" className="btn-ghost btn-sm">
          Esci
        </button>
      </form>
    </main>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-muted">{etichetta}</span>
      <span className="min-w-0 truncate text-sm">{valore}</span>
    </div>
  );
}
