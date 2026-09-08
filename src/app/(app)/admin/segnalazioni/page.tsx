import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoModerareChat } from '@/lib/domain';
import { comeChiamare, fmtDateTime, nomeCompleto } from '@/lib/format';
import { stradaAnnuncio } from '@/lib/mercatino';
import { Badge, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { AzioneBottone } from '@/components/AzioneBottone';
import { gestisciSegnalazione } from '@/actions/segnalazioni';

export const dynamic = 'force-dynamic';

/**
 * Le segnalazioni, per chi modera.
 *
 * Chi apre questa pagina deve poter decidere leggendo, senza andare a cercare
 * il messaggio da qualche altra parte: c'è il testo com'era, chi l'aveva
 * scritto, chi ha segnalato e perché. Il link al posto dov'è nato serve a
 * capire il contesto — una battuta fra due che si conoscono e la stessa frase
 * detta a freddo non sono la stessa cosa.
 */

const TONO: Record<string, 'warn' | 'ok' | 'neutro'> = {
  APERTA: 'warn',
  ACCOLTA: 'ok',
  RESPINTA: 'neutro',
};

const ETICHETTA: Record<string, string> = {
  APERTA: 'da guardare',
  ACCOLTA: 'messaggio tolto',
  RESPINTA: 'lasciata cadere',
};

export default async function SegnalazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  await requirePermesso(puoModerareChat);
  const { stato = 'APERTA' } = await searchParams;

  const dove: Prisma.SegnalazioneWhereInput =
    stato === 'tutte' ? {} : { stato: stato as never };

  const segnalazioni = await prisma.segnalazione.findMany({
    where: dove,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      segnalatore: { select: { nome: true, cognome: true, callsign: true } },
      gestitaDa: { select: { nome: true, cognome: true, callsign: true } },
      commentoAnnuncio: {
        select: { id: true, annuncio: { select: { id: true, titolo: true, ufficiale: true } } },
      },
      commentoEvento: {
        select: { id: true, evento: { select: { id: true, titolo: true } } },
      },
    },
  });

  const aperte = await prisma.segnalazione.count({ where: { stato: 'APERTA' } });

  return (
    <>
      <Intestazione
        titolo="Segnalazioni"
        sottotitolo="I messaggi che qualcuno ha trovato fuori posto"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Statistica
          etichetta="Da guardare"
          valore={aperte}
          tono={aperte > 0 ? 'warn' : 'ok'}
          dettaglio={aperte === 0 ? 'niente in sospeso' : undefined}
        />
        <Statistica etichetta="In elenco" valore={segnalazioni.length} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {[
          { chiave: 'APERTA', etichetta: 'Da guardare' },
          { chiave: 'ACCOLTA', etichetta: 'Accolte' },
          { chiave: 'RESPINTA', etichetta: 'Respinte' },
          { chiave: 'tutte', etichetta: 'Tutte' },
        ].map((f) => (
          <Link
            key={f.chiave}
            href={`/admin/segnalazioni?stato=${f.chiave}`}
            className={`rounded border px-2.5 py-1 text-xs transition-colors ${
              stato === f.chiave
                ? 'border-nvgdim bg-nvg/10 text-nvg'
                : 'border-line text-muted hover:border-nvgdim hover:text-ink'
            }`}
          >
            {f.etichetta}
          </Link>
        ))}
      </div>

      {segnalazioni.length === 0 ? (
        <Vuoto testo="Niente da guardare. È la situazione normale." />
      ) : (
        <div className="space-y-3">
          {segnalazioni.map((s) => {
            const dove = s.commentoAnnuncio
              ? {
                  testo: s.commentoAnnuncio.annuncio.titolo,
                  strada: stradaAnnuncio(s.commentoAnnuncio.annuncio),
                }
              : s.commentoEvento
                ? {
                    testo: s.commentoEvento.evento.titolo,
                    strada: `/calendario/${s.commentoEvento.evento.id}`,
                  }
                : null;

            return (
              <div key={s.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-muted">
                      Scritto da <strong className="text-ink">{s.autore}</strong>
                      {dove && (
                        <>
                          {' · '}
                          <Link href={dove.strada} className="hover:text-nvg">
                            {dove.testo}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <Badge tono={TONO[s.stato]}>{ETICHETTA[s.stato]}</Badge>
                </div>

                {/* il testo com'era: se il messaggio è stato tolto, è tutto
                    quello che resta di ciò su cui si è deciso */}
                <blockquote className="mt-2 whitespace-pre-wrap break-words rounded-lg border-l-2 border-l-warn bg-surface2 px-3 py-2 text-sm">
                  {s.testo}
                </blockquote>

                {s.motivo && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted">Segnalato perché:</span> {s.motivo}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <span className="num text-[11px] text-muted">
                    da {comeChiamare(s.segnalatore, { incarico: true, diSquadra: true }).nome} ·{' '}
                    {fmtDateTime(s.createdAt)}
                  </span>

                  {s.stato !== 'APERTA' && s.gestitaDa && (
                    <span className="num text-[11px] text-muted">
                      · chiusa da {nomeCompleto(s.gestitaDa)}
                      {s.gestitaIl && ` il ${fmtDateTime(s.gestitaIl)}`}
                    </span>
                  )}

                  {s.stato === 'APERTA' && (
                    <span className="ml-auto flex flex-wrap gap-2">
                      <AzioneBottone
                        azione={gestisciSegnalazione}
                        valori={{ id: s.id, esito: 'RESPINTA' }}
                        className="btn-ghost btn-sm"
                      >
                        Va bene così
                      </AzioneBottone>
                      <AzioneBottone
                        azione={gestisciSegnalazione}
                        valori={{ id: s.id, esito: 'ACCOLTA' }}
                        icona="elimina"
                        conferma="Togliere il messaggio? Resta la segnalazione con il testo."
                        className="btn-danger btn-sm"
                      >
                        Togli il messaggio
                      </AzioneBottone>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
