import Link from 'next/link';
import type { ReactNode } from 'react';
import { linkGiro, linkNaviga, linkPercorso, metaNaviga } from './Naviga';
import { NavigaMenu, type MetaNaviga } from './NavigaMenu';
import { Badge } from './ui';
import { Icona } from './Icona';
import { AdesioneEvento } from './AdesioneEvento';
import { fmtDateTime, fmtEuro, fmtTime, umanizza } from '@/lib/format';
import { etichettaEvento, tonoEvento, tonoRsvp } from '@/lib/domain';
import { BadgeOrganizzatore, type Organizzatore } from './BadgeOrganizzatore';
import type { FaseAttivita } from '@/lib/giorni';

/** La mia macchinata, detta nella card: guido, salgo con qualcuno, mi offrono un posto. */
export type ViaggioInCard = {
  ruolo: 'autista' | 'passeggero' | 'invitato' | 'richiesto';
  /** Chi guida, se non sono io. */
  con: string | null;
  aBordo: number;
  /** Il mio punto di salita (passeggero) o l'arrivo (autista). */
  dove: string | null;
  ora: Date | null;
  /** Il link di Maps: l'itinerario intero per chi guida, il mio punto per chi sale. */
  naviga: string | null;
  /** Chi guida: i punti del giro in ordine (casa, tappe, arrivo), per allungarlo fino al campo. */
  punti?: string[];
  pagina: string;
  /** Passa a prendermi: senza punto vuol dire che non gli ho ancora detto dove. */
  prendo?: boolean;
};

export type EventoLista = {
  id: string;
  titolo: string;
  tipo: string;
  colore: string;
  /** Tipologia riservata alla squadra: non si rilascia a tutti. */
  soloInterno?: boolean;
  status: string;
  /** In corso, o finita e ancora da chiudere. Nulla prima e dopo. */
  fase: FaseAttivita | null;
  visibilita: string | null;
  inizio: Date;
  /** Quando finisce, se lo si sa: per contare i giorni che occupa. */
  fine?: Date | string | null;
  costo: number | null;
  maxPartecipanti: number | null;
  titolari: number;
  /** Rilasciata, ancora da fare, e mai aperta da chi guarda. */
  nuovo: boolean;
  campo: string | null;
  lat: number | null;
  lng: number | null;
  indirizzo: string | null;
  presenti: number;
  forse: number;
  assenti: number;
  mioStato: string | null;
  miaNota: string | null;
  adesioniAperte: boolean;
  /** Rilasciata, ma non ci si segna più: il badge prende il posto dei pulsanti. */
  iscrizioniChiuse?: boolean;
  /** Chi c'era davvero, dopo l'appello. Serve allo storico. */
  presenze: number;
  mancati: number;
  appelloFatto: boolean;
  mioPresente: boolean | null;
  /** Perché è saltata: nello storico «annullata» da sola non dice niente. */
  motivoAnnullamento: string | null;
  /** Organizzata da un'altra squadra collegata: chi, col suo logo. */
  organizzatore?: Organizzatore | null;
  /** Quanto chiede chi organizza, se chiede qualcosa: «5,00 € a operatore». */
  /** Di un'altra squadra e a pagamento: lo vede solo l'admin, senza la cifra. */
  pagaOrganizzatore?: boolean;
  /** Su un invito ancora da decidere, quanto chiedono (solo per l'admin). */
  costoInvito?: string | null;
  costoChiesto?: { importo: number; per: 'OPERATORE' | 'SQUADRA' } | null;
  /** Il sondaggio da cui è nata, o aperto su di lei. */
  sondaggioId?: string | null;
  /** Ci hanno invitati su proposta di un'altra squadra ospite. */
  propostaDa?: string | null;
  /** La mia quota per l'attività (tutte le casse), se c'è. */
  quotaDovuta?: number | null;
  /** Saldata tutta: club e altre casse. */
  quotaSaldata?: boolean;
  /** Il ritrovo dell'attività, con la sua ora e il punto per Maps. */
  ritrovo?: string | null;
  ritrovoMeta?: string | null;
  oraRitrovo?: Date | null;
  /** La mia macchinata, se ne ho una. */
  viaggio?: ViaggioInCard | null;
};

/**
 * Dove porta il Naviga della card, e cosa c'è nel suo menu.
 *
 * La prima meta è quella del tocco, e cambia con chi guarda: chi guida ha
 * l'itinerario intero fino al campo, chi sale va al suo punto di salita, gli
 * altri passano dal ritrovo e arrivano al campo in un percorso solo. Le altre
 * sono per chi vuole andare dritto al campo, o solo al ritrovo.
 */
