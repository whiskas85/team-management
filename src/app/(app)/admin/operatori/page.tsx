import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  certificatoInScadenza,
  isAdmin,
  inRegola,
  puoVedereOperatori,
  statoEffettivo,
} from '@/lib/domain';
import { fmtDate, fmtDateTime, iniziali, nomeCompleto } from '@/lib/format';
import { stagioneAttiva } from '@/lib/stagioni';
import { Intestazione, Statistica } from '@/components/ui';
import { ElencoOperatori, type RigaOperatore } from '@/components/ElencoOperatori';
import { ElencoRegolarita, type RigaRegolarita } from '@/components/ElencoRegolarita';
import { BottoneCreaOperatore } from '@/components/FormOperatore';

export const dynamic = 'force-dynamic';

/**
 * Gli operatori, in due pagine dietro allo stesso indirizzo.
 *
 * Chi apre «Operatori» cerca le persone della squadra, ma non tutti per lo
 * stesso motivo: l'admin le **gestisce** — le crea, dà i ruoli, azzera una
 * password — mentre amministrazione, segreteria e team leader le
 * **controllano**, e di un compagno hanno bisogno di sapere se è a posto con
 * l'iscrizione e con il certificato.
 *
 * Prima la voce c'era per tutti e la pagina la apriva solo l'admin: agli altri
 * rispondeva rimbalzandoli sulla home, che è il modo peggiore di dire di no —
 * sembra un guasto. Un indirizzo solo, due pagine: il menu non mente e nessuno
 * si trova davanti pulsanti che non gli competono.
 */
export default async function OperatoriPage() {
  const me = await requirePermesso(puoVedereOperatori);
  return isAdmin(me.roles) ? <Gestione /> : <Regolarita />;
}

/** Quello che l'admin fa con le persone: crearle, dare ruoli, toglierle. */
async function Gestione() {

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
      // Con l'ora: sapere se c'è passato stamattina o tre settimane fa cambia.
      // È l'ultima volta che ha **usato** il gestionale, non che ci è entrato:
      // chi ha spuntato «ricordami» non fa un accesso per due mesi pur
      // aprendolo tutti i giorni, e da qui sembrava sparito.
      ultimaAttivita: o.ultimaAttivita ? fmtDateTime(o.ultimaAttivita) : null,
      ultimaAttivitaIl: o.ultimaAttivita ? o.ultimaAttivita.getTime() : null,
      daSaldare: o.payments
        .filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE')
        .reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0),
    };
  });

  // Chi ha detto di no alle foto. Serve a chi pubblica: il consenso si chiede
  // a tutti, e chi si è tirato indietro va saputo prima di caricare l'album
  // della domenica, non dopo.
  const nienteFoto = operatori.filter(
    (o) => o.consensoImmaginiIl !== null && !o.consensoImmagini && o.stato !== 'DISABILITATO',
  );

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
        azioni={<BottoneCreaOperatore />}
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

      {/* Chi non vuole comparire nelle foto. Il consenso si chiede a tutti, e
          chi si è tirato indietro va saputo prima di caricare l'album della
          domenica — dopo è tardi. */}
      {nienteFoto.length > 0 && (
        <div className="mb-6 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          <strong>Niente foto pubblicate</strong>:{' '}
          {nienteFoto.map((o) => nomeCompleto(o)).join(', ')}. Hanno detto di no, ed è una risposta
          buona quanto l'altra: quando pubblichi, tienili fuori.
        </div>
      )}

      <ElencoOperatori
        righe={righe}
        statiFiltrabili={['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE', 'DISABILITATO']}
        puoEliminare
        puoAssegnareRuoli
      />
    </>
  );
}

/**
 * Quello che chi segue le persone ha bisogno di sapere: chi è in regola.
 *
 * Guarda solo la rosa — chi è in squadra, sospeso o da riconfermare: i
 * contatti stanno in «Nuovi» e hanno un percorso loro, i disabilitati non
 * giocano più e riempirebbero l'elenco di righe rosse che non riguardano
 * nessuno.
 */
