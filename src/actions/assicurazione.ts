'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoAmministrare, puoGestirePagamenti, puoSchierare } from '@/lib/domain';
import { bool, intOpt, str, strOpt, type StatoForm } from '@/lib/form';
import { decifra } from '@/lib/segreti';
import { attivaPolizzaProva, contaPolizzeProva, eta } from '@/lib/figt';
import {
  dataLocale,
  etichettaGiorno,
  giornoDaChiave,
  giorniDi,
  quotaOnorata,
  cassePerPolizza,
  quotePerPolizza,
  tariffePolizza,
  SCORTA_POLIZZE,
} from '@/lib/assicurazione';
import { inTest } from '@/lib/ambiente';
import { avvisa, chiSegueINuovi } from '@/lib/push';

function aggiorna(eventId: string) {
  revalidatePath(`/calendario/${eventId}`);
  revalidatePath('/calendario');
  revalidatePath('/admin/polizze');
}

/**
 * La quota della giornata dev'essere saldata prima di assicurare.
 *
 * Una polizza attivata consuma una polizza vera, non si annulla e la paga il
 * club: metterla prima dell'incasso vuol dire che se l'ospite poi non viene —
 * o non paga — quei soldi il team li ha già spesi. Prima si incassa, poi si
 * copre.
 *
 * Vale ovunque, anche dalla scheda dell'attività: una regola che si può
 * scavalcare dalla pagina accanto non è una regola. Chi non deve niente —
 * attività gratuita, giocata offerta — non ha una quota aperta e passa senza
 * dire nulla: non avere debiti non è come non averli saldati.
 *
 * Passa anche chi ha **dichiarato** il pagamento e aspetta la conferma della
 * segreteria: ha detto «te li do in contanti» mettendoci la faccia, e tenerlo
 * scoperto in campo per un passaggio di cassa non ancora spuntato sarebbe
 * severo col rischio sbagliato.
 */
async function quotaDaSaldare(userId: string, eventId: string) {
  // quale quota paga la polizza lo dicono le voci: la giornata sì,
  // l'istruttore no — sul Corso CQB il club non chiede niente, e prima
  // bastava quello per assicurare
  const evento = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      costoEsterni: true,
      vociSquadra: true,
      vociEsterni: true,
      quoteCasse: { select: { cassaId: true, importoEsterni: true } },
      vociAttivita: {
        select: { cassaId: true, perEsterni: true, scelta: true, perPolizza: true },
      },
    },
  });
  if (!evento) return null;
  const casse = cassePerPolizza(
    evento,
    await tariffePolizza([...evento.vociSquadra, ...evento.vociEsterni]),
  );
  const quote = await prisma.payment.findMany({
    where: { eventId, userId, tipo: { not: 'RIMBORSO' } },
    select: { status: true, dichiaratoIl: true, cassaId: true },
  });
  return quotePerPolizza(quote, casse).find((q) => !quotaOnorata(q)) ?? null;
}

/**
 * Il giorno da coprire, se è davvero uno di quelli dell'attività.
 *
 * Arriva dal modulo, quindi si controlla: una polizza registrata su una data
 * in cui non si gioca è una polizza spesa per niente. Un modulo senza giorno —
 * aperto prima dell'aggiornamento — copre il primo, che è quello che si è
 * sempre assicurato.
 */
function giornoDellAttivita(chiave: string, evento: { inizio: Date; fine: Date | null }) {
  const giorni = giorniDi(evento.inizio, evento.fine);
  const scelto = chiave || giorni[0];
  if (!scelto || !giorni.includes(scelto)) return null;
  const colonna = giornoDaChiave(scelto);
  if (!colonna) return null;
  return { chiave: scelto, colonna, locale: dataLocale(scelto) };
}

/**
 * Rilegge la giacenza dal portale e la conserva, con la data della lettura.
 *
 * È la sola scrittura di quel dato: chiamarla dopo ogni attivazione tiene il
 * numero aggiornato da solo, senza che nessuno debba ricordarsi di premere il
 * pulsante. Se il portale non risponde si scala quella appena consumata: un
 * numero vecchio di un'ora è meno sbagliato di un numero fermo a ieri.
 */
