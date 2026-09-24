import Link from 'next/link';
import type { ReactNode } from 'react';
import { Naviga } from './Naviga';
import { Badge } from './ui';
import { Icona } from './Icona';
import { AdesioneEvento } from './AdesioneEvento';
import { fmtDateTime, fmtEuro, umanizza } from '@/lib/format';
import { etichettaEvento, tonoEvento, tonoRsvp } from '@/lib/domain';
import type { FaseAttivita } from '@/lib/giorni';

export type EventoLista = {
  id: string;
  titolo: string;
  tipo: string;
  colore: string;
  status: string;
  /** In corso, o finita e ancora da chiudere. Nulla prima e dopo. */
  fase: FaseAttivita | null;
  visibilita: string | null;
  inizio: Date;
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
  /** Chi c'era davvero, dopo l'appello. Serve allo storico. */
  presenze: number;
  mancati: number;
  appelloFatto: boolean;
  mioPresente: boolean | null;
  /** Perché è saltata: nello storico «annullata» da sola non dice niente. */
  motivoAnnullamento: string | null;
};

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
}: {
  e: EventoLista;
  azioni?: ReactNode;
  /**
   * Il cestino, in alto a destra all'altezza del titolo. Sta fuori dal link
   * della card — un pulsante dentro un link si preme aprendo la scheda — e ci
   * si appoggia sopra, con lo spazio lasciato libero apposta.
   */
  elimina?: ReactNode;
}) {
  const puoNavigare = (e.lat != null && e.lng != null) || !!e.indirizzo;
  // Una quota va vista **mentre si risponde**, non due righe più su in grigio:
  // uno preme "ci sono" e in quel momento deve sapere che sta prendendo un
  // impegno da dieci euro. Se le adesioni sono chiuse resta nel corpo, dove
  // c'è il resto dei dati.
  const quota = e.costo !== null && e.costo > 0 ? fmtEuro(e.costo) : null;

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
  const striscia = puoNavigare || (quota && e.adesioniAperte);
  const piede = e.adesioniAperte || azioni;

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

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <ContoAdesioni e={e} />
          {quota && !e.adesioniAperte && <Badge tono="warn">quota {quota}</Badge>}
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
      </Link>

      {/* Dove si va e quanto costa: sono cose da leggere, e stanno in una
          fascia loro. Il «Ci sei?» non c'è più — i tre pulsanti qui sotto la
          domanda la fanno da soli, e quello scelto resta acceso: scriverlo
          anche a parole era dire due volte la stessa cosa. */}
      {striscia && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
          <Naviga lat={e.lat} lng={e.lng} indirizzo={e.indirizzo} compatto />
          {quota && e.adesioniAperte && (
            <span className="badge border-warn/40 bg-warn/10 font-semibold text-warn">
              a pagamento · {quota}
            </span>
          )}
        </div>
      )}

      {/* Il piede: qui si fa. La risposta e — per chi gestisce — il rilascio
          di una bozza, tutto allineato a destra come in tutte le card. */}
      {piede && (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-[calc(0.5rem-1px)] border-t border-line bg-white/[0.045] px-4 py-3 [&>div]:justify-end">
          {e.adesioniAperte && (
            <AdesioneEvento
              eventId={e.id}
              scelta={e.mioStato}
              nota={e.miaNota}
              pieno={!!e.maxPartecipanti && e.presenti >= e.maxPartecipanti}
              compatta
            />
          )}
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
