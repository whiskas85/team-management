'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { classeColore, classePiena } from '@/lib/domain';
import { Icona } from './Icona';

export type GiornoEvento = {
  id: string;
  titolo: string;
  tipo: string;
  colore: string;
  status: string;
  visibilita: string | null;
  inizio: string; // ISO: il server component non può passare Date ai client
  fine: string | null;
  mioStato: string | null;
  /** Organizzata da un'altra squadra collegata. */
  organizzatore?: { nome: string; logo: string | null } | null;
};

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/** Lunedì = 0, per allineare la griglia alla settimana italiana. */
const indiceGiorno = (d: Date) => (d.getDay() + 6) % 7;

const chiave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const soloData = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const ora = (iso: string) =>
  new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

type Segmento = { evento: GiornoEvento; inizia: boolean; finisce: boolean };

/** Un'attività dentro una settimana: da che colonna parte, quante ne copre, in che riga sta. */
type Barra = {
  evento: GiornoEvento;
  da: number;
  per: number;
  corsia: number;
  inizia: boolean;
  finisce: boolean;
};

/** Quante righe di attività stanno in una cella prima del «+N». */
const CORSIE = 3;

/**
 * Le attività di una settimana messe in righe, come in ogni calendario: una
 * su più giorni è **una barra sola** che attraversa le colonne, col titolo
 * scritto una volta. Ognuna prende la prima riga libera per tutto il suo
 * tratto, così due attività non si sovrappongono mai.
 */
function barreDellaSettimana(eventi: GiornoEvento[], lunedi: Date): Barra[] {
  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);
  const giorni = (a: Date, b: Date) => Math.round((soloData(b).getTime() - soloData(a).getTime()) / 86_400_000);

  const tratti = eventi
    .map((e) => {
      const inizio = soloData(new Date(e.inizio));
      const fine = soloData(e.fine ? new Date(e.fine) : new Date(e.inizio));
      if (fine < lunedi || inizio > domenica) return null;
      const da = Math.max(0, giorni(lunedi, inizio));
      const a = Math.min(6, giorni(lunedi, fine < inizio ? inizio : fine));
      return { evento: e, da, per: a - da + 1, inizia: inizio >= lunedi, finisce: fine <= domenica };
    })
    .filter((t): t is Omit<Barra, 'corsia'> => t !== null)
    // prima quelle che partono prima, e a parità le più lunghe: stanno in alto
    .sort((x, y) => x.da - y.da || y.per - x.per || x.evento.inizio.localeCompare(y.evento.inizio));

  const occupate: number[] = []; // per ogni riga, l'ultima colonna presa
  return tratti.map((t) => {
    let corsia = occupate.findIndex((fine) => fine < t.da);
    if (corsia === -1) corsia = occupate.length;
    occupate[corsia] = t.da + t.per - 1;
    return { ...t, corsia };
  });
}