async function sincronizzaGiacenza(
  cred: { login: string; passwordCifrata: string; idAnagrafica: string },
  consumate = 0,
): Promise<number | null> {
  const dati = await (async () => {
    try {
      const g = await contaPolizzeProva({
        login: cred.login,
        password: decifra(cred.passwordCifrata),
        idAnagrafica: cred.idAnagrafica,
      });
      return { polizzeResidue: g.residue, polizzeAssegnate: g.assegnate };
    } catch {
      if (consumate === 0) return null;
      const attuale = await prisma.credenzialeFigt.findUnique({
        where: { id: 'figt' },
        select: { polizzeResidue: true, polizzeAssegnate: true },
      });
      if (attuale?.polizzeResidue === null || attuale?.polizzeResidue === undefined) return null;
      return {
        polizzeResidue: Math.max(0, attuale.polizzeResidue - consumate),
        polizzeAssegnate:
          attuale.polizzeAssegnate === null ? null : attuale.polizzeAssegnate + consumate,
      };
    }
  })();

  if (!dati) return null;

  const prima = await prisma.credenzialeFigt.findUnique({
    where: { id: 'figt' },
    select: { polizzeResidue: true },
  });

  await prisma.credenzialeFigt.update({
    where: { id: 'figt' },
    data: { ...dati, polizzeLetteIl: new Date() },
  });
  revalidatePath('/admin/cassa');
  revalidatePath('/admin/tessere');

  await avvisaScorteBasse(prima?.polizzeResidue ?? null, dati.polizzeResidue);
  return dati.polizzeResidue;
}

/**
 * Sotto le cinque polizze si avvisa chi le compra.
 *
 * Le polizze prova sono prepagate e si comprano a blocchi, con i tempi della
 * segreteria federale in mezzo: accorgersi che sono finite il sabato sera,
 * mentre tre nuovi aspettano di essere coperti, vuol dire che quei tre non
 * giocano. Il numero c'era già in cassa, ma bisognava andarlo a guardare — e
 * nessuno guarda un numero che è sempre stato grande.
 *
 * **Si avvisa quando il numero scende**, non a ogni lettura: riaprire la cassa
 * o rileggere il portale non è una notizia. Ogni polizza consumata sotto
 * soglia manda la sua — cinque, quattro, tre è una discesa, e ognuna è più
 * urgente della precedente.
 */
async function avvisaScorteBasse(prima: number | null, adesso: number | null) {
  if (adesso === null || adesso > SCORTA_POLIZZE) return;
  if (prima !== null && adesso >= prima) return;

  await avvisa(await chiSegueINuovi(), {
    titolo:
      adesso === 0 ? 'Polizze prova finite' : `Restano ${adesso} polizze prova`,
    testo:
      adesso === 0
        ? 'Non si può più assicurare nessun nuovo: vanno comprate prima della prossima attività.'
        : `Sotto le ${SCORTA_POLIZZE}: conviene ricomprarle adesso, la segreteria federale non è immediata.`,
    url: '/admin/polizze',
    // un tag solo: due avvisi di scorte non fanno due righe sul telefono
    tag: 'polizze-scorte',
  });
}

/**
 * Rilegge dal portale quante polizze prova restano da usare.
 *
 * È una lettura: non consuma niente, quindi si può fare anche dal test. Il
 * numero si conserva qui perché la cassa non deve chiamare il portale a ogni
 * apertura, e perché con il portale irraggiungibile è meglio mostrare l'ultimo
 * dato letto — con la sua data — che una pagina vuota.
 */
export async function aggiornaPolizzeProva(
  _prev: StatoForm,
  _fd: FormData,
): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles) && !puoAmministrare(me.roles)) {
    return { errore: 'Non hai i permessi per interrogare il portale federale.' };
  }

  const cred = await prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } });
  if (!cred) return { errore: 'Il portale federale non è collegato: mancano le credenziali.' };

  try {
    const residue = await sincronizzaGiacenza(cred);
    return { ok: `Il portale ne conta ${residue} ancora da usare.` };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : 'errore sconosciuto';
    // in test le credenziali sono cifrate con la chiave di prod: illeggibili
    return {
      errore: inTest
        ? `Non sono riuscito a leggere le polizze: ${motivo} In test le credenziali del portale restano cifrate con la chiave di prod, è voluto.`
        : `Non sono riuscito a leggere le polizze dal portale: ${motivo}`,
    };
  }
}

/**
 * Il messaggio che arriva alla persona appena è coperta.
 *
 * Una polizza giornaliera è una cosa che riguarda **lei**: il giorno che
 * copre, il numero che la identifica, fino a quando vale. Finora quei dati
 * restavano qui dentro, e chi era stato assicurato lo sapeva solo perché
 * qualcuno glielo diceva a voce — o non lo sapeva affatto e si presentava in
 * campo con il dubbio.
 *
 * Parte dal ponte, cioè dal numero della squadra, e **non blocca niente**: se
 * WhatsApp non è collegato, o quella persona non ha un numero, la polizza
 * resta attivata lo stesso. Un avviso mancato non è un buon motivo per far
 * fallire una cosa riuscita.
 */