function meteNaviga(e: EventoLista): { etichetta: string; mete: MetaNaviga[] } | null {
  const campo = metaNaviga(e.lat, e.lng, e.indirizzo);
  const nomeCampo = e.campo ?? e.indirizzo;
  const ritrovo = e.ritrovoMeta ?? null;
  const v = e.viaggio;
  const mete: MetaNaviga[] = [];
  const alCampo = campo && { etichetta: 'Dritto al campo', sotto: nomeCampo, href: linkNaviga(campo) };
  const alRitrovo = ritrovo && { etichetta: 'Solo il ritrovo', sotto: e.ritrovo, href: linkNaviga(ritrovo) };

  if (v?.ruolo === 'autista' && v.punti?.length) {
    // il giro di chi guida finisce al campo, se l'arrivo non è già lì
    const punti = campo && v.punti[v.punti.length - 1] !== campo ? [...v.punti, campo] : v.punti;
    const tappe = Math.max(0, punti.length - 2);
    const giro = linkPercorso(punti);
    if (giro) {
      mete.push({
        etichetta: 'Itinerario',
        sotto: `${tappe === 1 ? '1 tappa' : `${tappe} tappe`}${nomeCampo ? `, poi ${nomeCampo}` : ''}`,
        href: giro,
      });
    }
    if (alRitrovo) mete.push(alRitrovo);
    if (alCampo) mete.push(alCampo);
    return mete.length ? { etichetta: 'Itinerario', mete } : null;
  }

  if (v?.ruolo === 'passeggero' && v.naviga) {
    mete.push({
      etichetta: v.prendo ? 'Dove ti prende' : 'Al punto di salita',
      sotto: v.dove,
      href: v.naviga,
    });
    if (alCampo) mete.push(alCampo);
    return { etichetta: 'Naviga', mete };
  }

  if (ritrovo && campo) {
    mete.push({
      etichetta: 'Ritrovo → campo',
      sotto: `${e.ritrovo ?? 'Ritrovo'}, poi ${nomeCampo ?? 'il campo'}`,
      href: linkGiro([ritrovo], campo),
    });
  }
  if (alRitrovo) mete.push(alRitrovo);
  if (alCampo) mete.push(alCampo);
  if (mete.length === 0) return null;
  // una meta sola: il pulsante dice qual è
  return { etichetta: !campo && ritrovo ? 'Ritrovo' : 'Naviga', mete };
}

/**
 * Un'attività rilasciata che non hai ancora aperto. Sparisce la prima volta
 * che la apri: lo segna la pagina dell'attività (SegnaEventoLetto).
 */
export function BadgeNuova() {
  return (
    <span title="Non l'hai ancora aperta">
      <Badge tono="ok">Nuova</Badge>
    </span>
  );
}

/**
 * Le tre risposte in un colpo d'occhio. Il numero dei presenti porta anche il
 * limite di posti, che è l'unico dato con un tetto.
 */
export function ContoAdesioni({
  e,
  size = 14,
}: {
  e: Pick<EventoLista, 'presenti' | 'forse' | 'assenti' | 'maxPartecipanti' | 'titolari'>;
  size?: number;
}) {
  return (
    <span className="flex items-center gap-2.5 text-[11px]">
      {/* Quanti si sono proposti, e — se i posti sono contati — quanti ne sono
          già stati schierati sul totale. "4 (1/2)" dice le due cose che
          servono: c'è gente, e la formazione è ancora da fare. Mettere solo
          "4/2" faceva sembrare che quattro fossero entrati in due posti. */}
      <span
        className="flex items-center gap-1 text-nvg"
        title={e.maxPartecipanti ? 'Disponibili (schierati / posti)' : 'Disponibili'}
      >
        <Icona nome="presente" size={size} />
        <span className="num">
          {e.presenti}
          {e.maxPartecipanti ? (
            <span className="text-muted">
              {' '}
              ({e.titolari}/{e.maxPartecipanti})
            </span>
          ) : (
            ''
          )}
        </span>
      </span>
      <span className="flex items-center gap-1 text-warn" title="Forse">
        <Icona nome="forse" size={size} />
        <span className="num">{e.forse}</span>
      </span>
      <span className="flex items-center gap-1 text-danger" title="Assenti">
        <Icona nome="assente" size={size} />
        <span className="num">{e.assenti}</span>
      </span>
    </span>
  );
}

