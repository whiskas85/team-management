import { Statistica } from './ui';
import { Barre, Torta, mesiRecenti, type Fetta } from './Grafico';
import { tintaColore } from '@/lib/domain';
import { daQuanto, giorniA } from '@/lib/format';
import { impegni } from '@/lib/impegni';

export type RigaPartecipazione = {
  eventId: string;
  /** Cosa aveva risposto: PRESENTE, FORSE, ASSENTE. */
  status: string;
  /** Com'è andata all'appello: vero, falso, o appello non fatto. */
  presente: boolean | null;
  quando: Date;
  /** Quando finisce: serve a capire se due attività sono lo stesso impegno. */
  finisce: Date | null;
  collegatoAId: string | null;
  tipo: string | null;
  /** La tinta della tipologia nel calendario: la stessa nella torta. */
  colore?: string | null;
};

/**
 * Com'è andata, in numeri: gli stessi per la propria pagina e per la scheda.
 *
 * Due numeri — adesioni e presenze — dicono poco da soli: uno che ha detto sì
 * venti volte ed è venuto dieci volte e uno che ha detto sì dieci volte ed è
 * venuto dieci volte hanno lo stesso «10», e non sono affatto la stessa
 * persona. **Quello che manca è il rapporto fra le due cose**, e da quanto non
 * lo si vede.
 *
 * Le attività annullate restano fuori prima di arrivare qui: non ci è stato
 * nessuno, e contarle rovinerebbe tutte e tre le risposte.
 */
