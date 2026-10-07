import { requirePermesso } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { Badge, Intestazione, Vuoto } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { leggiNovita } from '@/lib/novita';
import { VERSIONE } from '@/lib/versione';

export const dynamic = 'force-dynamic';

/** Quante versioni restano aperte; le altre si aprono a una a una. */
const APERTE = 5;

/**
 * Le novità del gestionale, per l'admin: cosa è cambiato in ogni versione,
 * dalla più recente. È il registro delle modifiche (CHANGELOG.md) formattato:
 * le ultime aperte, le precedenti ripiegate, quella che gira evidenziata.
 */
export default async function NovitaPage() {
  await requirePermesso(isAdmin);
  const versioni = await leggiNovita();
  return (
    <>
      <Intestazione
        titolo="Novità"
        sottotitolo={`Cosa è cambiato, versione per versione. Qui gira la ${VERSIONE}.`}
      />
      {versioni.length === 0 ? (
        <Vuoto testo="Il registro delle modifiche non c’è in questa installazione." />
      ) : (
        <div className="space-y-4">
          {versioni.map((v, i) => {
            const qui = v.numero === VERSIONE;
            const testata = (
              <div className="flex flex-wrap items-center gap-2">
                <span className="num text-lg font-semibold text-ink">{v.numero}</span>
                <span className="text-sm text-muted">{v.data}</span>
                {qui && <Badge tono="ok">quella che gira</Badge>}
              </div>
            );
            return i < APERTE ? (
              <section
                key={v.numero}
                className={`card ${qui ? 'border-nvg/50' : ''}`}
                id={`v${v.numero}`}
              >
                {testata}
                <div className="mt-3 text-sm">
                  <Markdown testo={v.testo} />
                </div>
              </section>
            ) : (
              <details key={v.numero} className="card group" id={`v${v.numero}`}>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-2">
                    {testata}
                    <span className="text-xs text-nvg group-open:hidden">Apri ›</span>
                  </div>
                </summary>
                <div className="mt-3 text-sm">
                  <Markdown testo={v.testo} />
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
