import Link from 'next/link';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { Badge } from './ui';
import { Icona } from './Icona';

export type Assicurazione = {
  id: string;
  giorno: Date;
  valeIl: Date | null;
  codice: string | null;
  polizzaInfortuni: string | null;
  emessaIl: Date | null;
  richiestaIl: Date | null;
  valida: boolean;
  event: { id: string; titolo: string } | null;
  assicurato: {
    nome: string;
    cognome: string;
    callsign: string | null;
    dataNascita: Date | null;
    luogoNascita: string | null;
    codiceFiscale: string | null;
  };
  /** Chi l'ha stipulata, se si vuole dire: nell'elenco dell'admin. */
  stipulataDa?: string | null;
};

function Riga({ etichetta, valore, num = false }: { etichetta: string; valore: string | null; num?: boolean }) {
  if (!valore) return null;
  return (
    <div className="flex flex-wrap justify-between gap-x-4 text-sm">
      <dt className="text-muted">{etichetta}</dt>
      <dd className={`text-right ${num ? 'num font-medium' : ''}`}>{valore}</dd>
    </div>
  );
}

/**
 * Un'assicurazione giornaliera, come si mostra a chi è coperto: sopra i dati
 * della polizza (i numeri da dare se succede qualcosa, e fino a quando vale),
 * sotto quelli dell'assicurato. Quella valida è evidenziata.
 */
export function CardAssicurazione({ a }: { a: Assicurazione }) {
  const vale = a.valeIl
    ? `fino al ${fmtDateTime(a.valeIl)}`
    : `${fmtDate(a.giorno)}, fino alle 24:00`;
  return (
    <div className={`card space-y-4 ${a.valida ? 'border-nvg/50 shadow-nvg' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icona nome="scudo" size={20} />
          <div>
            <p className="font-semibold">Polizza giornaliera FIGT</p>
            <p className="text-xs text-muted">{vale}</p>
          </div>
        </div>
        <Badge tono={a.valida ? 'ok' : 'neutro'}>{a.valida ? 'Valida' : 'Scaduta'}</Badge>
      </div>

      <div>
        <p className="titolo-sezione mb-1.5">Assicurazione</p>
        <dl className="space-y-1">
          <Riga etichetta="Polizza prova n." valore={a.codice} num />
          <Riga etichetta="Polizza infortuni (AIG)" valore={a.polizzaInfortuni} num />
          <Riga etichetta="Giorno coperto" valore={fmtDate(a.giorno)} />
          <Riga etichetta="Emessa il" valore={a.emessaIl ? fmtDateTime(a.emessaIl) : null} />
          {a.stipulataDa !== undefined && (
            <Riga etichetta="Stipulata da" valore={a.stipulataDa ?? 'in automatico'} />
          )}
        </dl>
        {a.event && (
          <p className="mt-2 text-sm">
            Per{' '}
            <Link href={`/calendario/${a.event.id}`} className="text-nvg hover:underline">
              {a.event.titolo}
            </Link>
          </p>
        )}
      </div>

      <div className="border-t border-line pt-3">
        <p className="titolo-sezione mb-1.5">Assicurato</p>
        <dl className="space-y-1">
          <Riga
            etichetta="Nome"
            valore={`${a.assicurato.nome} ${a.assicurato.cognome}${a.assicurato.callsign ? ` · ${a.assicurato.callsign}` : ''}`}
          />
          <Riga
            etichetta="Nato"
            valore={
              a.assicurato.dataNascita
                ? `${fmtDate(a.assicurato.dataNascita)}${a.assicurato.luogoNascita ? ` a ${a.assicurato.luogoNascita}` : ''}`
                : null
            }
          />
          <Riga etichetta="Codice fiscale" valore={a.assicurato.codiceFiscale} num />
        </dl>
      </div>
    </div>
  );
}
