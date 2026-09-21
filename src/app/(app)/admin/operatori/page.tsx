import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  certificatoInScadenza,
  isAdmin,
  inRegola,
  puoVedereOperatori,
  statoEffettivo,
  devePortareCertificato,
  eAtleta,
  soloAtleti,
} from '@/lib/domain';
import { fmtDate, fmtDateTime, iniziali, nomeCompleto } from '@/lib/format';
import { stagioneAttiva } from '@/lib/stagioni';
import { Intestazione, Statistica } from '@/components/ui';
import { ElencoOperatori, type RigaOperatore } from '@/components/ElencoOperatori';
import { ElencoRegolarita, type RigaRegolarita } from '@/components/ElencoRegolarita';
import { BottoneCreaOperatore } from '@/components/FormOperatore';
import { ElencoNotifiche, type RigaNotifiche } from '@/components/ElencoNotifiche';
import { ScegliVista } from '@/components/ScegliVista';

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
export default async function OperatoriPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const me = await requirePermesso(puoVedereOperatori);
  const { vista } = await searchParams;
  if (!isAdmin(me.roles)) return <Regolarita />;
  if (vista === 'notifiche') return <Notifiche />;
  return <Gestione tutti={vista === 'tutti'} />;
}

/**
 * Le viste dell'admin sulle persone.
 *
 * Stesso indirizzo, domande diverse: l'anagrafica — chi c'è, che ruoli ha,
 * com'è messo — e gli avvisi, cioè su chi si può contare quando si manda
 * una notifica. Tenerle in una pagina sola vorrebbe dire una tabella con
 * dodici colonne in cui non si legge più niente.
 */
const VISTE_OPERATORI = [
  { chiave: 'elenco', href: '/admin/operatori', testo: 'Libro atleti' },
  { chiave: 'tutti', href: '/admin/operatori?vista=tutti', testo: 'Tutti' },
  { chiave: 'notifiche', href: '/admin/operatori?vista=notifiche', testo: 'Avvisi' },
];

/**
 * Chi riceve gli avvisi sul telefono.
 *
 * La domanda nasce il giorno che si manda qualcosa di importante: **a quante
 * persone è arrivato davvero?** Il permesso lo dà il telefono, una volta
 * sola, e chi ha detto no quel giorno non lo sa più nessuno — il gestionale
 * manda, il servizio accetta, e il messaggio non arriva. Qui si vede prima.
 */
