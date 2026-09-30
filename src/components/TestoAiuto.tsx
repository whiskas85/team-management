import type { ReactNode } from 'react';
import { Icona, eIcona, type NomeIcona } from './Icona';
import type { Tono } from '@/lib/domain';
import { SEGNAPOSTO } from '@/lib/aiuto';

/*
 * I testi dell'aiuto con dentro i pulsanti veri.
 *
 * «Premi Paga» si capisce a metà: il pulsante, visto, si riconosce subito
 * sulla pagina. Qui i segnaposto scritti in lib/aiuto.ts diventano copie dei
 * pulsanti, dei badge e delle icone del gestionale — stesse classi, stessi
 * colori — solo che non si premono: sono figure, non comandi.
 */

// gli stessi colori di Badge (ui.tsx), scritti qui: ui.tsx carica già l'aiuto
// per il «?» accanto al titolo, e importarlo da qui farebbe un giro chiuso
const TONI: Record<Tono, string> = {
  ok: 'border-nvg/40 bg-nvg/10 text-nvg',
  warn: 'border-warn/40 bg-warn/10 text-warn',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  info: 'border-info/40 bg-info/10 text-info',
  neutro: 'border-line bg-surface2 text-muted',
};

/** Una figura sta nella riga del testo, un filo più piccola di com'è sulla pagina. */
const IN_RIGA = 'pointer-events-none mx-0.5 select-none align-middle';

const ADESIONE: Record<string, { testo: string; icona: NomeIcona; classe: string }> = {
  si: { testo: 'Ci sono', icona: 'presente', classe: 'border-nvg bg-nvg/15 text-nvg' },
  forse: { testo: 'Forse', icona: 'forse', classe: 'border-warn bg-warn/15 text-warn' },
  no: { testo: 'Non ci sono', icona: 'assente', classe: 'border-danger bg-danger/15 text-danger' },
};

function Pulsante({ classe, icona, testo }: { classe: string; icona?: string; testo: string }) {
  return (
    <span className={`${classe} btn-sm ${IN_RIGA}`}>
      {icona && eIcona(icona) && <Icona nome={icona} size={14} />}
      {testo}
    </span>
  );
}

function Figura({ tipo, arg, testo }: { tipo: string; arg?: string; testo?: string }): ReactNode {
  switch (tipo) {
    case 'p':
      return <Pulsante classe="btn-primary" icona={arg} testo={testo ?? ''} />;
    case 'g':
      return <Pulsante classe="btn-ghost" icona={arg} testo={testo ?? ''} />;
    case 'd':
      return <Pulsante classe="btn-danger" icona={arg} testo={testo ?? ''} />;
    case 'x':
      // il cestino rosso delle card
      return (
        <span className={`btn-danger btn-sm px-2 ${IN_RIGA}`} title="Cestino">
          <Icona nome="elimina" size={14} />
        </span>
      );
    case 'si':
    case 'forse':
    case 'no': {
      // la versione della card: solo l'icona, accesa
      const a = ADESIONE[tipo];
      return (
        <span className={`inline-flex rounded-md border p-1 ${a.classe} ${IN_RIGA}`} title={a.testo}>
          <Icona nome={a.icona} size={14} />
        </span>
      );
    }
    case 'adesione':
      // i tre pulsanti grandi della scheda, spenti come prima di rispondere
      return (
        <span className={`inline-flex gap-1 ${IN_RIGA}`}>
          {Object.values(ADESIONE).map((a) => (
            <span
              key={a.testo}
              className="inline-flex flex-col items-center gap-0.5 rounded-md border border-line bg-surface2 px-2 py-1 text-[10px] text-muted"
            >
              <Icona nome={a.icona} size={14} />
              {a.testo}
            </span>
          ))}
        </span>
      );
    case 'b': {
      // b:tono o b:tono:icona
      const [tono, icona] = (arg ?? 'neutro').split(':');
      const colori = TONI[tono as Tono] ?? TONI.neutro;
      return (
        <span className={`badge ${colori} ${IN_RIGA}`}>
          {icona && eIcona(icona) && <Icona nome={icona} size={12} />}
          {testo}
        </span>
      );
    }
    case 'v':
      // una vista scelta, come nel selettore in cima alle pagine
      return (
        <span className={`inline-flex rounded-md border border-line p-0.5 ${IN_RIGA}`}>
          <span className="rounded bg-nvg/15 px-2 py-0.5 text-xs text-nvg">{testo}</span>
        </span>
      );
    case 'i':
      return arg && eIcona(arg) ? (
        <span className={`inline-flex text-ink ${IN_RIGA}`} title={testo}>
          <Icona nome={arg} size={16} riempi={testo === 'piena'} />
        </span>
      ) : null;
    case 'naviga':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md border border-nvg/40 bg-nvg/10 px-2 py-1 text-[11px] font-medium text-nvg ${IN_RIGA}`}
        >
          <Icona nome="naviga" size={12} />
          Naviga
        </span>
      );
    default:
      return testo ?? null;
  }
}

/** Il grassetto, fra doppi asterischi: per i nomi delle cose da cercare sulla pagina. */
function conGrassetto(testo: string, chiave: string): ReactNode[] {
  return testo.split(/\*\*(.+?)\*\*/g).map((pezzo, i) =>
    i % 2 === 1 ? (
      <strong key={`${chiave}-${i}`} className="font-semibold text-ink">
        {pezzo}
      </strong>
    ) : (
      pezzo
    ),
  );
}

/** Un testo dell'aiuto, con le figure al posto dei segnaposto. */
export function TestoAiuto({ testo }: { testo: string }) {
  const pezzi: ReactNode[] = [];
  let ultimo = 0;
  for (const m of testo.matchAll(SEGNAPOSTO)) {
    const i = m.index ?? 0;
    pezzi.push(...conGrassetto(testo.slice(ultimo, i), `t${i}`));
    pezzi.push(<Figura key={`f${i}`} tipo={m[1]} arg={m[2]} testo={m[3]} />);
    ultimo = i + m[0].length;
  }
  pezzi.push(...conGrassetto(testo.slice(ultimo), 'fine'));
  return <>{pezzi}</>;
}
