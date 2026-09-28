import { Icona } from './Icona';
import { AzioneBottone } from './AzioneBottone';
import { impostaStatoSquadra } from '@/actions/squadre';
import { fmtDate } from '@/lib/format';
import type { StatoSquadra } from '@prisma/client';

/** Affiliata FIGT: la squadra è arrivata (o è stata ritrovata) sul portale. */
export function BadgeFigt({ il }: { il: Date }) {
  return (
    <span
      title={`Affiliata FIGT · dati dal portale del ${fmtDate(il)}`}
      className="badge border-sky-400/40 bg-sky-400/15 text-sky-300"
    >
      FIGT
    </span>
  );
}

export function BadgeGiovanile() {
  return (
    <span className="badge border-amber-400/40 bg-amber-400/15 text-amber-300">
      Settore giovanile
    </span>
  );
}

/** La stella: accesa porta la squadra in cima, spenta la rimette fra le altre. */
export function StellaSquadra({ id, stato }: { id: string; stato: StatoSquadra }) {
  if (stato === 'DISATTIVATA') return null;
  const preferita = stato === 'PREFERITA';
  return (
    <AzioneBottone
      azione={impostaStatoSquadra}
      valori={{ id, stato: preferita ? 'ATTIVA' : 'PREFERITA' }}
      className={`btn-ghost btn-sm px-1.5 ${preferita ? 'text-warn' : 'text-muted'}`}
    >
      <span className="sr-only">{preferita ? 'Togli dalle preferite' : 'Aggiungi alle preferite'}</span>
      <Icona nome="titolare" size={17} />
    </AzioneBottone>
  );
}
