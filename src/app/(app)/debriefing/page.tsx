import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { filtroVisibilita } from '@/lib/query';
import { isAdmin, puoModerareChat, puoSchierare, vedeDebriefing } from '@/lib/domain';
import { comeChiamare, fmtDate, nomeCompleto } from '@/lib/format';
import { Badge, Intestazione, Vuoto } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { Social, type Commento } from '@/components/Social';
import { FormDebriefing } from '@/components/Debriefing';
import { BottoneModale } from '@/components/Modale';
import { SegnaDebriefingLetti } from '@/components/SegnaDebriefingLetti';

export const dynamic = 'force-dynamic';

/**
 * Tutti i debriefing, in fila.
 *
 * È la memoria della squadra: cosa è successo alle giocate, raccontato da chi
 * le ha portate in campo. Chi c'era rilegge, chi non c'era capisce, e chi
 * arriva l'anno dopo trova scritto perché si fa in un certo modo.
 *
 * **Si commenta da qui.** Il racconto è tutto in pagina, e mandare altrove chi
 * vuole dire la sua vuol dire che non la dice: like e commenti sono quelli
 * dell'attività — la giornata è quella — ma si scrivono dove si legge.
 *
 * Si vedono solo quelli **pubblicati** e solo delle attività che uno potrebbe
 * comunque vedere: un resoconto non è una scorciatoia per leggere di una
 * giocata che non ti riguardava.
 */
export default async function DebriefingPage() {
  const me = await requireUser();
  // la voce di menu non compare a chi non gioca, ma la pagina non si fida del
  // menu: un indirizzo si indovina
  if (!vedeDebriefing(me.roles)) redirect('/dashboard');
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
    take: 20,
    include: {
      autore: { select: { nome: true, cognome: true, callsign: true } },
      letture: { where: { userId: me.id }, select: { userId: true } },
      evento: {
        select: {
          id: true,
          titolo: true,
          inizio: true,
          tipo: { select: { nome: true } },
          commenti: {
            orderBy: { createdAt: 'asc' },
            include: {
              utente: {
                select: {
                  id: true,
                  nome: true,
                  cognome: true,
                  callsign: true,
                  fotoPath: true,
                },
              },
            },
          },
          miPiace: {
            include: { utente: { select: { nome: true, cognome: true, callsign: true } } },
          },
        },
      },
    },
  });

  const chiSono = comeChiamare(me, { incarico: false, diSquadra: true }).nome;
  // quelli che sto leggendo adesso: il pallino si spegne aprendo questa pagina,
  // perché qui il testo è tutto davanti — non c'è un dentro in cui entrare
  const daSegnare = debriefing.filter((d) => d.pubblicato && d.letture.length === 0).map((d) => d.id);

  return (
    <>
      <SegnaDebriefingLetti ids={daSegnare} />

      <Intestazione titolo="Debriefing" sottotitolo="Com'è andata, raccontato da chi c'era" />

      {debriefing.length === 0 ? (
        <Vuoto
          testo={
            scrive
              ? 'Ancora nessun debriefing. Si scrive dalla scheda dell’attività, quando è finita.'
              : 'Ancora nessun debriefing pubblicato.'
          }
        />
      ) : (
        <div className="space-y-6">
          {debriefing.map((d) => {
            const nuovo = d.pubblicato && d.letture.length === 0;
            // lo corregge chi l'ha scritto — è il suo racconto — e chi porta la
            // squadra in campo, che è chi lo scriverebbe comunque
            const correggo = d.autoreId === me.id || scrive;
            return (
              <article key={d.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
                      {d.evento.tipo?.nome ?? 'Attività'}
                    </p>
                    <h2 className="mt-1 flex items-center gap-2 font-medium">
                      {/* il pallino sta attaccato al titolo, come sulle attività */}
                      {nuovo && (
                        <span
                          title="Non l’hai ancora letto"
                          className="h-2 w-2 shrink-0 rounded-full bg-nvg"
                        />
                      )}
                      <Link href={`/calendario/${d.evento.id}`} className="hover:text-nvg">
                        {d.titolo ?? d.evento.titolo}
                      </Link>
                    </h2>
                    <p className="num mt-0.5 text-[11px] text-muted">
                      {fmtDate(d.evento.inizio)}
                      {d.autore && ` · ${nomeCompleto(d.autore)}`}
                    </p>
                  </div>
                  <span className="flex flex-wrap items-center gap-2">
                    {nuovo && <Badge tono="ok">nuovo</Badge>}
                    {!d.pubblicato && <Badge tono="warn">bozza</Badge>}
                    {correggo && (
                      <BottoneModale
                        etichetta="Modifica"
                        icona="modifica"
                        titolo="Debriefing"
                        className="btn-ghost btn-sm"
                        larga
                      >
                        <FormDebriefing
                          eventId={d.evento.id}
                          debriefing={{
                            titolo: d.titolo,
                            testo: d.testo,
                            pubblicato: d.pubblicato,
                            aggiornatoIl: d.aggiornatoIl,
                            autore: d.autore,
                          }}
                        />
                      </BottoneModale>
                    )}
                  </span>
                </div>

                <div className="mt-3">
                  <Markdown testo={d.testo} />
                </div>

                {/* Si commenta qui, dove si legge: il racconto è in pagina, e
                    mandare altrove chi vuole dire la sua vuol dire che non la
                    dice. La conversazione resta quella dell'attività. */}
                <div className="mt-4">
                  <Social
                    eventId={d.evento.id}
                    commenti={d.evento.commenti as Commento[]}
                    miPiace={d.evento.miPiace.map((m) => ({
                      nome: comeChiamare(m.utente, { incarico: false, diSquadra: true }).nome,
                    }))}
                    mioMiPiace={d.evento.miPiace.some((m) => m.userId === me.id)}
                    ioSono={me.id}
                    chiSono={chiSono}
                    puoModerare={isAdmin(me.roles) || puoModerareChat(me.roles)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