async function Regolarita() {
  const stagione = await stagioneAttiva();

  const operatori = await prisma.user.findMany({
    where: { stato: { in: ['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE'] } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    include: {
      certificates: { select: { status: true, scadeIl: true, tipo: true } },
      // iscrizione e tessera si guardano nella stagione in corso: quella
      // dell'anno scorso era valida allora, e mostrarla direbbe che è a posto
      // uno che deve ancora rinnovare
      memberships: { where: { stagioneId: stagione.id }, select: { status: true } },
      figtCards: { where: { stagioneId: stagione.id }, select: { status: true } },
    },
  });

  const righe: RigaRegolarita[] = operatori.map((o) => {
    // Il certificato che conta è il migliore che vale oggi: fra due validi
    // vince l'agonistico — dove serve quello, l'altro non basta — e a parità
    // quello che scade più tardi. Se non ne vale nessuno si mostra comunque
    // l'ultimo, perché «in attesa» e «scaduto» sono due problemi diversi e
    // chiamarli entrambi «mancante» manderebbe a rifare una visita già fatta.
    const conStato = o.certificates.map((c) => ({ ...c, effettivo: statoEffettivo(c) }));
    const validi = conStato
      .filter((c) => c.effettivo === 'VALIDO')
      .sort(
        (a, b) =>
          Number(b.tipo === 'AGONISTICO') - Number(a.tipo === 'AGONISTICO') ||
          (b.scadeIl?.getTime() ?? 0) - (a.scadeIl?.getTime() ?? 0),
      );
    const ripiego = [...conStato].sort(
      (a, b) => (b.scadeIl?.getTime() ?? 0) - (a.scadeIl?.getTime() ?? 0),
    )[0];
    const cert = validi[0] ?? ripiego ?? null;

    const iscrizione = o.memberships[0]?.status ?? null;

    return {
      id: o.id,
      nome: nomeCompleto(o),
      iniziali: iniziali(o.nome, o.cognome),
      stato: o.stato,
      iscrizione,
      certStato: cert ? cert.effettivo : null,
      certTipo: cert?.tipo ?? null,
      certScade: cert?.scadeIl ? fmtDate(cert.scadeIl) : null,
      certInScadenza: cert?.effettivo === 'VALIDO' && certificatoInScadenza(cert.scadeIl),
      tessera: o.figtCards[0]?.status ?? null,
      // «a posto» sono le due cose che questa pagina esiste per sapere:
      // iscrizione della stagione attiva e un certificato valido oggi
      aPosto: iscrizione === 'ATTIVA' && inRegola(o.certificates),
    };
  });

  const daSistemare = righe.filter((r) => !r.aPosto).length;
  const senzaCertificato = righe.filter((r) => r.certStato !== 'VALIDO').length;
  const senzaIscrizione = righe.filter((r) => r.iscrizione !== 'ATTIVA').length;

  return (
    <>
      <Intestazione
        titolo="Operatori"
        sottotitolo={`Chi è in regola con iscrizione e certificato · stagione ${stagione.nome}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="In rosa" valore={righe.length} />
        <Statistica
          etichetta="Da sistemare"
          valore={daSistemare}
          tono={daSistemare > 0 ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="Senza certificato valido"
          valore={senzaCertificato}
          tono={senzaCertificato > 0 ? 'danger' : 'ok'}
          href="/admin/certificati"
        />
        <Statistica
          etichetta="Iscrizione non attiva"
          valore={senzaIscrizione}
          tono={senzaIscrizione > 0 ? 'warn' : 'ok'}
          href="/admin/richieste"
        />
      </div>

      <ElencoRegolarita righe={righe} />

      <p className="mt-4 text-xs text-muted">
        Si vede la rosa della stagione in corso: i contatti da valutare stanno in{' '}
        <strong className="text-ink">Nuovi</strong>. Aprendo una persona c’è la sua scheda con
        certificati, iscrizione e tessera per esteso.
      </p>
    </>
  );
}
