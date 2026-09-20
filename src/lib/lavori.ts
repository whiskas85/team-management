import { prisma } from './db';
import { conIdentita } from './identita';
import { attivitaDaCoprire, dataLocale } from './assicurazione';
import { attivaGiornaliera } from '@/actions/assicurazione';
import type { SessionUser } from './auth';
import { avvisaPersona } from './avvisi';
import { fmtDate, giorniA } from './format';

/**
 * Il lavoro che si sveglia da solo.
 *
 * Il gestionale, per tutto il resto, fa qualcosa perché qualcuno ha premuto un
 * pulsante. Qui no: un `cron` sulla macchina chiama `/api/lavori` ogni pochi
 * minuti, e questa funzione guarda se c'è qualcosa da fare **adesso**.
 *
 * Serve per un caso solo, ed è quello per cui è nata: la domenica mattina.
 * Alle otto si è in viaggio, il gestionale non lo apre nessuno, e chi non è
 * stato coperto il giovedì arriva in campo scoperto. Un'ora prima è il momento
 * in cui non c'è più nessuno a rimediare.
 */

export type EsitoLavori = {
  spento?: true;
  /** Quante polizze sono state attivate davvero. */
  fatte: number;
  /** Quante sono state tentate e rifiutate, col perché. */
  rifiutate: { chi: string; perche: string }[];
  /** Quante persone erano da coprire ma non lo erano ancora: quota, dati. */
  inAttesa: number;
};

/**
 * Non più di queste per giro.
 *
 * Non è una regola di dominio, è un freno: se un difetto qui dentro provasse
 * ad assicurare in cerchio, il costo lo pagherebbe il club in polizze vere. Un
 * tetto basso lo fa fermare dopo poche, e la prossima sveglia riprende da dove
 * era arrivato.
 */
const MAX_PER_GIRO = 20;

/** Chi firma le polizze che partono da sole. */
async function chiFirma(id: string | null): Promise<SessionUser | null> {
  const utente = await prisma.user.findFirst({
    where: {
      ...(id ? { id } : {}),
      stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] },
      roles: { hasSome: ['ADMIN', 'AMMINISTRAZIONE'] },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      nome: true,
      cognome: true,
      callsign: true,
      deveCambiarePassword: true,
      roles: true,
      stato: true,
      ultimaAttivita: true,
    },
  });
  // chi l'aveva accesa può essere uscito dalla squadra: in quel caso firma il
  // primo che amministra, invece di smettere di assicurare senza dirlo
  if (!utente && id) return chiFirma(null);
  return utente;
}

/**
 * Copre chi sta per giocare e non è ancora coperto.
 *
 * **Le regole non le decide questa funzione.** Chiama la stessa azione del
 * pulsante «Assicura», per conto di chi ha acceso l'automatismo: ha detto «ci
 * sono», la quota è saldata o dichiarata, i dati anagrafici ci sono, non è già
 * coperto, ha almeno dodici anni. Se un domani una di quelle regole cambia,
 * cambia in un posto solo e vale anche qui — che è tutto il punto di passare
 * di lì invece di riscriverla.
 */
export async function assicuraInAnticipo(): Promise<EsitoLavori> {
  const conf = await prisma.impostazioni.findUnique({ where: { id: 'app' } });
  const generale = conf?.assicuraAuto ?? false;

  /*
   * L'interruttore grande e quello della singola attività.
   *
   * L'attività, se ha detto la sua, comanda — in tutti e due i versi: una
   * giocata può assicurare da sola con l'interruttore generale spento, e una
   * può restare a mano con l'interruttore generale acceso. Chi non ha detto
   * niente segue il grande, che è il caso di quasi tutte.
   */
  const attivo = (a: { assicuraAuto: boolean | null }) => a.assicuraAuto ?? generale;

  const daFare = (await attivitaDaCoprire()).filter(attivo);
  if (daFare.length === 0) return { spento: true, fatte: 0, rifiutate: [], inAttesa: 0 };

  const firma = await chiFirma(conf?.assicuraAutoDaId ?? null);
  if (!firma) return { fatte: 0, rifiutate: [{ chi: '—', perche: 'nessun admin a cui intestarle' }], inAttesa: 0 };

  const adesso = new Date();
  // senza impostazioni salvate vale il preavviso di serie: un'ora
  const finestra = new Date(adesso.getTime() + (conf?.assicuraAnticipoMin ?? 60) * 60_000);
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const esito: EsitoLavori = { fatte: 0, rifiutate: [], inAttesa: 0 };

  for (const attivita of daFare) {
    // Quelle che cominciano più in là del preavviso si guardano al prossimo
    // giro: è presto, e chi deve ancora pagare ha tempo per farlo.
    if (attivita.quando > finestra) continue;

    for (const nuovo of attivita.nuovi) {
      if (!nuovo.copribile || !nuovo.datiCompleti) {
        // non è un rifiuto: è uno che il gestionale non può coprire ancora,
        // e lo dice già la pagina delle polizze in rosso
        esito.inAttesa += 1;
        continue;
      }

      for (const g of nuovo.giorni) {
        if (!g.serve || g.copertura === 'ASSICURATO') continue;
        // un giorno già passato non si copre: la polizza vale fino alle 24:00
        // del suo giorno, e comprarla dopo è buttarla
        // mezzanotte di qui contro mezzanotte di qui: la chiave del giorno
        // letta in UTC starebbe un fuso più in là e sposterebbe il confronto
        const quandoVale = dataLocale(g.giorno);
        if (quandoVale < oggi) continue;

        if (esito.fatte >= MAX_PER_GIRO) return esito;

        const dati = new FormData();
        dati.set('userId', nuovo.id);
        dati.set('eventId', attivita.id);
        dati.set('giorno', g.giorno);

        const risposta = await conIdentita(firma, () => attivaGiornaliera({}, dati));
        if (risposta.ok) esito.fatte += 1;
        else if (risposta.errore) {
          esito.rifiutate.push({ chi: `${nuovo.nome} · ${attivita.titolo}`, perche: risposta.errore });
        }
      }
    }
  }

  return esito;
}

