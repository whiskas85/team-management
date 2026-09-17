import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { fmtDateLong, fmtTime } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Mappa } from '@/components/Mappa';
import { Naviga } from '@/components/Naviga';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { Campo } from '@/components/ui';
import { rispondiInvito } from '@/actions/ospiti';
import { Icona } from '@/components/Icona';
import { ReferentiEvento } from '@/components/ReferentiEvento';
import { etichettaGenere, genereAllegato, peso } from '@/lib/allegati';

export const dynamic = 'force-dynamic';

/**
 * L'attività vista da fuori, da chi non ha un account qui dentro.
 *
 * **Quello che non c'è è una scelta, non una dimenticanza.** Niente elenco di
 * chi viene, niente quote, niente adesioni una per una: di noi si vede un
 * numero, come di loro. Un link girato per sbaglio nella chat sbagliata non
 * deve consegnare a nessuno l'anagrafica della squadra.
 *
 * Quello che c'è è tutto ciò che serve per venirci, nell'ordine in cui serve:
 * **quando** — in grande, perché è la cosa che si sbaglia — **dove**, con la
 * mappa e il pulsante per farsi portare, **a chi chiedere**, col numero da
 * chiamare, chi altro viene, e la casella per dire in quanti siete. Quella si
 * può cambiare quante volte si vuole fino al giorno prima: una squadra che
 * cresce o cala è la normalità.
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
          field: { select: { nome: true, citta: true, indirizzo: true, lat: true, lng: true } },
          rsvps: { select: { status: true, user: { select: { stato: true } } } },
          ospiti: {
            orderBy: { creatoIl: 'asc' },
            select: { id: true, nome: true, operatori: true },
          },
          // Il nome e il numero di chi tiene in mano l'attività: da fuori una
          // domanda non ha altro modo di arrivare, e finora finiva nel vuoto
          // o passava per chi aveva mandato il link.
          referenti: {
            include: {
              utente: { select: { nome: true, cognome: true, callsign: true, telefono: true } },
            },
          },
          // Solo quelli marcati «anche fuori». Il filtro sta nella query e
          // non nella pagina: un allegato interno non deve nemmeno arrivare
          // fin qui, e una riga dimenticata in un `.map` sarebbe il modo più
          // facile per farlo uscire.
          allegati: {
            where: { pubblico: true },
            orderBy: [{ ordine: 'asc' }, { creatoIl: 'asc' }],
            select: {
              id: true,
              titolo: true,
              mimeType: true,
              fileSize: true,
            },
          },
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

  /*
   * L'elenco le comprende **tutte, loro compresi**.
   *
   * Prima chi leggeva si trovava davanti le altre squadre e non sé stesso, e
   * l'elenco sembrava sbagliato: uno conta le righe, non torna, e si chiede se
   * il numero che ha scritto sia arrivato. La riga loro ce l'hanno eccome — è
   * il senso di questa pagina — e va vista dov'è, in mezzo alle altre, con
   * accanto il numero che hanno detto.
   */
  const squadre = e.ospiti.map((o) => ({ ...o, loro: o.id === ospite.id }));

  /*
   * Quanti si presentano in campo, in tutto.
   *
   * È il numero per cui si organizza una giocata, e finora bisognava sommare
   * le righe a mente. Chi non ha ancora risposto non ci può essere dentro, e
   * il conto lo dice invece di far sembrare piccolo un campo che sarà pieno.
   */
  const attesi = nostri + e.ospiti.reduce((t, o) => t + (o.operatori ?? 0), 0);
  const mancanti = e.ospiti.filter((o) => o.operatori === null).length;

  /*
   * Il ritrovo, e basta.
   *
   * **Il nome del campo non c'è**, ed è voluto: «Area Boschiva Nord ·
   * Bergamo» è come lo chiamiamo noi in anagrafica, non dice a nessuno dove
   * mettere le ruote, e messo in cima si legge come se fosse l'informazione —
   * mentre l'informazione è il punto sulla mappa e il pulsante che ci porta.
   *
   * Il ritrovo ha spesso coordinate sue — un autogrill, un parcheggio prima
   * del bosco — e sono quelle che devono stare sulla mappa e aprirsi nel
   * navigatore. Dove non ce ne sono, il ritrovo è il campo stesso: cambia il
   * punto, non cambia il senso della riga.
   */
  const lat = e.ritrovoLat ?? e.field?.lat ?? e.luogoLat;
  const lng = e.ritrovoLng ?? e.field?.lng ?? e.luogoLng;
  const indirizzo = e.ritrovo ?? e.field?.indirizzo ?? e.luogo;

  const referenti = e.referenti.map((r) => ({
    id: r.userId,
    nome: r.utente.callsign ?? `${r.utente.nome} ${r.utente.cognome[0] ?? ''}.`,
    telefono: r.utente.telefono,
  }));

  // Lo stesso giorno si scrive una volta sola: «20 settembre, 08:15 → 20
  // settembre, 13:00» fa leggere due date per scoprire che sono la stessa.
  const stessoGiorno =
    !!e.fine && new Date(e.fine).toDateString() === new Date(e.inizio).toDateString();

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

      {/* Quando. In grande, e per primo: è il dato che fa perdere le squadre —
          si sbaglia il giorno, si arriva all'ora sbagliata — e stava scritto
          in grigio piccolo in coda al tipo di attività. Che sia un allenamento
          o un torneo, da fuori, non cambia niente a nessuno. */}
      <div className="card mt-4">
        <p className="titolo-sezione">Quando</p>
        <p className="mt-1 text-xl font-semibold leading-tight first-letter:uppercase">
          {fmtDateLong(e.inizio)}
        </p>
        <p className="num mt-1 text-lg text-nvg">
          {fmtTime(e.inizio)}
          {e.fine && (stessoGiorno ? ` → ${fmtTime(e.fine)}` : '')}
        </p>
        {e.fine && !stessoGiorno && (
          <p className="mt-2 text-sm text-ink/90">
            <span className="text-muted">fino a</span>{' '}
            <span className="font-medium first-letter:uppercase">{fmtDateLong(e.fine)}</span>{' '}
            <span className="num text-nvg">{fmtTime(e.fine)}</span>
          </p>
        )}
      </div>

      {e.descrizione && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-ink/90">{e.descrizione}</p>
      )}

      {/* Il ritrovo: il segnaposto sulla mappa e il pulsante che ci porta.
          Niente nome del campo — quello è come lo chiamiamo noi, e non porta
          nessuno da nessuna parte. */}
      {(lat != null && lng != null) || indirizzo ? (
        <div className="card mt-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="titolo-sezione">Ritrovo</p>
            {e.oraRitrovo && (
              <p className="num text-sm text-nvg">ore {fmtTime(e.oraRitrovo)}</p>
            )}
          </div>

          {lat != null && lng != null && <Mappa lat={lat} lng={lng} altezza={200} />}

          <div className="mt-3">
            <Naviga
              lat={lat}
              lng={lng}
              indirizzo={indirizzo}
              className="btn-primary btn-sm w-full justify-center sm:w-auto"
            />
          </div>
        </div>
      ) : null}

      {/* A chi chiedere, col numero: da fuori una domanda non ha altro modo di
          arrivare. Si legge il callsign e il recapito, niente di più. */}
      <ReferentiEvento referenti={referenti} riquadro />

      {/* Il book di missione, e quello che ci sta intorno.
          È la cosa per cui questo link vale la pena di essere aperto due
          volte: si legge qui dentro, e se lo aggiorniamo il giorno prima chi
          torna su questa pagina trova la versione nuova senza che nessuno
          debba rimandare niente in chat. */}
      {e.allegati.length > 0 && (
        <div className="card mt-4">
          <p className="titolo-sezione">Documenti</p>
          <ul className="mt-2 space-y-2">
            {e.allegati.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/invito/${token}/allegati/${a.id}`}
                  className="flex items-center gap-2.5 text-sm hover:text-nvg"
                >
                  <span className="text-muted">
                    <Icona nome="allegato" size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.titolo}</span>
                    <span className="num text-[11px] text-muted">
                      {etichettaGenere[genereAllegato(a.mimeType)]} · {peso(a.fileSize)}
                    </span>
                  </span>
                  <Icona nome="freccia" size={15} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chi viene, tutti sullo stesso piano: noi siamo una squadra come le
          altre, con il suo numero accanto. Verde vuol dire «l'hanno detto» —
          che l'abbiano scritto loro o che l'abbiamo segnato noi per loro è la
          stessa cosa. Grigio è solo il silenzio. */}
      <div className="card mt-4">
        <p className="titolo-sezione">Chi viene</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-baseline justify-between gap-3">
            <span className="font-medium">Zero Dark Team</span>
            <span className="num font-semibold text-nvg">{nostri}</span>
          </li>
          {squadre.map((a) => (
            <li
              key={a.id}
              className={`flex items-baseline justify-between gap-3 ${
                a.loro ? '-mx-2 rounded-md bg-nvg/10 px-2 py-0.5' : ''
              }`}
            >
              <span className={a.loro ? 'font-medium' : undefined}>
                {a.nome}
                {/* la riga loro si riconosce a colpo d'occhio: è quella che
                    possono cambiare, ed è la prima che cercano */}
                {a.loro && <span className="ml-1.5 text-[11px] text-nvg">voi</span>}
              </span>
              {a.operatori === null ? (
                <span className="text-muted">non ancora detto</span>
              ) : (
                <span className="num font-semibold text-nvg">{a.operatori}</span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-2 text-sm">
          <span className="text-muted">
            In tutto
            {mancanti > 0 && (
              <span className="block text-[11px]">
                {mancanti === 1
                  ? 'una squadra non ha ancora risposto: non è contata'
                  : `${mancanti} squadre non hanno ancora risposto: non sono contate`}
              </span>
            )}
          </span>
          <span className="num text-lg font-semibold text-nvg">{attesi}</span>
        </p>
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
        <>
          {/* L'avviso sta attaccato alla casella, non in fondo alla pagina:
              va letto nel momento in cui si capisce cosa fa questo link, non
              dopo averlo già inoltrato. Chi ce l'ha può cambiare il numero di
              operatori — non è una password, è una chiave, e chi la gira la
              dà a qualcun altro. */}
          <div className="mt-4 rounded-md border border-warn/40 bg-warn/10 px-4 py-3">
            <p className="flex items-center gap-2 font-medium text-warn">
              <Icona nome="scudo" size={16} />
              Questo link è di {ospite.nome}.
            </p>
            <p className="mt-1 text-sm text-ink/90">
              Non giratelo fuori dalla vostra squadra: chi ce l’ha può cambiare il numero di
              operatori che portate, e ve ne accorgereste solo in campo. Dentro la squadra
              passatelo a chi deve: il numero si aggiorna quante volte serve.
            </p>
          </div>

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
        </>
      )}

      <p className="mt-6 text-center text-[11px] text-muted">
        Questa pagina è solo per questa attività.{' '}
        {chiuso
          ? 'Resta qui come promemoria di quello che era stato detto.'
          : 'Si aggiorna da sé: quello che c’è scritto è sempre l’ultima versione.'}
      </p>
    </main>
  );
}
