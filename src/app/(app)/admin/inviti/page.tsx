import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoAmministrare } from '@/lib/domain';
import { stagioneAttiva } from '@/lib/stagioni';
import { Intestazione, Statistica } from '@/components/ui';
import { InvioRichieste, type Candidato } from '@/components/InvioRichieste';

/**
 * Etichetta della stagione precedente. Il nome lo sceglie chi crea la stagione,
 * quindi puo' essere "2025/2026" o solo "2026": si decrementano gli anni che si
 * trovano e, se non ce ne sono, si rinuncia invece di scrivere "NaN".
 */
function stagionePrecedente(nome: string): string | null {
  if (!/\d{4}/.test(nome)) return null;
  return nome.replace(/\d{4}/g, (a) => String(Number(a) - 1));
}

export default async function InvitiPage() {
  await requirePermesso(puoAmministrare);

  // la stagione in corso viene dall'anagrafica, non più calcolata dal calendario
  const stagione = await stagioneAttiva();
  const precedente = stagionePrecedente(stagione.nome);

  // il listino di questa stagione: le voci sue più quelle generiche. Se una
  // voce esiste in entrambe le versioni vince quella della stagione
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

  // candidati: chiunque non sia disabilitato e non sia già in regola per la stagione
  const utenti = await prisma.user.findMany({
    where: { stato: { notIn: ['DISABILITATO'] } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    include: {
      memberships: { select: { stagioneId: true, status: true, stagione: { select: { nome: true } } } },
      rsvps: { select: { presente: true } },
    },
  });

  const candidati: Candidato[] = utenti.map((u) => {
    const perStagione = u.memberships.find((m) => m.stagioneId === stagione.id);
    const storiche = u.memberships
      .filter((m) => m.status === 'ATTIVA' && m.stagioneId !== stagione.id)
      .map((m) => m.stagione.nome)
      .sort()
      .reverse();

    return {
      id: u.id,
      nome: u.nome,
      cognome: u.cognome,
      callsign: u.callsign,
      email: u.email,
      telefono: u.telefono,
      stato: u.stato,
      origine: storiche.length > 0 ? 'VECCHIO' : 'NUOVO',
      ultimaStagione: storiche[0] ?? null,
      presenze: u.rsvps.filter((r) => r.presente === true).length,
      giaInvitato: !!perStagione,
    };
  });

  const daInvitare = candidati.filter((c) => !c.giaInvitato);
  const rinnovi = daInvitare.filter((c) => c.origine === 'VECCHIO').length;

  const inviti = await prisma.membership.groupBy({
    by: ['status'],
    where: { stagioneId: stagione.id },
    _count: { _all: true },
  });
  const conta = (s: string) => inviti.find((i) => i.status === s)?._count._all ?? 0;

  return (
    <>
      <Intestazione
        titolo="Invio richieste di iscrizione"
        sottotitolo={`Stagione ${stagione.nome} · scegli i destinatari e inoltra il modulo da compilare`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Da invitare"
          valore={daInvitare.length}
          dettaglio={`${rinnovi} rinnovi, ${daInvitare.length - rinnovi} nuovi`}
          tono={daInvitare.length ? 'warn' : 'ok'}
        />
        <Statistica etichetta="Inviti in attesa" valore={conta('INVITATA')} tono="info" />
        <Statistica etichetta="Moduli compilati" valore={conta('COMPILATA')} tono="warn" />
        <Statistica etichetta="Iscrizioni attive" valore={conta('ATTIVA')} tono="ok" />
      </div>

      <InvioRichieste
        candidati={candidati}
        stagioni={stagioni}
        stagioneId={stagione.id}
        stagionePrecedente={precedente}
        listino={listino}
      />
    </>
  );
}