async function avvisaAssicurato(dati: {
  userId: string;
  nome: string;
  cognome: string;
  titolo: string;
  giorno: string;
  codice: string;
  valida?: string | null;
}): Promise<boolean> {
  const { perWhatsapp } = await import('@/lib/telefono');
  const persona = await prisma.user.findUnique({
    where: { id: dati.userId },
    select: { telefono: true },
  });
  const numero = perWhatsapp(persona?.telefono);
  if (!numero) return false;

  const validita = dati.valida
    ? `Valida fino al ${dati.valida}`
    : 'Vale fino alle 24:00 del giorno indicato';

  const testo = `Zero Dark Ops — sei coperto

${dati.nome} ${dati.cognome}
Attività: ${dati.titolo}
Giorno: ${dati.giorno}
Polizza giornaliera n. ${dati.codice}
${validita}

Tienila a portata: in campo può essere chiesta.`;

  const { inviaWhatsapp } = await import('@/lib/whatsapp');
  const esito = await inviaWhatsapp(numero, testo).catch(() => ({ ok: false }) as const);
  return esito.ok;
}

/**
 * Emette la tessera giornaliera che copre chi gioca senza annuale.
 *
 * Il numero lo dà il portale federale, non noi. L'automazione verso
 * intranetasnwg.it non è ancora scritta — manca la cattura di rete della
 * pagina che le rilascia — quindi per ora la pratica si fa sul portale e qui
 * si registra il codice ottenuto. Quando arriverà l'integrazione, il codice
 * verrà chiesto al portale invece che a chi compila: il resto del flusso e
 * gli stati restano questi.
 */
export async function emettiGiornaliera(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles) && !puoSchierare(me.roles)) {
    return { errore: 'Solo chi amministra o guida la squadra può assicurare un partecipante.' };
  }

  const userId = str(fd, 'userId');
  const eventId = str(fd, 'eventId');
  const codice = str(fd, 'codice');

  if (!userId || !eventId) return { errore: 'Partecipante o attività mancanti.' };
  if (!codice) {
    return {
      errore:
        'Serve il numero della giornaliera rilasciato dal portale federale: emettila lì e riporta qui il codice.',
    };
  }

  const [utente, evento] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { nome: true, cognome: true } }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, inizio: true, fine: true, titolo: true },
    }),
  ]);
  if (!utente || !evento) return { errore: 'Partecipante o attività non trovati.' };

  const giorno = giornoDellAttivita(str(fd, 'giorno'), evento);
  if (!giorno) return { errore: 'Quel giorno non fa parte dell’attività.' };

  // vale anche quando la pratica è già stata fatta sul portale: la regola è
  // che prima si incassa, e scriverla qui solo per metà la renderebbe un
  // consiglio
  if (await quotaDaSaldare(userId, eventId)) {
    return {
      errore: `La quota di ${utente.nome} ${utente.cognome} per questa attività non risulta saldata: la copertura si registra dopo l’incasso, o dopo che è stato lui a dichiarare il pagamento.`,
    };
  }

  const dati = {
    stato: 'ASSICURATO' as const,
    codice,
    idPortale: strOpt(fd, 'idPortale'),
    richiestaIl: new Date(),
    emessaIl: new Date(),
    esito: 'codice registrato a mano dal portale',
    richiestaDaId: me.id,
  };

  await prisma.tesseraGiornaliera.upsert({
    where: { userId_eventId_giorno: { userId, eventId, giorno: giorno.colonna } },
    create: { userId, eventId, giorno: giorno.colonna, ...dati },
    update: dati,
  });

  // la polizza l'ha consumata il portale, anche se il codice l'abbiamo scritto
  // a mano: la giacenza va riletta lo stesso
  const cred = await prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } });
  if (cred) await sincronizzaGiacenza(cred, 1).catch(() => null);

  const avvisato = await avvisaAssicurato({
    userId,
    nome: utente.nome,
    cognome: utente.cognome,
    titolo: evento.titolo,
    giorno: etichettaGiorno(giorno.chiave),
    codice,
  });

  aggiorna(eventId);
  return {
    ok:
      `${utente.nome} ${utente.cognome} è coperto per ${etichettaGiorno(giorno.chiave)}: giornaliera ${codice}.` +
      (avvisato ? ' Gli ho mandato i dati su WhatsApp.' : ''),
  };
}

