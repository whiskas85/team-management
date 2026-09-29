import { fmtEuro } from '@/lib/format';

/**
 * Il conto di una squadra in una riga: dovuto, già in cassa, da confermare,
 * scoperto. I colori dicono a colpo d'occhio se c'è da fare qualcosa.
 */
export function ContoFraSquadre({
  conto,
}: {
  conto: { dovuto: number; incassati: number; inAttesa: number; scoperto: number };
}) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      <span>
        Dovuto <strong className="num">{fmtEuro(conto.dovuto)}</strong>
      </span>
      <span className="text-nvg">
        pagati <span className="num">{fmtEuro(conto.incassati)}</span>
      </span>
      {conto.inAttesa > 0 && (
        <span className="text-warn">
          da confermare <span className="num">{fmtEuro(conto.inAttesa)}</span>
        </span>
      )}
      <span className={conto.scoperto > 0 ? 'font-semibold text-danger' : 'text-muted'}>
        {conto.scoperto > 0 ? (
          <>
            scoperti <span className="num">{fmtEuro(conto.scoperto)}</span>
          </>
        ) : (
          'nulla di scoperto'
        )}
      </span>
    </span>
  );
}
