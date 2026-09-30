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
      className="badge border-info/40 bg-info/15 text-info"
    >
      FIGT
    </span>
  );
}

export function BadgeGiovanile() {
  return (
    <span className="badge border-warn/40 bg-warn/15 text-warn">
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