async function Notifiche() {
  const operatori = await prisma.user.findMany({
    where: { stato: { in: ['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE'] } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    select: {
      id: true,
      nome: true,
      cognome: true,
      callsign: true,
      ultimaAttivita: true,
      iscrizioniPush: {
        orderBy: { creatoIl: 'asc' },
        select: { id: true, dispositivo: true, creatoIl: true },
      },
    },
  });

  const righe: RigaNotifiche[] = operatori.map((o) => ({
    id: o.id,
    nome: o.nome,
    cognome: o.cognome,
    callsign: o.callsign,
    // il dispositivo lo racconta il browser e a volte non lo dice: allora si
    // scrive almeno da quando e' iscritto, che e' meglio di una riga vuota
    dispositivi: o.iscrizioniPush.map(
      (i) => `${i.dispositivo ?? 'dispositivo sconosciuto'} \u00b7 dal ${fmtDate(i.creatoIl)}`,
    ),
    ultimaAttivita: o.ultimaAttivita ? fmtDateTime(o.ultimaAttivita) : null,
    maiEntrato: o.ultimaAttivita === null,
  }));

  const raggiunti = righe.filter((r) => r.dispositivi.length > 0).length;
  const dispositivi = righe.reduce((t, r) => t + r.dispositivi.length, 0);
  const scoperti = righe.length - raggiunti;

  return (
    <>
      <Intestazione
        titolo="Operatori"
        sottotitolo="Chi riceve gli avvisi sul telefono, e chi va cercato in un altro modo"
        azioni={<ScegliVista viste={VISTE_OPERATORI} attuale="notifiche" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Li ricevono"
          valore={raggiunti}
          dettaglio={`su ${righe.length} in squadra`}
          tono={raggiunti > 0 ? 'ok' : 'neutro'}
        />
        <Statistica
          etichetta="Non li ricevono"
          valore={scoperti}
          dettaglio="vanno avvisati in altro modo"
          tono={scoperti > 0 ? 'warn' : 'ok'}
        />
        <Statistica etichetta="Dispositivi" valore={dispositivi} dettaglio="telefoni e computer" />
      </div>

      <ElencoNotifiche righe={righe} />

      <p className="mt-4 text-xs text-muted">
        Il permesso lo concede il telefono, e da qui non si può né darlo né
        togliere: ognuno lo accende dal proprio profilo. Chi non compare fra i raggiunti non ha
        fatto niente di male: ha solo detto di no a una finestra, magari mesi fa.
      </p>
    </>
  );
}

/**
 * Quello che l'admin fa con le persone: crearle, dare ruoli, toglierle.
 *
 * Due elenchi dietro allo stesso indirizzo, e quello che si apre per primo è
 * **il libro atleti**: chi in campo ci va. In squadra non ci sono solo
 * giocatori — c'è chi tiene i conti, le tessere, la segreteria — e sono
 * persone del club a tutti gli effetti, ma mischiate agli altri facevano
 * sembrare la rosa più grande di quella che scende in campo la domenica.
 *
 * «Tutti» esiste perché quelle persone vanno comunque gestite: ci si dà un
 * ruolo, ci si azzera una password, ci si guarda una quota aperta. Non sono
 * nascoste, sono in un'altra pagina.
 */
async function Gestione({ tutti }: { tutti: boolean }) {

  // Chi è da riconfermare va tenuto dentro: aprendo una stagione tutta la rosa
  // passa in quello stato, e finché non compariva qui restava invisibile —
  // impossibile riconfermarlo, modificarlo o cancellarlo dall'applicazione.
  // I contatti da valutare non stanno qui: hanno la loro pagina, «Nuovi».
  const operatori = await prisma.user.findMany({
    where: {
      stato: { in: ['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE', 'DISABILITATO'] },
      ...(tutti ? {} : soloAtleti),
    },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    include: {
      certificates: { select: { status: true, scadeIl: true }, orderBy: { createdAt: 'desc' } },
      // i debiti col club: una quota del corso di Mario non è un debito verso la squadra
      payments: { where: { cassaId: null }, select: { importo: true, pagato: true, status: true } },
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
  // solo chi deve portarlo: a chi non è atleta il certificato non si chiede
  const senzaCertificato = righe.filter(
    (r) => devePortareCertificato(r.roles) && r.certStato !== 'VALIDO',
  ).length;
  const conDebito = righe.filter((r) => r.daSaldare > 0).length;
  const teamLeader = righe.filter((r) => r.roles.includes('TL')).length;

  /*
   * Quanti scendono in campo, adesso.
   *
   * È il numero che si va a cercare quando si prepara una giocata — «in quanti
   * siamo?» — e non è «quanti sono in squadra»: fra quelli c'è chi tiene i
   * conti e la domenica non c'è. Si contano quelli in forza: un sospeso o un
   * disabilitato è nel libro ma quella domenica non si schiera.
   */
  const atletiInForza = righe.filter((r) => eAtleta(r.roles) && r.stato === 'SQUADRA').length;

  return (
    <>
      <Intestazione
        titolo={tutti ? 'Operatori' : 'Libro atleti'}
        sottotitolo={
          tutti
            ? 'Tutti quelli del club, atleti e non · anagrafica completa'
            : 'Chi scende in campo · anagrafica completa'
        }
        azioni={
          <>
            <ScegliVista viste={VISTE_OPERATORI} attuale={tutti ? 'tutti' : 'elenco'} />
            <BottoneCreaOperatore />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Il numero che si cerca preparando una giocata: in quanti siamo
            davvero. Nell'elenco di tutti la domanda cambia — lì si guarda
            quanti sono del club — e il riquadro la segue. */}
        <Statistica
          etichetta={tutti ? 'In squadra' : 'Atleti in forza'}
          valore={tutti ? inSquadra : atletiInForza}
          dettaglio={daRiconfermare > 0 ? `${daRiconfermare} da riconfermare` : undefined}
          tono="ok"
        />
        <Statistica etichetta="Team leader" valore={teamLeader} tono="warn" />
        <Statistica
          etichetta="Atleti senza certificato valido"
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

      {/* Dove sono finiti gli altri. Un elenco che ne nasconde una parte senza
          dirlo fa cercare una persona che c'è, e non trovarla fa pensare a un
          guasto. */}
      <p className="mt-4 text-xs text-muted">
        {tutti ? (
          <>
            Tutti quelli del club: <strong className="text-ink">atleti e non</strong>. Chi non ha
            il ruolo atleta è del club come gli altri — si iscrive, paga, viene alle cene — ma in
            campo non ci va: non gli si chiede il certificato, non fa numero nelle statistiche e
            non compare fra chi si può schierare.
          </>
        ) : (
          <>
            Il libro atleti è <strong className="text-ink">chi scende in campo</strong>, ed è
            quello che fa numero nelle statistiche. Chi tiene i conti, le tessere o la segreteria
            sta in <strong className="text-ink">Tutti</strong>: si gestisce da lì, e lì gli si può
            dare il ruolo atleta il giorno che comincia a giocare.
          </>
        )}
      </p>
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
    // a chi non è atleta il certificato non si chiede: senza, è a posto lo stesso
    const serveCertificato = devePortareCertificato(o.roles);

    return {
      id: o.id,
      nome: nomeCompleto(o),
      iniziali: iniziali(o.nome, o.cognome),
      foto: !!o.fotoPath,
      stato: o.stato,
      iscrizione,
      certStato: cert ? cert.effettivo : null,
      certTipo: cert?.tipo ?? null,
      certScade: cert?.scadeIl ? fmtDate(cert.scadeIl) : null,
      certInScadenza: cert?.effettivo === 'VALIDO' && certificatoInScadenza(cert.scadeIl),
      serveCertificato,
      tessera: o.figtCards[0]?.status ?? null,
      // «a posto» sono le due cose che questa pagina esiste per sapere:
      // iscrizione della stagione attiva e un certificato valido oggi
      aPosto: iscrizione === 'ATTIVA' && (!serveCertificato || inRegola(o.certificates)),
    };
  });

  const daSistemare = righe.filter((r) => !r.aPosto).length;
  // Quanti di quelli in rosa scendono in campo: «in rosa 17, atleti 16» dice
  // in due numeri una cosa che altrimenti si scopre contando a mano.
  const atleti = operatori.filter((o) => eAtleta(o.roles)).length;
  const senzaCertificato = righe.filter(
    (r) => r.serveCertificato && r.certStato !== 'VALIDO',
  ).length;
  const senzaIscrizione = righe.filter((r) => r.iscrizione !== 'ATTIVA').length;

  return (
    <>
      <Intestazione
        titolo="Operatori"
        sottotitolo={`Chi è in regola con iscrizione e certificato · stagione ${stagione.nome}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="In rosa"
          valore={righe.length}
          dettaglio={atleti < righe.length ? `${atleti} atleti` : undefined}
        />
        <Statistica
          etichetta="Da sistemare"
          valore={daSistemare}
          tono={daSistemare > 0 ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="Atleti senza certificato valido"
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
