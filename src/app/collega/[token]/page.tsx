import { prisma } from '@/lib/db';
import { marchio } from '@/lib/mia-squadra';
import { Logo } from '@/components/Logo';
import { ApriCollegamento } from '@/components/ApriCollegamento';

export const dynamic = 'force-dynamic';

/**
 * Il link di collegamento, visto da chi lo riceve: di chi è, cosa vuol dire
 * collegarsi, e il modo di continuare dal proprio gestionale. Pubblica: chi la
 * apre non ha un account qui, e non gli serve.
 */
export default async function PaginaCollega({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [m, link] = await Promise.all([
    marchio(),
    prisma.linkCollegamento.findUnique({ where: { token } }),
  ]);
  const valido = !!link && !link.revocatoIl && link.scadeIl > new Date();

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <header className="mb-6 flex items-center gap-3 border-b border-line pb-5">
        <Logo size={56} src={m.logoUrl} alt={m.nome} />
        <div className="min-w-0">
          <p className="text-lg font-semibold">{m.nome}</p>
          <p className="num text-[11px] uppercase tracking-[0.2em] text-nvg">{m.nomeGestionale}</p>
        </div>
      </header>

      {valido ? (
        <div className="card space-y-4">
          <div>
            <p className="titolo-sezione">Collegamento fra gestionali</p>
            <p className="mt-2 text-sm">
              <strong>{m.nome}</strong> vi invita a collegare i vostri gestionali. Collegati, quando
              una delle due squadre organizza un evento può invitare l’altra: l’evento compare nel
              vostro calendario, e i numeri dei presenti passano da soli, senza riscriverli a mano.
            </p>
            <p className="mt-2 text-xs text-muted">
              Passano solo il profilo della squadra e i referenti (col callsign). Nomi, adesioni e
              quote restano a casa di ognuno. Il collegamento si può togliere quando si vuole.
            </p>
          </div>
          <ApriCollegamento />
        </div>
      ) : (
        <div className="card">
          <p className="titolo-sezione">Link non più valido</p>
          <p className="mt-2 text-sm text-muted">
            Questo link di collegamento è scaduto o è stato revocato. Chiedine uno nuovo a {m.nome}.
          </p>
        </div>
      )}
    </main>
  );
}