export function CardEvento({
  e,
  azioni,
  elimina,
  paga,
}: {
  e: EventoLista;
  azioni?: ReactNode;
  /** Il «Paga» della mia quota (PagaEvento): accanto ai pulsanti di presenza. */
  paga?: ReactNode;
  /**
   * Il cestino, in alto a destra all'altezza del titolo. Sta fuori dal link
   * della card — un pulsante dentro un link si preme aprendo la scheda — e ci
   * si appoggia sopra, con lo spazio lasciato libero apposta.
   */
  elimina?: ReactNode;
}) {
  // Una quota va vista **mentre si risponde**, non due righe più su in grigio:
  // uno preme "ci sono" e in quel momento deve sapere che sta prendendo un
  // impegno da dieci euro. Se le adesioni sono chiuse resta nel corpo, dove
  // c'è il resto dei dati.
  // la mia quota se c'è già (mi sono segnato), altrimenti quanto costa
  const importo = e.quotaDovuta ?? (e.costo !== null && e.costo > 0 ? e.costo : null);
  const quota = importo !== null && importo > 0 ? fmtEuro(importo) : null;
  const pagata = !!e.quotaSaldata && e.quotaDovuta !== null && e.quotaDovuta !== undefined;

  /*
   * Il piede sta in fondo, anche quando la card è più corta delle sue vicine.
   *
   * Le card stanno in una griglia, e in una griglia le celle di una riga sono
   * alte tutte quanto la più alta: una card senza campo e senza quota si
   * allunga per pareggiare quella accanto. Lo spazio in più cadeva **sotto** al
   * piede — una fascia di fondo card, più scura, larga quanto la riga dei
   * pulsanti: sembrava un secondo piede, vuoto.
   *
   * Si risolve dicendo che a crescere è il **corpo**: la card è una colonna, e
   * il corpo si prende lo spazio che avanza. Il piede torna appoggiato al
   * fondo, e l'aria in più finisce sotto al testo — dove per giunta è ancora
   * area cliccabile, perché il corpo è tutto un link all'attività.
   */
  const v = e.viaggio;
  const nav = meteNaviga(e);
  const striscia = !!nav || !!v || !!e.ritrovo;
  // «Paga» va in fila ai pulsanti di presenza, quando ci sono
  const pagaQui = pagata ? null : paga;
  const conPresenza = e.adesioniAperte || (e.iscrizioniChiuse && e.mioStato !== 'ASSENTE');
  const piede = e.adesioniAperte || e.iscrizioniChiuse || azioni || quota;

  return (
    <div className="relative flex h-full flex-col rounded-lg border border-line bg-surface">
      {elimina && <div className="absolute right-3 top-3 z-10">{elimina}</div>}
      <Link
        href={`/calendario/${e.id}`}
        className="block flex-1 rounded-t-lg p-4 transition-colors hover:bg-surface2"
      >
        <div className={`flex items-start justify-between gap-3 ${elimina ? 'pr-11' : ''}`}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
              {e.tipo}
              {e.visibilita === 'TUTTI' && <span className="text-warn"> · tutti</span>}
              {e.visibilita === 'TEAM' && <span className="text-muted"> · squadra</span>}
              {e.visibilita === 'INVITO' && <span className="text-muted"> · su invito</span>}
            </p>
            <h3 className="mt-1 break-words font-medium">{e.titolo}</h3>
            {e.organizzatore && (
              <p className="mt-1">
                <BadgeOrganizzatore organizzatore={e.organizzatore} />
              </p>
            )}
            {e.propostaDa && (
              <p className="mt-1 text-xs text-muted">
                Proposta da <strong className="text-ink">{e.propostaDa}</strong>
              </p>
            )}
            {e.pagaOrganizzatore && (
              <p className="mt-1">
                <Badge tono="warn">
                  A pagamento{e.costoInvito ? ` · ${e.costoInvito}` : ''}
                </Badge>
              </p>
            )}
            <p className="mt-1 text-xs text-muted num">{fmtDateTime(e.inizio)}</p>
            {e.campo && <p className="text-xs text-muted">{e.campo}</p>}
          </div>
          {/* una rilasciata già cominciata dice a che punto è: in corso, o
              finita e ancora da chiudere */}
          {/* «Rilasciata» non si scrive: è lo stato normale di tutto quello
              che si vede, e un badge uguale su ogni scheda non dice niente. Si
              scrive invece «Nuova» finché non l'hai aperta — è quella la cosa
              che fa venire voglia di entrare — e sparisce appena lo fai. */}
          {e.fase ? (
            <Badge tono={e.fase === 'in corso' ? 'ok' : 'warn'}>
              {e.fase === 'in corso' ? 'In corso' : 'Terminata'}
            </Badge>
          ) : e.status === 'RILASCIATA' ? (
            e.nuovo && <BadgeNuova />
          ) : (
            <Badge tono={tonoEvento[e.status] ?? 'neutro'}>
              {etichettaEvento[e.status] ?? umanizza(e.status)}
            </Badge>
          )}
        </div>

        {/* un invito di un'altra squadra non ha ancora presenze: al loro
            posto, nel piede, la risposta da dare */}
        {e.status !== 'INVITATA' && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <ContoAdesioni e={e} />
          {!e.adesioniAperte && (
            <span className="ml-auto">
              {e.mioStato ? (
                <Badge tono={tonoRsvp[e.mioStato] ?? 'neutro'}>{umanizza(e.mioStato)}</Badge>
              ) : (
                <Badge tono="neutro">Da rispondere</Badge>
              )}
            </span>
          )}
        </div>
        )}
      </Link>

      {/* Dove si va e quanto costa: sono cose da leggere, e stanno in una
          fascia loro. Il «Ci sei?» non c'è più — i tre pulsanti qui sotto la
          domanda la fanno da soli, e quello scelto resta acceso: scriverlo
          anche a parole era dire due volte la stessa cosa. */}
      {striscia && (
        <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
          {/* In macchina il punto che conta è dove si sale, non il ritrovo
              dell'attività: chi guida ha l'itinerario intero. */}
          <div className="min-w-0 flex-1 text-xs">
            {v ? (
              <div className="flex items-start gap-2">
                <span className="mt-px shrink-0 text-nvg">
                  <Icona nome="macchina" size={15} />
                </span>
                <span className="min-w-0">
                  {v.ruolo === 'autista' ? (
                    <>
                      <strong className="text-ink">Guidi tu</strong>
                      <span className="text-muted"> · {v.aBordo} a bordo</span>
                    </>
                  ) : v.ruolo === 'passeggero' ? (
                    <>
                      In macchina con <strong className="text-ink">{v.con}</strong>
                      <span className="block text-muted">
                        {v.dove
                          ? `${v.prendo ? 'Ti prende a: ' : 'Ritrovo: '}${v.dove}${v.ora ? ` · ore ${fmtTime(v.ora)}` : ''}`
                          : v.prendo
                            ? 'Digli dove passare a prenderti'
                            : 'Ritrovo da decidere'}
                      </span>
                    </>
                  ) : v.ruolo === 'richiesto' ? (
                    <span className="text-muted">
                      Hai chiesto un passaggio a <strong className="text-ink">{v.con}</strong>
                    </span>
                  ) : (
                    <>
                      <strong className="text-ink">{v.con}</strong>
                      <span className="text-muted"> ti offre un passaggio</span>
                    </>
                  )}
                  <Link href={v.pagina} className="mt-0.5 block text-nvg hover:underline">
                    {v.ruolo === 'invitato' ? 'Rispondi ›' : 'Il viaggio ›'}
                  </Link>
                </span>
              </div>
            ) : (
              e.ritrovo && (
                <p className="text-muted">
                  Ritrovo: <span className="text-ink">{e.ritrovo}</span>
                  {e.oraRitrovo && ` · ore ${fmtTime(e.oraRitrovo)}`}
                  {e.campo && <span className="block">poi {e.campo}</span>}
                </p>
              )
            )}
          </div>
          {nav && <NavigaMenu etichetta={nav.etichetta} mete={nav.mete} />}
        </div>
      )}

      {/* Il piede: qui si fa. La risposta e — per chi gestisce — il rilascio
          di una bozza, tutto allineato a destra come in tutte le card. */}
      {piede && (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-[calc(0.5rem-1px)] border-t border-line bg-ink/[0.045] px-4 py-3 [&>div]:justify-end">
          {/* Quanto costa, a sinistra: la cifra colorata (da pagare o
              pagata), e accanto «Pagato» quando è saldata. */}
          {quota && (
            <span className="mr-auto flex items-center gap-2">
              <span className={`num text-sm font-semibold ${pagata ? 'text-nvg' : 'text-warn'}`}>
                {quota}
              </span>
              {pagata && <Badge tono="ok">Pagato</Badge>}
            </span>
          )}
          {e.adesioniAperte && (
            <AdesioneEvento
              eventId={e.id}
              scelta={e.mioStato}
              nota={e.miaNota}
              pieno={!!e.maxPartecipanti && e.presenti >= e.maxPartecipanti}
              compatta
              accanto={pagaQui}
            />
          )}
          {e.iscrizioniChiuse && <BadgeIscrizioniChiuse />}
          {/* chiuse: resta solo «non ci sono», per chi non lo ha già detto */}
          {e.iscrizioniChiuse && e.mioStato !== 'ASSENTE' && (
            <AdesioneEvento
              eventId={e.id}
              scelta={e.mioStato}
              nota={e.miaNota}
              pieno={false}
              compatta
              soloNo
              accanto={pagaQui}
            />
          )}
          {/* il «Paga» da solo, quando non ci sono pulsanti di presenza */}
          {!conPresenza && pagaQui}
          {azioni}
        </div>
      )}
    </div>
  );
}

