import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { etichettaEvento, isAdmin, tonoEvento } from '@/lib/domain';
import { fmtDate, fmtEuro, umanizza } from '@/lib/format';
import { Badge, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioniContatto } from '@/components/AzioniContatto';
import { FormCampo } from '@/components/FormCampo';
import { CampiSquadra } from '@/components/CampiSquadra';
import { Invia } from '@/components/Bottone';
import { Icona } from '@/components/Icona';
import { salvaSquadra } from '@/actions/squadre';
import { salvaCampo } from '@/actions/campi';
import { BadgeFigt, BadgeGiovanile, StellaSquadra } from '@/components/BadgeSquadra';

/**
 * Il profilo di una squadra esterna: chi sono, i campi che gestiscono — da qui
 * se ne aggiungono quanti se ne vuole — e cosa si è fatto insieme, sui loro
 * campi o con loro ospiti alle nostre attività.
 */
export default async function SquadraPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermesso(isAdmin);
  const { id } = await params;

  const squadra = await prisma.squadraEsterna.findUnique({
    where: { id },
    include: {
      contatti: { orderBy: { ordine: 'asc' } },
      campi: {
        orderBy: [{ attivo: 'desc' }, { nome: 'asc' }],
        include: { _count: { select: { events: true } } },
      },
      inviti: {
        include: {
          event: { select: { id: true, titolo: true, inizio: true, status: true } },
        },
      },
    },
  });
  if (!squadra) notFound();

  const [sulCampo, squadre] = await Promise.all([
    // le attività fatte sui loro campi: le bozze non contano, non sono mai esistite
    prisma.event.findMany({
      where: { field: { squadraId: id }, status: { not: 'CREATA' } },
      orderBy: { inizio: 'desc' },
      select: {
        id: true,
        titolo: true,
        inizio: true,
        status: true,
        field: { select: { nome: true } },
        _count: { select: { rsvps: { where: { status: 'PRESENTE' } } } },
      },
    }),
    // per la tendina del modulo: le attive, più questa anche se disattivata
    prisma.squadraEsterna.findMany({
      where: { OR: [{ stato: { not: 'DISATTIVATA' } }, { id }] },
      orderBy: [{ stato: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, stato: true },
    }),
  ]);

  const ora = new Date();
  const svolte = sulCampo.filter((e) => e.status !== 'ANNULLATA' && e.inizio < ora);
  const presenze = svolte.reduce((t, e) => t + e._count.rsvps, 0);
  const ultima = svolte[0];
  const prossima = sulCampo
    .filter((e) => e.status === 'RILASCIATA' && e.inizio >= ora)
    .at(-1);

  const inviti = squadra.inviti.filter((i) => i.event.status !== 'CREATA');
  const risposte = inviti.filter((i) => i.operatori !== null);
  const portati = risposte.reduce((t, i) => t + (i.operatori ?? 0), 0);

  // un'unica fila, dalla più recente: sui loro campi e con loro ospiti
  const attivita = [
    ...sulCampo.map((e) => ({
      id: e.id,
      titolo: e.titolo,
      inizio: e.inizio,
      status: e.status,
      come: `sul campo ${e.field?.nome ?? ''}`.trim(),
    })),
    ...inviti.map((i) => ({
      id: i.event.id,
      titolo: i.event.titolo,
      inizio: i.event.inizio,
      status: i.event.status,
      come:
        i.operatori === null
          ? 'ospiti · non hanno ancora risposto'
          : i.operatori === 0
            ? 'ospiti · non sono venuti'
            : `ospiti · in ${i.operatori}`,
    })),
  ]
    .sort((a, b) => b.inizio.getTime() - a.inizio.getTime())
    .slice(0, 20);

  // prima le cariche, nell'ordine di sempre; poi gli altri come sono stati scritti
  const CARICHE = ['Presidente', 'Vicepresidente', 'Segretario'];
  const peso = (ruolo: string) => {
    const i = CARICHE.indexOf(ruolo);
    return i < 0 ? CARICHE.length : i;
  };
  const contatti = [...squadra.contatti].sort(
    (a, b) => peso(a.ruolo) - peso(b.ruolo) || a.ordine - b.ordine,
  );

  const localita = [squadra.citta, squadra.provincia].filter(Boolean).join(' · ');

  return (
    <>
      <Link href="/admin/squadre" className="mb-4 inline-block text-xs text-muted hover:text-nvg">
        ← Squadre esterne
      </Link>

      <Intestazione
        titolo={squadra.nome}
        sottotitolo={localita || 'Squadra esterna'}
        etichette={
          <>
            {squadra.stato === 'PREFERITA' && <Badge tono="warn">★ Preferita</Badge>}
            {squadra.stato === 'DISATTIVATA' && <Badge tono="neutro">Disattivata</Badge>}
            {squadra.figtAggiornataIl && <BadgeFigt il={squadra.figtAggiornataIl} />}
            {squadra.disciplina && <Badge tono="neutro">{squadra.disciplina}</Badge>}
            {squadra.settoreGiovanile && <BadgeGiovanile />}
          </>
        }
        azioni={
          <>
          <StellaSquadra id={squadra.id} stato={squadra.stato} />
          <BottoneModale
            etichetta="Modifica"
            icona="modifica"
            titolo={`Modifica "${squadra.nome}"`}
            className="btn-ghost"
            larga
            compatto
          >
            <FormAzione azione={salvaSquadra}>
              <input type="hidden" name="id" value={squadra.id} />
              <CampiSquadra squadra={squadra} />
              <Invia icona="salva">Salva</Invia>
            </FormAzione>
          </BottoneModale>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Campi"
          valore={squadra.campi.filter((c) => c.attivo).length}
          dettaglio={
            squadra.campi.some((c) => !c.attivo)
              ? `più ${squadra.campi.filter((c) => !c.attivo).length} archiviati`
              : 'che gestiscono'
          }
        />
        <Statistica
          etichetta="Giocate da loro"
          valore={svolte.length}
          dettaglio={
            prossima
              ? `prossima il ${fmtDate(prossima.inizio)}`
              : ultima
                ? `ultima il ${fmtDate(ultima.inizio)}`
                : 'sui loro campi'
          }
          tono={svolte.length > 0 ? 'ok' : 'neutro'}
        />
        <Statistica
          etichetta="Nostre presenze"
          valore={presenze}
          dettaglio="sui loro campi"
          tono={presenze > 0 ? 'ok' : 'neutro'}
        />
        <Statistica
          etichetta="Inviti come ospiti"
          valore={inviti.length}
          dettaglio={
            inviti.length === 0
              ? 'mai invitati'
              : `${risposte.length} risposte · ${portati} operatori`
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-6">
          <section>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="titolo-sezione flex-1">Campi · {squadra.campi.length}</h2>
              <BottoneModale
                etichetta="Aggiungi campo"
                icona="aggiungi"
                titolo={`Nuovo campo di ${squadra.nome}`}
                className="btn-primary btn-sm"
                larga
              >
                <FormAzione azione={salvaCampo}>
                  <FormCampo squadre={squadre} squadraPredefinita={squadra.id} />
                  <Invia icona="aggiungi">Aggiungi campo</Invia>
                </FormAzione>
              </BottoneModale>
            </div>
            {squadra.campi.length === 0 ? (
              <Vuoto testo="Nessun campo ancora. Aggiungi quelli che gestiscono: anche più d’uno." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {squadra.campi.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/campi/${c.id}`}
                    className={`card block transition-colors hover:border-nvgdim ${
                      c.attivo ? '' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
                          {umanizza(c.tipo)}
                        </p>
                        <h3 className="mt-1 break-words font-medium">{c.nome}</h3>
                        <p className="text-xs text-muted">
                          {[c.citta, c.provincia].filter(Boolean).join(' · ') ||
                            'Località non indicata'}
                        </p>
                      </div>
                      {!c.attivo && <Badge tono="neutro">Archiviato</Badge>}
                    </div>
                    <p className="num mt-3 border-t border-line pt-3 text-xs text-muted">
                      {fmtEuro(c.costo ? Number(c.costo) : null)} · {c._count.events} attività
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="titolo-sezione mb-3">Attività insieme</h2>
            {attivita.length === 0 ? (
              <Vuoto testo="Nessuna attività sui loro campi, né con loro ospiti." />
            ) : (
              <div className="card divide-y divide-line p-0">
                {attivita.map((a) => (
                  <Link
                    key={`${a.id}-${a.come}`}
                    href={`/calendario/${a.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface2"
                  >
                    <span className="num w-20 shrink-0 text-xs text-muted">
                      {fmtDate(a.inizio)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium">{a.titolo}</span>
                      <span className="block text-xs text-muted">{a.come}</span>
                    </span>
                    {a.status !== 'RILASCIATA' && (
                      <Badge tono={tonoEvento[a.status]}>{etichettaEvento[a.status]}</Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="card">
            <p className="titolo-sezione mb-3">Contatti</p>
            {contatti.length === 0 ? (
              <p className="text-sm text-muted">
                Nessuna persona segnata. Da «Modifica» aggiungi presidente, vicepresidente,
                segretario o chi vuoi.
              </p>
            ) : (
              <ul className="space-y-3">
                {contatti.map((c) => (
                  <li key={c.id} className="text-sm">
                    <p className="text-xs text-muted">{c.ruolo}</p>
                    <p className="font-medium">{c.nome}</p>
                    {(c.telefono || c.email) && (
                      <p className="num break-all text-xs text-muted">
                        {[c.telefono, c.email].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {(c.telefono || c.email) && (
                      <div className="mt-1.5">
                        <AzioniContatto telefono={c.telefono} email={c.email} compatto />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <p className="titolo-sezione mb-3">La società</p>
            <dl className="space-y-2 text-sm">
              {(squadra.indirizzo || localita) && (
                <div>
                  <dt className="text-xs text-muted">Sede</dt>
                  <dd>
                    {squadra.indirizzo && <span className="block">{squadra.indirizzo}</span>}
                    {[squadra.cap, squadra.citta, squadra.provincia && `(${squadra.provincia})`]
                      .filter(Boolean)
                      .join(' ')}
                  </dd>
                </div>
              )}
              {squadra.telefono && (
                <div>
                  <dt className="text-xs text-muted">Telefono</dt>
                  <dd className="num">{squadra.telefono}</dd>
                </div>
              )}
              {squadra.email && (
                <div>
                  <dt className="text-xs text-muted">Email</dt>
                  <dd className="break-all">{squadra.email}</dd>
                </div>
              )}
              {squadra.sito && (
                <div>
                  <dt className="text-xs text-muted">Sito</dt>
                  <dd>
                    <a
                      href={
                        squadra.sito.startsWith('http') ? squadra.sito : `https://${squadra.sito}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 break-all text-nvg hover:underline"
                    >
                      <Icona nome="apri" size={13} /> {squadra.sito}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {(squadra.telefono || squadra.email) && (
              <div className="mt-3 border-t border-line pt-3">
                <AzioniContatto telefono={squadra.telefono} email={squadra.email} compatto />
              </div>
            )}
          </div>
          {squadra.note && (
            <div className="card">
              <p className="titolo-sezione mb-2">Note</p>
              <p className="whitespace-pre-wrap text-sm text-ink/90">{squadra.note}</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
