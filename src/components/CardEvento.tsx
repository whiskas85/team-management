import Link from 'next/link';
import type { ReactNode } from 'react';
import { Naviga } from './Naviga';
import { Badge } from './ui';
import { Icona } from './Icona';
import { AdesioneEvento } from './AdesioneEvento';
import { fmtDateTime, fmtEuro, umanizza } from '@/lib/format';
import { etichettaEvento, tonoEvento, tonoRsvp } from '@/lib/domain';

export type EventoLista = {
  id: string;
  titolo: string;
  tipo: string;
  colore: string;
  status: string;
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
};

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

export function CardEvento({ e, azioni }: { e: EventoLista; azioni?: ReactNode }) {
  const puoNavigare = (e.lat != null && e.lng != null) || !!e.indirizzo;
  // Una quota va vista **mentre si risponde**, non due righe più su in grigio:
  // uno preme "ci sono" e in quel momento deve sapere che sta prendendo un
  // impegno da dieci euro. Se le adesioni sono chiuse resta nel corpo, dove
  // c'è il resto dei dati.
  const quota = e.costo !== null && e.costo > 0 ? fmtEuro(e.costo) : null;

  return (
    <div className="rounded-lg border border-line bg-surface">
      <Link
        href={`/calendario/${e.id}`}
        className="block rounded-t-lg p-4 transition-colors hover:bg-surface2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
              {e.tipo}
              {e.visibilita === 'TUTTI' && <span className="text-warn"> · tutti</span>}
              {e.visibilita === 'TEAM' && <span className="text-muted"> · squadra</span>}
              {e.visibilita === 'INVITO' && <span className="text-muted"> · su invito</span>}
            </p>
            {/* Il pallino sta attaccato al titolo e non in un angolo: si
                legge insieme al nome dell'attività, che è quello che si guarda
                per decidere se aprirla. */}
            <h3 className="mt-1 flex items-center gap-2 font-medium">
              {e.nuovo && (
                <span
                  title="Non l'hai ancora aperta"
                  className="h-2 w-2 shrink-0 rounded-full bg-nvg"
                />
              )}
              <span className="truncate">{e.titolo}</span>
            </h3>
            <p className="mt-1 text-xs text-muted num">{fmtDateTime(e.inizio)}</p>
            {e.campo && <p className="text-xs text-muted">{e.campo}</p>}
          </div>
          <Badge tono={tonoEvento[e.status] ?? 'neutro'}>
            {etichettaEvento[e.status] ?? umanizza(e.status)}
          </Badge>
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

      {(puoNavigare || e.adesioniAperte) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <Naviga lat={e.lat} lng={e.lng} indirizzo={e.indirizzo} compatto />
            {quota && e.adesioniAperte && (
              <span className="badge border-warn/40 bg-warn/10 font-semibold text-warn">
                a pagamento · {quota}
              </span>
            )}
            {e.adesioniAperte && (
              <span className="text-[11px] text-muted">
                {e.mioStato ? `Hai risposto: ${umanizza(e.mioStato).toLowerCase()}` : 'Ci sei?'}
              </span>
            )}
          </span>
          {e.adesioniAperte && (
            <AdesioneEvento
              eventId={e.id}
              scelta={e.mioStato}
              nota={e.miaNota}
              pieno={!!e.maxPartecipanti && e.presenti >= e.maxPartecipanti}
              compatta
            />
          )}
        </div>
      )}

      {azioni && <div className="border-t border-line px-4 py-3">{azioni}</div>}
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
          <h3 className="mt-1 truncate font-medium">{e.titolo}</h3>
          <p className="mt-1 text-xs text-muted num">{fmtDateTime(e.inizio)}</p>
          {e.campo && <p className="text-xs text-muted">{e.campo}</p>}
        </div>
        {e.mioPresente === true ? (
          <Badge tono="ok">c'eri</Badge>
        ) : e.mioPresente === false ? (
          <Badge tono="danger">non c'eri</Badge>
        ) : (
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
