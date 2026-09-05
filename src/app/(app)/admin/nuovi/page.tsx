import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { STATI_CONTATTO, isAdmin, puoAmministrare, puoVedereNuovi } from '@/lib/domain';
import { fmtDate } from '@/lib/format';
import { stagioneAttiva } from '@/lib/stagioni';
import { Intestazione, Statistica } from '@/components/ui';
import { ElencoNuovi, type RigaNuovo } from '@/components/ElencoNuovi';

/** Da quanti giorni un contatto è considerato "sparito". */
const GIORNI_INATTIVITA = 90;

export default async function NuoviPage() {
  // i contatti li seguono comando, amministrazione e segreteria: sono gli unici
  // a vederne nome e cognome per intero e ad aprirne la scheda
  const me = await requirePermesso(puoVedereNuovi);

  // stesse fonti dell'invio massivo: stagioni dall'anagrafica e listino della
  // stagione in corso, con le voci generiche che valgono sempre
  const stagione = await stagioneAttiva();
  const [stagioni, tariffe] = await Promise.all([
    prisma.stagione.findMany({ orderBy: { inizio: 'desc' }, select: { id: true, nome: true } }),
    // tutto il listino: quali voci valgono lo decide il modulo, che sa quale
    // stagione e' stata scelta nella tendina
    prisma.tariffa.findMany({ where: { attiva: true }, orderBy: { nome: 'asc' } }),
  ]);

  const listino = tariffe.map((t) => ({
    id: t.id,
    nome: t.nome,
    importo: Number(t.importo),
    usi: t.usi as string[],
    stagioneId: t.stagioneId,
  }));

  const nuovi = await prisma.user.findMany({
    where: { stato: { in: STATI_CONTATTO } },
    orderBy: { createdAt: 'desc' },
    include: {
      // una riga sola se chi sta guardando ha gia' aperto la scheda
      letturaDaAltri: { where: { lettoreId: me.id }, select: { id: true } },
      memberships: { select: { status: true } },
      rsvps: {
        select: { status: true, presente: true, event: { select: { inizio: true } } },
        orderBy: { event: { inizio: 'desc' } },
      },
    },
  });

  const righe: RigaNuovo[] = nuovi.map((n) => {
    const venute = n.rsvps.filter((r) => r.presente === true);
    const ultima = venute[0]?.event.inizio ?? null;
    return {
      id: n.id,
      nome: n.nome,
      cognome: n.cognome,
      callsign: n.callsign,
      email: n.email,
      telefono: n.telefono,
      stato: n.stato,
      registrato: fmtDate(n.createdAt),
      ultimoAccesso: n.ultimoAccesso ? fmtDate(n.ultimoAccesso) : null,
      daLeggere: n.stato === 'NUOVO' && n.letturaDaAltri.length === 0,
      adesioni: n.rsvps.filter((r) => r.status === 'PRESENTE').length,
      presenze: venute.length,
      ultimaPresenza: ultima ? fmtDate(ultima) : null,
      haIscrizione: n.memberships.some((m) =>
        ['INVITATA', 'COMPILATA', 'ATTIVA'].includes(m.status),
      ),
    };
  });

  const soglia = Date.now() - GIORNI_INATTIVITA * 86400000;
  const maiVenuti = nuovi.filter((n) => !n.rsvps.some((r) => r.presente === true)).length;
  const spariti = nuovi.filter((n) => {
    const ultima = n.rsvps.find((r) => r.presente === true)?.event.inizio;
    return ultima ? new Date(ultima).getTime() < soglia : false;
  }).length;
  const inIter = righe.filter(
    (r) => r.stato === 'ATTESA_COMPILAZIONE' || r.stato === 'ATTESA_ACCETTAZIONE',
  ).length;

  return (
    <>
      <Intestazione
        titolo="Nuovi"
        sottotitolo="Chi si sta approcciando al team: monitora chi torna e chi no, poi invita o elimina"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="Contatti attivi" valore={righe.length} tono="info" />
        <Statistica
          etichetta="Mai venuti"
          valore={maiVenuti}
          dettaglio="nessuna presenza registrata"
          tono={maiVenuti ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="Spariti"
          valore={spariti}
          dettaglio={`nessuna presenza da ${GIORNI_INATTIVITA} giorni`}
          tono={spariti ? 'danger' : 'ok'}
        />
        <Statistica etichetta="In iter di iscrizione" valore={inIter} tono="warn" />
      </div>

      <ElencoNuovi
        righe={righe}
        stagioni={stagioni}
        stagioneId={stagione.id}
        listino={listino}
        // le azioni restano a chi le può eseguire: la segreteria guarda e basta
        puoInvitare={puoAmministrare(me.roles)}
        puoEliminare={isAdmin(me.roles)}
      />
    </>
  );
}