// Non c'è nessuna azione per togliere una copertura, ed è voluto: un'attivazione
// sul portale federale consuma una polizza vera e non si annulla. Un pulsante
// che cancella solo la nostra riga racconterebbe una bugia comoda — la persona
// risulterebbe scoperta mentre la polizza resta spesa.


/**
 * Attiva la polizza prova sul portale federale e la registra qui.
 *
 * Ogni attivazione consuma una polizza vera e non si annulla, quindi tutto
 * quello che si può controllare prima si controlla prima: chi è già coperto,
 * chi è troppo giovane, chi non ha i dati di nascita, e il portale stesso che
 * accetta solo una finestra di pochi giorni. Se qualcosa non torna non si
 * chiama nemmeno il portale.
 */
export async function attivaGiornaliera(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles) && !puoSchierare(me.roles)) {
    return { errore: 'Solo chi amministra o guida la squadra può assicurare un partecipante.' };
  }

  // in test non si chiama il portale: ogni attivazione brucia una polizza vera
  // e non si annulla. Per provare il flusso c'è la registrazione a mano
  if (inTest) {
    return {
      errore:
        'Sei nell’ambiente di test: attivare una polizza consumerebbe una polizza vera sul portale federale. Usa “L’ho già attivata a mano” per provare il flusso.',
    };
  }

  const userId = str(fd, 'userId');
  const eventId = str(fd, 'eventId');

  /*
   * Si assicura chi ha detto sì, e nessun altro.
   *
   * L'elenco delle polizze mostra solo quelli, ma il controllo va fatto qui:
   * la richiesta può arrivare da una pagina rimasta aperta da ieri, o da chi
   * nel frattempo ha cambiato risposta. Una polizza attivata consuma una
   * polizza vera e non si annulla — meglio un rifiuto spiegato che una
   * bruciata per qualcuno che poi non viene.
   */
  const risposta = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { status: true },
  });
  if (risposta?.status !== 'PRESENTE') {
    return {
      errore:
        risposta?.status === 'FORSE'
          ? 'Ha risposto «forse»: la polizza si fa quando conferma che viene.'
          : 'Non risulta fra chi ha detto di venire a questa attività.',
    };
  }

  const [utente, evento, cred] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { nome: true, cognome: true, dataNascita: true, luogoNascita: true },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { inizio: true, fine: true, titolo: true },
    }),
    prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } }),
  ]);

  if (!utente || !evento) return { errore: 'Partecipante o attività non trovati.' };

  const giorno = giornoDellAttivita(str(fd, 'giorno'), evento);
  if (!giorno) return { errore: 'Quel giorno non fa parte dell’attività.' };

  // gia' assicurato quel giorno: rifarlo brucerebbe una polizza per niente
  const gia = await prisma.tesseraGiornaliera.findUnique({
    where: { userId_eventId_giorno: { userId, eventId, giorno: giorno.colonna } },
  });
  if (gia?.stato === 'ASSICURATO') {
    return { errore: `Già coperto dalla polizza ${gia.codice ?? ''}. Non ne attivo un’altra.` };
  }

  // la polizza la paga il club e non torna indietro: prima si incassa
  if (await quotaDaSaldare(userId, eventId)) {
    return {
      errore: `La quota di ${utente.nome} ${utente.cognome} per questa attività non risulta saldata: la polizza si attiva dopo l’incasso, o dopo che è stato lui a dichiarare il pagamento.`,
    };
  }

  if (!cred) return { errore: 'Il portale federale non è collegato: mancano le credenziali.' };
  if (!cred.idAffiliazione) {
    return {
      errore:
        'Manca l’id affiliazione, che le polizze prova usano al posto dell’id anagrafica. Aggiungilo nel collegamento al portale.',
    };
  }

  if (!utente.dataNascita || !utente.luogoNascita) {
    return {
      errore: `Per assicurare ${utente.nome} ${utente.cognome} servono data e luogo di nascita: compilali nella sua scheda.`,
    };
  }

  if (eta(utente.dataNascita, giorno.locale) < 12) {
    return {
      errore:
        'Il portale non rilascia polizze prova sotto i 12 anni: va chiesta alla segreteria FIGT.',
    };
  }

  // segno che la richiesta è partita: se il portale rispondesse a metà resta
  // traccia che qualcosa è stato tentato, invece di sembrare che non sia successo nulla
  await prisma.tesseraGiornaliera.upsert({
    where: { userId_eventId_giorno: { userId, eventId, giorno: giorno.colonna } },
    create: {
      userId,
      eventId,
      giorno: giorno.colonna,
      stato: 'RICHIESTA',
      richiestaIl: new Date(),
      richiestaDaId: me.id,
    },
    update: { stato: 'RICHIESTA', richiestaIl: new Date(), richiestaDaId: me.id },
  });
  aggiorna(eventId);

  try {
    const polizza = await attivaPolizzaProva(
      {
        login: cred.login,
        password: decifra(cred.passwordCifrata),
        idAnagrafica: cred.idAnagrafica,
      },
      cred.idAffiliazione,
      {
        nome: utente.nome,
        cognome: utente.cognome,
        nascita: utente.dataNascita,
        luogoNascita: utente.luogoNascita,
        giorno: giorno.locale,
      },
    );

    await prisma.tesseraGiornaliera.update({
      where: { userId_eventId_giorno: { userId, eventId, giorno: giorno.colonna } },
      data: {
        stato: 'ASSICURATO',
        codice: polizza.numero,
        idPortale: polizza.idPolizza,
        polizzaInfortuni: polizza.polizzaInfortuni,
        valeIl: giorno.locale,
        emessaIl: new Date(),
        esito: `polizza prova ${polizza.numero}${polizza.valida ? `, valida fino al ${polizza.valida}` : ''}`,
      },
    });

    // la polizza è stata consumata: la giacenza si rilegge subito, così il
    // numero in cassa e in tessere è già giusto senza premere niente
    const residue = await sincronizzaGiacenza(cred, 1);

    const avvisato = await avvisaAssicurato({
      userId,
      nome: utente.nome,
      cognome: utente.cognome,
      titolo: evento.titolo,
      giorno: etichettaGiorno(giorno.chiave),
      codice: polizza.numero,
      valida: polizza.valida,
    });

    aggiorna(eventId);
    return {
      ok:
        `${utente.nome} ${utente.cognome} è coperto per ${etichettaGiorno(giorno.chiave)}: polizza prova n. ${polizza.numero}.` +
        (residue === null ? '' : ` Ne restano ${residue}.`) +
        (avvisato ? ' Gli ho mandato i dati su WhatsApp.' : ''),
    };
  } catch (e) {
    const messaggio = (e as Error).message;
    await prisma.tesseraGiornaliera.update({
      where: { userId_eventId_giorno: { userId, eventId, giorno: giorno.colonna } },
      data: { stato: 'ERRORE', esito: messaggio },
    });
    aggiorna(eventId);
    return { errore: messaggio };
  }
}