/**
 * Un'attività finita, in riga.
 *
 * Nello storico non si risponde e non si schiera più nessuno: quello che
 * serve è **chi c'era davvero**, quanto è costata e com'è andata a finire.
 * I pulsanti di partecipazione e le azioni di gestione qui non hanno niente
 * da fare, e messi in fondo a una riga vecchia si premono per sbaglio.
 */
export function RigaStorico({ e }: { e: EventoLista }) {
  return (
    <tr>
      <td>
        <Link
          href={`/calendario/${e.id}`}
          className="font-medium hover:text-nvg"
        >
          {e.titolo}
        </Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          {e.tipo}
        </p>
        {e.organizzatore && <BadgeOrganizzatore organizzatore={e.organizzatore} />}
        {e.motivoAnnullamento && (
          <p className="mt-0.5 text-[11px] text-danger">
            Annullata: {e.motivoAnnullamento}
          </p>
        )}
      </td>
      <td className="whitespace-nowrap text-muted num">{fmtDateTime(e.inizio)}</td>
      <td className="text-muted">{e.campo ?? '—'}</td>
      <td>
        {e.appelloFatto ? (
          <span className="num">
            <span className="font-semibold text-nvg">{e.presenze}</span>
            <span className="text-muted"> presenti</span>
            {e.mancati > 0 && <span className="text-muted"> · {e.mancati} mancati</span>}
          </span>
        ) : (
          <span className="num text-muted">{e.presenti} adesioni · appello non fatto</span>
        )}
      </td>
      <td className="num text-muted">{e.costo !== null ? fmtEuro(e.costo) : '—'}</td>
      <td>
        {e.status !== 'CONCLUSA' && e.status !== 'RILASCIATA' ? (
          <Badge tono={tonoEvento[e.status] ?? 'neutro'}>
            {etichettaEvento[e.status] ?? umanizza(e.status)}
          </Badge>
        ) : e.mioPresente === true ? (
          <Badge tono="ok">c'eri</Badge>
        ) : e.mioPresente === false ? (
          <Badge tono="danger">non c'eri</Badge>
        ) : (
          <span className="text-[11px] text-muted">—</span>
        )}
      </td>
    </tr>
  );
}

