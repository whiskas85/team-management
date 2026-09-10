'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { classeColore } from '@/lib/domain';

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
};

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/** Lunedì = 0, per allineare la griglia alla settimana italiana. */
const indiceGiorno = (d: Date) => (d.getDay() + 6) % 7;

const chiave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const soloData = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const ora = (iso: string) =>
  new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

type Segmento = { evento: GiornoEvento; inizia: boolean; finisce: boolean };

export function CalendarioMese({
  eventi,
  legenda = [],
  nuovoEvento,
}: {
  eventi: GiornoEvento[];
  legenda?: { nome: string; colore: string }[];
  /**
   * Form di creazione già renderizzato dal server (le funzioni non possono
   * attraversare il confine server/client): al click su un giorno gli
   * scriviamo dentro la data scelta.
   */
  nuovoEvento?: ReactNode;
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

  const celle = useMemo(() => {
    const primo = new Date(mese.getFullYear(), mese.getMonth(), 1);
    const partenza = new Date(primo);
    partenza.setDate(primo.getDate() - indiceGiorno(primo));

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(partenza);
      d.setDate(partenza.getDate() + i);
      return d;
    });
  }, [mese]);

  const spostaMese = (delta: number) =>
    setMese(new Date(mese.getFullYear(), mese.getMonth() + delta, 1));

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
            onClick={() => setMese(new Date(oggi.getFullYear(), oggi.getMonth(), 1))}
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
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
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

        <div className="grid grid-cols-7">
          {celle.map((d, i) => {
            const delMese = d.getMonth() === mese.getMonth();
            const isOggi = chiave(d) === chiave(oggi);
            const segmenti = perGiorno.get(chiave(d)) ?? [];

            return (
              <div
                key={i}
                onClick={() => setGiornoScelto(d)}
                title="Clicca per vedere la giornata o aggiungere un'attività"
                className={`min-h-[76px] cursor-pointer border-b border-r border-line/60 p-1 transition-colors sm:min-h-[108px] ${
                  delMese ? 'hover:bg-surface2' : 'bg-bg/40 text-muted/50'
                }`}
              >
                <span
                  className={`num inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isOggi ? 'bg-nvg font-semibold text-black' : delMese ? 'text-ink' : ''
                  }`}
                >
                  {d.getDate()}
                </span>

                <div className="mt-1 flex flex-col gap-0.5">
                  {segmenti.slice(0, 3).map((s) => (
                    <ChipEvento key={s.evento.id} segmento={s} />
                  ))}
                  {segmenti.length > 3 && (
                    <span className="px-1 text-[10px] text-muted">
                      +{segmenti.length - 3} altre
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {legenda.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
          {legenda.map((t) => (
            <span key={t.nome} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm border ${classeColore(t.colore)}`} />
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
 * Un segmento di attività dentro una cella. Sulle giornate intermedie la barra
 * sfora nei bordi della cella, così un'attività lunga si legge come una fascia
 * continua invece che come tanti rettangoli separati.
 */
function ChipEvento({ segmento }: { segmento: Segmento }) {
  const { evento: e, inizia, finisce } = segmento;

  const stile =
    e.status === 'ANNULLATA'
      ? 'border-line bg-surface2 text-muted line-through'
      : e.status === 'CREATA'
        ? 'border-dashed border-warn/50 bg-warn/10 text-warn'
        : classeColore(e.colore);

  // i bordi verticali restano solo agli estremi: in mezzo la barra prosegue
  const bordi = [
    inizia ? 'rounded-l' : 'rounded-l-none -ml-1 border-l-0',
    finisce ? 'rounded-r' : 'rounded-r-none -mr-1 border-r-0',
  ].join(' ');

  return (
    <Link
      href={`/calendario/${e.id}`}
      onClick={(ev) => ev.stopPropagation()}
      title={`${e.titolo} · ${e.tipo}`}
      className={`block truncate border px-1 py-0.5 text-[10px] leading-tight transition-opacity hover:opacity-80 ${stile} ${bordi}`}
    >
      {inizia ? (
        <>
          <span className="hidden sm:inline">{ora(e.inizio)} </span>
          {e.titolo}
        </>
      ) : (
        <span className="opacity-80">{finisce ? `↔ ${e.titolo}` : '↔'}</span>
      )}
    </Link>
  );
}
