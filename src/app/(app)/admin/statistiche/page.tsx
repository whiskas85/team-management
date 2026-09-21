import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stagioneAttiva } from '@/lib/stagioni';
import { isAdmin, statoEffettivo } from '@/lib/domain';
import { impegni } from '@/lib/impegni';
import { fmtEuro, umanizza } from '@/lib/format';
import { Intestazione, Statistica, Vuoto } from '@/components/ui';
import { Anello, Barre, BarreOrizzontali, mesiRecenti } from '@/components/Grafico';

export default async function StatistichePage() {
  await requirePermesso(isAdmin);

  const [utenti, eventi, rsvps, pagamenti, certificati] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, nome: true, cognome: true, callsign: true, roles: true, stato: true },
    }),
    prisma.event.findMany({
      where: { status: { not: 'ANNULLATA' } },
      select: {
        id: true,
        titolo: true,
        tipo: { select: { nome: true } },
        inizio: true,
        fine: true,
        collegatoAId: true,
        fieldId: true,
      },
    }),
    prisma.eventRsvp.findMany({
      select: { userId: true, status: true, presente: true, eventId: true },
    }),
    prisma.payment.findMany({
      where: { cassaId: null },
      select: { importo: true, pagato: true, tipo: true, createdAt: true },
    }),
    prisma.medicalCertificate.findMany({ select: { status: true, scadeIl: true } }),
  ]);

  const campi = await prisma.field.findMany({ select: { id: true, nome: true } });

  const squadra = utenti.filter((u) => u.stato === 'SQUADRA');
  const svolti = eventi.filter((e) => new Date(e.inizio) < new Date());

  /*
   * Le attività che vanno insieme contano per una.
   *
   * La domenica con la PLR e la giocata è una giornata sola: chi c'era non ci
   * poteva stare due volte, e contarla doppia gonfia le presenze di chi c'era
   * e abbassa l'affluenza media di tutte le altre giornate. La regola è quella
   * di `lib/impegni`, la stessa che usano le statistiche personali — se qui
   * contassimo in un altro modo, la scheda di una persona e la classifica
   * direbbero due numeri diversi sulla stessa domenica.
   */
  const gruppi = impegni(eventi);
  const impegnoDi = (eventId: string) => gruppi.get(eventId) ?? eventId;

  // presenze per operatore, contate a impegno
  const classifica = squadra
    .map((u) => {
      const suoi = rsvps.filter((r) => r.userId === u.id && r.presente === true);
      const presenze = new Set(suoi.map((r) => impegnoDi(r.eventId))).size;
      return { etichetta: `${u.cognome} ${u.nome}`, valore: presenze };
    })
    .sort((a, b) => b.valore - a.valore)
    .slice(0, 10);

  // eventi per tipologia, prese dai dati di base
  const perTipo = [...new Set(eventi.map((e) => e.tipo?.nome ?? 'Senza tipologia'))]
    .map((nome) => ({
      etichetta: nome,
      valore: eventi.filter((e) => (e.tipo?.nome ?? 'Senza tipologia') === nome).length,
    }))
    .filter((d) => d.valore > 0)
    .sort((a, b) => b.valore - a.valore);

  // campi più usati
  const perCampo = campi
    .map((c) => ({ etichetta: c.nome, valore: eventi.filter((e) => e.fieldId === c.id).length }))
    .filter((d) => d.valore > 0)
    .sort((a, b) => b.valore - a.valore)
    .slice(0, 8);

  /*
   * Affluenza media per **giornata**, non per riga di calendario.
   *
   * Chi c'era alla PLR e alla giocata è una persona sola in campo quella
   * domenica: sommarla due volte direbbe che eravamo il doppio. E la giornata
   * si conta una volta: due righe con dieci presenti ciascuna sono una
   * giornata da dieci, non due da dieci.
   */
  const impegniSvolti = [...new Set(svolti.map((e) => impegnoDi(e.id)))];
  const affluenze = impegniSvolti.map(
    (gruppo) =>
      new Set(
        rsvps
          .filter((r) => r.presente === true && impegnoDi(r.eventId) === gruppo)
          .map((r) => r.userId),
      ).size,
  );
  const affluenzaMedia = affluenze.length
    ? affluenze.reduce((a, b) => a + b, 0) / affluenze.length
    : 0;
  const copertura = squadra.length ? (affluenzaMedia / squadra.length) * 100 : 0;

  const certValidi = certificati.filter((c) => statoEffettivo(c) === 'VALIDO').length;
  const inRegolaPct = squadra.length ? (certValidi / squadra.length) * 100 : 0;

  const incassato = pagamenti.reduce((t, p) => t + Number(p.pagato), 0);
  const daIncassare = pagamenti.reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);

  const incassiPerTipo = Object.entries(
    pagamenti.reduce<Record<string, number>>((acc, p) => {
      acc[p.tipo] = (acc[p.tipo] ?? 0) + Number(p.pagato);
      return acc;
    }, {}),
  )
    .map(([t, v]) => ({ etichetta: umanizza(t), valore: Math.round(v) }))
    .filter((d) => d.valore > 0)
    .sort((a, b) => b.valore - a.valore);

  // il nome della stagione lo decide chi l'ha aperta, non il calendario:
  // calcolarlo qui vorrebbe dire scrivere "2026/2027" dove la squadra legge "2026"
  const stagione = await stagioneAttiva();

  return (
    <>
      <Intestazione
        titolo="Statistiche"
        sottotitolo={`Andamento del team · stagione ${stagione.nome}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="Operatori in forza" valore={squadra.length} tono="ok" />
        <Statistica
          etichetta="Eventi svolti"
          valore={svolti.length}
          dettaglio={`${eventi.length} totali`}
        />
        <Statistica
          etichetta="Affluenza media"
          valore={affluenzaMedia.toFixed(1)}
          dettaglio="presenti per evento"
        />
        <Statistica
          etichetta="Cassa"
          valore={fmtEuro(incassato)}
          dettaglio={`${fmtEuro(daIncassare)} da incassare`}
          tono={daIncassare > 0 ? 'warn' : 'ok'}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <p className="titolo-sezione mb-4">Eventi per mese</p>
          <Barre dati={mesiRecenti(eventi.map((e) => e.inizio))} />
        </div>
        <div className="card flex flex-col items-center justify-center gap-6">
          <Anello percentuale={copertura} etichetta="Copertura media squadra" />
          <Anello percentuale={inRegolaPct} etichetta="Certificati in regola" size={100} />
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="titolo-sezione mb-4">Presenze per operatore</p>
          {classifica.length === 0 ? (
            <Vuoto testo="Nessuna presenza registrata." />
          ) : (
            <BarreOrizzontali dati={classifica} />
          )}
        </div>

        <div className="card">
          <p className="titolo-sezione mb-4">Campi più frequentati</p>
          {perCampo.length === 0 ? (
            <Vuoto testo="Nessun evento collegato a un campo." />
          ) : (
            <BarreOrizzontali dati={perCampo} />
          )}
        </div>

        <div className="card">
          <p className="titolo-sezione mb-4">Eventi per tipologia</p>
          {perTipo.length === 0 ? <Vuoto testo="Nessun evento." /> : <Barre dati={perTipo} />}
        </div>

        <div className="card">
          <p className="titolo-sezione mb-4">Incassi per voce (€)</p>
          {incassiPerTipo.length === 0 ? (
            <Vuoto testo="Nessun incasso registrato." />
          ) : (
            <BarreOrizzontali dati={incassiPerTipo} unita=" €" />
          )}
        </div>
      </div>

      <div className="card">
        <p className="titolo-sezione mb-4">Adesioni registrate per mese</p>
        <Barre
          dati={mesiRecenti(
            rsvps
              .map((r) => eventi.find((e) => e.id === r.eventId)?.inizio)
              .filter((d): d is Date => !!d),
          )}
        />
      </div>
    </>
  );
}