/** La stessa attività finita, per il telefono. */
export function CardStorico({ e }: { e: EventoLista }) {
  return (
    <Link
      href={`/calendario/${e.id}`}
      className="block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-nvgdim"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
            {e.tipo}
          </p>
          <h3 className="mt-1 break-words font-medium">{e.titolo}</h3>
          <p className="mt-1 text-xs text-muted num">{fmtDateTime(e.inizio)}</p>
          {e.campo && <p className="text-xs text-muted">{e.campo}</p>}
          {e.motivoAnnullamento && (
            <p className="mt-1 text-xs text-danger">Annullata: {e.motivoAnnullamento}</p>
          )}
        </div>
        {e.mioPresente === true ? (
          <Badge tono="ok">c'eri</Badge>
        ) : e.mioPresente === false ? (
          <Badge tono="danger">non c'eri</Badge>
        ) : e.status === 'RILASCIATA' ? null : (
          <Badge tono={tonoEvento[e.status] ?? 'neutro'}>
            {etichettaEvento[e.status] ?? umanizza(e.status)}
          </Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-[11px]">
        {e.appelloFatto ? (
          <span className="num">
            <span className="font-semibold text-nvg">{e.presenze}</span>
            <span className="text-muted"> presenti</span>
            {e.mancati > 0 && <span className="text-muted"> · {e.mancati} mancati</span>}
          </span>
        ) : (
          <span className="num text-muted">{e.presenti} adesioni · appello non fatto</span>
        )}
        {e.costo !== null && <span className="num text-muted">{fmtEuro(e.costo)}</span>}
      </div>
    </Link>
  );
}

/** Le iscrizioni sono chiuse: al posto dei pulsanti con cui si risponde. */
export function BadgeIscrizioniChiuse() {
  return (
    <Badge tono="danger">
      <Icona nome="chiave" size={12} /> Iscrizioni chiuse
    </Badge>
  );
}
