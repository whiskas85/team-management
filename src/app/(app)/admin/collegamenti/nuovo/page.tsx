import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { chiediIdentita, identita } from '@/lib/federazione';
import { leggiLink, mandaRichiestaCollegamento } from '@/actions/collegamenti';
import { Intestazione } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { ScegliSquadraCollegata } from '@/components/ScegliSquadraCollegata';
import { DettagliProfilo, StemmaSquadra } from '@/components/ProfiloCollegato';

export const dynamic = 'force-dynamic';

/**
 * Il link di un'altra squadra, aperto qui: chi sono, a quale squadra
 * dell'anagrafica corrispondono, e la richiesta da mandare.
 */
export default async function NuovoCollegamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  await requirePermesso(isAdmin);
  const { link: testoLink = '' } = await searchParams;
  const link = await leggiLink(testoLink);
  const io = await identita();

  const problema = (testo: string) => (
    <>
      <Intestazione titolo="Collega una squadra" />
      <div className="card">
        <p className="text-sm">{testo}</p>
        <Link href="/admin/collegamenti" className="btn-ghost btn-sm mt-4">
          Torna ai collegamenti
        </Link>
      </div>
    </>
  );

  if (!link)
    return problema('Questo non è un link di collegamento: controlla di averlo copiato intero.');
  if (link.indirizzo === io.indirizzo) {
    return problema(
      'Questo link è del nostro gestionale: va mandato all’altra squadra, non aperto qui.',
    );
  }
  const loro = await chiediIdentita(link.indirizzo);
  if (!loro.ok) return problema(`Il gestionale ${link.indirizzo} ${loro.errore}.`);
  const p = loro.dati.profilo;

  const [squadre, gia] = await Promise.all([
    prisma.squadraEsterna.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, collegamento: { select: { stato: true } } },
    }),
    prisma.collegamentoSquadra.findUnique({ where: { indirizzo: link.indirizzo } }),
  ]);

  return (
    <>
      <Intestazione titolo="Collega una squadra" sottotitolo={link.indirizzo} />
      <div className="card max-w-2xl">
        <div className="mb-3 flex items-center gap-3">
          <StemmaSquadra nome={p.nome} logo={`${link.indirizzo}/api/federazione/logo`} size={56} />
          <div className="min-w-0">
            <p className="text-lg font-semibold">{p.nome}</p>
            <p className="num text-[11px] uppercase tracking-[0.2em] text-nvg">
              {p.nomeGestionale}
            </p>
          </div>
        </div>
        <DettagliProfilo profilo={p} />

        {gia?.stato === 'ATTIVO' ? (
          <p className="mt-4 rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-sm text-nvg">
            Siete già collegati.
          </p>
        ) : (
          <FormAzione
            azione={mandaRichiestaCollegamento}
            className="mt-5 space-y-4 border-t border-line pt-4"
          >
            <input type="hidden" name="link" value={testoLink} />
            <p className="text-sm font-medium">A quale squadra dell’anagrafica corrisponde?</p>
            <ScegliSquadraCollegata
              squadre={squadre.map((s) => ({
                id: s.id,
                nome: s.nome,
                collegata: s.collegamento?.stato === 'ATTIVO',
              }))}
              nome={p.nome}
            />
            <p className="text-xs text-muted">
              Mandando la richiesta {p.nome} riceve il nostro profilo (nome, logo, referenti col
              callsign). Il collegamento parte quando la accettano.
            </p>
            <Invia icona="collegamento">
              {gia?.stato === 'RICHIESTO' ? 'Manda di nuovo la richiesta' : 'Manda la richiesta'}
            </Invia>
          </FormAzione>
        )}
      </div>
    </>
  );
}
