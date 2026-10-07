import { prisma } from '@/lib/db';
import { affiliazioneValida } from '@/lib/figt';
import { fmtDate } from '@/lib/format';
import { Badge } from './ui';
import { AzioneBottone } from './AzioneBottone';
import { aggiornaAffiliazioniFigt } from '@/actions/figt';

/**
 * Le affiliazioni dell'associazione alla FIGT, lette dal portale: una per
 * anno, con le date di validità. Quella che vale oggi è segnata: è il suo
 * codice che usano le polizze prova.
 */
export async function AffiliazioniFigt() {
  const affiliazioni = await prisma.affiliazioneFigt.findMany({
    orderBy: [{ validaDa: 'desc' }, { codice: 'desc' }],
  });
  const oggi = affiliazioneValida(affiliazioni);

  return (
    <div className="mt-3 w-full">
      {affiliazioni.length === 0 ? (
        <p className="text-xs text-muted">Nessuna affiliazione letta dal portale.</p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {affiliazioni.map((a) => (
            <li key={a.codice} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="num font-semibold">{a.codice}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted">
                {a.validaDa ? fmtDate(a.validaDa) : '—'} → {a.validaA ? fmtDate(a.validaA) : '—'}
                {a.tipo ? ` · ${a.tipo}` : ''}
                {a.tesserati !== null && a.limite !== null ? ` · ${a.tesserati}/${a.limite} tesserati` : ''}
              </span>
              {oggi?.codice === a.codice ? (
                <Badge tono="ok">In corso</Badge>
              ) : (
                <Badge tono={a.stato === 'ATTIVA' ? 'neutro' : 'warn'}>
                  {a.stato === 'ATTIVA' ? 'Scaduta' : a.stato.toLowerCase()}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <AzioneBottone
          azione={aggiornaAffiliazioniFigt}
          valori={{}}
          icona="riapri"
          className="btn-ghost btn-sm"
          attesa="Leggo…"
        >
          Rileggi dal portale
        </AzioneBottone>
        {!oggi && affiliazioni.length > 0 && (
          <span className="text-xs text-warn">Nessuna attiva oggi: niente polizze prova.</span>
        )}
      </div>
    </div>
  );
}