/**
 * Le tappe dell'avviso di scadenza.
 *
 * Un mese prima serve a prenotare la visita; una settimana prima a ricordarsi
 * che l'hai prenotata; il giorno stesso a non presentarsi in campo scoperto.
 * Le tappe in mezzo esistono perché fra trenta giorni e zero c'è un mese in
 * cui è facile non pensarci mai.
 */
const TAPPE_SCADENZA = [30, 14, 7, 3, 1, 0];

/** Meno zero: la scadenza è passata, e lo si dice una volta sola. */
const TAPPA_SCADUTO = -1;

/**
 * Avvisa chi ha il certificato in scadenza.
 *
 * Il gestionale lo sapeva già — lo dice la pagina del certificato, con i
 * giorni che mancano e la linea che si accorcia. Ma **chi ha il certificato in
 * scadenza è esattamente la persona che quella pagina non la apre**: se la
 * aprisse se ne sarebbe già accorta. La notifica va a cercarla dove sta, sul
 * telefono.
 *
 * Una per tappa, non una al giorno e tantomeno una ogni cinque minuti: quello
 * che si ricorda non è *se* abbiamo avvisato, è **a che punto eravamo** —
 * altrimenti il passaggio da «manca una settimana» a «è domani», che è la cosa
 * che conta, non si distinguerebbe da un doppione.
 *
 * Si manda **solo agli atleti**: il certificato serve a scendere in campo, e
 * chi tiene i conti o le tessere in campo non ci va. Stessa regola di tutto il
 * resto, `devePortareCertificato`.
 */
export async function avvisaCertificatiInScadenza(): Promise<{ avvisati: number }> {
  /*
   * Non di notte, e non all'alba.
   *
   * Un certificato che scade fra tre giorni scade fra tre giorni anche alle
   * nove del mattino: far vibrare il telefono a mezzanotte e cinque — che è
   * quando il conto dei giorni cambia — non serve a nessuno e insegna a
   * spegnere le notifiche.
   */
  const ora = new Date().getHours();
  if (ora < 9 || ora >= 21) return { avvisati: 0 };

  const certificati = await prisma.medicalCertificate.findMany({
    where: {
      status: 'VALIDO',
      scadeIl: { not: null, lte: new Date(Date.now() + (TAPPE_SCADENZA[0] + 1) * 86_400_000) },
      user: { stato: { notIn: ['DISABILITATO', 'RIFIUTATO'] }, roles: { has: 'ATLETA' } },
    },
    select: { id: true, userId: true, scadeIl: true, avvisoScadenzaA: true },
  });

  let avvisati = 0;

  for (const cert of certificati) {
    const giorni = giorniA(cert.scadeIl);
    if (giorni === null) continue;

    // la tappa in cui siamo: la prima che il conto alla rovescia ha raggiunto
    const tappa = giorni < 0 ? TAPPA_SCADUTO : (TAPPE_SCADENZA.find((t) => giorni <= t) ?? null);
    if (tappa === null) continue;

    // già detto a questa tappa, o a una più stretta: si tace
    if (cert.avvisoScadenzaA !== null && tappa >= cert.avvisoScadenzaA) continue;

    await avvisaPersona(cert.userId, {
      titolo:
        tappa === TAPPA_SCADUTO
          ? 'Certificato medico scaduto'
          : giorni === 0
            ? 'Il certificato medico scade oggi'
            : `Il certificato medico scade fra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`,
      testo:
        tappa === TAPPA_SCADUTO
          ? 'Senza non si scende in campo: prenota la visita e carica il nuovo appena ce l’hai.'
          : 'Prenota la visita adesso: fra il medico e l’approvazione ci vuole qualche giorno.',
      url: '/certificati',
      // uno solo per persona: due avvisi di scadenza non fanno due righe
      tag: 'certificato-scadenza',
      // a chi le notifiche non le ha, lo stesso avviso arriva su WhatsApp —
      // scritto per stare da solo in una chat, con dentro la data
      whatsapp:
        tappa === TAPPA_SCADUTO
          ? `Zero Dark Ops — il tuo certificato medico è scaduto il ${fmtDate(cert.scadeIl)}.

Senza non si scende in campo: prenota la visita e carica il nuovo nel gestionale appena ce l'hai.`
          : `Zero Dark Ops — il tuo certificato medico scade ${
              giorni === 0 ? 'oggi' : `fra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`
            }, il ${fmtDate(cert.scadeIl)}.

Prenota la visita adesso: fra il medico e l'approvazione ci vuole qualche giorno. Il nuovo si carica dal gestionale, in «Miei certificati».`,
    });

    await prisma.medicalCertificate.update({
      where: { id: cert.id },
      data: { avvisoScadenzaA: tappa },
    });
    avvisati += 1;
  }

  return { avvisati };
}
