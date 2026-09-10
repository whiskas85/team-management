'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Avatar, Badge } from './ui';
import { Icona } from './Icona';
import { Quota, vociAttivita } from './QuoteEvento';
import type { VoceListino } from './CampiRichiesta';
import type { StatoForm } from '@/lib/form';
import { iscriviOperatori } from '@/actions/eventi';

export type Candidato = {
  id: string;
  /** Come va chiamato: già ridotto a "Mario R." se chi guarda non deve saperne di più. */
  etichetta: string;
  iniziali: string;
  callsign: string | null;
  /** Stato del certificato: chi non è in regola non può essere schierato. */
  certificatoOk: boolean;
  motivo: string | null;
  /** Da che parte sta: si mostrano in due gruppi, ma si cercano insieme. */
  gruppo: 'squadra' | 'nuovi';
};

/** Quello che serve per chiedere il prezzo per gli esterni, quando l'attività non ce l'ha. */
export type PrezzoEsterni = {
  listino: VoceListino[];
  stagioneId: string | null;
  /** Giorni dell'attività: le voci «al giorno» contano per ognuno. */
  giorni: number;
  /** Il prezzo lo decide l'admin: agli altri si dice a chi chiederlo. */
  puoImpostare: boolean;
};

/**
 * Selezione dei partecipanti da aggiungere. Niente tendina: un elenco con la
 * ricerca, dove si vede subito chi non può essere aggiunto e perché, e si
 * possono spuntare più operatori in una volta.
 *
 * **Squadra e nuovi in due gruppi, con una ricerca sola.** Mescolati, chi
 * cercava un compagno scorreva i nomi di gente vista una volta a un'open;
 * divisi in due elenchi con due ricerche, chi non ricorda da che parte sta
 * uno lo cercherebbe due volte. Così si scrive una volta e lo si trova
 * ovunque sia.
 *
 * **Sull'attività di sola squadra i nuovi partono nascosti**, che è la cosa
 * giusta quasi sempre. Il quasi è un pulsante sotto l'elenco: se ne può
 * forzare uno, sapendo che lo si sta facendo. E se la ricerca ne trova
 * qualcuno lo dice, invece di rispondere «nessuno» mentre la persona c'è.
 *
 * **Se l'attività non ha un prezzo per chi viene da fuori**, scegliendo un
 * nuovo compare di fianco la card della quota esterni. Senza, il nuovo
 * giocherebbe gratis senza che nessuno l'abbia deciso — e la giornaliera, che
 * la paga il club, si potrebbe fare lo stesso. Il prezzo si sceglie lì e parte
 * insieme ai nomi: un gesto solo, invece di chiudere, andare a modificare
 * l'attività e tornare.
 */
