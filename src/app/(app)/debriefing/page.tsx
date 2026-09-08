import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { filtroVisibilita } from '@/lib/query';
import { isAdmin, puoSchierare } from '@/lib/domain';
import { fmtDate, nomeCompleto } from '@/lib/format';
import { Badge, Intestazione, Vuoto } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { Icona } from '@/components/Icona';

export const dynamic = 'force-dynamic';

/**
 * Tutti i debriefing, in fila.
 *
 * È la memoria della squadra: cosa è successo alle giocate, raccontato da chi
 * le ha portate in campo. Chi c'era rilegge, chi non c'era capisce, e chi
 * arriva l'anno dopo trova scritto perché si fa in un certo modo.
 *
 * Si vedono solo quelli **pubblicati** e solo delle attività che uno potrebbe
 * comunque vedere: un resoconto non è una scorciatoia per leggere di una
 * giocata che non ti riguardava.
 */
export default async function DebriefingPage() {
  const me = await requireUser();
  const scrive = puoSchierare(me.roles);

  const debriefing = await prisma.debriefing.findMany({
    where: {
      AND: [
        // in bozza li vede solo chi li scrive
        scrive ? {} : { pubblicato: true },
        { evento: filtroVisibilita(me.stato, isAdmin(me.roles)) },
      ],
    },
    orderBy: { evento: { inizio: 'desc' } },
    take: 50,
    include: {
      autore: { select: { nome: true, cognome: true, callsign: true } },
      evento: {
        select: {
          id: true,
          titolo: true,
          inizio: true,
          tipo: { select: { nome: true } },
          _count: { select: { commenti: true, miPiace: true } },
        },
      },
    },
  });

  return (
    <>
      <Intestazione
        titolo="Debriefing"
        sottotitolo="Com'è andata, raccontato da chi c'era"
      />

      {debriefing.length === 0 ? (
        <Vuoto
          testo={
            scrive
              ? 'Ancora nessun debriefing. Si scrive dalla scheda dell’attività, quando è finita.'
              : 'Ancora nessun debriefing pubblicato.'
          }
        />
      ) : (
        <div className="space-y-4">
          {debriefing.map((d) => (
            <article key={d.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
                    {d.evento.tipo?.nome ?? 'Attività'}
                  </p>
                  <h2 className="mt-1 font-medium">
                    {d.titolo ?? d.evento.titolo}
                  </h2>
                  <p className="num mt-0.5 text-[11px] text-muted">
                    {fmtDate(d.evento.inizio)}
                    {d.autore && ` · ${nomeCompleto(d.autore)}`}
                  </p>
                </div>
                {!d.pubblicato && <Badge tono="warn">bozza</Badge>}
              </div>

              <div className="mt-3">
                <Markdown testo={d.testo} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <Icona nome="miPiace" size={13} />
                  <span className="num">{d.evento._count.miPiace}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Icona nome="commento" size={13} />
                  <span className="num">{d.evento._count.commenti}</span>
                </span>
                {/* commenti e mi piace stanno sull'attività: si parla della
                    stessa giornata, e due discussioni separate sullo stesso
                    pomeriggio non aiutano nessuno */}
                <Link
                  href={`/calendario/${d.evento.id}`}
                  className="ml-auto text-nvg hover:underline"
                >
                  Apri l’attività e commenta →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
