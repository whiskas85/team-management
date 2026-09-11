'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Campo } from './ui';
import { Icona, type NomeIcona } from './Icona';
import type { VoceListino } from './CampiRichiesta';

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

/** La quota di un'altra cassa com'è nel modulo: importo a mano e voci spuntate. */
export type QuotaCassaModulo = {
  cassaId: string;
  cassa: string;
  descrizione: string;
  importo: number | null;
  voci: string[];
  importoEsterni: number | null;
  vociEsterni: string[];
};

/**
 * Le quote di un'attività, cassa per cassa, in un modulo solo.
 *
 * Un'attività può chiedere soldi a più casse: il Corso CQB chiede la giornata
 * a Marco e l'istruttore a SAT & Gaming, e magari qualcosa al club. Ogni cassa
 * ha il suo blocco, con le due quote — chi è in squadra e chi viene da fuori —
 * e le voci del **suo** tariffario: una voce di Marco sta nel blocco di Marco,
 * e non si confonde con quelle del club. Si aggiunge una cassa dalla tendina
 * in fondo e la si toglie dal suo blocco, senza uscire dal modulo.
 *
 * L'importo scritto a mano **si somma** alle voci spuntate: 40 € di corso più
 * «Costo Partita» da 10 fanno 50, e il totale si legge sotto mentre si
 * compone. Zero, senza voci, è una giocata regalata. Le voci spuntate si
 * ricordano: riaprendo il modulo sono ancora lì.
 */