export function StatistichePersona({
  righe,
  svolteTotali,
  stagione,
  tu = false,
  grafici = false,
}: {
  righe: RigaPartecipazione[];
  /**
   * Le giornate che ci sono state in stagione, contate a impegni.
   *
   * È il denominatore vero. Prima si usava «quante ne ho svolte fra quelle a
   * cui ho risposto», e un «7 su 8» raccontava una squadra che gioca otto
   * volte l'anno: chi legge cerca **su quante se ne sono fatte**.
   */
  svolteTotali: number;
  stagione: string | null;
  /** Cambia solo le parole: «hai detto sì» invece di «ha detto sì». */
  tu?: boolean;
  /**
   * Sotto ai numeri anche i grafici: le adesioni mese per mese e l'anello
   * della parola mantenuta. Stavano solo nella scheda completa, e per vedere
   * i propri bisognava passare dal calendario: sulla home si guardano entrando.
   */
  grafici?: boolean;
}) {
  const adesso = new Date();
  const svolte = righe.filter((r) => r.quando < adesso);

  /*
   * Si contano gli **impegni**, non le righe.
   *
   * Due attività che si sovrappongono — la PLR e la giocata della stessa
   * domenica — sono una giornata sola per chi c'era: non ci poteva stare due
   * volte, e contargliele come due gli abbassa la percentuale per una giornata
   * in cui c'era davvero.
   */
  const gruppi = impegni(
    righe.map((r) => ({
      id: r.eventId,
      inizio: r.quando,
      fine: r.finisce,
      collegatoAId: r.collegatoAId,
    })),
  );
  const quanti = (elenco: RigaPartecipazione[]) =>
    new Set(elenco.map((r) => gruppi.get(r.eventId) ?? r.eventId)).size;

  const righeAdesioni = righe.filter((r) => r.status === 'PRESENTE');
  const adesioni = quanti(righeAdesioni);
  const presenze = quanti(svolte.filter((r) => r.presente === true));

  /*
   * Quante volte ha detto sì e poi non c'era.
   *
   * È il numero che conta per chi schiera: su un posto contato, uno che non si
   * presenta lascia un buco che nessun altro ha potuto riempire. Si guardano
   * solo le attività dove l'appello è stato fatto — dove non c'è appello non
   * c'è un «non c'era», c'è solo che nessuno ha spuntato niente.
   */
  const attese = quanti(svolte.filter((r) => r.status === 'PRESENTE' && r.presente !== null));
  /*
   * Mancare vuol dire non esserci stato **in nessuna** delle attività di quella
   * giornata: chi si era segnato a tutte e due e si è presentato a una c'era,
   * e segnargli un buco sarebbe falso.
   */
  const impegniPresente = new Set(
    svolte.filter((r) => r.presente === true).map((r) => gruppi.get(r.eventId) ?? r.eventId),
  );
  const mancate = quanti(
    svolte.filter(
      (r) =>
        r.status === 'PRESENTE' &&
        r.presente === false &&
        !impegniPresente.has(gruppi.get(r.eventId) ?? r.eventId),
    ),
  );
  const percentuale = attese > 0 ? Math.round((presenze / attese) * 100) : null;

  const ultima = svolte
    .filter((r) => r.presente === true)
    .reduce<Date | null>((t, r) => (t === null || r.quando > t ? r.quando : t), null);
  const daUltima = ultima ? Math.max(0, -(giorniA(ultima) ?? 0)) : null;

  /*
   * Dove si va più spesso, **contato a giornate come tutto il resto**.
   *
   * Contandolo a righe usciva «10 volte su 7»: dieci attività di allenamento
   * dentro sette giornate, confrontate con un totale che le giornate le
   * contava una volta. Due unità diverse nello stesso paragone, e un numero
   * impossibile davanti agli occhi di chi lo legge.
   */
  const perTipo = new Map<string, Set<string>>();
  for (const r of svolte) {
    if (r.presente !== true || !r.tipo) continue;
    const gruppo = gruppi.get(r.eventId) ?? r.eventId;
    perTipo.set(r.tipo, (perTipo.get(r.tipo) ?? new Set()).add(gruppo));
  }
  const classifica = [...perTipo.entries()]
    .map(([nome, giornate]) => [nome, giornate.size] as const)
    .sort((a, b) => b[1] - a[1]);
  const preferita = classifica[0] ?? null;

  /*
   * La torta delle tipologie, **con il colore che la tipologia ha nel
   * calendario**, identico: PLR è dello stesso colore qui, nella legenda del
   * calendario e sulle sue schede. Se due tipologie hanno scelto lo stesso
   * colore restano uguali anche qui — le separa la legenda — perché un colore
   * che cambia da una pagina all'altra non lo riconosce più nessuno.
   */
  const colorePerTipo = new Map<string, string | null>();
  for (const r of righe) if (r.tipo) colorePerTipo.set(r.tipo, r.colore ?? null);
  const fette: Fetta[] = classifica.map(([nome, giornate]) => ({
    etichetta: nome,
    valore: giornate,
    colore: tintaColore(colorePerTipo.get(nome)),
  }));

  /*
   * Le adesioni per mese, anche queste a giornate: una per impegno, con la
   * data della prima attività della giornata.
   */
  const giornateAdesione = new Map<string, Date>();
  for (const r of righeAdesioni) {
    const gruppo = gruppi.get(r.eventId) ?? r.eventId;
    const gia = giornateAdesione.get(gruppo);
    if (!gia || r.quando < gia) giornateAdesione.set(gruppo, r.quando);
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Presenze"
          valore={presenze}
          dettaglio={`su ${svolteTotali} ${
            svolteTotali === 1 ? 'giornata' : 'giornate'
          }${stagione ? ` · ${stagione}` : ''}`}
          tono={presenze > 0 ? 'ok' : 'neutro'}
        />

        <Statistica
          etichetta="Parola mantenuta"
          valore={percentuale === null ? '—' : `${percentuale}%`}
          dettaglio={
            percentuale === null
              ? 'nessun appello ancora fatto'
              : `${tu ? 'hai detto sì' : 'ha detto sì'} ${attese} ${
                  attese === 1 ? 'volta' : 'volte'
                }, ${
                  // «sempre presente» invece di «mai mancato»: il participio
                  // vorrebbe sapere se è un lui o una lei, e il gestionale non
                  // lo chiede a nessuno
                  mancate === 0
                    ? 'sempre presente'
                    : `${mancate} ${mancate === 1 ? 'volta' : 'volte'} no`
                }`
          }
          tono={
            percentuale === null
              ? 'neutro'
              : percentuale >= 80
                ? 'ok'
                : percentuale >= 50
                  ? 'warn'
                  : 'danger'
          }
        />

        <Statistica
          etichetta="Ultima volta in campo"
          valore={daUltima === null ? 'mai' : (daQuanto(daUltima) ?? '—')}
          dettaglio={daUltima === null ? 'nessuna presenza registrata' : 'fa'}
          tono={
            daUltima === null ? 'neutro' : daUltima > 90 ? 'danger' : daUltima > 30 ? 'warn' : 'ok'
          }
        />

        <Statistica
          etichetta="Dove si va più spesso"
          valore={preferita ? preferita[0] : '—'}
          dettaglio={
            preferita
              ? `${preferita[1]} ${preferita[1] === 1 ? 'giornata' : 'giornate'} su ${presenze}`
              : `${adesioni} ${adesioni === 1 ? 'adesione' : 'adesioni'} in tutto`
          }
        />
      </div>

      {grafici && (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <p className="titolo-sezione mb-4">
              Adesioni per mese{stagione ? ` · ${stagione}` : ''}
            </p>
            <Barre dati={mesiRecenti([...giornateAdesione.values()])} />
          </div>
          <div className="card flex flex-col items-center gap-4">
            <p className="titolo-sezione self-start">{tu ? 'Cosa hai fatto' : 'Cosa ha fatto'}</p>
            {fette.length === 0 ? (
              <p className="my-auto text-center text-xs text-muted">
                La torta si riempie con le presenze segnate all’appello.
              </p>
            ) : (
              <Torta fette={fette} sotto="presenze" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
