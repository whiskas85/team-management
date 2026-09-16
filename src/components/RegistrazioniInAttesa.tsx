import { AzioneBottone } from './AzioneBottone';
import { approvaRegistrazione, rifiutaRegistrazione } from '@/actions/operatori';

export type RegistrazioneInAttesa = {
  id: string;
  nome: string;
  cognome: string;
  callsign: string | null;
  email: string;
  telefono: string | null;
  nato: string | null;
  luogoNascita: string | null;
  richiestaDel: string;
  consensoImmagini: boolean;
  /** Quando la stessa persona era già stata respinta, se è già successo. */
  giaRespintoIl: string | null;
};

/**
 * Chi bussa, in cima all'elenco Nuovi.
 *
 * Una card per uno, con tutto quello che ha scritto: chi decide non deve
 * andare a cercare i dati in una scheda che non esiste ancora, perché finché
 * non lo si approva questa persona non è nessuno dentro il gestionale.
 *
 * I due pulsanti non sono simmetrici, e si vede: approvare è un gesto
 * normale, respingere cancella una persona e chiede conferma.
 */
export function RegistrazioniInAttesa({ righe }: { righe: RegistrazioneInAttesa[] }) {
  if (righe.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-nvg">
          Da approvare
        </h2>
        <span className="rounded-full bg-nvg px-2 py-0.5 text-[11px] font-semibold text-black">
          {righe.length}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {righe.map((r) => (
          <Card key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
}

function Card({ r }: { r: RegistrazioneInAttesa }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">
            {r.nome} {r.cognome}
            {r.callsign && <span className="ml-2 text-sm text-nvg">«{r.callsign}»</span>}
          </h3>
          <p className="text-xs text-muted">Richiesta del {r.richiestaDel}</p>
        </div>
      </div>

      {/* Chi ci riprova dopo un no: non sappiamo chi fosse — di lui non è
          rimasto niente — ma sappiamo che è già successo, ed è quello che
          serve a chi deve decidere una seconda volta. */}
      {r.giaRespintoIl && (
        <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          Una richiesta con questi stessi dati era già stata respinta il {r.giaRespintoIl}.
        </p>
      )}

      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <Dato etichetta="Email" valore={r.email} />
        <Dato etichetta="Telefono" valore={r.telefono} />
        <Dato etichetta="Nato il" valore={r.nato} />
        <Dato etichetta="Luogo di nascita" valore={r.luogoNascita} />
        <Dato
          etichetta="Foto e immagini"
          valore={r.consensoImmagini ? 'ha dato il consenso' : 'non ha dato il consenso'}
        />
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <AzioneBottone
          azione={approvaRegistrazione}
          valori={{ userId: r.id }}
          icona="approva"
          className="btn-primary btn-sm"
          attesa="Approvo…"
        >
          Approva
        </AzioneBottone>
        <AzioneBottone
          azione={rifiutaRegistrazione}
          valori={{ userId: r.id }}
          conferma={`Respingere la richiesta di ${r.nome} ${r.cognome}? I suoi dati vengono cancellati: resta solo un'impronta che lo riconosce se ci riprova.`}
          icona="rifiuta"
          className="btn-danger btn-sm"
          attesa="Respingo…"
        >
          Rifiuta e cancella
        </AzioneBottone>
      </div>
    </div>
  );
}

function Dato({ etichetta, valore }: { etichetta: string; valore: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.06em] text-muted">{etichetta}</dt>
      <dd className="truncate">{valore || '—'}</dd>
    </div>
  );
}
