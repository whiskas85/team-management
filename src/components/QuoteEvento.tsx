'use client';

import { useMemo, useState } from 'react';
import { Campo } from './ui';
import { Icona, type NomeIcona } from './Icona';
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
 * L'importo scritto a mano **si somma** alle voci spuntate: 40 € di corso più
 * «Costo Partita» da 10 fanno 50, e il totale si legge sotto mentre si
 * compone. Zero, senza voci, è una giocata regalata.
 */
/**
 * Le voci del listino che riguardano le attività, per la stagione giusta.
 *
 * Iscrizioni, rinnovi e tessere federali stanno nello stesso tariffario ma con
 * una giocata non c'entrano, e in mezzo alle altre si spuntano per sbaglio. Di
 * due voci con lo stesso nome vince quella scritta per la stagione. Sta fuori
 * dal componente perché la stessa scelta serve anche a chi aggiunge un nuovo e
 * deve decidere al volo quanto paga.
 */
export function vociAttivita(listino: VoceListino[], stagioneId: string | null) {
  const valide = listino.filter(
    (v) =>
      (v.stagioneId === null || v.stagioneId === stagioneId) &&
      (v.usi.includes('ATTIVITA') || v.usi.includes('GIOCATA_NUOVO')),
  );
  return valide.filter(
    (v) => v.stagioneId === stagioneId || !valide.some((a) => a.nome === v.nome && a.stagioneId),
  );
}

export function QuoteEvento({
  listino,
  stagioneId,
  costo,
  costoEsterni,
  preselezionaEsterni = false,
  mostraEsterni = true,
  giorni = 1,
}: {
  listino: VoceListino[];
  /** Stagione dell'attività: filtra le voci valide. */
  stagioneId: string | null;
  costo?: number | null;
  costoEsterni?: number | null;
  /** Alla creazione la giocata per gli esterni si propone già spuntata. */
  preselezionaEsterni?: boolean;
  /**
   * Su un'attività riservata alla squadra la quota esterni non si mostra: non
   * verrà mai a nessuno, e due caselle di prezzo affiancate sono il modo più
   * facile per scrivere la cifra in quella sbagliata.
   */
  mostraEsterni?: boolean;
  /** Quanti giorni occupa l'attività: le voci «al giorno» contano per ognuno. */
  giorni?: number;
}) {
  // Qui si vedono solo le voci che riguardano le attività: iscrizioni, rinnovi
  // e tessere federali stanno nello stesso tariffario ma non c'entrano niente
  // con una giocata, e in mezzo alle altre si spuntano per sbaglio.
  // Di due voci con lo stesso nome vince quella scritta per la stagione.
  const applicabili = useMemo(() => vociAttivita(listino, stagioneId), [listino, stagioneId]);

  const giocate = useMemo(
    () => applicabili.filter((v) => v.usi.includes('GIOCATA_NUOVO')).map((v) => v.id),
    [applicabili],
  );

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:col-span-2 ${mostraEsterni ? 'sm:grid-cols-2' : ''}`}
    >
      <Quota
        titolo="Quota squadra"
        icona="squadra"
        spiega="Quanto paga chi è in squadra. Vuoto: per loro l'attività è gratis."
        campoImporto="costo"
        campoVoci="tariffeSquadra"
        giorni={giorni}
        voci={applicabili}
        importo={costo}
        iniziali={[]}
      />
      {mostraEsterni ? (
        <Quota
          titolo="Quota esterni"
          icona="nuovi"
          spiega="Quanto paga chi in squadra non è: importo e voci si sommano. Vuoto e senza voci: pagano come la squadra; zero: offerta."
          campoImporto="costoEsterni"
          campoVoci="tariffeEsterni"
          giorni={giorni}
          voci={applicabili}
          importo={costoEsterni}
          iniziali={preselezionaEsterni ? giocate : []}
        />
      ) : (
        <p className="text-[11px] text-muted sm:col-span-2">
          Questa attività è riservata alla squadra: la quota esterni non serve. Comparirà se la
          aprirai anche a chi in squadra non è, o se ci aggiungi un nuovo.
        </p>
      )}
    </div>
  );
}

export function Quota({
  titolo,
  icona,
  spiega,
  campoImporto,
  campoVoci,
  voci,
  importo,
  iniziali,
  giorni = 1,
}: {
  titolo: string;
  icona: NomeIcona;
  spiega: string;
  campoImporto: string;
  campoVoci: string;
  voci: VoceListino[];
  importo?: number | null;
  iniziali: string[];
  giorni?: number;
}) {
  const [scelte, setScelte] = useState<Set<string>>(() => new Set(iniziali));
  // l'importo si tiene in mano per poter scrivere il totale mentre si compone
  const [aMano, setAMano] = useState(importo != null ? String(importo) : '');

  const commuta = (id: string) =>
    setScelte((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // le voci «al giorno» contano una volta per ogni giorno dell'attività
  const volte = (v: VoceListino) => (v.perGiorno ? giorni : 1);
  const totale = voci
    .filter((v) => scelte.has(v.id))
    .reduce((t, v) => t + v.importo * volte(v), 0);
  const conGiorni = voci.some((v) => scelte.has(v.id) && v.perGiorno);
  // l'importo scritto a mano si aggiunge alle voci: 40 più 10 fa 50
  const base = Number(aMano) || 0;
  const complessivo = base + totale;

  return (
    <div className="rounded-lg border border-line bg-surface2/40 p-3">
      {/* l'icona distingue le due caselle a colpo d'occhio: sono uguali, e
          quello che cambia è chi paga */}
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        <Icona nome={icona} size={14} />
        {titolo}
      </p>
      <p className="mb-3 text-[11px] text-muted">{spiega}</p>

      <Campo label="Importo (€)">
        <input
          name={campoImporto}
          type="number"
          step="0.01"
          min="0"
          value={aMano}
          onChange={(e) => setAMano(e.target.value)}
          className="input"
          placeholder={scelte.size > 0 ? 'si aggiunge alle voci' : 'niente da pagare'}
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
                  <span className="num ml-1 opacity-80">
                    {v.importo.toFixed(2)} €{v.perGiorno ? ' /giorno' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {[...scelte].map((id) => (
            <input key={id} type="hidden" name={campoVoci} value={id} />
          ))}

          {scelte.size > 0 && (
            <p className="num mt-2 text-xs text-muted">
              {base > 0 ? (
                <>
                  {base.toFixed(2)} € + voci {totale.toFixed(2)} € ={' '}
                  <strong className="text-nvg">{complessivo.toFixed(2)} €</strong>
                </>
              ) : (
                <>
                  Dal listino: <strong className="text-nvg">{totale.toFixed(2)} €</strong>
                </>
              )}
              {' · '}
              è quello che si chiede
            </p>
          )}
          {conGiorni && (
            <p className="mt-1 text-[11px] text-muted">
              Le voci al giorno contano {giorni === 1 ? 'un giorno' : `${giorni} giorni`}, quelli
              dell’attività: se ne cambi le date, il conto si rifà quando salvi.
            </p>
          )}
        </>
      )}
    </div>
  );
}
