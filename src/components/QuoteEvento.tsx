'use client';

import { useMemo, useState } from 'react';
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

/** Una quota aggiunta con il + su questa attività: vale solo qui. */
export type VoceAttivitaModulo = {
  /** C'era già: si aggiorna invece di crearne un'altra. */
  id?: string;
  chiave: string;
  nome: string;
  importo: number;
  cassaId: string | null;
  cassa: string | null;
  scelta: boolean;
  /** Paga la polizza giornaliera. */
  perPolizza: boolean;
};

/**
 * Le due quote di un'attività: chi è in squadra e chi viene da fuori.
 *
 * Sono due perché non pagano la stessa cosa: la squadra al massimo divide un
 * contributo campo, un esterno paga la giocata. In ognuna si spuntano le voci
 * del tariffario — di qualsiasi cassa: quelle di Marco hanno la freccina «→
 * Marco» — e quello che il tariffario non ha si aggiunge con il +: un nome,
 * un importo, la cassa. Le quote aggiunte compaiono accanto alle altre, già
 * spuntate, e valgono solo per questa attività.
 *
 * Ogni cassa diventa un pagamento a sé: le voci spuntate del club fanno la
 * quota di sempre, quelle di Marco si pagano a Marco.
 */
export function QuoteEvento({
  listino,
  stagioneId,
  vociSquadra = [],
  vociEsterni = [],
  vociAttivitaSquadra = [],
  vociAttivitaEsterni = [],
  casse = [],
  preselezionaEsterni = false,
  mostraEsterni = true,
  giorni = 1,
}: {
  listino: VoceListino[];
  /** Stagione dell'attività: filtra le voci valide. */
  stagioneId: string | null;
  /** Le voci del tariffario già spuntate. */
  vociSquadra?: string[];
  vociEsterni?: string[];
  /** Le quote già aggiunte con il +. */
  vociAttivitaSquadra?: VoceAttivitaModulo[];
  vociAttivitaEsterni?: VoceAttivitaModulo[];
  /** Le casse a cui può andare una quota aggiunta, oltre al club. */
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
  const giocate = useMemo(
    () => applicabili.filter((v) => v.usi.includes('GIOCATA_NUOVO')).map((v) => v.id),
    [applicabili],
  );

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:col-span-2 ${mostraEsterni ? 'sm:grid-cols-2' : ''}`}
    >
      <CardQuota
        titolo="Quota squadra"
        icona="squadra"
        lato="squadra"
        spiega="Quanto paga chi è in squadra. Niente spuntato: per loro l'attività è gratis."
        voci={applicabili}
        iniziali={vociSquadra}
        aggiunte={vociAttivitaSquadra}
        casse={casse}
        giorni={giorni}
      />
      {mostraEsterni ? (
        <CardQuota
          titolo="Quota esterni"
          icona="nuovi"
          lato="esterni"
          spiega="Quanto paga chi in squadra non è. Niente spuntato: pagano come la squadra; una quota da 0 €: è offerta."
          voci={applicabili}
          iniziali={preselezionaEsterni ? giocate : vociEsterni}
          aggiunte={vociAttivitaEsterni}
          casse={casse}
          giorni={giorni}
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

/** Il segno accanto a una voce che paga la polizza giornaliera. */
function SegnoPolizza() {
  return (
    <span className="ml-1 text-sky-300" title="Paga la polizza giornaliera">
      · polizza
    </span>
  );
}

let contatore = 0;
const nuovaChiave = () => `nuova-${Date.now()}-${contatore++}`;

function CardQuota({
  titolo,
  icona,
  lato,
  spiega,
  voci,
  iniziali,
  aggiunte,
  casse,
  giorni,
}: {
  titolo: string;
  icona: NomeIcona;
  lato: 'squadra' | 'esterni';
  spiega: string;
  voci: VoceListino[];
  iniziali: string[];
  aggiunte: VoceAttivitaModulo[];
  casse: { id: string; nome: string }[];
  giorni: number;
}) {
  // si parte dalle voci già spuntate che esistono ancora nel listino
  const [scelte, setScelte] = useState<Set<string>>(
    () => new Set(iniziali.filter((id) => voci.some((v) => v.id === id))),
  );
  const [extra, setExtra] = useState<VoceAttivitaModulo[]>(aggiunte);
  const [nuova, setNuova] = useState<{
    nome: string;
    importo: string;
    cassaId: string;
    perPolizza: boolean;
  } | null>(null);

  const commuta = (id: string) =>
    setScelte((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const commutaExtra = (chiave: string) =>
    setExtra((es) => es.map((e) => (e.chiave === chiave ? { ...e, scelta: !e.scelta } : e)));
  const togliExtra = (chiave: string) => setExtra((es) => es.filter((e) => e.chiave !== chiave));

  const importoNuova = nuova ? Number(nuova.importo.replace(',', '.')) : NaN;
  const nuovaValida =
    !!nuova && nuova.nome.trim() !== '' && nuova.importo !== '' && importoNuova >= 0;
  const aggiungi = () => {
    if (!nuova || !nuovaValida) return;
    const cassa = casse.find((c) => c.id === nuova.cassaId) ?? null;
    setExtra((es) => [
      ...es,
      {
        chiave: nuovaChiave(),
        nome: nuova.nome.trim(),
        importo: importoNuova,
        cassaId: cassa?.id ?? null,
        cassa: cassa?.nome ?? null,
        scelta: true,
        perPolizza: nuova.perPolizza,
      },
    ]);
    setNuova(null);
  };
  // Invio in queste caselle aggiunge la quota, non salva tutta l'attività
  const invioAggiunge = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      aggiungi();
    }
  };

  // quanto si chiede, cassa per cassa: ognuna diventa un pagamento a sé
  const volte = (v: VoceListino) => (v.perGiorno ? giorni : 1);
  const perCassa = new Map<string, { nome: string; totale: number }>();
  const somma = (cassaId: string | null, cassa: string | null, importo: number) => {
    const k = cassaId ?? '';
    const g = perCassa.get(k);
    perCassa.set(k, {
      nome: cassaId ? (cassa ?? 'altra cassa') : 'club',
      totale: (g?.totale ?? 0) + importo,
    });
  };
  for (const v of voci) if (scelte.has(v.id)) somma(v.cassaId ?? null, v.cassa ?? null, v.importo * volte(v));
  for (const e of extra) if (e.scelta) somma(e.cassaId, e.cassa, e.importo);
  const conGiorni = voci.some((v) => scelte.has(v.id) && v.perGiorno);
  const campoVoci = lato === 'squadra' ? 'tariffeSquadra' : 'tariffeEsterni';

  // le voci e le quote aggiunte, cassa per cassa: il club per primo, poi le
  // altre in ordine di nome; una cassa senza niente non compare
  const gruppiCassa = (() => {
    const per = new Map<
      string,
      { chiave: string; nome: string; voci: VoceListino[]; extra: VoceAttivitaModulo[] }
    >();
    const gruppo = (cassaId: string | null, cassa: string | null) => {
      const chiave = cassaId ?? '';
      const g = per.get(chiave) ?? {
        chiave: chiave || 'club',
        nome: cassaId ? (cassa ?? 'Altra cassa') : 'Club',
        voci: [],
        extra: [],
      };
      per.set(chiave, g);
      return g;
    };
    for (const v of voci) gruppo(v.cassaId ?? null, v.cassa ?? null).voci.push(v);
    for (const e of extra) gruppo(e.cassaId, e.cassa).extra.push(e);
    return [...per.entries()]
      .sort(([a, ga], [b, gb]) => (a === '' ? -1 : b === '' ? 1 : ga.nome.localeCompare(gb.nome)))
      .map(([, g]) => g);
  })();

  const chip = (attiva: boolean) =>
    `inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
      attiva ? 'border-nvg/50 bg-nvg/10 text-nvg' : 'border-line text-muted hover:border-nvgdim'
    }`;

  return (
    <div className="rounded-lg border border-line bg-surface2/40 p-3">
      {/* il modulo ha mostrato questa card: salvando si aggiorna */}
      <input type="hidden" name={`quote_${lato}`} value="1" />

      {/* l'icona distingue le due caselle a colpo d'occhio: sono uguali, e
          quello che cambia è chi paga */}
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        <Icona nome={icona} size={14} />
        {titolo}
      </p>
      <p className="mb-3 text-[11px] text-muted">{spiega}</p>

      <p className="text-[11px] text-muted">Di cosa è fatta</p>
      {/* Divise per cassa, il club per primo: si vede subito cosa va a chi,
          e le voci di Marco non si confondono con quelle del club */}
      {gruppiCassa.map((g) => (
        <div key={g.chiave} className="mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            {g.nome}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {g.voci.map((v) => {
              const attiva = scelte.has(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => commuta(v.id)}
                  className={chip(attiva)}
                >
                  {attiva ? '✓ ' : '+ '}
                  {v.nome}
                  <span className="num ml-1 opacity-80">
                    {v.importo.toFixed(2)} €{v.perGiorno ? ' /giorno' : ''}
                  </span>
                  {v.perPolizza && <SegnoPolizza />}
                </button>
              );
            })}
            {g.extra.map((e) => (
              <span key={e.chiave} className={chip(e.scelta)}>
                <button type="button" onClick={() => commutaExtra(e.chiave)}>
                  {e.scelta ? '✓ ' : '+ '}
                  {e.nome}
                  <span className="num ml-1 opacity-80">{e.importo.toFixed(2)} €</span>
                  {e.perPolizza && <SegnoPolizza />}
                </button>
                <button
                  type="button"
                  onClick={() => togliExtra(e.chiave)}
                  className="ml-1.5 text-muted hover:text-danger"
                  aria-label={`Togli ${e.nome}`}
                  title="Togli questa quota"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}

      {[...scelte].map((id) => (
        <input key={id} type="hidden" name={campoVoci} value={id} />
      ))}
      {extra.map((e) => (
        <input
          key={e.chiave}
          type="hidden"
          name={`vociAttivita_${lato}`}
          value={JSON.stringify({
            id: e.id ?? null,
            nome: e.nome,
            importo: e.importo,
            cassaId: e.cassaId,
            scelta: e.scelta,
            perPolizza: e.perPolizza,
          })}
        />
      ))}

      {/* quello che il tariffario non ha: vale solo per questa attività */}
      {nuova ? (
        <div className="mt-3 space-y-2 rounded-md border border-line p-2">
          <div className="grid grid-cols-[1fr_6.5rem] gap-2">
            <input
              value={nuova.nome}
              onChange={(e) => setNuova({ ...nuova, nome: e.target.value })}
              onKeyDown={invioAggiunge}
              className="input"
              placeholder="A cosa serve, es. Istruttore"
              aria-label="Nome della quota"
              autoFocus
            />
            <input
              value={nuova.importo}
              onChange={(e) => setNuova({ ...nuova, importo: e.target.value })}
              onKeyDown={invioAggiunge}
              type="number"
              step="0.01"
              min="0"
              className="input"
              placeholder="€"
              aria-label="Importo della quota"
            />
          </div>
          {casse.length > 0 && (
            <select
              value={nuova.cassaId}
              onChange={(e) => setNuova({ ...nuova, cassaId: e.target.value })}
              className="input"
              aria-label="Cassa a cui va"
            >
              <option value="">cassa del club</option>
              {casse.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          )}
          {/* come una voce del tariffario: la polizza aspetta questa quota */}
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={nuova.perPolizza}
              onChange={(e) => setNuova({ ...nuova, perPolizza: e.target.checked })}
              className="h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
            />
            paga la polizza giornaliera
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={aggiungi}
              disabled={!nuovaValida}
              className="btn-primary btn-sm"
            >
              Aggiungi
            </button>
            <button type="button" onClick={() => setNuova(null)} className="btn-ghost btn-sm">
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNuova({ nome: '', importo: '', cassaId: '', perPolizza: false })}
          className="mt-3 text-xs text-nvg hover:underline"
        >
          + aggiungi una quota
        </button>
      )}

      {perCassa.size > 0 ? (
        <p className="num mt-2 text-xs text-muted">
          {[...perCassa.values()].map((c, i) => (
            <span key={c.nome}>
              {i > 0 && ' · '}
              {c.nome} <strong className="text-nvg">{c.totale.toFixed(2)} €</strong>
            </span>
          ))}
          {' · '}è quello che si chiede
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-muted">
          {lato === 'squadra'
            ? 'Niente da pagare per chi è in squadra.'
            : 'Niente spuntato: gli esterni pagano come la squadra.'}
        </p>
      )}
      {conGiorni && (
        <p className="mt-1 text-[11px] text-muted">
          Le voci al giorno contano {giorni === 1 ? 'un giorno' : `${giorni} giorni`}, quelli
          dell’attività: se ne cambi le date, il conto si rifà quando salvi.
        </p>
      )}
    </div>
  );
}

/**
 * Una quota composta al volo: importo a mano più voci del listino.
 *
 * Serve a chi aggiunge un nuovo a un'attività che non ha ancora un prezzo per
 * gli esterni: lo si decide lì, senza aprire il modulo dell'attività.
 */
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
  const [scelte, setScelte] = useState<Set<string>>(
    () => new Set(iniziali.filter((id) => voci.some((v) => v.id === id))),
  );
  const [aMano, setAMano] = useState(importo != null ? String(importo) : '');

  const commuta = (id: string) =>
    setScelte((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const volte = (v: VoceListino) => (v.perGiorno ? giorni : 1);
  const totale = voci
    .filter((v) => scelte.has(v.id))
    .reduce((t, v) => t + v.importo * volte(v), 0);
  const base = Number(aMano) || 0;

  return (
    <div className="rounded-lg border border-line bg-surface2/40 p-3">
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

      {voci.length > 0 && (
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
              {base > 0 ? `${base.toFixed(2)} € + voci ${totale.toFixed(2)} € = ` : 'Dal listino: '}
              <strong className="text-nvg">{(base + totale).toFixed(2)} €</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}
