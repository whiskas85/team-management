import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  etichettaRuolo,
  etichettaStato,
  inSquadra,
  puoVedereOperatori,
  tonoRuolo,
  tonoStato,
} from '@/lib/domain';
import { fmtDate, iniziali, nomeCompleto, umanizza } from '@/lib/format';
import { Avatar, Badge, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { AzioniContatto } from '@/components/AzioniContatto';

/**
 * Scheda di un compagno di squadra. Mostra solo ciò che serve a lavorare
 * insieme: chi è, come contattarlo e quanto è presente. I dati personali
 * (anagrafica, residenza, dati sanitari, certificati, pagamenti) restano
 * riservati al diretto interessato e a chi ha un incarico che li richiede.
 */
export default async function SchedaCompagnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;

  if (id === me.id) redirect('/profilo');
  // chi ha un incarico vede la scheda completa, non questa
  if (puoVedereOperatori(me.roles)) redirect(`/admin/operatori/${id}`);
  if (!inSquadra(me.stato)) redirect('/dashboard?errore=permessi');

  const utente = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      cognome: true,
      callsign: true,
      email: true,
      telefono: true,
      // la faccia e il motto: è la scheda di un compagno, non un tabulato
      fotoPath: true,
      frase: true,
      roles: true,
      stato: true,
      createdAt: true,
      rsvps: {
        where: { event: { status: { not: 'CREATA' } } },
        select: {
          status: true,
          presente: true,
          event: { select: { titolo: true, inizio: true, tipo: { select: { nome: true } } } },
        },
        orderBy: { respondedAt: 'desc' },
      },
    },
  });

  if (!utente || !inSquadra(utente.stato)) notFound();

  const svolti = utente.rsvps.filter((r) => new Date(r.event.inizio) < new Date());
  const presenze = svolti.filter((r) => r.presente === true).length;
  const adesioni = utente.rsvps.filter((r) => r.status === 'PRESENTE').length;

  return (
    <>
      <Link href="/calendario" className="mb-4 inline-block text-xs text-muted hover:text-nvg">
        ← Calendario
      </Link>

      <Intestazione titolo={nomeCompleto(utente)} sottotitolo="Scheda operatore" />

      <div className="card mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar
            iniziali={iniziali(utente.nome, utente.cognome)}
            size="lg"
            fotoDi={utente.fotoPath ? utente.id : null}
          />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {utente.nome} {utente.cognome}
            </h2>
            {utente.callsign && <p className="text-sm text-nvg">&quot;{utente.callsign}&quot;</p>}
            {utente.frase && (
              <p className="mt-2 border-l-2 border-nvg/40 pl-2 text-sm italic text-ink/80">
                {utente.frase}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tono={tonoStato[utente.stato]}>{etichettaStato[utente.stato]}</Badge>
              {utente.roles.map((r) => (
                <Badge key={r} tono={tonoRuolo[r]}>
                  {etichettaRuolo[r]}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted num">
              In squadra dal {fmtDate(utente.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="titolo-sezione mb-3">Contatti</p>
          <AzioniContatto
            telefono={utente.telefono}
            email={utente.email}
            nome={utente.nome}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Statistica etichetta="Adesioni" valore={adesioni} dettaglio="attività a cui ha detto sì" />
        <Statistica
          etichetta="Presenze confermate"
          valore={presenze}
          dettaglio={`su ${svolti.length} attività svolte`}
          tono="ok"
        />
      </div>

      <h2 className="titolo-sezione mb-3">Ultime attività</h2>
      {utente.rsvps.length === 0 ? (
        <Vuoto testo="Non ha ancora risposto a nessuna attività." />
      ) : (
        <div className="space-y-2">
          {utente.rsvps.slice(0, 10).map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{r.event.titolo}</p>
                <p className="text-xs text-muted num">
                  {r.event.tipo?.nome ?? 'Senza tipologia'} · {fmtDate(r.event.inizio)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {r.presente !== null && (
                  <Badge tono={r.presente ? 'ok' : 'neutro'}>
                    {r.presente ? 'presente' : 'assente'}
                  </Badge>
                )}
                <Badge
                  tono={r.status === 'PRESENTE' ? 'ok' : r.status === 'FORSE' ? 'warn' : 'danger'}
                >
                  {umanizza(r.status)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
