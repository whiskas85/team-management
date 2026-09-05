import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { StatoOperatore } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elencoOperatori } from '@/lib/query';
import {
  etichettaEvento,
  etichettaRisposta,
  etichettaVisibilita,
  inRegola,
  inSquadra,
  isAdmin,
  puoGestireEventi,
  puoGestirePagamenti,
  puoSchierare,
  puoVedereNuovi,
  tonoAssegnazione,
  tonoEvento,
  tonoRsvp,
  vedeAttivitaSquadra,
} from '@/lib/domain';
import { comeChiamare, fmtDate, fmtDateTime, fmtEuro, fmtTime, umanizza } from '@/lib/format';
import { listinoAttivo, quotaPer } from '@/lib/quote';
import { Avatar, Badge, Campo, Dato, Intestazione, Vuoto } from '@/components/ui';
import { Conferma, FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { FormEvento } from '@/components/FormEvento';
import { BottoneModale } from '@/components/Modale';
import { AzioniEvento } from '@/components/AzioniEvento';
import { Mappa } from '@/components/Mappa';
import { Naviga } from '@/components/Naviga';
import { AzioneBottone } from '@/components/AzioneBottone';
import { AdesioneEvento } from '@/components/AdesioneEvento';
import {
  registraPresenze,
  rimuoviPartecipante,
  salvaEvento,
  schiera,
} from '@/actions/eventi';
import { chiediRimborso } from '@/actions/pagamenti';
import {
  annullaGiornaliera,
  attivaGiornaliera,
  emettiGiornaliera,
} from '@/actions/assicurazione';
import {
  ETICHETTA_ASSICURAZIONE,
  TONO_ASSICURAZIONE,
  serveGiornaliera,
} from '@/lib/assicurazione';
import { ScegliPartecipanti, type Candidato } from '@/components/ScegliPartecipanti';

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  const evento = await prisma.event.findUnique({
    where: { id },
    include: {
      tipo: true,
      field: { include: { squadra: { select: { nome: true } } } },
      createdBy: { select: { nome: true, cognome: true } },
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              callsign: true,
              stato: true,
              // la riga mostra la faccia e il motto di chi si è segnato
              fotoPath: true,
              frase: true,
              // servono a capire chi è già coperto dalla tessera annuale
              figtCards: { select: { status: true, scadeIl: true } },
            },
          },
        },
        orderBy: { respondedAt: 'asc' },
      },
      giornaliere: true,
      payments: {
        select: {
          id: true,
          tipo: true,
          userId: true,
          importo: true,
          pagato: true,
          status: true,
          rimborso: { select: { id: true } },
        },
      },
    },
  });

  if (!evento) notFound();

  const admin = isAdmin(me.roles);
  if (evento.status === 'CREATA' && !admin) notFound();
  // chi amministra apre tutto: nell'elenco vede gia' ogni attivita', e trovare
  // un 404 aprendo una riga che il calendario gli mostra sarebbe assurdo
  if (evento.visibilita === 'TEAM' && !vedeAttivitaSquadra(me.stato) && !admin) notFound();
  const tl = puoSchierare(me.roles);
  const gestisce = puoGestireEventi(me.roles);

  // chi si è segnato appare col callsign se ce l'ha; l'anagrafica intera resta
  // a chi segue i contatti, e senza callsign un nuovo è "Mario R."
  const vedeNuovi = puoVedereNuovi(me.roles);
  type Chiunque = { nome: string; cognome: string; callsign: string | null; stato: StatoOperatore };
  const chiamato = (u: Chiunque) =>
    comeChiamare(u, { incarico: vedeNuovi, diSquadra: vedeAttivitaSquadra(u.stato) });
  const nomeDi = (u: Chiunque) => chiamato(u).nome;

  const mio = evento.rsvps.find((r) => r.userId === me.id);
  const presenti = evento.rsvps.filter((r) => r.status === 'PRESENTE');
  const forse = evento.rsvps.filter((r) => r.status === 'FORSE');
  const assenti = evento.rsvps.filter((r) => r.status === 'ASSENTE');
  const titolari = presenti.filter((r) => r.assegnazione === 'TITOLARE');
  const riserve = presenti.filter((r) => r.assegnazione === 'RISERVA');
  const pieno = !!evento.maxPartecipanti && presenti.length >= evento.maxPartecipanti;
  const chiuso =
    evento.status !== 'RILASCIATA' ||
    (!!evento.chiusuraIscrizioni && evento.chiusuraIscrizioni < new Date());

  const [campi, tipologie, operatoriGrezzi, listino] = tl
    ? await Promise.all([
        // teniamo anche la voce già collegata, se nel frattempo è stata
        // archiviata: modificando l'attività non deve sparire
        admin
          ? prisma.field.findMany({
              where: { OR: [{ attivo: true }, { id: evento.fieldId ?? '' }] },
              orderBy: { nome: 'asc' },
            })
          : Promise.resolve([]),
        admin
          ? prisma.tipoAttivita.findMany({
              where: { OR: [{ attivo: true }, { id: evento.tipoId ?? '' }] },
              orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
              select: { id: true, nome: true, attivo: true },
            })
          : Promise.resolve([]),
        prisma.user.findMany({
          where: inSquadra(me.stato)
            ? evento.visibilita === 'TEAM'
              ? { stato: { in: ['SQUADRA', 'SOSPESO'] } }
              : { stato: { notIn: ['DISABILITATO', 'RIFIUTATO'] } }
            : { stato: { in: ['SQUADRA', 'SOSPESO'] } },
          orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
          select: {
            id: true,
            nome: true,
            cognome: true,
            callsign: true,
            stato: true,
            certificates: { select: { status: true, scadeIl: true } },
          },
        }),
        // serve solo al modulo di modifica, che è dell'admin
        admin ? listinoAttivo() : Promise.resolve([]),
      ])
    : [[], [], [], []];

  const gia = new Set(evento.rsvps.map((r) => r.userId));

  // per ognuno diciamo subito se è schierabile: il certificato è vincolante
  const candidati: Candidato[] = operatoriGrezzi
    .filter((o) => !gia.has(o.id))
    .map((o) => {
      const serve = inSquadra(o.stato);
      const ok = !serve || inRegola(o.certificates);
      // il team leader schiera anche i nuovi: qui li chiama come li vede in elenco
      const come = chiamato(o);
      return {
        id: o.id,
        etichetta: come.nome,
        iniziali: come.iniziali,
        callsign: o.callsign,
        certificatoOk: ok,
        motivo: ok ? null : 'Certificato medico mancante o scaduto',
      };
    })
    // prima chi è schierabile, poi chi ha il certificato scaduto o mancante:
    // dentro i due gruppi resta l'ordine alfabetico arrivato dal database
    // (Array.sort è stabile, quindi basta confrontare l'idoneità)
    .sort((a, b) => Number(b.certificatoOk) - Number(a.certificatoOk));

  const costo = evento.costo ? Number(evento.costo) : 0;
  // ognuno legge la quota che riguarda lui: la squadra la sua, chi viene da
  // fuori quella degli esterni. Sono due numeri scritti sull'attività, non un
  // automatismo nascosto da qualche altra parte
  const { importo: mioCosto, dettaglio: mioDettaglio } = quotaPer(evento, me.stato);
  const quotaEsterni = evento.costoEsterni === null ? null : Number(evento.costoEsterni);
  // lo stato di pagamento degli altri è un dato riservato a chi amministra
  const vedeQuoteAltrui = tl || puoGestirePagamenti(me.roles);
  // i rimborsi sono movimenti a sé: la quota di un operatore è quella dovuta,
  // altrimenti si finirebbe per chiedere il rimborso di un rimborso
  const quotePerUtente = new Map(
    evento.payments.filter((p) => p.tipo !== 'RIMBORSO').map((p) => [p.userId, p]),
  );
  const miaQuota = quotePerUtente.get(me.id) ?? null;

  // senza certificato in corso di validità non ci si segna e non si gioca
  const mieiCertificati = inSquadra(me.stato)
    ? await prisma.medicalCertificate.findMany({
        where: { userId: me.id },
        select: { status: true, scadeIl: true },
      })
    : [];
  const certificatoOk = !inSquadra(me.stato) || inRegola(mieiCertificati);
  // titolari e riserve hanno senso solo dove la tipologia li prevede
  const schieraQuesta = evento.tipo?.riserve ?? false;

  // una sola lista, raggruppata: con la formazione separa titolari e riserve,
  // altrimenti bastano le tre risposte
  const daAssegnare = presenti.filter((r) => r.assegnazione === 'NON_ASSEGNATO');

  type Riga = (typeof evento.rsvps)[number];
  const diSquadra = (r: Riga) => inSquadra(r.user.stato) || r.user.stato === 'DA_RICONFERMARE';

  // squadra e ospiti restano separati: hanno adempimenti diversi (i nuovi vanno
  // assicurati con la giornaliera) e mescolarli nasconde chi manca di cosa
  const dividi = (
    chiave: string,
    titolo: string,
    colore: string,
    righe: Riga[],
  ) => {
    const squadra = righe.filter(diSquadra);
    const nuovi = righe.filter((r) => !diSquadra(r));
    if (nuovi.length === 0) return [{ chiave, titolo, colore, righe: squadra }];
    if (squadra.length === 0) return [{ chiave: `${chiave}-n`, titolo: `${titolo} · nuovi`, colore, righe: nuovi }];
    return [
      { chiave, titolo: `${titolo} · squadra`, colore, righe: squadra },
      { chiave: `${chiave}-n`, titolo: `${titolo} · nuovi`, colore, righe: nuovi },
    ];
  };

  const gruppi = schieraQuesta
    ? [
        ...dividi('titolari', 'Titolari', 'text-nvg', titolari),
        ...dividi('riserve', 'Riserve', 'text-warn', riserve),
        ...dividi('daassegnare', 'Da assegnare', 'text-muted', daAssegnare),
        ...dividi('forse', 'Forse', 'text-warn', forse),
        ...dividi('assenti', 'Non ci sono', 'text-danger', assenti),
      ]
    : [
        ...dividi('presenti', 'Presenti', 'text-nvg', presenti),
        ...dividi('forse', 'Forse', 'text-warn', forse),
        ...dividi('assenti', 'Non ci sono', 'text-danger', assenti),
      ];

  // copertura assicurativa: chi non ha l'annuale valida nel giorno dell'attività
  const giornaliere = new Map(evento.giornaliere.map((g) => [g.userId, g]));

  return (
    <>
      <Link href="/calendario" className="mb-4 inline-block text-xs text-muted hover:text-nvg">
        ← Calendario
      </Link>

      <Intestazione
        titolo={evento.titolo}
        sottotitolo={`${evento.tipo?.nome ?? 'Senza tipologia'} · ${fmtDateTime(evento.inizio)}`}
        azioni={
          <div className="flex flex-wrap items-center gap-2">
            {/* la propria risposta, in testa: aprendo l'attività la prima cosa
                da sapere è se ci si è già segnati, e la card sta più in basso */}
            {mio ? (
              <Badge tono={tonoRsvp[mio.status]}>{etichettaRisposta[mio.status]}</Badge>
            ) : (
              !chiuso && <Badge tono="warn">Non hai risposto</Badge>
            )}
            {admin && (
              <BottoneModale
                etichetta="Modifica"
                icona="modifica"
                titolo={`Modifica "${evento.titolo}"`}
                className="btn-ghost btn-sm"
                larga
              >
                <FormAzione azione={salvaEvento}>
                  <FormEvento
                    campi={campi}
                    tipologie={tipologie}
                    listino={listino}
                    stagioneId={evento.stagioneId}
                    evento={evento}
                  />
                  <Invia icona="salva">Salva modifiche</Invia>
                </FormAzione>
              </BottoneModale>
            )}
            {/* stato e destinatari raccontano come è messa l'attività a chi la
                gestisce: all'operatore non cambiano niente, e quando non è
                rilasciata glielo dice comunque la fascia qui sotto */}
            {gestisce && (
              <>
                <span
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold ${
                    evento.status === 'RILASCIATA'
                      ? 'border-nvg/50 bg-nvg/15 text-nvg'
                      : evento.status === 'CREATA'
                        ? 'border-warn/50 bg-warn/15 text-warn'
                        : evento.status === 'ANNULLATA'
                          ? 'border-danger/50 bg-danger/15 text-danger'
                          : 'border-line bg-surface2 text-muted'
                  }`}
                >
                  {etichettaEvento[evento.status]}
                </span>
                {evento.visibilita ? (
                  <Badge tono={evento.visibilita === 'TUTTI' ? 'warn' : 'neutro'}>
                    {etichettaVisibilita[evento.visibilita]}
                  </Badge>
                ) : (
                  <Badge tono="neutro">Destinatari da scegliere</Badge>
                )}
              </>
            )}
          </div>
        }
      />

      {evento.status !== 'RILASCIATA' && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 ${
            evento.status === 'CREATA'
              ? 'border-warn/40 bg-warn/10 text-warn'
              : evento.status === 'ANNULLATA'
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-line bg-surface2 text-muted'
          }`}
        >
          <span className="text-base font-semibold">
            {etichettaEvento[evento.status].toUpperCase()}
          </span>
          <span className="text-sm">
            {evento.status === 'CREATA'
              ? 'Bozza: non è ancora visibile agli operatori e non accetta adesioni.'
              : evento.status === 'ANNULLATA'
                ? 'Attività annullata: le adesioni sono chiuse.'
                : 'Attività conclusa: restano solo le presenze registrate.'}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Dato etichetta="Inizio" valore={fmtDateTime(evento.inizio)} />
              <Dato etichetta="Fine" valore={evento.fine ? fmtDateTime(evento.fine) : '—'} />
              <Dato
                etichetta="Quota"
                valore={
                  <>
                    {mioCosto > 0 ? (
                      <>
                        {fmtEuro(mioCosto)}
                        {/* di cosa è fatta: si paga in una volta sola */}
                        {mioDettaglio && (
                          <span className="block text-[11px] text-muted">{mioDettaglio}</span>
                        )}
                        <span className="block text-[11px] text-warn">
                          presenza confermata a quota saldata
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
                    {/* chi gestisce vede tutte e due le quote: è lui a deciderle */}
                    {gestisce && (
                      <span className="block text-[11px] text-muted">
                        squadra {fmtEuro(costo)}
                        {evento.dettaglioCosto ? ` (${evento.dettaglioCosto})` : ''} · esterni{' '}
                        {quotaEsterni === null ? 'come la squadra' : fmtEuro(quotaEsterni)}
                        {evento.dettaglioCostoEsterni ? ` (${evento.dettaglioCostoEsterni})` : ''}
                      </span>
                    )}
                  </>
                }
              />
              <Dato
                etichetta="Campo"
                valore={
                  evento.field ? (
                    <>
                      {evento.field.nome}
                      {evento.field.squadra && (
                        <span className="block text-[11px] text-muted">
                          gestito da {evento.field.squadra.nome}
                        </span>
                      )}
                      <span className="mt-1.5 block">
                        <Naviga
                          lat={evento.field.lat}
                          lng={evento.field.lng}
                          indirizzo={
                            [evento.field.indirizzo, evento.field.citta]
                              .filter(Boolean)
                              .join(', ') || evento.field.nome
                          }
                          compatto
                        />
                      </span>
                    </>
                  ) : (
                    '—'
                  )
                }
              />
              <Dato etichetta="Ritrovo" valore={evento.ritrovo ?? '—'} />
              <Dato
                etichetta="Ora ritrovo"
                valore={evento.oraRitrovo ? fmtTime(evento.oraRitrovo) : '—'}
              />
              <Dato
                etichetta="Posti"
                valore={
                  evento.maxPartecipanti
                    ? `${presenti.length} / ${evento.maxPartecipanti}`
                    : `${presenti.length} adesioni`
                }
              />
              <Dato
                etichetta="Chiusura adesioni"
                valore={evento.chiusuraIscrizioni ? fmtDate(evento.chiusuraIscrizioni) : '—'}
              />
              <Dato
                etichetta="Creato da"
                valore={
                  evento.createdBy
                    ? `${evento.createdBy.nome} ${evento.createdBy.cognome}`
                    : 'sistema'
                }
              />
            </div>

            {evento.field?.lat !== null && evento.field?.lng != null && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="titolo-sezione mb-2">Dove si gioca</p>
                <Mappa
                  lat={evento.field.lat as number}
                  lng={evento.field.lng}
                  nome={evento.field.nome}
                  altezza={200}
                />
                <Naviga
                  lat={evento.field.lat}
                  lng={evento.field.lng}
                  indirizzo={evento.field.indirizzo}
                  className="btn-primary btn-sm mt-3 w-full justify-center sm:w-auto"
                />
              </div>
            )}

            {evento.descrizione && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="titolo-sezione mb-2">Briefing</p>
                <p className="whitespace-pre-wrap text-sm text-ink/90">{evento.descrizione}</p>
              </div>
            )}

            {tl && evento.note && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="titolo-sezione mb-2">Note interne</p>
                <p className="whitespace-pre-wrap text-sm text-muted">{evento.note}</p>
              </div>
            )}
          </div>

          {/* -------------------------------------------------- partecipanti */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="titolo-sezione">
                Partecipanti · {presenti.length} presenti, {forse.length} forse, {assenti.length}{' '}
                assenti
              </h2>

              {tl && (
                <BottoneModale
                  etichetta="Aggiungi partecipanti"
                  icona="invita"
                  titolo="Aggiungi partecipanti"
                  className="btn-ghost btn-sm"
                  larga
                >
                  <ScegliPartecipanti eventId={evento.id} candidati={candidati} />
                </BottoneModale>
              )}
            </div>

            {evento.rsvps.length === 0 ? (
              <Vuoto testo="Nessuna risposta ancora." />
            ) : (
              <div className="space-y-5">
                {gruppi.map((g) =>
                  g.righe.length === 0 ? null : (
                    <div key={g.chiave}>
                      <p
                        className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] ${g.colore}`}
                      >
                        {g.titolo} · {g.righe.length}
                      </p>
                      <div className="space-y-2">
                        {g.righe.map((r) => (
                          <div
                            key={r.id}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5"
                          >
                            <Avatar
                              iniziali={chiamato(r.user).iniziali}
                              size="sm"
                              fotoDi={r.user.fotoPath ? r.user.id : null}
                            />
                            <div className="min-w-0 flex-1">
                              {/* la scheda si apre solo tra membri della squadra:
                                  verso i nuovi, e dai nuovi, non c'è profilo */}
                              {inSquadra(me.stato) && inSquadra(r.user.stato) ? (
                                <Link
                                  href={`/operatori/${r.user.id}`}
                                  className="block truncate text-sm hover:text-nvg"
                                >
                                  {nomeDi(r.user)}
                                </Link>
                              ) : (
                                <p className="truncate text-sm">{nomeDi(r.user)}</p>
                              )}
                              {/* una riga sola sotto il nome, così l'elenco resta
                                  regolare: la nota riguarda questa attività e
                                  viene prima del motto, che è sempre lì */}
                              {r.note ? (
                                <p className="truncate text-xs text-muted">{r.note}</p>
                              ) : (
                                r.user.frase && (
                                  <p className="truncate text-xs italic text-muted/80">
                                    {r.user.frase}
                                  </p>
                                )
                              )}
                            </div>

                            {/* la quota può esserci anche su un'attività gratis:
                                i nuovi pagano la loro tariffa fissa */}
                            {vedeQuoteAltrui &&
                              (costo > 0 || quotePerUtente.has(r.userId)) &&
                              r.status === 'PRESENTE' && (
                                <Badge
                                  tono={
                                    quotePerUtente.get(r.userId)?.status === 'PAGATO'
                                      ? 'ok'
                                      : 'warn'
                                  }
                                >
                                  {quotePerUtente.get(r.userId)?.status === 'PAGATO'
                                    ? 'quota saldata'
                                    : 'quota da saldare'}
                                </Badge>
                              )}

                            {/* copertura assicurativa: chi non ha l'annuale valida
                                gioca solo con la giornaliera del portale */}
                            {r.status !== 'ASSENTE' &&
                              serveGiornaliera(diSquadra(r), r.user.stato, r.user.figtCards, evento.inizio) &&
                              (() => {
                                const g = giornaliere.get(r.userId);
                                const stato = g?.stato ?? 'NON_ASSICURATO';
                                return (
                                  <span className="flex items-center gap-1.5">
                                    <Badge tono={TONO_ASSICURAZIONE[stato]}>
                                      {ETICHETTA_ASSICURAZIONE[stato]}
                                      {g?.codice ? ` · ${g.codice}` : ''}
                                    </Badge>
                                    {tl && stato !== 'ASSICURATO' && (
                                      <BottoneModale
                                        etichetta="Assicura"
                                        icona="tessera"
                                        titolo={`Giornaliera per ${nomeDi(r.user)}`}
                                        className="btn-ghost btn-sm"
                                      >
                                        <p className="mb-3 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                                          Ogni attivazione consuma una polizza vera e non si può
                                          annullare. Prima di chiamare il portale controllo che la
                                          persona non sia già coperta, che abbia almeno 12 anni e
                                          che il giorno rientri nella finestra ammessa.
                                        </p>

                                        <FormAzione azione={attivaGiornaliera}>
                                          <input type="hidden" name="userId" value={r.userId} />
                                          <input type="hidden" name="eventId" value={evento.id} />
                                          <p className="mb-3 text-sm text-muted">
                                            Attiva la polizza prova sul portale federale per{' '}
                                            <strong className="text-ink">
                                              {nomeDi(r.user)}
                                            </strong>{' '}
                                            e il giorno dell’attività. Servono data e luogo di
                                            nascita nella sua scheda.
                                          </p>
                                          <Invia
                                            icona="tessera"
                                            className="btn-primary w-full"
                                            attesa="Parlo col portale…"
                                          >
                                            Attiva la polizza sul portale
                                          </Invia>
                                        </FormAzione>

                                        <details className="mt-4 border-t border-line pt-4">
                                          <summary className="cursor-pointer text-xs text-muted">
                                            L’ho già attivata a mano sul portale
                                          </summary>
                                          <FormAzione azione={emettiGiornaliera} className="mt-3">
                                            <input type="hidden" name="userId" value={r.userId} />
                                            <input type="hidden" name="eventId" value={evento.id} />
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                              <Campo label="Numero polizza *">
                                                <input
                                                  name="codice"
                                                  required
                                                  className="input"
                                                  placeholder="es. 2793"
                                                />
                                              </Campo>
                                              <Campo label="Id pratica sul portale">
                                                <input name="idPortale" className="input" />
                                              </Campo>
                                            </div>
                                            <Invia icona="salva">Registra il numero</Invia>
                                          </FormAzione>
                                        </details>
                                      </BottoneModale>
                                    )}
                                    {tl && stato === 'ASSICURATO' && (
                                      <AzioneBottone
                                        azione={annullaGiornaliera}
                                        valori={{ userId: r.userId, eventId: evento.id }}
                                        conferma={`Togliere la copertura di ${nomeDi(r.user)}?`}
                                        icona="elimina"
                                        className="btn-ghost btn-sm"
                                      >
                                        Togli
                                      </AzioneBottone>
                                    )}
                                  </span>
                                );
                              })()}

                            {r.presente !== null && (
                              <Badge tono={r.presente ? 'ok' : 'neutro'}>
                                {r.presente ? 'presente' : 'no show'}
                              </Badge>
                            )}

                            {/* lo schieramento si cambia qui, sulla riga della persona */}
                            {tl && schieraQuesta && r.status === 'PRESENTE' ? (
                              <div className="flex gap-1">
                                {(['TITOLARE', 'RISERVA', 'NON_ASSEGNATO'] as const).map((a) => (
                                  <AzioneBottone
                                    key={a}
                                    azione={schiera}
                                    valori={{ rsvpId: r.id, assegnazione: a }}
                                    className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                                      r.assegnazione === a
                                        ? a === 'TITOLARE'
                                          ? 'border-nvg bg-nvg/15 text-nvg'
                                          : a === 'RISERVA'
                                            ? 'border-warn bg-warn/15 text-warn'
                                            : 'border-line bg-surface2 text-muted'
                                        : 'border-line text-muted hover:border-nvgdim'
                                    }`}
                                  >
                                    {a === 'NON_ASSEGNATO'
                                      ? '—'
                                      : a === 'TITOLARE'
                                        ? 'Titolare'
                                        : 'Riserva'}
                                  </AzioneBottone>
                                ))}
                              </div>
                            ) : (
                              !schieraQuesta && (
                                <Badge tono={tonoRsvp[r.status] ?? 'neutro'}>
                                  {umanizza(r.status)}
                                </Badge>
                              )
                            )}

                            {tl && (
                              <AzioneBottone
                                azione={rimuoviPartecipante}
                                valori={{ rsvpId: r.id }}
                                icona="elimina"
                                conferma={`Rimuovere ${r.user.nome} dall’attività?`}
                                className="rounded border border-line p-1.5 text-muted transition-colors hover:border-danger hover:text-danger"
                              >
                                <span className="sr-only">Rimuovi</span>
                              </AzioneBottone>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* -------------------------------------------------- laterale */}
        <div className="space-y-6">
          {admin && (
            <div className="card">
              <p className="titolo-sezione mb-3">Stato dell’attività</p>
              <AzioniEvento
                id={evento.id}
                titolo={evento.titolo}
                status={evento.status}
                visibilita={evento.visibilita}
                soloInterno={evento.tipo?.soloInterno ?? false}
              />
            </div>
          )}

          <div className="card">
            <p className="titolo-sezione mb-3">
              {schieraQuesta ? 'La tua disponibilità' : 'La tua adesione'}
            </p>

            {!certificatoOk ? (
              <div className="space-y-3">
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                  Non puoi segnarti: il certificato medico manca o non è più valido.
                </div>
                <Link href="/certificati" className="btn-primary w-full btn-sm">
                  Carica il certificato
                </Link>
              </div>
            ) : chiuso ? (
              <p className="text-sm text-muted">
                {evento.status === 'CREATA'
                  ? 'Attività in bozza: non è ancora stata rilasciata.'
                  : evento.status === 'ANNULLATA'
                    ? 'Attività annullata.'
                    : evento.status === 'CONCLUSA'
                      ? 'Attività conclusa.'
                      : 'Le adesioni sono chiuse.'}
              </p>
            ) : (
              <>
                <AdesioneEvento
                  eventId={evento.id}
                  scelta={mio?.status ?? null}
                  nota={mio?.note ?? null}
                  pieno={pieno}
                />
                {schieraQuesta && (
                  <p className="mt-3 text-xs text-muted">
                    {mio?.assegnazione && mio.assegnazione !== 'NON_ASSEGNATO' ? (
                      <span className="text-nvg">
                        Il TL ti ha schierato come {umanizza(mio.assegnazione).toLowerCase()}.
                      </span>
                    ) : (
                      'Qui dichiari la disponibilità: alla gara partecipa chi il TL schiera come titolare.'
                    )}
                  </p>
                )}

                {mioCosto > 0 &&
                  mio?.status !== 'PRESENTE' &&
                  miaQuota &&
                  Number(miaQuota.pagato) > 0 && (
                    <div className="mt-3 space-y-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                      <p>
                        Hai versato {fmtEuro(Number(miaQuota.pagato))} per questa attività e non
                        partecipi più.
                      </p>
                      {miaQuota.rimborso ? (
                        <p className="text-nvg">
                          Rimborso già richiesto: la segreteria lo erogherà.
                        </p>
                      ) : (
                        <AzioneBottone
                          azione={chiediRimborso}
                          valori={{ id: miaQuota.id }}
                          icona="incassa"
                          className="btn-ghost btn-sm"
                        >
                          Chiedi il rimborso
                        </AzioneBottone>
                      )}
                    </div>
                  )}

                {mioCosto > 0 && mio?.status === 'PRESENTE' && (
                  <div
                    className={`mt-3 rounded-md border px-3 py-2 text-xs ${
                      miaQuota?.status === 'PAGATO'
                        ? 'border-nvg/40 bg-nvg/10 text-nvg'
                        : 'border-warn/40 bg-warn/10 text-warn'
                    }`}
                  >
                    {miaQuota?.status === 'PAGATO' ? (
                      <>Quota di {fmtEuro(mioCosto)} saldata: il posto è confermato.</>
                    ) : (
                      <>
                        {schieraQuesta ? 'La disponibilità vale' : 'Il posto è confermato'} al saldo
                        della quota di {fmtEuro(mioCosto)}.{' '}
                        <Link href="/pagamenti" className="underline underline-offset-2">
                          Vai ai pagamenti
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {tl && (
            <>
              <div className="card">
                <p className="titolo-sezione mb-3">Appello</p>
                <FormAzione azione={registraPresenze} className="space-y-3">
                  <input type="hidden" name="eventId" value={evento.id} />
                  {evento.rsvps.length === 0 ? (
                    <p className="text-sm text-muted">Nessun partecipante da spuntare.</p>
                  ) : (
                    <>
                      <div className="max-h-64 space-y-1.5 overflow-y-auto">
                        {evento.rsvps.map((r) => (
                          <label key={r.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="presenti"
                              value={r.id}
                              defaultChecked={r.presente ?? r.status === 'PRESENTE'}
                              className="h-4 w-4 accent-[color:var(--nvg)]"
                            />
                            <span className="truncate">{nomeDi(r.user)}</span>
                          </label>
                        ))}
                      </div>
                      <Invia className="btn-ghost w-full btn-sm">Salva presenze e chiudi</Invia>
                    </>
                  )}
                </FormAzione>
              </div>


            </>
          )}

        </div>
      </div>

    </>
  );
}
