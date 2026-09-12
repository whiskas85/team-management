'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Campo } from './ui';

export type VoceListino = {
  id: string;
  nome: string;
  importo: number;
  usi: string[];
  /** null = vale per tutte le stagioni. */
  stagioneId: string | null;
  /** Si conta una volta per ogni giorno dell'attività. */
  perGiorno?: boolean;
  /** La cassa a cui vanno i soldi, e come si chiama: vuota, il club. */
  cassaId?: string | null;
  cassa?: string | null;
  /** La quota che la contiene paga la polizza giornaliera. */
  perPolizza?: boolean;
};

/**
 * I campi di una richiesta di iscrizione: tipo, stagione e composizione della
 * quota. Sta qui e non duplicato nelle due pagine perché l'invio massivo e
 * l'invito al singolo devono chiedere esattamente le stesse cose: quando erano
 * due moduli distinti hanno preso strade diverse.
 */
export function CampiRichiesta({
  stagioni,
  stagioneId,
  listino,
  tipoIniziale = 'REISCRIZIONE',
  azione,
}: {
  stagioni: { id: string; nome: string }[];
  stagioneId: string;
  listino: VoceListino[];
  tipoIniziale?: 'ISCRIZIONE' | 'REISCRIZIONE';
  /** Pulsante da mettere in linea con i campi, quando serve (invio massivo). */
  azione?: ReactNode;
}) {
  const [tipo, setTipo] = useState<'ISCRIZIONE' | 'REISCRIZIONE'>(tipoIniziale);
  const [stagione, setStagione] = useState(stagioneId);

  // il listino arriva intero e si filtra qui: cambiando stagione nella tendina
  // devono cambiare anche le voci, e il server ha gia' risposto da un pezzo.
  // Di due voci con lo stesso nome vince quella scritta per la stagione.
  const applicabili = useMemo(() => {
    const valide = listino.filter((v) => v.stagioneId === null || v.stagioneId === stagione);
    return valide.filter(
      (v) => v.stagioneId === stagione || !valide.some((a) => a.nome === v.nome && a.stagioneId),
    );
  }, [listino, stagione]);

  // di partenza si spuntano le voci agganciate al tipo di richiesta: le altre
  // (cassa comune, contributi…) si aggiungono a mano
  const [voci, setVoci] = useState<Set<string>>(
    () =>
      new Set(
        listino
          .filter(
            (v) =>
              v.usi.includes(tipoIniziale) &&
              (v.stagioneId === null || v.stagioneId === stagioneId),
          )
          .map((v) => v.id),
      ),
  );

  // cambiando tipo si rifanno le voci automatiche, lasciando stare quelle
  // aggiunte a mano. Un automatismo puo' essere fatto di piu' voci: si
  // spuntano tutte quelle che lo dichiarano
  const cambiaTipo = (nuovo: 'ISCRIZIONE' | 'REISCRIZIONE') => {
    setTipo(nuovo);
    setVoci((s) => {
      const n = new Set(s);
      for (const v of applicabili) {
        if (v.usi.includes('ISCRIZIONE') || v.usi.includes('REISCRIZIONE')) n.delete(v.id);
      }
      for (const v of applicabili) {
        if (v.usi.includes(nuovo)) n.add(v.id);
      }
      return n;
    });
  };

  // cambiando stagione si riparte dalle voci automatiche di quella: tenere
  // spuntata una tariffa di un altro anno sarebbe un errore silenzioso
  const cambiaStagione = (nuova: string) => {
    setStagione(nuova);
    const valide = listino.filter((v) => v.stagioneId === null || v.stagioneId === nuova);
    const vincenti = valide.filter(
      (v) => v.stagioneId === nuova || !valide.some((a) => a.nome === v.nome && a.stagioneId),
    );
    setVoci(new Set(vincenti.filter((v) => v.usi.includes(tipo)).map((v) => v.id)));
  };

  const commuta = (id: string) =>
    setVoci((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const totale = applicabili.filter((v) => voci.has(v.id)).reduce((t, v) => t + v.importo, 0);

  return (
    <>
      <div className={`grid grid-cols-1 gap-4 ${azione ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
        <Campo label="Tipo di richiesta">
          <select
            name="tipo"
            className="input"
            value={tipo}
            onChange={(e) => cambiaTipo(e.target.value as 'ISCRIZIONE')}
          >
            <option value="REISCRIZIONE">Reiscrizione (rinnovo)</option>
            <option value="ISCRIZIONE">Iscrizione (primo tesseramento)</option>
          </select>
        </Campo>

        <Campo label="Stagione">
          <select
            name="stagioneId"
            value={stagione}
            onChange={(e) => cambiaStagione(e.target.value)}
            className="input"
          >
            {stagioni.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Quota (€)">
          <input
            name="quota"
            type="number"
            step="0.01"
            min="0"
            className="input"
            placeholder={voci.size > 0 ? `dal listino: ${totale.toFixed(2)}` : 'scrivi l’importo'}
          />
        </Campo>

        {azione && <div className="flex items-end">{azione}</div>}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Di cosa è fatta la quota
        </p>

        {applicabili.length === 0 ? (
          <p className="text-xs text-muted">
            Nessuna voce a listino per questa stagione: scrivi la quota a mano, oppure impostala in{' '}
            <strong className="text-ink">Tariffario</strong>.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {applicabili.map((v) => {
                const attiva = voci.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => commuta(v.id)}
                    className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      attiva
                        ? 'border-nvg/50 bg-nvg/10 text-nvg'
                        : 'border-line text-muted hover:border-nvgdim'
                    }`}
                  >
                    {attiva ? '✓ ' : '+ '}
                    {v.nome}
                    <span className="num ml-1.5 opacity-80">{v.importo.toFixed(2)} €</span>
                  </button>
                );
              })}
            </div>

            {[...voci].map((id) => (
              <input key={id} type="hidden" name="tariffe" value={id} />
            ))}

            <p className="num mt-2 text-sm">
              Totale:{' '}
              <strong className={totale > 0 ? 'text-nvg' : 'text-muted'}>
                {totale.toFixed(2)} €
              </strong>
            </p>
          </>
        )}
      </div>

      <p className="mt-2 text-xs text-muted">
        {voci.size > 0
          ? 'Lasciando vuoto il campo Quota si richiede il totale delle voci spuntate. Scrivendo un importo vale quello, solo per questo invio.'
          : 'Nessuna voce spuntata: scrivi tu la quota, altrimenti non verrà richiesto nulla.'}
      </p>
    </>
  );
}
