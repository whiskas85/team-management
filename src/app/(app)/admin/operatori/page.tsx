import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, statoEffettivo } from '@/lib/domain';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { Campo, Intestazione, Statistica } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { ElencoOperatori, type RigaOperatore } from '@/components/ElencoOperatori';
import { SceltaRuoli, SceltaStato } from '@/components/FormOperatore';
import { creaOperatore } from '@/actions/operatori';

export default async function OperatoriPage() {
  await requirePermesso(isAdmin);

  // Qui vivono gli atleti registrati: i contatti da valutare stanno in "Nuovi".
  // Chi è da riconfermare va tenuto dentro: aprendo una stagione tutta la rosa
  // passa in quello stato, e finché non compariva qui restava invisibile —
  // impossibile riconfermarlo, modificarlo o cancellarlo dall'applicazione.
  const operatori = await prisma.user.findMany({
    where: { stato: { in: ['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE', 'DISABILITATO'] } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    include: {
      certificates: { select: { status: true, scadeIl: true }, orderBy: { createdAt: 'desc' } },
      payments: { select: { importo: true, pagato: true, status: true } },
      rsvps: { select: { status: true, presente: true } },
    },
  });

  const righe: RigaOperatore[] = operatori.map((o) => {
    const cert = o.certificates[0];
    return {
      id: o.id,
      nome: o.nome,
      cognome: o.cognome,
      callsign: o.callsign,
      email: o.email,
      telefono: o.telefono,
      roles: o.roles,
      stato: o.stato,
      adesioni: o.rsvps.filter((r) => r.status === 'PRESENTE').length,
      presenze: o.rsvps.filter((r) => r.presente === true).length,
      certStato: cert ? statoEffettivo(cert) : null,
      certScade: cert?.scadeIl ? fmtDate(cert.scadeIl) : null,
      // con l'ora: sapere se è entrato stamattina o tre settimane fa cambia
      ultimoAccesso: o.ultimoAccesso ? fmtDateTime(o.ultimoAccesso) : null,
      ultimoAccessoIl: o.ultimoAccesso ? o.ultimoAccesso.getTime() : null,
      daSaldare: o.payments
        .filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE')
        .reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0),
    };
  });

  const inSquadra = righe.filter((r) => r.stato === 'SQUADRA').length;
  const daRiconfermare = righe.filter((r) => r.stato === 'DA_RICONFERMARE').length;
  const senzaCertificato = righe.filter((r) => r.certStato !== 'VALIDO').length;
  const conDebito = righe.filter((r) => r.daSaldare > 0).length;
  const teamLeader = righe.filter((r) => r.roles.includes('TL')).length;

  return (
    <>
      <Intestazione
        titolo="Operatori"
        sottotitolo="Atleti registrati del team · anagrafica completa"
        azioni={
          <BottoneModale etichetta="Crea operatore" icona="operatori" titolo="Nuovo operatore" larga>
            <FormAzione azione={creaOperatore}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Nome *">
                  <input name="nome" required className="input" />
                </Campo>
                <Campo label="Cognome *">
                  <input name="cognome" required className="input" />
                </Campo>
                <Campo label="Email *">
                  <input name="email" type="email" required className="input" />
                </Campo>
                <Campo label="Callsign">
                  <input name="callsign" className="input" />
                </Campo>
                <Campo label="Telefono">
                  <input name="telefono" className="input" />
                </Campo>
                <SceltaStato />
                <Campo label="Password provvisoria *" span>
                  <input name="password" type="text" minLength={8} required className="input" />
                </Campo>
              </div>

              <SceltaRuoli attuali={['ATLETA']} />

              <Invia icona="aggiungi">
            Crea operatore
          </Invia>
              <p className="text-xs text-muted">
                Comunica tu la password provvisoria: l’operatore potrà cambiarla dal suo profilo.
              </p>
            </FormAzione>
          </BottoneModale>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="In squadra"
          valore={inSquadra}
          dettaglio={daRiconfermare > 0 ? `${daRiconfermare} da riconfermare` : undefined}
          tono="ok"
        />
        <Statistica etichetta="Team leader" valore={teamLeader} tono="warn" />
        <Statistica
          etichetta="Senza certificato valido"
          valore={senzaCertificato}
          tono={senzaCertificato ? 'danger' : 'ok'}
        />
        <Statistica
          etichetta="Con quote aperte"
          valore={conDebito}
          tono={conDebito ? 'warn' : 'ok'}
        />
      </div>

      <ElencoOperatori
        righe={righe}
        statiFiltrabili={['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE', 'DISABILITATO']}
        puoEliminare
        puoAssegnareRuoli
      />
    </>
  );
}
