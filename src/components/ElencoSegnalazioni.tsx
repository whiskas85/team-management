import Link from 'next/link';
import { Badge } from './ui';
import { Icona } from './Icona';
import { fmtDateTime } from '@/lib/format';
import { etichettaStatoSegnalazione, tonoStatoSegnalazione } from '@/lib/segnalazioni-canali';
import type { StatoSegnalazioneCanale } from '@prisma/client';

export type VoceSegnalazione = {
  id: string;
  titolo: string;
  stato: StatoSegnalazioneCanale;
  anonima: boolean;
  aggiornataIl: Date;
  canale: string;
  /** Chi l'ha scritta, come la vede chi guarda: null quando è anonima o è sua. */
  chi: string | null;
  /** C'è qualcosa di nuovo per chi guarda. */
  nuova: boolean;
  risposte: number;
};

/** Le segnalazioni in fila: una riga a testa, il pallino su quelle con del nuovo. */
export function ElencoSegnalazioni({
  voci,
  conCanale = true,
}: {
  voci: VoceSegnalazione[];
  /** Si dice il canale: fuori dalla pagina del canale. */
  conCanale?: boolean;
}) {
  return (
    <div className="space-y-2">
      {voci.map((s) => (
        <Link
          key={s.id}
          href={`/segnalazioni/${s.id}`}
          className={`card flex items-start gap-3 transition-colors hover:border-nvgdim ${
            s.stato === 'CHIUSA' ? 'opacity-70' : ''
          }`}
        >
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.nuova ? 'bg-nvg' : 'bg-transparent'}`}
            aria-label={s.nuova ? 'Novità' : undefined}
          />
          <div className="min-w-0 flex-1">
            <p className={`break-words ${s.nuova ? 'font-semibold' : 'font-medium'}`}>{s.titolo}</p>
            <p className="num mt-0.5 text-xs text-muted">
              {conCanale && <>{s.canale} · </>}
              {/* anonima lo dice il badge: qui sarebbe doppio */}
              {!s.anonima && <>{s.chi ?? 'col tuo nome'} · </>}
              {fmtDateTime(s.aggiornataIl)}
              {s.risposte > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
                    <Icona nome="commento" size={11} /> {s.risposte}
                  </span>
                </>
              )}
            </p>
          </div>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <Badge tono={tonoStatoSegnalazione[s.stato]}>
              {etichettaStatoSegnalazione[s.stato]}
            </Badge>
            {s.anonima && <BadgeAnonima />}
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Anonima: si dice sempre, in parole intere, dove la segnalazione si vede. */
export function BadgeAnonima() {
  return (
    <span
      title="Il nome di chi l’ha scritta non lo vede nessuno, nemmeno l’admin"
      className="badge border-violet-400/40 bg-violet-400/15 text-violet-300"
    >
      <Icona nome="scudo" size={11} /> Segnalazione anonima
    </span>
  );
}

/** Col nome: chi l'ha scritta si sa. */
export function BadgeNominale({ chi }: { chi: string }) {
  return (
    <span className="badge border-line bg-surface2 text-ink/80">
      <Icona nome="profilo" size={11} /> Firmata da {chi}
    </span>
  );
}

/**
 * Come si firma in un canale, detto in grande: chi sta per scrivere deve
 * saperlo prima ancora di leggere il resto — soprattutto se è anonimo.
 */
export function BadgeFirmaCanale({
  firma,
  grande = false,
}: {
  firma: 'NOMINALE' | 'ANONIMA' | 'A_SCELTA';
  /** In cima alla pagina del canale: più grosso, con la spiegazione. */
  grande?: boolean;
}) {
  const misura = grande
    ? 'gap-2 px-3.5 py-1.5 text-sm font-semibold'
    : 'gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold';
  const icona = grande ? 16 : 12;
  if (firma === 'ANONIMA') {
    return (
      <span
        title="Il nome di chi scrive non lo vede nessuno, nemmeno l’admin"
        className={`inline-flex items-center rounded-full border-2 border-violet-400/70 bg-violet-500/25 uppercase tracking-[0.06em] text-violet-200 ${misura}`}
      >
        <Icona nome="scudo" size={icona} /> Anonime
        {grande && (
          <span className="font-normal normal-case tracking-normal text-violet-200/80">
            · il tuo nome non lo vede nessuno, nemmeno l’admin
          </span>
        )}
      </span>
    );
  }
  if (firma === 'A_SCELTA') {
    return (
      <span
        className={`inline-flex items-center rounded-full border-2 border-violet-400/40 bg-violet-400/10 uppercase tracking-[0.06em] text-violet-300 ${misura}`}
      >
        <Icona nome="scudo" size={icona} /> Anonime o col nome
        {grande && (
          <span className="font-normal normal-case tracking-normal text-violet-200/80">
            · scegli tu, ogni volta
          </span>
        )}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 border-line bg-surface2 uppercase tracking-[0.06em] text-ink/85 ${misura}`}
    >
      <Icona nome="profilo" size={icona} /> Col nome
      {grande && (
        <span className="font-normal normal-case tracking-normal text-muted">
          · chi gestisce vede chi ha scritto
        </span>
      )}
    </span>
  );
}
