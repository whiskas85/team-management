'use client';

import { useMemo, useState } from 'react';
import { Campo } from './ui';
import type { VoceListino } from './CampiRichiesta';

/**
 * Le due quote di un'attività, composte dal listino come le iscrizioni.
 *
 * Sono due perché chi è in squadra e chi viene da fuori non pagano la stessa
 * cosa: la squadra al massimo divide un contributo campo, un esterno paga la
 * giocata. Le voci del tariffario sono le stesse, cambia quali si spuntano —
 * e su una giocata la voce marcata "giocata esterni" arriva già selezionata,
 * così il caso normale non si configura ogni volta.
 *
 * L'importo scritto a mano vince sulla somma: è lì che si regala una giocata
 * (zero) o si chiede una cifra diversa dal listino.
 */
export function QuoteEvento({
  listino,
  stagioneId,
  costo,
  costoEsterni,
  preselezionaEsterni = false,
}: {
  listino: VoceListino[];
  /** Stagione dell'attività: filtra le voci valide. */
  stagioneId: string | null;
  costo?: number | null;
  costoEsterni?: number | null;
  /** Alla creazione la giocata per gli esterni si propone già spuntata. */
  preselezionaEsterni?: boolean;
}) {
  // Qui si vedono solo le voci che riguardano le attività: iscrizioni, rinnovi
  // e tessere federali stanno nello stesso tariffario ma non c'entrano niente
  // con una giocata, e in mezzo alle altre si spuntano per sbaglio.
  // Di due voci con lo stesso nome vince quella scritta per la stagione.
  const applicabili = useMemo(() => {
    const valide = listino.filter(
      (v) =>
        (v.stagioneId === null || v.stagioneId === stagioneId) &&
        (v.usi.includes('ATTIVITA') || v.usi.includes('GIOCATA_NUOVO')),
    );
    return valide.filter(
      (v) => v.stagioneId === stagioneId || !valide.some((a) => a.nome === v.nome && a.stagioneId),
    );
  }, [listino, stagioneId]);

  const giocate = useMemo(
    () => applicabili.filter((v) => v.usi.includes('GIOCATA_NUOVO')).map((v) => v.id),
    [applicabili],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
      <Quota
        titolo="Quota squadra"
        spiega="Quanto paga chi è in squadra. Vuoto: per loro l'attività è gratis."
        campoImporto="costo"
        campoVoci="tariffeSquadra"
        voci={applicabili}
        importo={costo}
        iniziali={[]}
      />
      <Quota
        titolo="Quota esterni"
        spiega="Quanto paga chi in squadra non è. Vuoto: pagano come la squadra; zero: offerta."
        campoImporto="costoEsterni"
        campoVoci="tariffeEsterni"
        voci={applicabili}
        importo={costoEsterni}
        iniziali={preselezionaEsterni ? giocate : []}
      />
    </div>
  );
}

function Quota({
  titolo,
  spiega,
  campoImporto,
  campoVoci,
  voci,
  importo,
  iniziali,
}: {
  titolo: string;
  spiega: string;
  campoImporto: string;
  campoVoci: string;
  voci: VoceListino[];
  importo?: number | null;
  iniziali: string[];
}) {
  const [scelte, setScelte] = useState<Set<string>>(() => new Set(iniziali));

  const commuta = (id: string) =>
    setScelte((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const totale = voci.filter((v) => scelte.has(v.id)).reduce((t, v) => t + v.importo, 0);

  return (
    <div className="rounded-lg border border-line bg-surface2/40 p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {titolo}
      </p>
      <p className="mb-3 text-[11px] text-muted">{spiega}</p>

      <Campo label="Importo (€)">
        <input
          name={campoImporto}
          type="number"
          step="0.01"
          min="0"
          defaultValue={importo ?? ''}
          className="input"
          placeholder={scelte.size > 0 ? `dal listino: ${totale.toFixed(2)}` : 'niente da pagare'}
        />
      </Campo>

      {voci.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted">
          Nessuna voce per le attività: scrivi l’importo a mano, oppure marca una voce del{' '}
          <strong className="text-ink">Tariffario</strong> come “per le attività”.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[11px] text-muted">Di cosa è fatta</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {voci.map((v) => {
              const attiva = scelte.has(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => commuta(v.id)}
                  className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                    attiva
                      ? 'border-nvg/50 bg-nvg/10 text-nvg'
                      : 'border-line text-muted hover:border-nvgdim'
                  }`}
                >
                  {attiva ? '✓ ' : '+ '}
                  {v.nome}
                  <span className="num ml-1 opacity-80">{v.importo.toFixed(2)} €</span>
                </button>
              );
            })}
          </div>

          {[...scelte].map((id) => (
            <input key={id} type="hidden" name={campoVoci} value={id} />
          ))}

          {scelte.size > 0 && (
            <p className="num mt-2 text-xs text-muted">
              Dal listino: <strong className="text-nvg">{totale.toFixed(2)} €</strong>
              {' · '}
              lasciando vuoto l’importo si chiede questo
            </p>
          )}
        </>
      )}
    </div>
  );
}
