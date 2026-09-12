import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { eventiPerLista, filtroVisibilita } from '@/lib/query';
import { etichettaEvento, isAdmin, puoSchierare, tonoEvento } from '@/lib/domain';
import { fmtDateLong, fmtDateTime, umanizza } from '@/lib/format';
import { Badge, Intestazione, Elenco, Vuoto } from '@/components/ui';
import { CardEvento, CardStorico, ContoAdesioni, RigaStorico } from '@/components/CardEvento';
import { Naviga } from '@/components/Naviga';
import { AdesioneEvento } from '@/components/AdesioneEvento';
import { FormAzione, Fisarmonica } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { FormEvento } from '@/components/FormEvento';
import { AzioniEvento } from '@/components/AzioniEvento';
import { CalendarioMese, type GiornoEvento } from '@/components/CalendarioMese';
import { InProgramma } from '@/components/InProgramma';
import { salvaEvento } from '@/actions/eventi';
import { listinoAttivo } from '@/lib/quote';
import { stagioneAttiva, stagioniAperte } from '@/lib/stagioni';

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const me = await requireUser();
  const { vista } = await searchParams;
  // Si apre su quello che c'è da fare, non sulla griglia del mese: chi entra
  // nel calendario vuole sapere cosa viene, e il mese è la vista che si sceglie
  // quando si cerca una data precisa.
  const attuale = vista === 'passati' ? 'passati' : vista === 'mese' ? 'mese' : 'lista';
  const admin = isAdmin(me.roles);

  // il listino serve al modulo di creazione: le quote si compongono da lì
  const [campi, tipologie, listino, stagione, stagioni, casse] = admin
    ? await Promise.all([
        prisma.field.findMany({ where: { attivo: true }, orderBy: { nome: 'asc' } }),
        prisma.tipoAttivita.findMany({
          where: { attivo: true },
          orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
          select: { id: true, nome: true },
        }),
        listinoAttivo(),
        stagioneAttiva(),
        stagioniAperte(),
        // le casse a cui un'attività nuova può chiedere una quota
        prisma.cassa.findMany({
          where: { attiva: true },
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true },
        }),
      ])
    : [[], [], [], null, [], []];

  // legenda dei colori: sempre visibile, anche a chi non gestisce il calendario
  const legenda = await prisma.tipoAttivita.findMany({
    where: { attivo: true },
    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
    select: { nome: true, colore: true },
  });

  // il mese mostra tutto, le liste filtrano su futuro/passato
  const perMese =
    attuale === 'mese'
      ? await prisma.event.findMany({
          where: filtroVisibilita(me.stato, admin, me.id),
          orderBy: { inizio: 'asc' },
          select: {
            id: true,
            titolo: true,
            tipo: { select: { nome: true, colore: true } },
            status: true,
            visibilita: true,
            inizio: true,
            fine: true,
            rsvps: { where: { userId: me.id }, select: { status: true } },
          },
        })
      : [];

  const eventiMese: GiornoEvento[] = perMese.map((e) => ({
    id: e.id,
    titolo: e.titolo,
    tipo: e.tipo?.nome ?? 'Senza tipologia',
    colore: e.tipo?.colore ?? 'grigio',
    status: e.status,
    visibilita: e.visibilita,
    inizio: e.inizio.toISOString(),
    fine: e.fine ? e.fine.toISOString() : null,
    mioStato: e.rsvps[0]?.status ?? null,
  }));

  // In programma ci sono anche le attività cominciate e non ancora chiuse: in
  // corso, o finite e da concludere. Stanno in cima, fra le correnti, finché
  // qualcuno non fa l'appello — e lo storico le lascia fuori, per non
  // mostrarle due volte.
  const tutte =
    attuale === 'mese'
      ? []
      : await eventiPerLista({
          stato: me.stato,
          userId: me.id,
          vedeBozze: admin,
          dove:
            attuale === 'passati'
              ? { inizio: { lt: new Date() } }
              : {
                  OR: [
                    { inizio: { gte: new Date() } },
                    { status: 'RILASCIATA', inizio: { lt: new Date() } },
                  ],
                },
          ordine: attuale === 'passati' ? 'desc' : 'asc',
        });

  // Una giornata finita e non chiusa la ritrova chi la può chiudere, admin e
  // team leader; agli altri non chiede niente, e per loro è già storico. Quelle
  // in corso invece le vedono tutti in cima.
  const chiude = admin || puoSchierare(me.roles);
  const corrente = (e: (typeof tutte)[number]) =>
    e.fase === 'in corso' || (e.fase === 'terminata' && chiude);
  const adesso = new Date();
  const lista = tutte.filter((e) =>
    attuale === 'passati' ? !corrente(e) : e.inizio >= adesso || corrente(e),
  );

  // La colonna laterale ha senso solo nella vista mese, dove la griglia non
  // dice cosa viene adesso. In programma sarebbe la copia dell'elenco che si
  // sta già guardando.
  const prossimi =
    attuale === 'mese'
      ? await eventiPerLista({
          stato: me.stato,
          userId: me.id,
          vedeBozze: admin,
          dove: { inizio: { gte: new Date() }, status: { not: 'ANNULLATA' } },
          limite: 6,
        })
      : [];

  const VISTE = [
    { chiave: 'lista', href: '/calendario', testo: 'In programma' },
    { chiave: 'mese', href: '/calendario?vista=mese', testo: 'Mese' },
    { chiave: 'passati', href: '/calendario?vista=passati', testo: 'Storico' },
  ];

  // Le bozze in programma: contate a parte e non dalla lista di turno, che
  // cambia con la vista — l'avviso deve dire la stessa cosa ovunque, perché
  // un'attività in bozza è invisibile alla squadra e va rilasciata.
  const bozze = admin
    ? await prisma.event.count({ where: { status: 'CREATA', inizio: { gte: new Date() } } })
    : 0;

  return (
    <>
      <Intestazione
        titolo="Calendario"
        sottotitolo={
          attuale === 'mese'
            ? admin
              ? 'Clicca un giorno per vedere le attività o aggiungerne una'
              : 'Clicca un giorno per vedere le attività'
            : attuale === 'passati'
              ? 'Attività già svolte'
              : 'Attività in programma: rispondi per far sapere se ci sei'
        }
        azioni={
          <div className="flex rounded-md border border-line p-0.5">
            {VISTE.map((v) => (
              <Link
                key={v.chiave}
                href={v.href}
                className={`rounded px-3 py-1.5 text-xs ${
                  attuale === v.chiave ? 'bg-nvg/15 text-nvg' : 'text-muted'
                }`}
              >
                {v.testo}
              </Link>
            ))}
          </div>
        }
      />

      {admin && bozze > 0 && (
        <div className="mb-4 rounded-md border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm text-warn">
          {bozze === 1 ? "C'è 1 attività in bozza" : `Ci sono ${bozze} attività in bozza`}: finché
          non le rilasci nessuno le vede.
        </div>
      )}

      <div
        className={
          attuale === 'mese' ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]' : 'min-w-0'
        }
      >
        <div className="min-w-0">
          {attuale === 'mese' ? (
            <CalendarioMese
              eventi={eventiMese}
              legenda={legenda}
              nuovoEvento={
                admin ? (
                  <FormAzione azione={salvaEvento}>
                    <FormEvento
                      campi={campi}
                      tipologie={tipologie}
                      listino={listino}
                      stagioneId={stagione?.id ?? null}
                    stagioni={stagioni}
                      casse={casse}
                      compatto
                    />
                    <Invia icona="aggiungi">Crea attività</Invia>
                    <p className="text-xs text-muted">
                      Nasce in bozza: sceglierai dopo se rilasciarla alla squadra o a tutti.
                    </p>
                  </FormAzione>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* nello storico non si crea niente: quello che è passato è passato */}
              {admin && attuale !== 'passati' && (
                <Fisarmonica titolo="Nuova attività">
                  <FormAzione azione={salvaEvento}>
                    <FormEvento
                      campi={campi}
                      tipologie={tipologie}
                      listino={listino}
                      stagioneId={stagione?.id ?? null}
                    stagioni={stagioni}
                      casse={casse}
                    />
                    <Invia icona="aggiungi">Crea attività</Invia>
                    <p className="text-xs text-muted">
                      Nasce in bozza: sceglierai dopo se rilasciarla alla squadra o a tutti.
                    </p>
                  </FormAzione>
                </Fisarmonica>
              )}

              {lista.length === 0 ? (
                <Vuoto
                  testo={
                    attuale === 'passati'
                      ? 'Nessuna attività nello storico.'
                      : 'Nessuna attività in programma.'
                  }
                />
              ) : attuale === 'lista' ? (
                /* Quello che deve ancora venire si guarda a card: c'è la quota
                   attaccata al pulsante con cui si risponde, e la tabella
                   quella riga non la può contenere. Lo storico invece resta
                   una tabella, perché lì si cercano i numeri.
                   Le card le disegna il server come sempre; la ricerca e la
                   divisione per anno le fa il browser, così filtrare non
                   ricarica la pagina a ogni lettera. */
                <InProgramma
                  annoCorrente={new Date().getFullYear()}
                  voci={lista.map((e) => ({
                    id: e.id,
                    anno: e.inizio.getFullYear(),
                    // fra le correnti solo quelle che questa persona deve vedere lì
                    fase: corrente(e) ? e.fase : null,
                    // dove si cerca: titolo, tipologia, campo e data, anche per
                    // esteso — così «ottobre» trova quelle di ottobre. Lo stato
                    // solo se non è rilasciata: l'admin cerca «bozza»
                    cerca: [
                      e.titolo,
                      e.tipo,
                      e.campo,
                      e.indirizzo,
                      fmtDateTime(e.inizio),
                      fmtDateLong(e.inizio),
                      e.status !== 'RILASCIATA' ? etichettaEvento[e.status] : null,
                    ]
                      .filter(Boolean)
                      .join(' '),
                    card: (
                      <CardEvento
                        e={e}
                        azioni={
                          admin ? (
                            <AzioniEvento
                              id={e.id}
                              titolo={e.titolo}
                              status={e.status}
                              visibilita={e.visibilita}
                              compatto
                            />
                          ) : undefined
                        }
                      />
                    ),
                  }))}
                />
              ) : (
                /* Storico: non si risponde e non si schiera più nessuno. Quello
                   che serve è chi c'era davvero, quanto è costata e com'è
                   andata a finire; i pulsanti di partecipazione e le azioni di
                   gestione, in fondo a una riga vecchia, si premono soltanto
                   per sbaglio. */
                <Elenco
                  cards={lista.map((e) => (
                    <CardStorico key={e.id} e={e} />
                  ))}
                  tabella={
                    <table className="tabella">
                      <thead>
                        <tr>
                          <th>Attività</th>
                          <th>Quando</th>
                          <th>Campo</th>
                          <th>Presenze</th>
                          <th>Quota</th>
                          <th>Tu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map((e) => (
                          <RigaStorico key={e.id} e={e} />
                        ))}
                      </tbody>
                    </table>
                  }
                />
              )}
            </>
          )}
        </div>

        {/* ---------------------------------------------- prossimi eventi (desktop) */}
        {attuale === 'mese' && (
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <h2 className="titolo-sezione mb-3">Prossime attività</h2>
            {prossimi.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
                Nessuna attività in programma.
              </p>
            ) : (
              <div className="space-y-2">
                {prossimi.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg border border-line bg-surface px-3 py-2.5 transition-colors hover:border-nvgdim"
                  >
                  <Link href={`/calendario/${e.id}`} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                        {/* mai aperta: il pallino sta attaccato al titolo, che è
                            quello che si legge per decidere se entrare */}
                        {e.nuovo && (
                          <span
                            title="Non l’hai ancora aperta"
                            className="h-2 w-2 shrink-0 rounded-full bg-nvg"
                          />
                        )}
                        <span className="truncate">{e.titolo}</span>
                      </p>
                      {e.status !== 'RILASCIATA' && (
                        <Badge tono={tonoEvento[e.status] ?? 'neutro'}>
                          {etichettaEvento[e.status]}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted num">{fmtDateTime(e.inizio)}</p>
                    <p className="text-[11px] text-muted">
                      {e.tipo}
                      {e.campo ? ` · ${e.campo}` : ''}
                    </p>
                    <div className="mt-1.5">
                      <ContoAdesioni e={e} size={13} />
                    </div>
                  </Link>

                  {((e.lat != null && e.lng != null) || e.indirizzo) && (
                    <div className="mt-2 border-t border-line pt-2">
                      <Naviga lat={e.lat} lng={e.lng} indirizzo={e.indirizzo} compatto />
                    </div>
                  )}

                  {e.adesioniAperte && (
                    <div className="mt-2 border-t border-line pt-2">
                      <AdesioneEvento
                        eventId={e.id}
                        scelta={e.mioStato}
                        nota={e.miaNota}
                        pieno={!!e.maxPartecipanti && e.presenti >= e.maxPartecipanti}
                        compatta
                      />
                    </div>
                  )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
        )}
      </div>
    </>
  );
}