/**
 * Accende o spegne le polizze che si attivano da sole.
 *
 * **Spenta di suo, e si accende sapendolo.** Ogni polizza e' un soldo speso
 * che non torna indietro: una cosa che spende da sola non puo' essere il
 * comportamento di serie, e chi la accende ci mette il nome — le polizze
 * automatiche partono a firma sua, perche' una spesa ha sempre qualcuno
 * dietro anche quando parte alle otto di domenica mattina.
 *
 * L'anticipo si misura in minuti e sta fra dieci minuti e un giorno: sotto i
 * dieci il lavoro non farebbe in tempo a svegliarsi, sopra le ventiquattr'ore
 * non e' piu' "poco prima dell'attivita'", e' "quando capita".
 */
export async function impostaPolizzeAutomatiche(
  _prev: StatoForm,
  fd: FormData,
): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) {
    return { errore: 'Solo chi amministra può cambiare le polizze automatiche.' };
  }

  const acceso = bool(fd, 'acceso');
  const minuti = Math.min(24 * 60, Math.max(10, intOpt(fd, 'anticipo') ?? 60));

  await prisma.impostazioni.upsert({
    where: { id: 'app' },
    create: {
      id: 'app',
      assicuraAuto: acceso,
      assicuraAnticipoMin: minuti,
      assicuraAutoDaId: acceso ? me.id : null,
    },
    update: {
      assicuraAuto: acceso,
      assicuraAnticipoMin: minuti,
      // chi spegne non firma niente: la firma resta attaccata all'accensione
      ...(acceso ? { assicuraAutoDaId: me.id } : {}),
    },
  });

  revalidatePath('/admin/polizze');
  return {
    ok: acceso
      ? `Polizze automatiche accese: partono ${minuti} minuti prima dell’attività, a tuo nome.`
      : 'Polizze automatiche spente: si assicura solo a mano.',
  };
}