export function QuoteEvento({
  listino,
  stagioneId,
  costo,
  costoEsterni,
  vociSquadra = [],
  vociEsterni = [],
  quoteCasse,
  casse = [],
  preselezionaEsterni = false,
  mostraEsterni = true,
  giorni = 1,
}: {
  listino: VoceListino[];
  /** Stagione dell'attività: filtra le voci valide. */
  stagioneId: string | null;
  /** Gli importi scritti a mano della quota del club. */
  costo?: number | null;
  costoEsterni?: number | null;
  /** Le voci del club già spuntate. */
  vociSquadra?: string[];
  vociEsterni?: string[];
  /** Le quote delle altre casse che l'attività ha già. */
  quoteCasse?: QuotaCassaModulo[];
  /** Le casse a cui si può chiedere una quota. */
  casse?: { id: string; nome: string }[];
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
  const applicabili = useMemo(() => vociAttivita(listino, stagioneId), [listino, stagioneId]);
  const vociDi = (cassaId: string | null) =>
    applicabili.filter((v) => (v.cassaId ?? null) === cassaId);

  // la giocata degli esterni, su un'attività nuova, arriva già spuntata nel
  // blocco della sua cassa: il caso normale non si configura ogni volta
  const giocate = applicabili.filter((v) => v.usi.includes('GIOCATA_NUOVO'));

  const [blocchi, setBlocchi] = useState<QuotaCassaModulo[]>(() => {
    if (quoteCasse) return quoteCasse;
    if (!preselezionaEsterni) return [];
    const perCassa = new Map<string, QuotaCassaModulo>();
    for (const v of giocate) {
      if (!v.cassaId) continue;
      const b = perCassa.get(v.cassaId) ?? {
        cassaId: v.cassaId,
        cassa: v.cassa ?? 'Cassa',
        descrizione: '',
        importo: null,
        voci: [],
        importoEsterni: null,
        vociEsterni: [],
      };
      b.vociEsterni.push(v.id);
      perCassa.set(v.cassaId, b);
    }
    return [...perCassa.values()];
  });

  const aggiungibili = casse.filter((c) => !blocchi.some((b) => b.cassaId === c.id));
  const aggiungi = (id: string) => {
    const c = casse.find((x) => x.id === id);
    if (!c) return;
    setBlocchi((bs) => [
      ...bs,
      {
        cassaId: c.id,
        cassa: c.nome,
        descrizione: '',
        importo: null,
        voci: [],
        importoEsterni: null,
        vociEsterni: [],
      },
    ]);
  };
  const togli = (id: string) => setBlocchi((bs) => bs.filter((b) => b.cassaId !== id));

  const coppia = (squadra: ReactNode, esterni: ReactNode) => (
    <div className={`grid grid-cols-1 gap-3 ${mostraEsterni ? 'sm:grid-cols-2' : ''}`}>
      {squadra}
      {mostraEsterni && esterni}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* il modulo le ha mostrate: salvando si aggiornano, e un blocco tolto
          toglie la quota di quella cassa */}
      <input type="hidden" name="quoteCasse" value="1" />

      <Blocco titolo="Club" sottotitolo="La quota di sempre: la incassa la segreteria.">
        {coppia(
          <Quota
            titolo="Squadra"
            icona="squadra"
            spiega="Quanto paga chi è in squadra. Vuoto: per loro l'attività è gratis."
            campoImporto="costo"
            campoVoci="tariffeSquadra"
            giorni={giorni}
            voci={vociDi(null)}
            importo={costo}
            iniziali={vociSquadra}
          />,
          <Quota
            titolo="Esterni"
            icona="nuovi"
            spiega="Quanto paga chi in squadra non è: importo e voci si sommano. Vuoto e senza voci: pagano come la squadra; zero: offerta."
            campoImporto="costoEsterni"
            campoVoci="tariffeEsterni"
            giorni={giorni}
            voci={vociDi(null)}
            importo={costoEsterni}
            iniziali={
              preselezionaEsterni
                ? giocate.filter((v) => !v.cassaId).map((v) => v.id)
                : vociEsterni
            }
          />,
        )}
      </Blocco>

      {blocchi.map((b) => {
        const campo = (n: string) => `cassa_${b.cassaId}_${n}`;
        return (
          <Blocco
            key={b.cassaId}
            titolo={b.cassa}
            sottotitolo="Si paga a chi tiene questa cassa: non passa dalla segreteria."
            onTogli={() => togli(b.cassaId)}
          >
            <input type="hidden" name="cassaQuota" value={b.cassaId} />
            <Campo label="A cosa serve">
              <input
                name={campo('descrizione')}
                defaultValue={b.descrizione}
                className="input"
                placeholder="es. Istruttore, giornata di gioco"
              />
            </Campo>
            {coppia(
              <Quota
                titolo="Squadra"
                icona="squadra"
                spiega="Quanto paga a questa cassa chi è in squadra. Vuoto: niente."
                campoImporto={campo('squadra')}
                campoVoci={campo('vociSquadra')}
                giorni={giorni}
                voci={vociDi(b.cassaId)}
                importo={b.importo}
                iniziali={b.voci}
              />,
              <Quota
                titolo="Esterni"
                icona="nuovi"
                spiega="Quanto paga a questa cassa chi in squadra non è. Vuoto e senza voci: come la squadra; zero: niente."
                campoImporto={campo('esterni')}
                campoVoci={campo('vociEsterni')}
                giorni={giorni}
                voci={vociDi(b.cassaId)}
                importo={b.importoEsterni}
                iniziali={b.vociEsterni}
              />,
            )}
          </Blocco>
        );
      })}

      {aggiungibili.length > 0 && (
        <select
          className="input max-w-sm"
          value=""
          onChange={(e) => aggiungi(e.target.value)}
          aria-label="Aggiungi la quota di un'altra cassa"
        >
          <option value="">+ aggiungi la quota di un’altra cassa</option>
          {aggiungibili.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      )}

      {!mostraEsterni && (
        <p className="text-[11px] text-muted">
          Questa attività è riservata alla squadra: la quota esterni non serve. Comparirà se la
          aprirai anche a chi in squadra non è, o se ci aggiungi un nuovo.
        </p>
      )}
    </div>
  );
}

/** Il blocco di una cassa: il suo nome, a chi si paga, e le sue quote. */
function Blocco({
  titolo,
  sottotitolo,
  onTogli,
  children,
}: {
  titolo: string;
  sottotitolo: string;
  onTogli?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{titolo}</p>
          <p className="text-[11px] text-muted">{sottotitolo}</p>
        </div>
        {onTogli && (
          <button
            type="button"
            onClick={onTogli}
            className="shrink-0 text-xs text-danger hover:underline"
          >
            togli
          </button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
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
  // si parte dalle voci già spuntate che esistono ancora nel listino
  const [scelte, setScelte] = useState<Set<string>>(
    () => new Set(iniziali.filter((id) => voci.some((v) => v.id === id))),
  );
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
          Nessuna voce per le attività in questa cassa: scrivi l’importo a mano, oppure marca una
          voce del <strong className="text-ink">Tariffario</strong> come “per le attività”.
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
