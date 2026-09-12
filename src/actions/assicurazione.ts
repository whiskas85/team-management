'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoAmministrare, puoGestirePagamenti, puoSchierare } from '@/lib/domain';
import { str, strOpt, type StatoForm } from '@/lib/form';
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
} from '@/lib/assicurazione';
import { inTest } from '@/lib/ambiente';

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

  await prisma.credenzialeFigt.update({
    where: { id: 'figt' },
    data: { ...dati, polizzeLetteIl: new Date() },
  });
  revalidatePath('/admin/cassa');
  revalidatePath('/admin/tessere');
  return dati.polizzeResidue;
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
      select: { id: true, inizio: true, fine: true },
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

  aggiorna(eventId);
  return {
    ok: `${utente.nome} ${utente.cognome} è coperto per ${etichettaGiorno(giorno.chiave)}: giornaliera ${codice}.`,
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

    aggiorna(eventId);
    return {
      ok:
        `${utente.nome} ${utente.cognome} è coperto per ${etichettaGiorno(giorno.chiave)}: polizza prova n. ${polizza.numero}.` +
        (residue === null ? '' : ` Ne restano ${residue}.`),
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
