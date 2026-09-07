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
  etichettaAssegnazione,
  occupaPosto,
  puoGestirePagamenti,
  schierato,
  puoSchierare,
  isContatto,
  puoVedereNuovi,
  serveCertificato,
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
import { FormRiunione } from '@/components/FormRiunione';
import { BottoneModale } from '@/components/Modale';
import { AzioniEvento } from '@/components/AzioniEvento';
import { Mappa } from '@/components/Mappa';
import { Naviga } from '@/components/Naviga';
import { AzioneBottone } from '@/components/AzioneBottone';
import { AdesioneEvento } from '@/components/AdesioneEvento';
import { ContoAllaRovescia } from '@/components/ContoAllaRovescia';
import {
  creaRiunione,
  registraPresenze,
  rimuoviPartecipante,
  salvaEvento,
  scambiaTitolare,
  schiera,
} from '@/actions/eventi';
import { chiediRimborso } from '@/actions/pagamenti';
import {
  attivaGiornaliera,
  emettiGiornaliera,
} from '@/actions/assicurazione';
import {
  ETICHETTA_ASSICURAZIONE,
  TONO_ASSICURAZIONE,
  serveGiornaliera,
} from '@/lib/assicurazione';
import { ScegliPartecipanti, type Candidato } from '@/components/ScegliPartecipanti';
import { Social, type Commento } from '@/components/Social';
import { BloccoNote, FormNota, type NotaLetta } from '@/components/Note';
import { citabili } from '@/lib/note';
import { haIncarichi } from '@/lib/domain';

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

  // Commenti e "mi piace" li vede chiunque veda l'attività; le note sotto sono
  // l'opposto e stanno nella stessa pagina solo perché è lì che uno le scrive.
  const [commenti, miPiace, mioMiPiace] = await Promise.all([
    prisma.commentoEvento.findMany({
      where: { eventId: evento.id },
      orderBy: { createdAt: 'asc' },
      include: {
        utente: {
          select: { id: true, nome: true, cognome: true, callsign: true, fotoPath: true },
        },
      },
    }),
    prisma.miPiaceEvento.findMany({
      where: { eventId: evento.id },
      include: { utente: { select: { nome: true, cognome: true, callsign: true } } },
    }),
    prisma.miPiaceEvento.findUnique({
      where: { eventId_userId: { eventId: evento.id, userId: me.id } },
      select: { userId: true },
    }),
  ]);

  /**
   * L'indirizzo della scheda di una persona, oppure niente se non la si può
   * aprire. Sta qui e non dentro il JSX perché la stessa regola serve in più
   * punti della pagina, e due copie divergono.
   */
  const profiloDi = (u: { id: string; stato: StatoOperatore }) => {
    if (isContatto(u.stato)) return puoVedereNuovi(me.roles) ? `/admin/operatori/${u.id}` : null;
    // fra membri della squadra: la pagina manda da sola alla scheda completa
    // chi ha un incarico, quindi l'indirizzo è uno solo
    return inSquadra(me.stato) && inSquadra(u.stato) ? `/operatori/${u.id}` : null;
  };

  /**
   * Un badge solo per persona, che dice l'ultima cosa vera.
   *
   * Prima dell'appello conta quello che ha risposto; dopo l'appello conta se
   * c'era davvero, e allora la risposta non serve più a nessuno. Tenerli
   * entrambi a vista dava due badge quasi uguali — "presente" e "Presente" —
   * e toccava indovinare quale dei due stesse parlando di cosa.
   */
  const statoDiFatto = (r: { status: string; presente: boolean | null }) =>
    r.presente === null
      ? { testo: umanizza(r.status), tono: tonoRsvp[r.status] ?? 'neutro' }
      : r.presente
        ? { testo: 'c’era', tono: 'ok' as const }
        : { testo: 'non c’era', tono: 'danger' as const };

  const scrivoNote = haIncarichi(me.roles);

  // Le mie note su chi partecipa, prese in una query sola e poi divise per
  // persona: una per partecipante sarebbero venti query per una pagina.
  // Una nota conta per chi vi è appuntata e per chi vi è nominato, come
  // sulla scheda personale — se le due cose contassero in modo diverso, il
  // numero sul pulsante non tornerebbe con quello che poi si apre.
  const idPartecipanti = evento.rsvps.map((r) => r.userId);
  const noteSullePersone = scrivoNote
    ? await prisma.nota.findMany({
        where: {
          autoreId: me.id,
          OR: [
            { userId: { in: idPartecipanti } },
            { citate: { some: { userId: { in: idPartecipanti } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          persona: { select: { nome: true, cognome: true, callsign: true } },
          evento: { select: { titolo: true } },
          citate: {
            include: {
              utente: { select: { id: true, nome: true, cognome: true, callsign: true } },
            },
          },
        },
      })
    : [];

  const notePerPersona = (userId: string) =>
    noteSullePersone.filter(
      (n) => n.userId === userId || n.citate.some((c) => c.userId === userId),
    ) as NotaLetta[];
  const [mieNote, persone] = scrivoNote
    ? await Promise.all([
        prisma.nota.findMany({
          where: { autoreId: me.id, eventId: evento.id },
          orderBy: { createdAt: 'desc' },
          include: {
            persona: { select: { nome: true, cognome: true, callsign: true } },
            evento: { select: { titolo: true } },
            citate: {
              include: {
                utente: { select: { id: true, nome: true, cognome: true, callsign: true } },
              },
            },
          },
        }),
        citabili(),
      ])
    : [[], []];
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
  // i convocati tengono già il posto: mancano solo i soldi
  const convocati = presenti.filter((r) => r.assegnazione === 'CONVOCATO');
  // la sala controllo c'è ma non in campo: non toglie un posto e non paga
  const toc = presenti.filter((r) => r.assegnazione === 'TOC');
  const riserve = presenti.filter((r) => r.assegnazione === 'RISERVA');
  // il posto lo occupa anche chi è convocato: sta solo aspettando di pagarlo.
  // Il TOC no: sta in sala controllo e non toglie un posto in campo.
  const pieno =
    !!evento.maxPartecipanti && presenti.filter(occupaPosto).length >= evento.maxPartecipanti;
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
      const serve = inSquadra(o.stato) && serveCertificato(evento.tipo);
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
  // dove c'è la formazione la quota la deve chi scende in campo, non chi si è
  // solo reso disponibile: serve a dirlo prima, invece di farlo scoprire dopo
  const mioTitolare = mio?.assegnazione === 'TITOLARE';
  const mioConvocato = mio?.assegnazione === 'CONVOCATO';

  // senza certificato in corso di validità non ci si segna e non si gioca —
  // dove la tipologia lo richiede: a una riunione si va comunque
  const certificatoDovuto = inSquadra(me.stato) && serveCertificato(evento.tipo);
  const mieiCertificati = certificatoDovuto
    ? await prisma.medicalCertificate.findMany({
        where: { userId: me.id },
        select: { status: true, scadeIl: true },
      })
    : [];
  const certificatoOk = !certificatoDovuto || inRegola(mieiCertificati);
  // titolari e riserve hanno senso solo dove la tipologia li prevede
  // Si schiera dove la tipologia lo prevede, **e anche dove i posti sono
  // contati**: se un'attività ha un limite ma nessuno può essere messo in
  // formazione, quel limite non lo fa rispettare nessuno e il numero sulla
  // card resterebbe fermo a zero schierati per sempre.
  const schieraQuesta = (evento.tipo?.riserve ?? false) || !!evento.maxPartecipanti;

  // una sola lista, raggruppata: con la formazione separa titolari e riserve,
  // altrimenti bastano le tre risposte
  const daAssegnare = presenti.filter((r) => r.assegnazione === 'NON_ASSEGNATO');

  // Le tipologie segnate come riunione: se non ce n'è nessuna il pulsante non
  // compare, invece di aprire un modulo che non può funzionare.
  const tipiRiunione = tl
    ? await prisma.tipoAttivita.findMany({
        where: { riunione: true, attivo: true },
        orderBy: { ordine: 'asc' },
        select: { id: true, nome: true },
      })
    : [];

  // L'appello è di chi doveva esserci: dove c'è una formazione, titolari,
  // convocati e sala controllo. Le riserve non hanno giocato e segnarle
  // assenti sarebbe scriverlo sulla loro scheda per una colpa che non hanno.
  const daAppello = schieraQuesta ? evento.rsvps.filter(schierato) : evento.rsvps;

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
        ...dividi('convocati', 'Convocati · in attesa del saldo', 'text-warn', convocati),
        ...dividi('toc', 'TOC · sala controllo', 'text-sky-300', toc),
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

            {/* quanto manca per decidere: una data costringe a fare il conto a
                mente, un conto alla rovescia no */}
            {evento.status === 'RILASCIATA' && evento.chiusuraIscrizioni && (
              <ContoAllaRovescia scadenza={evento.chiusuraIscrizioni.toISOString()} />
            )}
{/* Il team leader può sistemare la logistica: è lui che il sabato sera
                scopre che il campo ha cambiato ingresso, e farglielo chiedere
                all'admin vuol dire che la squadra lo saprà il giorno dopo.
                Quote, posti e destinatari restano di chi gestisce il
                calendario: lì si decide, non si corregge. */}
            {(admin || tl) && (
              <BottoneModale
                etichetta={admin ? 'Modifica' : 'Luoghi e titolo'}
                icona="modifica"
                titolo={admin ? `Modifica "${evento.titolo}"` : `Luoghi di "${evento.titolo}"`}
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
                    soloLogistica={!admin}
                  />
                  <Invia icona="salva">Salva modifiche</Invia>
                </FormAzione>
              </BottoneModale>
            )}
            {/* Da una gara si decide di vedersi per prepararla: è così che
                succede, e il titolo arriva già scritto perché è quello che uno
                scriverebbe comunque. */}
            {tl && tipiRiunione.length > 0 && (
              <BottoneModale
                etichetta="Organizza una riunione"
                icona="calendario"
                titolo="Nuova riunione"
                className="btn-ghost btn-sm"
                larga
              >
                <FormAzione azione={creaRiunione}>
                  <FormRiunione
                    tipologie={tipiRiunione}
                    daEventId={evento.id}
                    titoloPredefinito={`Riunione: ${evento.titolo}`}
                  />
                  <Invia icona="salva">Crea la riunione</Invia>
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
                          {mioConvocato
                            ? 'sei convocato: il posto è tuo, diventa tuo davvero al saldo'
                            : schieraQuesta && !mioTitolare
                              ? 'si paga solo se il TL ti schiera titolare'
                              : 'presenza confermata a quota saldata'}
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
                etichetta="Dove"
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
                  ) : evento.luogo ? (
                    <>
                      {evento.luogo}
                      <span className="mt-1.5 block">
                        <Naviga
                          lat={evento.luogoLat}
                          lng={evento.luogoLng}
                          indirizzo={evento.luogo}
                          compatto
                        />
                      </span>
                    </>
                  ) : (
                    '—'
                  )
                }
              />
              {evento.linkRiunione && (
                <Dato
                  etichetta="Collegamento"
                  valore={
                    <a
                      href={evento.linkRiunione}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-nvg underline underline-offset-2"
                    >
                      Entra nella riunione
                    </a>
                  }
                />
              )}
              <Dato
                etichetta="Ritrovo"
                valore={
                  evento.ritrovo ? (
                    <>
                      {evento.ritrovo}
                      {/* un ritrovo scritto a mano non porta nessuno da nessuna
                          parte: se ha le coordinate, si apre il navigatore */}
                      {evento.ritrovoLat != null && (
                        <span className="mt-1.5 block">
                          <Naviga
                            lat={evento.ritrovoLat}
                            lng={evento.ritrovoLng}
                            indirizzo={evento.ritrovo}
                            compatto
                          />
                        </span>
                      )}
                    </>
                  ) : (
                    '—'
                  )
                }
              />
              <Dato
                etichetta="Ora ritrovo"
                valore={evento.oraRitrovo ? fmtTime(evento.oraRitrovo) : '—'}
              />
              <Dato
                etichetta="Disponibili"
                valore={
                  evento.maxPartecipanti ? (
                    <>
                      {presenti.length}
                      {/* i posti non chiudono le adesioni: alzare la mano si può
                          sempre, e chi avanza va in riserva */}
                      <span className="block text-[11px] text-muted">
                        {evento.maxPartecipanti} posti in formazione
                        {pieno && presenti.length > evento.maxPartecipanti
                          ? ` · ${presenti.length - evento.maxPartecipanti} in più`
                          : ''}
                      </span>
                    </>
                  ) : (
                    `${presenti.length} adesioni`
                  )
                }
              />
              <Dato
                etichetta="Chiusura adesioni"
                valore={evento.chiusuraIscrizioni ? fmtDateTime(evento.chiusuraIscrizioni) : '—'}
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
                            /* su telefono il nome sta su una riga sua e i comandi vanno
                               a capo: prima il nome aveva flex-1 e si stringeva fino a
                               sparire, mentre badge e pulsanti non cedono un pixel */
                            className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 sm:flex-row sm:items-center"
                          >
                            <div className="flex min-w-0 items-center gap-2 sm:flex-1">
                            <Avatar
                              iniziali={chiamato(r.user).iniziali}
                              size="sm"
                              fotoDi={r.user.fotoPath ? r.user.id : null}
                            />
                            <div className="min-w-0 flex-1">
                              {/* Si apre la scheda di chi si ha diritto di vedere,
                                  e la regola è la stessa di ogni altro elenco: fra
                                  compagni di squadra ci si apre a vicenda, mentre
                                  la scheda di un contatto la apre solo chi lo segue
                                  — comando, amministrazione, segreteria. Al team
                                  leader resta il nome e basta: in campo gli serve
                                  sapere chi c'è, non chi sia. */}
                              {profiloDi(r.user) ? (
                                <Link
                                  href={profiloDi(r.user)!}
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
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {/* Nota al volo su questa persona in questa attività.
                                Nasce già legata a tutte e due: è il momento in cui
                                ci si ricorda cos'è successo, e chiederlo dopo dalla
                                scheda vuol dire riscrivere anche dov'era. */}
                            {scrivoNote &&
                              (() => {
                                const sue = notePerPersona(r.user.id);
                                return (
                                  <BottoneModale
                                    /* il numero sul pulsante dice se su questa
                                       persona c'è già qualcosa da rileggere,
                                       senza doverlo aprire per scoprirlo */
                                    etichetta={sue.length ? `Nota · ${sue.length}` : 'Nota'}
                                    icona="bozza"
                                    titolo={`Nota su ${nomeDi(r.user)}`}
                                    className="btn-ghost btn-sm"
                                    larga
                                  >
                                    <FormNota
                                      persone={persone}
                                      userId={r.user.id}
                                      eventId={evento.id}
                                      precedenti={sue}
                                    />
                                  </BottoneModale>
                                );
                              })()}

                            {/* la quota può esserci anche su un'attività gratis:
                                i nuovi pagano la loro tariffa fissa */}
                            {/* Il badge guarda la quota **di quella persona**, non
                                il costo dell'attività: dove c'è la formazione una
                                riserva non deve niente, e vedersi scritto "quota da
                                saldare" senza avere nessun pagamento era falso. */}
                            {vedeQuoteAltrui && quotePerUtente.has(r.userId) && (
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
                                  </span>
                                );
                              })()}

                            {/* fatto l'appello, il verdetto sostituisce la
                                risposta: è l'unico che conta ancora */}
                            {r.presente !== null ? (
                              <Badge tono={statoDiFatto(r).tono}>{statoDiFatto(r).testo}</Badge>
                            ) : tl && schieraQuesta && r.status === 'PRESENTE' ? (
                              <div className="flex flex-wrap items-center gap-1">
                                {/* Chi è dentro si può scambiare con una riserva:
                                    uno si fa male il giorno prima e la formazione
                                    non si smonta a mano. Se aveva già pagato, chi
                                    subentra non paga — la somma per quel posto il
                                    club l'ha incassata. */}
                                {(r.assegnazione === 'TITOLARE' ||
                                  r.assegnazione === 'CONVOCATO') &&
                                  riserve.length > 0 && (
                                    <BottoneModale
                                      etichetta="Sostituisci"
                                      icona="squadra"
                                      titolo={`Chi entra al posto di ${nomeDi(r.user)}?`}
                                      className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:border-nvgdim hover:text-ink"
                                    >
                                      <div className="space-y-2">
                                        {riserve.map((s) => (
                                          <div
                                            key={s.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                                          >
                                            <span className="min-w-0 truncate text-sm">
                                              {nomeDi(s.user)}
                                            </span>
                                            <AzioneBottone
                                              azione={scambiaTitolare}
                                              valori={{ rsvpId: r.id, conRsvpId: s.id }}
                                              icona="squadra"
                                              className="btn-primary btn-sm"
                                            >
                                              Fai entrare
                                            </AzioneBottone>
                                          </div>
                                        ))}
                                      </div>
                                    </BottoneModale>
                                  )}

                                {(['TITOLARE', 'TOC', 'RISERVA', 'NON_ASSEGNATO'] as const).map((a) => (
                                  <AzioneBottone
                                    key={a}
                                    azione={schiera}
                                    valori={{ rsvpId: r.id, assegnazione: a }}
                                    className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                                      r.assegnazione === a ||
                                      (a === 'TITOLARE' && r.assegnazione === 'CONVOCATO')
                                        ? a === 'TITOLARE'
                                          ? 'border-nvg bg-nvg/15 text-nvg'
                                          : a === 'TOC'
                                            ? 'border-sky-400 bg-sky-400/15 text-sky-300'
                                            : a === 'RISERVA'
                                              ? 'border-warn bg-warn/15 text-warn'
                                              : 'border-line bg-surface2 text-muted'
                                        : 'border-line text-muted hover:border-nvgdim'
                                    }`}
                                  >
                                    {a === 'NON_ASSEGNATO'
                                      ? '—'
                                      : a === 'TITOLARE' && r.assegnazione === 'CONVOCATO'
                                        ? 'Convocato'
                                        : etichettaAssegnazione[a]}
                                  </AzioneBottone>
                                ))}
                              </div>
                            ) : (
                              !schieraQuesta && (
                                <Badge tono={statoDiFatto(r).tono}>{statoDiFatto(r).testo}</Badge>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* ------------------------------------------------ commenti */}
          <Social
            eventId={evento.id}
            commenti={commenti as Commento[]}
            miPiace={miPiace.map((m) => ({
              nome: comeChiamare(m.utente, { incarico: false, diSquadra: true }).nome,
            }))}
            mioMiPiace={mioMiPiace != null}
            ioSono={me.id}
            chiSono={comeChiamare(me, { incarico: false, diSquadra: true }).nome}
            puoModerare={admin}
          />

          {/* ------------------------------------------------ note private */}
          {scrivoNote && (
            <BloccoNote
              note={mieNote as NotaLetta[]}
              persone={persone}
              eventId={evento.id}
              titolo="Le tue note su questa attività"
              contesto
            />
          )}
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
                  {daAppello.length === 0 ? (
                    <p className="text-sm text-muted">
                      {schieraQuesta
                        ? 'Nessuno in formazione: l’appello si fa su chi doveva esserci.'
                        : 'Nessun partecipante da spuntare.'}
                    </p>
                  ) : (
                    <>
                      {/* squadra e nuovi separati anche qui: hanno adempimenti
                          diversi — i nuovi vanno assicurati con la giornaliera —
                          e in una lista sola non si vede più chi è chi */}
                      <div className="max-h-64 space-y-1.5 overflow-y-auto">
                        {[
                          {
                            titolo: 'Operatori',
                            righe: daAppello.filter(
                              (r) => r.assegnazione !== 'TOC' && diSquadra(r),
                            ),
                          },
                          {
                            titolo: 'Nuovi',
                            righe: daAppello.filter(
                              (r) => r.assegnazione !== 'TOC' && !diSquadra(r),
                            ),
                          },
                          {
                            // il TOC c'era, ma non in campo: tenerlo a parte
                            // evita di contarlo fra chi ha giocato mentre si
                            // spunta l'elenco
                            titolo: 'TOC · sala controllo',
                            righe: daAppello.filter((r) => r.assegnazione === 'TOC'),
                          },
                        ]
                          .filter((g) => g.righe.length > 0)
                          .map((g) => (
                            <div key={g.titolo}>
                              <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted first:mt-0">
                                {g.titolo} · {g.righe.length}
                              </p>
                              <div className="space-y-1.5">
                                {g.righe.map((r) => (
                                  <label
                                    key={r.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      name="presenti"
                                      value={r.id}
                                      defaultChecked={r.presente ?? r.status === 'PRESENTE'}
                                      className="h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
                                    />
                                    <span className="truncate">{nomeDi(r.user)}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
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
