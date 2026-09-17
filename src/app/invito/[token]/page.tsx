import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { fmtDateTime } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Naviga } from '@/components/Naviga';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { Campo } from '@/components/ui';
import { rispondiInvito } from '@/actions/ospiti';

export const dynamic = 'force-dynamic';

/**
 * L'attività vista da fuori, da chi non ha un account qui dentro.
 *
 * **Quello che non c'è è una scelta, non una dimenticanza.** Niente nomi,
 * niente recapiti, niente quote, niente adesioni una per una: di noi si vede
 * un numero, come di loro. Un link girato per sbaglio nella chat sbagliata
 * non deve consegnare a nessuno l'anagrafica della squadra.
 *
 * Quello che c'è è tutto ciò che serve per venirci: titolo, descrizione,
 * quando, dove — col pulsante per farsi portare — chi altro viene, e la
 * casella per dire in quanti siete. Quella si può cambiare quante volte si
 * vuole fino al giorno prima: una squadra che cresce o cala è la normalità.
 */
export default async function PaginaInvito({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const ospite = await prisma.squadraOspite.findUnique({
    where: { token },
    include: {
      event: {
        include: {
          tipo: { select: { nome: true } },
          field: { select: { nome: true, citta: true, indirizzo: true, lat: true, lng: true } },
          rsvps: { select: { status: true, user: { select: { stato: true } } } },
          ospiti: { select: { id: true, nome: true, operatori: true } },
        },
      },
    },
  });

  // Un link tolto non apre più niente, e non spiega perché: a chi non c'entra
  // non si racconta che quell'attività esiste.
  if (!ospite) notFound();

  const e = ospite.event;

  /*
   * Un invito ha una stagione.
   *
   * A cose fatte la casella del numero non serve più a nessuno — e lasciarla
   * lì invita a cambiarlo il lunedì, quando non cambia più niente. Lo stesso
   * vale per un'attività annullata: chi apre il link deve capirlo in un
   * secondo, invece di prepararsi per una domenica che non ci sarà.
   *
   * Della bozza non si dice che esiste: un invito mandato prima del rilascio
   * è un invito mandato per sbaglio.
   */
  if (e.status === 'CREATA') notFound();

  const finita =
    e.status === 'CONCLUSA' || (e.fine ?? e.inizio) < new Date();
  const annullata = e.status === 'ANNULLATA';
  const chiuso = finita || annullata;

  // Noi, contati come una squadra: **tutti quelli che hanno detto sì**, non i
  // soli tesserati. Da fuori la differenza fra un atleta e un nuovo che viene
  // alle aperte non esiste: chi organizza deve sapere quante persone si
  // presentano in campo, e quel giorno sono lì tutte allo stesso modo.
  // Un numero, non un elenco.
  const nostri = e.rsvps.filter((r) => r.status === 'PRESENTE').length;

  const altre = e.ospiti.filter((o) => o.id !== ospite.id);
  const dove = e.field
    ? `${e.field.nome}${e.field.citta ? ` · ${e.field.citta}` : ''}`
    : e.luogo;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3 border-b border-line pb-5">
        <Logo size={44} />
        <div className="min-w-0">
          <p className="num text-sm font-semibold tracking-wide">ZERO DARK OPS</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-nvg">going dark</p>
        </div>
      </header>

      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
        Invito per {ospite.nome}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{e.titolo}</h1>
      <p className="mt-1 text-sm text-muted">
        {e.tipo?.nome ?? 'Attività'} · {fmtDateTime(e.inizio)}
        {e.fine ? ` → ${fmtDateTime(e.fine)}` : ''}
      </p>

      {e.descrizione && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-ink/90">{e.descrizione}</p>
      )}

      {/* Dove si gioca, con il pulsante che apre la navigazione: un indirizzo
          scritto a mano non porta nessuno da nessuna parte. */}
      {dove && (
        <div className="card mt-5">
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted">Dove si gioca</p>
          <p className="mt-1 font-medium">{dove}</p>
          {e.field?.indirizzo && <p className="text-sm text-muted">{e.field.indirizzo}</p>}
          <div className="mt-3">
            <Naviga
              lat={e.field?.lat ?? e.luogoLat}
              lng={e.field?.lng ?? e.luogoLng}
              indirizzo={e.field?.indirizzo ?? e.luogo}
            />
          </div>
        </div>
      )}

      {/* Chi viene, tutti sullo stesso piano: noi siamo una squadra come le
          altre, con il suo numero accanto. */}
      <div className="card mt-4">
        <p className="text-[11px] uppercase tracking-[0.06em] text-muted">Chi viene</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-baseline justify-between gap-3">
            <span className="font-medium">Zero Dark Team</span>
            <span className="num text-nvg">{nostri}</span>
          </li>
          {altre.map((a) => (
            <li key={a.id} className="flex items-baseline justify-between gap-3">
              <span>{a.nome}</span>
              <span className="num text-muted">
                {a.operatori === null ? 'non ancora detto' : a.operatori}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* L'unica cosa che si può toccare da qui — finché ha senso toccarla. */}
      {chiuso ? (
        <div
          className={`card mt-4 ${
            annullata ? 'border-danger/40 bg-danger/10' : 'border-line bg-surface2'
          }`}
        >
          <p className={`font-medium ${annullata ? 'text-danger' : 'text-ink'}`}>
            {annullata ? 'Questa attività è stata annullata.' : 'Questa attività è finita.'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {annullata
              ? 'Non c’è più niente da confermare. Se vi era stato chiesto un numero, lasciate perdere: ci risentiamo per la prossima.'
              : 'Il numero non si cambia più. Grazie di esserci stati — alla prossima.'}
          </p>
        </div>
      ) : (
      <div className="card mt-4">
        <FormAzione azione={rispondiInvito}>
          <input type="hidden" name="token" value={token} />
          <Campo label="Quanti operatori portate">
            <input
              name="operatori"
              type="number"
              inputMode="numeric"
              min={0}
              max={500}
              required
              defaultValue={ospite.operatori ?? ''}
              className="input"
              placeholder="es. 8"
            />
          </Campo>
          <p className="text-xs text-muted">
            Si può cambiare quante volte serve: basta tornare su questo link. Se alla fine non
            venite, scrivete <strong className="text-ink">0</strong> — saperlo ci serve quanto
            saperlo il contrario.
          </p>
          <Invia icona="salva">
            {ospite.operatori === null ? 'Dillo a Zero Dark' : 'Aggiorna il numero'}
          </Invia>
        </FormAzione>
      </div>
      )}

      <p className="mt-6 text-center text-[11px] text-muted">
        Questa pagina è solo per questa attività.{' '}
        {chiuso
          ? 'Resta qui come promemoria di quello che era stato detto.'
          : "Il link è vostro: chi ce l'ha può cambiare il numero, quindi giratelo solo a chi di dovere."}
      </p>
    </main>
  );
}