export function ScegliPartecipanti({
  eventId,
  candidati,
  soloSquadra,
  prezzoEsterni = null,
}: {
  eventId: string;
  candidati: Candidato[];
  /** Attività riservata alla squadra: i nuovi partono nascosti. */
  soloSquadra: boolean;
  /** Presente solo se l'attività non ha ancora un prezzo per gli esterni. */
  prezzoEsterni?: PrezzoEsterni | null;
}) {
  const [stato, azione] = useActionState(iscriviOperatori, {} as StatoForm);
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [conNuovi, setConNuovi] = useState(!soloSquadra);

  const { squadra, nuovi } = useMemo(() => {
    const testo = q.trim().toLowerCase();
    const trovati = testo
      ? candidati.filter((c) =>
          `${c.etichetta} ${c.callsign ?? ''}`.toLowerCase().includes(testo),
        )
      : candidati;
    return {
      squadra: trovati.filter((c) => c.gruppo === 'squadra'),
      nuovi: trovati.filter((c) => c.gruppo === 'nuovi'),
    };
  }, [candidati, q]);

  const nuoviInTutto = candidati.filter((c) => c.gruppo === 'nuovi').length;
  const nuoviScelti = candidati.filter((c) => c.gruppo === 'nuovi' && scelti.has(c.id)).length;
  const senzaCertificato = candidati.filter((c) => !c.certificatoOk).length;
  const nessuno = squadra.length === 0 && nuovi.length === 0;

  // il prezzo serve solo se si sta davvero aggiungendo un nuovo: per la
  // squadra la quota c'è già o è gratis per scelta
  const serveIlPrezzo = prezzoEsterni !== null && nuoviScelti > 0;
  const bloccato = serveIlPrezzo && !prezzoEsterni!.puoImpostare;

  const commuta = (id: string) =>
    setScelti((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // in blocco, ma dentro un gruppo: «tutta la squadra» è una scelta che si fa
  // spesso, «tutta la squadra e tutti i nuovi» quasi mai
  const commutaGruppo = (elenco: Candidato[]) => {
    const ids = elenco.filter((c) => c.certificatoOk).map((c) => c.id);
    const pieno = ids.length > 0 && ids.every((id) => scelti.has(id));
    setScelti((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (pieno) n.delete(id);
        else n.add(id);
      }
      return n;
    });
  };

  return (
    <form action={azione} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      {[...scelti].map((id) => (
        <input key={id} type="hidden" name="userIds" value={id} />
      ))}

      {stato.errore && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {stato.errore}
        </div>
      )}
      {stato.ok && (
        <div className="rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-sm text-nvg">
          {stato.ok}
        </div>
      )}

      {candidati.length === 0 ? (
        <p className="text-sm text-muted">Hanno già risposto tutti.</p>
      ) : (
        <>
          {/* di fianco, non sotto: la card del prezzo compare mentre si
              sceglie, e sotto un elenco lungo la si scoprirebbe solo arrivati
              al pulsante */}
          <div className={serveIlPrezzo ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : ''}>
            <div className="min-w-0 space-y-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="input"
                placeholder="Cerca per nome o callsign…"
                autoComplete="off"
              />

              {(scelti.size > 0 || senzaCertificato > 0) && (
                <div className="flex flex-wrap items-center gap-3">
                  {scelti.size > 0 && (
                    <span className="num text-xs text-nvg">{scelti.size} selezionati</span>
                  )}
                  {senzaCertificato > 0 && (
                    <span className="text-xs text-danger">
                      {senzaCertificato} non selezionabili per il certificato
                    </span>
                  )}
                </div>
              )}

              <div className="max-h-80 space-y-4 overflow-y-auto">
                <Gruppo
                  titolo="Squadra"
                  elenco={squadra}
                  scelti={scelti}
                  commuta={commuta}
                  commutaTutti={() => commutaGruppo(squadra)}
                />

                {conNuovi ? (
                  <Gruppo
                    titolo="Nuovi"
                    elenco={nuovi}
                    scelti={scelti}
                    commuta={commuta}
                    commutaTutti={() => commutaGruppo(nuovi)}
                  />
                ) : (
                  nuoviInTutto > 0 && (
                    <button
                      type="button"
                      onClick={() => setConNuovi(true)}
                      className="w-full rounded-lg border border-dashed border-line px-3 py-2 text-left text-xs text-muted transition-colors hover:border-nvgdim hover:text-ink"
                    >
                      {q.trim() && nuovi.length > 0
                        ? `${nuovi.length === 1 ? 'Un nuovo corrisponde' : `${nuovi.length} nuovi corrispondono`} alla ricerca: mostra`
                        : `Attività di sola squadra · aggiungi comunque un nuovo (${nuoviInTutto})`}
                    </button>
                  )
                )}

                {nessuno && (
                  <p className="py-4 text-center text-sm text-muted">Nessuno corrisponde.</p>
                )}
              </div>

              {/* forzare si può, ma deve essere una scelta che si vede: chi
                  rilegge l'elenco dei partecipanti non deve chiedersi come ci
                  sia finito */}
              {soloSquadra && nuoviScelti > 0 && (
                <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                  {nuoviScelti === 1
                    ? 'Stai aggiungendo un nuovo'
                    : `Stai aggiungendo ${nuoviScelti} nuovi`}{' '}
                  a un’attività riservata alla squadra. Si può, perché lo decidi tu: la vedrà
                  solo chi aggiungi, non gli altri nuovi.
                </p>
              )}
            </div>

            {serveIlPrezzo && <PrezzoPerEsterni {...prezzoEsterni!} />}
          </div>

          <Aggiungi quanti={scelti.size} bloccato={bloccato} />
        </>
      )}
    </form>
  );
}

