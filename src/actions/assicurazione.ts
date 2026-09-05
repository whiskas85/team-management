'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoAmministrare, puoGestirePagamenti, puoSchierare } from '@/lib/domain';
import { str, strOpt, type StatoForm } from '@/lib/form';
import { decifra } from '@/lib/segreti';
import { attivaPolizzaProva, contaPolizzeProva, eta } from '@/lib/figt';
import { inTest } from '@/lib/ambiente';

function aggiorna(eventId: string) {
  revalidatePath(`/calendario/${eventId}`);
  revalidatePath('/calendario');
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
    const giacenza = await contaPolizzeProva({
      login: cred.login,
      password: decifra(cred.passwordCifrata),
      idAnagrafica: cred.idAnagrafica,
    });

    await prisma.credenzialeFigt.update({
      where: { id: 'figt' },
      data: {
        polizzeResidue: giacenza.residue,
        polizzeAssegnate: giacenza.assegnate,
        polizzeLetteIl: new Date(),
      },
    });

    revalidatePath('/admin/cassa');
    return {
      ok: `Il portale ne conta ${giacenza.residue} ancora da usare.`,
    };
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
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }),
  ]);
  if (!utente || !evento) return { errore: 'Partecipante o attività non trovati.' };

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
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId, ...dati },
    update: dati,
  });

  aggiorna(eventId);
  return { ok: `${utente.nome} ${utente.cognome} è coperto: giornaliera ${codice}.` };
}

/** Toglie la copertura, per correggere un codice sbagliato. */
export async function annullaGiornaliera(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles) && !puoSchierare(me.roles)) {
    return { errore: 'Non hai i permessi per togliere una copertura.' };
  }

  const eventId = str(fd, 'eventId');
  await prisma.tesseraGiornaliera.deleteMany({
    where: { userId: str(fd, 'userId'), eventId },
  });

  aggiorna(eventId);
  return { ok: 'Copertura rimossa: il partecipante torna non assicurato.' };
}


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

  const [utente, evento, gia, cred] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { nome: true, cognome: true, dataNascita: true, luogoNascita: true },
    }),
    prisma.event.findUnique({ where: { id: eventId }, select: { inizio: true, titolo: true } }),
    prisma.tesseraGiornaliera.findUnique({ where: { userId_eventId: { userId, eventId } } }),
    prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } }),
  ]);

  if (!utente || !evento) return { errore: 'Partecipante o attività non trovati.' };

  // gia' assicurato: rifarlo brucerebbe una polizza per niente
  if (gia?.stato === 'ASSICURATO') {
    return { errore: `Già coperto dalla polizza ${gia.codice ?? ''}. Non ne attivo un’altra.` };
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

  if (eta(utente.dataNascita, evento.inizio) < 12) {
    return {
      errore:
        'Il portale non rilascia polizze prova sotto i 12 anni: va chiesta alla segreteria FIGT.',
    };
  }

  // segno che la richiesta è partita: se il portale rispondesse a metà resta
  // traccia che qualcosa è stato tentato, invece di sembrare che non sia successo nulla
  await prisma.tesseraGiornaliera.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: {
      userId,
      eventId,
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
        giorno: evento.inizio,
      },
    );

    await prisma.tesseraGiornaliera.update({
      where: { userId_eventId: { userId, eventId } },
      data: {
        stato: 'ASSICURATO',
        codice: polizza.numero,
        idPortale: polizza.idPolizza,
        polizzaInfortuni: polizza.polizzaInfortuni,
        valeIl: evento.inizio,
        emessaIl: new Date(),
        esito: `polizza prova ${polizza.numero}${polizza.valida ? `, valida fino al ${polizza.valida}` : ''}`,
      },
    });

    aggiorna(eventId);
    return {
      ok: `${utente.nome} ${utente.cognome} è coperto: polizza prova n. ${polizza.numero}.`,
    };
  } catch (e) {
    const messaggio = (e as Error).message;
    await prisma.tesseraGiornaliera.update({
      where: { userId_eventId: { userId, eventId } },
      data: { stato: 'ERRORE', esito: messaggio },
    });
    aggiorna(eventId);
    return { errore: messaggio };
  }
}