export function CalendarioMese({
  eventi,
  legenda = [],
  nuovoEvento,
  festivita = {},
}: {
  eventi: GiornoEvento[];
  legenda?: { nome: string; colore: string }[];
  /**
   * Form di creazione già renderizzato dal server (le funzioni non possono
   * attraversare il confine server/client): al click su un giorno gli
   * scriviamo dentro la data scelta.
   */
  nuovoEvento?: ReactNode;
  /** Le festività importate, per giorno (chiave anno-mese(0..11)-giorno). */
  festivita?: Record<string, string>;
}) {
  const oggi = new Date();
  const [mese, setMese] = useState(new Date(oggi.getFullYear(), oggi.getMonth(), 1));
  const [giornoScelto, setGiornoScelto] = useState<Date | null>(null);
  const contenitoreForm = useRef<HTMLDivElement>(null);

  // i campi data sono scoperti (defaultValue): li valorizziamo a mano sul
  // giorno cliccato, inizio e fine, così la giornata è già impostata
  useEffect(() => {
    if (!giornoScelto || !contenitoreForm.current) return;
    const p = (n: number) => String(n).padStart(2, '0');
    const giorno = `${giornoScelto.getFullYear()}-${p(giornoScelto.getMonth() + 1)}-${p(
      giornoScelto.getDate(),
    )}`;

    const scrivi = (nome: string, o: string) => {
      const campo = contenitoreForm.current?.querySelector<HTMLInputElement>(
        `input[name="${nome}"]`,
      );
      if (campo) campo.value = `${giorno}T${o}`;
    };

    scrivi('inizio', '09:00');
    scrivi('fine', '18:00');
  }, [giornoScelto]);

  /**
   * Un'attività su più giorni occupa tutte le date che copre: di ognuna
   * teniamo se è il primo o l'ultimo giorno, per disegnare una barra continua
   * invece di tanti rettangoli slegati.
   */
  const perGiorno = useMemo(() => {
    const mappa = new Map<string, Segmento[]>();

    for (const e of eventi) {
      const inizio = soloData(new Date(e.inizio));
      const fine = soloData(e.fine ? new Date(e.fine) : new Date(e.inizio));

      const giorno = new Date(inizio);
      for (let i = 0; giorno <= fine && i < 62; i++) {
        const k = chiave(giorno);
        mappa.set(k, [
          ...(mappa.get(k) ?? []),
          {
            evento: e,
            inizia: chiave(giorno) === chiave(inizio),
            finisce: chiave(giorno) === chiave(fine),
          },
        ]);
        giorno.setDate(giorno.getDate() + 1);
      }
    }
    return mappa;
  }, [eventi]);

  // Il mese che esce mentre entra il nuovo, e da che parte: servono solo per
  // il tempo della scivolata, poi resta il mese nuovo da solo.
  const [uscente, setUscente] = useState<{ mese: Date; verso: number } | null>(null);
  const [trascinato, setTrascinato] = useState(0);
  const tocco = useRef<{ x: number; y: number; orizzontale: boolean | null } | null>(null);
  const fineScivolata = useRef<ReturnType<typeof setTimeout>>(undefined);
  // dopo una strisciata il browser manda anche un clic: non deve aprire il giorno
  const appenaStrisciato = useRef(false);

  const vaiA = (nuovo: Date) => {
    const verso = Math.sign(
      nuovo.getFullYear() * 12 + nuovo.getMonth() - (mese.getFullYear() * 12 + mese.getMonth()),
    );
    if (verso === 0) return;
    setUscente({ mese, verso });
    setMese(nuovo);
    clearTimeout(fineScivolata.current);
    fineScivolata.current = setTimeout(() => setUscente(null), 280);
  };
  const spostaMese = (delta: number) =>
    vaiA(new Date(mese.getFullYear(), mese.getMonth() + delta, 1));

  const eventiDelGiorno = giornoScelto ? (perGiorno.get(chiave(giornoScelto)) ?? []) : [];

  return (
    <div>
      {/* ---------------------------------------------------- barra del mese */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => spostaMese(-1)} className="btn-ghost btn-sm">
            ←
          </button>
          <button
            type="button"
            onClick={() => vaiA(new Date(oggi.getFullYear(), oggi.getMonth(), 1))}
            className="btn-ghost btn-sm"
          >
            Oggi
          </button>
          <button type="button" onClick={() => spostaMese(1)} className="btn-ghost btn-sm">
            →
          </button>
        </div>
        <h2 className="text-lg font-semibold capitalize">
          {mese.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </h2>
      </div>

      {/* ---------------------------------------------------- griglia */}
      {/* Col dito a destra e a sinistra si cambia mese: la griglia segue il
          dito, e lasciandola il mese vecchio esce da una parte mentre il nuovo
          entra dall'altra. In verticale si scorre la pagina come sempre. */}
      <div
        className="relative touch-pan-y overflow-hidden rounded-lg border border-line bg-surface"
        onTouchStart={(e) => {
          tocco.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, orizzontale: null };
        }}
        onTouchMove={(e) => {
          const t = tocco.current;
          if (!t) return;
          const dx = e.touches[0].clientX - t.x;
          const dy = e.touches[0].clientY - t.y;
          if (t.orizzontale === null && Math.abs(dx) + Math.abs(dy) > 10) {
            t.orizzontale = Math.abs(dx) > Math.abs(dy);
          }
          if (t.orizzontale) setTrascinato(dx);
        }}
        onTouchEnd={() => {
          const t = tocco.current;
          tocco.current = null;
          if (t?.orizzontale) {
            appenaStrisciato.current = true;
            setTimeout(() => (appenaStrisciato.current = false), 350);
            if (Math.abs(trascinato) > 60) spostaMese(trascinato < 0 ? 1 : -1);
          }
          setTrascinato(0);
        }}
      >
        {uscente && (
          <div
            className={`pointer-events-none absolute inset-0 ${
              uscente.verso > 0 ? 'animate-esce-sinistra' : 'animate-esce-destra'
            }`}
            aria-hidden
          >
            <Griglia mese={uscente.mese} eventi={eventi} oggi={oggi} festivita={festivita} />
          </div>
        )}
        <div
          key={chiave(mese)}
          className={
            uscente ? (uscente.verso > 0 ? 'animate-entra-destra' : 'animate-entra-sinistra') : ''
          }
          style={
            trascinato
              ? { transform: `translateX(${trascinato}px)`, transition: 'none' }
              : { transition: 'transform 0.2s ease-out' }
          }
        >
          <Griglia
            mese={mese}
            eventi={eventi}
            oggi={oggi}
            festivita={festivita}
            onGiorno={(d) => {
              // un tocco che era l'inizio di una strisciata non apre il giorno
              if (!appenaStrisciato.current) setGiornoScelto(d);
            }}
          />
        </div>
      </div>

      {legenda.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
          {legenda.map((t) => (
            <span key={t.nome} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${classePiena(t.colore)}`} />
              {t.nome}
            </span>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------- pannello del giorno */}
      {giornoScelto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setGiornoScelto(null)}
          />
          <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface sm:max-w-2xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
              <h3 className="font-semibold capitalize">
                {giornoScelto.toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                {festivita[chiave(giornoScelto)] && (
                  <span className="ml-2 text-sm font-normal normal-case text-danger">
                    · {festivita[chiave(giornoScelto)]}
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setGiornoScelto(null)}
                className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-ink"
              >
                Chiudi
              </button>
            </div>

            <div className="space-y-4 p-5">
              {eventiDelGiorno.length > 0 ? (
                <div className="space-y-2">
                  {eventiDelGiorno.map(({ evento: e }) => (
                    <Link
                      key={e.id}
                      href={`/calendario/${e.id}`}
                      className="card card-hover block py-3"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
                        {e.tipo}
                        {e.visibilita === 'TUTTI' && <span className="text-warn"> · tutti</span>}
                        {e.visibilita === 'INVITO' && <span className="text-muted"> · su invito</span>}
                      </p>
                      <p className="font-medium">{e.titolo}</p>
                      <p className="num text-xs text-muted">
                        {new Date(e.inizio).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        {ora(e.inizio)}
                        {e.fine &&
                          ` → ${new Date(e.fine).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                          })} ${ora(e.fine)}`}
                        {e.mioStato && ` · tu: ${e.mioStato.toLowerCase()}`}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Nessuna attività in questo giorno.</p>
              )}

              {nuovoEvento && (
                <div className="border-t border-line pt-4" ref={contenitoreForm}>
                  <p className="titolo-sezione mb-3">Aggiungi attività</p>
                  {nuovoEvento}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Un mese: sei settimane, ognuna una riga di giorni con sopra le barre delle
 * attività. Le barre stanno in uno strato a parte che copre la settimana, così
 * possono attraversare le colonne; il resto della cella resta cliccabile.
 */
function Griglia({
  mese,
  eventi,
  oggi,
  festivita,
  onGiorno,
}: {
  mese: Date;
  eventi: GiornoEvento[];
  oggi: Date;
  festivita: Record<string, string>;
  onGiorno?: (d: Date) => void;
}) {
  const settimane = useMemo(() => {
    const primo = new Date(mese.getFullYear(), mese.getMonth(), 1);
    const partenza = new Date(primo);
    partenza.setDate(primo.getDate() - indiceGiorno(primo));
    return Array.from({ length: 6 }, (_, w) => {
      const lunedi = new Date(partenza);
      lunedi.setDate(partenza.getDate() + w * 7);
      const giorni = Array.from({ length: 7 }, (_, g) => {
        const d = new Date(lunedi);
        d.setDate(lunedi.getDate() + g);
        return d;
      });
      return { lunedi, giorni, barre: barreDellaSettimana(eventi, lunedi) };
    });
  }, [mese, eventi]);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line">
        {GIORNI.map((g) => (
          <div
            key={g}
            className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-muted"
          >
            <span className="hidden sm:inline">{g}</span>
            <span className="sm:hidden">{g.charAt(0)}</span>
          </div>
        ))}
      </div>

      {settimane.map(({ lunedi, giorni, barre }) => (
        <div key={chiave(lunedi)} className="relative">
          <div className="grid grid-cols-7">
            {giorni.map((d, g) => {
              const delMese = d.getMonth() === mese.getMonth();
              const isOggi = chiave(d) === chiave(oggi);
              const festa = festivita[chiave(d)] ?? null;
              // quelle che non ci stanno nelle righe visibili, per questo giorno
              const nascoste = barre.filter(
                (b) => b.corsia >= CORSIE && g >= b.da && g < b.da + b.per,
              ).length;
              return (
                <div
                  key={g}
                  onClick={() => onGiorno?.(d)}
                  title={
                    festa
                      ? `${festa} · clicca per vedere la giornata o aggiungere un'attività`
                      : "Clicca per vedere la giornata o aggiungere un'attività"
                  }
                  className={`relative min-h-[84px] cursor-pointer border-b border-r border-line/60 p-1 transition-colors sm:min-h-[108px] ${
                    delMese ? 'hover:bg-surface2' : 'bg-bg/40 text-muted/50'
                  }`}
                >
                  {/* le festività: il numero in rosso, come sui calendari di
                      carta, e il nome accanto dove c'è spazio */}
                  <span className="flex min-w-0 items-center gap-1">
                    <span
                      className={`num inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        isOggi
                          ? 'bg-nvg font-semibold text-black'
                          : festa
                            ? `font-semibold ${delMese ? 'text-danger' : 'text-danger/50'}`
                            : delMese
                              ? 'text-ink'
                              : ''
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {festa && (
                      <span
                        className={`hidden truncate text-[10px] sm:inline ${
                          delMese ? 'text-danger/90' : 'text-danger/40'
                        }`}
                      >
                        {festa}
                      </span>
                    )}
                  </span>
                  {nascoste > 0 && (
                    <span className="absolute bottom-0.5 left-1 text-[10px] text-muted">
                      +{nascoste} altre
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* le barre: sopra i giorni, sotto il numero */}
          <div className="pointer-events-none absolute inset-x-0 top-8 grid grid-cols-7 gap-y-0.5">
            {barre
              .filter((b) => b.corsia < CORSIE)
              .map((b) => (
                <BarraEvento key={b.evento.id} barra={b} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Un'attività in una settimana: una barra sola, lunga quanto i giorni che
 * copre, col titolo una volta. Gli angoli sono tondi solo dove comincia e
 * dove finisce davvero: se prosegue nella settimana dopo, il bordo resta
 * dritto e dice che continua.
 */
function BarraEvento({ barra }: { barra: Barra }) {
  const { evento: e, da, per, corsia, inizia, finisce } = barra;

  // Conclusa: è storia, e tutte uguali — il colore della tipologia serviva a
  // scegliere dove andare, a cose fatte distrae. Al posto dell'ora, la spunta.
  const conclusa = e.status === 'CONCLUSA';
  const stile =
    e.status === 'ANNULLATA'
      ? 'border-line bg-surface2 text-muted line-through'
      : e.status === 'CREATA'
        ? 'border-dashed border-warn/50 bg-warn/10 text-warn'
        : e.status === 'INVITATA'
          ? 'border-dashed border-nvg/50 bg-nvg/10 text-nvg'
        : conclusa
          ? 'border-line bg-surface2 text-ink/75'
          : classeColore(e.colore);

  return (
    <Link
      href={`/calendario/${e.id}`}
      onClick={(ev) => ev.stopPropagation()}
      title={`${e.titolo} · ${e.tipo}${e.organizzatore ? ` · organizza ${e.organizzatore.nome}` : ''}`}
      style={{ gridColumn: `${da + 1} / span ${per}`, gridRow: corsia + 1 }}
      className={`pointer-events-auto block truncate border px-1 py-0.5 text-[10px] leading-tight transition-opacity hover:opacity-80 ${stile} ${
        inizia ? 'ml-0.5 rounded-l' : 'rounded-l-none border-l-0'
      } ${finisce ? 'mr-0.5 rounded-r' : 'rounded-r-none border-r-0'}`}
    >
      {inizia &&
        (conclusa ? (
          <span className="mr-0.5 inline-flex align-[-2px] text-nvg" aria-label="Fatta">
            <Icona nome="approva" size={11} />
          </span>
        ) : (
          <span className="hidden sm:inline">{ora(e.inizio)} </span>
        ))}
      {/* di un'altra squadra: il loro logo davanti al titolo */}
      {inizia && e.organizzatore?.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={e.organizzatore.logo}
          alt=""
          width={11}
          height={11}
          className="mr-0.5 inline-block h-[11px] w-[11px] rounded-full align-[-2px]"
        />
      )}
      {e.titolo}
    </Link>
  );
}