/**
 * La card della quota esterni, quando l'attività non ce l'ha.
 *
 * È la stessa del modulo dell'attività, con la giocata degli esterni già
 * spuntata come su un'attività nuova: il caso normale non si configura ogni
 * volta, e chi vuole regalarla scrive zero.
 */
function PrezzoPerEsterni({ listino, stagioneId, giorni, puoImpostare }: PrezzoEsterni) {
  const voci = useMemo(() => vociAttivita(listino, stagioneId), [listino, stagioneId]);
  const giocate = useMemo(
    () => voci.filter((v) => v.usi.includes('GIOCATA_NUOVO')).map((v) => v.id),
    [voci],
  );

  return (
    <div className="min-w-0 space-y-3">
      <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
        {puoImpostare ? (
          <>
            Questa attività non ha un prezzo per chi viene da fuori. Senza, il nuovo non avrebbe
            nessuna quota, e la giornaliera — che la paga il club — si potrebbe fare lo stesso.
            Scegli qui quanto paga: vale per l’attività e per tutti i nuovi che ci aggiungerai.
            Zero è una scelta, vuol dire offerta.
          </>
        ) : (
          <>
            Questa attività non ha un prezzo per chi viene da fuori, e lo decide l’admin. Chiedigli
            di impostarlo, poi potrai aggiungere il nuovo: senza, giocherebbe gratis senza che
            nessuno l’abbia deciso.
          </>
        )}
      </p>

      {puoImpostare && (
        <Quota
          titolo="Quota esterni"
          icona="nuovi"
          spiega="Quanto paga chi in squadra non è. Zero: offerta."
          campoImporto="costoEsterni"
          campoVoci="tariffeEsterni"
          voci={voci}
          importo={null}
          iniziali={giocate}
          giorni={giorni}
        />
      )}
    </div>
  );
}

function Gruppo({
  titolo,
  elenco,
  scelti,
  commuta,
  commutaTutti,
}: {
  titolo: string;
  elenco: Candidato[];
  scelti: Set<string>;
  commuta: (id: string) => void;
  commutaTutti: () => void;
}) {
  // un gruppo che la ricerca ha svuotato non ha niente da dire: la sua
  // intestazione con «· 0» sarebbe solo una riga da scavalcare
  if (elenco.length === 0) return null;

  const selezionabili = elenco.filter((c) => c.certificatoOk);
  const pieno = selezionabili.length > 0 && selezionabili.every((c) => scelti.has(c.id));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
          {titolo} · {elenco.length}
        </p>
        {selezionabili.length > 0 && (
          <button
            type="button"
            onClick={commutaTutti}
            className="text-[11px] text-muted transition-colors hover:text-nvg"
          >
            {pieno ? 'Togli tutti' : 'Seleziona tutti'}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {elenco.map((c) => {
          const scelto = scelti.has(c.id);
          return (
            <label
              key={c.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                !c.certificatoOk
                  ? 'cursor-not-allowed border-danger/30 bg-danger/5 opacity-70'
                  : scelto
                    ? 'cursor-pointer border-nvg/50 bg-nvg/10'
                    : 'cursor-pointer border-line bg-surface2 hover:border-nvgdim'
              }`}
            >
              <input
                type="checkbox"
                checked={scelto}
                disabled={!c.certificatoOk}
                onChange={() => commuta(c.id)}
                className="h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
              />
              <Avatar iniziali={c.iniziali} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{c.etichetta}</span>
                {c.motivo && <span className="block text-[11px] text-danger">{c.motivo}</span>}
              </span>
              {c.certificatoOk ? (
                <Badge tono="ok">idoneo</Badge>
              ) : (
                <Badge tono="danger">non idoneo</Badge>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Aggiungi({ quanti, bloccato }: { quanti: number; bloccato: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || quanti === 0 || bloccato}
      className="btn-primary w-full"
    >
      <Icona nome="aggiungi" size={15} />
      {pending
        ? 'Aggiungo…'
        : bloccato
          ? 'Serve il prezzo per chi viene da fuori'
          : quanti === 0
            ? 'Seleziona chi aggiungere'
            : `Aggiungi ${quanti} ${quanti === 1 ? 'operatore' : 'operatori'}`}
    </button>
  );
}
