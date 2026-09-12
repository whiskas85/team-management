'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { stagioneAttiva } from '@/lib/stagioni';
import {
  componiQuota,
  leggiQuoteAttivita,
  quotaPer,
  sommaRighe,
  spaccatoRighe,
  vociSpuntate,
  type QuoteAttivita,
  type RigaQuota,
} from '@/lib/quote';
import { giorniDi } from '@/lib/giorni';
import { requireUser } from '@/lib/auth';
import { quoteTutteSaldate } from '@/lib/casse';
import {
  MOTIVO_NON_IDONEO,
  conFormazione,
  idoneoPer,
  inSquadra,
  isAdmin,
  occupaPosto,
  puoSchierare,
  schierato,
  serveCertificato,
  vedeAttivitaSquadra,
} from '@/lib/domain';
import { data, enumOpt, enumVal, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';

const VISIBILITA = ['TEAM', 'TUTTI', 'INVITO'] as const;
const STATI = ['CREATA', 'RILASCIATA', 'ANNULLATA', 'CONCLUSA'] as const;
const RSVP = ['PRESENTE', 'ASSENTE', 'FORSE'] as const;
const ASSEGNAZIONI = ['NON_ASSEGNATO', 'CONVOCATO', 'TITOLARE', 'TOC', 'RISERVA'] as const;


function aggiorna(id?: string) {
  revalidatePath('/calendario');
  revalidatePath('/dashboard');
  revalidatePath('/admin/statistiche');
  if (id) revalidatePath(`/calendario/${id}`);
}

/** Crea o aggiorna un evento. Solo admin. */
export async function salvaEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  // Il team leader può sistemare la logistica di un'attività già creata:
  // titolo, dove si gioca, dove ci si trova. È lui che il sabato sera scopre
  // che il campo ha cambiato ingresso, e farglielo chiedere all'admin vuol
  // dire che l'informazione arriva alla squadra il giorno dopo. Quote, posti e
  // destinatari restano a chi gestisce il calendario: lì si decide, non si
  // corregge.
  const soloLogistica = !isAdmin(me.roles);
  if (soloLogistica && !puoSchierare(me.roles)) {
    return { errore: 'Solo l’admin può gestire il calendario.' };
  }

  const id = str(fd, 'id');
  const titolo = str(fd, 'titolo');
  if (!titolo) return { errore: 'Il titolo è obbligatorio.' };
  // il team leader corregge, non crea: senza un'attività da sistemare non ha
  // niente da fare qui
  if (soloLogistica && !id) return { errore: 'Solo l’admin può creare un’attività.' };

  const inizio = data(fd, 'inizio');
  if (!soloLogistica && !inizio) return { errore: 'La data di inizio è obbligatoria.' };

  const fine = data(fd, 'fine');
  if (fine && inizio && fine < inizio) return { errore: 'La fine non può precedere l’inizio.' };

  const esistente = id ? await prisma.event.findUnique({ where: { id } }) : null;
  if (id && !esistente) return { errore: 'Attività non trovata.' };

  // Ogni attività appartiene a una stagione: di solito quella in corso, ma la
  // gara di settembre si organizza a giugno e va nella stagione dopo. Chi la
  // scrive lo dice qui; senza indicazione resta quella in cui l'attività è
  // nata, perché le voci di listino da usare sono le sue e non quelle
  // dell'anno in cui la si sta ritoccando.
  const stagioneScelta = strOpt(fd, 'stagioneId');
  const stagioneId = stagioneScelta
    ? ((
        await prisma.stagione.findFirst({
          where: { id: stagioneScelta, chiusa: false },
          select: { id: true },
        })
      )?.id ?? esistente?.stagioneId ?? (await stagioneAttiva()).id)
    : (esistente?.stagioneId ?? (await stagioneAttiva()).id);

  // due quote: chi è in squadra e chi viene da fuori non pagano la stessa cosa.
  // Le voci «al giorno» contano i giorni che l'attività occupa, con le date di
  // questo salvataggio: se le si sposta, il conto si rifà da solo
  const giorni = inizio ? giorniDi(inizio, fine).length : 1;
  // Una quota che il modulo non ha mostrato non si tocca. Prima una card
  // nascosta — gli esterni su un'attività di squadra, i soldi di una riunione —
  // arrivava vuota, e il salvataggio cancellava il prezzo che c'era: i nuovi
  // finivano a pagare come la squadra senza che nessuno l'avesse deciso
  const tieni = (importo: unknown, dettaglio: string | null | undefined) => ({
    quota: importo == null ? null : Number(importo),
    dettaglio: dettaglio ?? null,
  });
  // Le quote come le ha lasciate il modulo: le voci del tariffario spuntate e
  // quelle aggiunte con il +, cassa per cassa. Quelle del club fanno la quota
  // di sempre; le altre casse hanno la loro, salvata dopo.
  const quote = soloLogistica ? null : await leggiQuoteAttivita(fd, stagioneId, giorni);
  const delClub = (righe: RigaQuota[] | undefined) => ({
    quota: sommaRighe(righe),
    dettaglio: spaccatoRighe(righe),
  });
  const squadra = quote?.lati.squadra
    ? delClub(quote.squadra.get(null))
    : tieni(esistente?.costo, esistente?.dettaglioCosto);
  const esterni = quote?.lati.esterni
    ? delClub(quote.esterni.get(null))
    : tieni(esistente?.costoEsterni, esistente?.dettaglioCostoEsterni);
  // le voci spuntate, per riaprire il modulo com'era
  const composizione = {
    ...(quote?.lati.squadra ? { vociSquadra: quote.tariffe.squadra } : {}),
    ...(quote?.lati.esterni ? { vociEsterni: quote.tariffe.esterni } : {}),
  };

  // stato e visibilità non passano da qui: si governano con i pulsanti sulla
  // scheda, così non si rilascia un'attività per sbaglio da una tendina
  // Quello che il team leader può toccare: il titolo e i luoghi. Sono i campi
  // che cambiano il sabato sera, non quelli su cui si decide.
  const logistica = {
    titolo,
    fieldId: strOpt(fd, 'fieldId'),
    luogo: strOpt(fd, 'luogo'),
    luogoLat: num(fd, 'luogoLat'),
    luogoLng: num(fd, 'luogoLng'),
    ritrovo: strOpt(fd, 'ritrovo'),
    ritrovoLat: num(fd, 'ritrovoLat'),
    ritrovoLng: num(fd, 'ritrovoLng'),
    oraRitrovo: data(fd, 'oraRitrovo'),
  };

  const valori = {
    ...logistica,
    descrizione: strOpt(fd, 'descrizione'),
    tipoId: strOpt(fd, 'tipoId'),
    tipoGaraId: strOpt(fd, 'tipoGaraId'),
    // La durata dichiarata si scrive e basta: **non si confronta con inizio e
    // fine**. Una 24 ore si gioca dentro un fine settimana che parte il
    // venerdì, perché quello spazio va tenuto occupato tutto — si viaggia, si
    // monta, si dorme, si smonta. La gara dura quello che dice il volantino,
    // l'attività dura quello che occupa: sono due fatti diversi e nessuno dei
    // due è sbagliato. Un controllo che pretendesse di farli coincidere
    // costringerebbe a scrivere una data falsa per far tacere un avviso.
    durataOre: intOpt(fd, 'durataOre'),
    inizio: inizio!,
    fine,
    costo: squadra.quota,
    dettaglioCosto: squadra.dettaglio,
    costoEsterni: esterni.quota,
    dettaglioCostoEsterni: esterni.dettaglio,
    ...composizione,
    maxPartecipanti: intOpt(fd, 'maxPartecipanti'),
    chiusuraIscrizioni: data(fd, 'chiusuraIscrizioni'),
    note: strOpt(fd, 'note'),
  };

  if (id) {
    await prisma.event.update({
      where: { id },
      data: soloLogistica ? logistica : valori,
    });

    if (quote) await salvaQuoteCasse(id, quote);

    // Il costo può arrivare dopo che la gente si è già segnata: senza questo
    // giro le quote non nascevano più, e chi era titolare non vedeva niente
    // fra i suoi pagamenti.
    await allineaQuoteEvento(id);

    aggiorna(id);
    revalidatePath('/pagamenti');
    revalidatePath('/admin/pagamenti');
    revalidatePath('/cassa');
    return { ok: 'Evento aggiornato.' };
  }

  // nasce sempre come bozza: a chi è rilasciata si decide dopo
  const creato = await prisma.event.create({
    data: {
      ...valori,
      status: 'CREATA',
      createdById: me.id,
      // l'attività nasce dentro la stagione in corso e ci resta
      stagioneId,
    },
  });
  if (quote) await salvaQuoteCasse(creato.id, quote);
  aggiorna(creato.id);
  return { ok: 'Attività creata in bozza. Rilasciala quando è pronta.' };
}

/**
 * Salva le quote aggiunte con il + e quelle delle altre casse.
 *
 * Le quote aggiunte valgono solo per questa attività: si tengono quelle
 * rimaste nel modulo, con la loro spunta, e spariscono quelle tolte. Poi ogni
 * cassa diversa dal club ha la sua quota: la squadra paga le righe spuntate
 * nella sua card, gli esterni quelle della loro — se lì non ce n'è nessuna di
 * quella cassa, pagano come la squadra, con la stessa regola del club. Più
 * righe della stessa cassa fanno un pagamento solo, con i nomi di tutte. Una
 * cassa senza più niente da chiedere perde la quota. La card che il modulo non
 * ha mostrato non si tocca.
 */
async function salvaQuoteCasse(eventId: string, quote: QuoteAttivita) {
  const lati = [
    ...(quote.lati.squadra ? [false] : []),
    ...(quote.lati.esterni ? [true] : []),
  ];

  // le quote aggiunte con il +
  const esistenti = await prisma.voceAttivita.findMany({
    where: { eventId, OR: lati.map((perEsterni) => ({ perEsterni })) },
    select: { id: true },
  });
  const tenute = new Set(
    quote.aggiunte
      .map((a) => a.id)
      .filter((id): id is string => !!id && esistenti.some((e) => e.id === id)),
  );
  await prisma.voceAttivita.deleteMany({
    where: { eventId, OR: lati.map((perEsterni) => ({ perEsterni })), id: { notIn: [...tenute] } },
  });
  for (const a of quote.aggiunte) {
    const dati = {
      nome: a.nome,
      importo: a.importo,
      cassaId: a.cassaId,
      scelta: a.scelta,
      perEsterni: a.perEsterni,
      perPolizza: a.perPolizza,
    };
    if (a.id && tenute.has(a.id)) {
      await prisma.voceAttivita.update({ where: { id: a.id }, data: dati });
    } else {
      await prisma.voceAttivita.create({ data: { eventId, ...dati } });
    }
  }

  // una quota per ogni altra cassa
  const gia = await prisma.quotaCassa.findMany({ where: { eventId } });
  const casse = new Set<string>([
    ...gia.map((q) => q.cassaId),
    ...[...quote.squadra.keys(), ...quote.esterni.keys()].filter((c): c is string => c !== null),
  ]);
  for (const cassaId of casse) {
    const q = gia.find((x) => x.cassaId === cassaId) ?? null;
    const rs = quote.squadra.get(cassaId);
    const re = quote.esterni.get(cassaId);
    const importo = quote.lati.squadra ? sommaRighe(rs) : q ? Number(q.importo) : null;
    const importoEsterni = quote.lati.esterni
      ? sommaRighe(re)
      : q?.importoEsterni == null
        ? null
        : Number(q.importoEsterni);

    if ((importo ?? 0) <= 0 && (importoEsterni ?? 0) <= 0) {
      if (q) await togliQuotaCassa(q);
      continue;
    }

    const nomi = [...new Set([...(rs ?? []), ...(re ?? [])].map((r) => r.nome))];
    const valori = {
      descrizione: nomi.join(' + ') || q?.descrizione || 'Quota',
      importo: importo ?? 0,
      importoEsterni,
    };
    await prisma.quotaCassa.upsert({
      where: { eventId_cassaId: { eventId, cassaId } },
      create: { eventId, cassaId, ...valori },
      update: valori,
    });
  }
}

/**
 * Toglie la quota di un'altra cassa da un'attività.
 *
 * Chi non l'aveva ancora pagata non la deve più; quello che è già entrato
 * resta dov'è — se e come restituirlo lo decide chi tiene quella cassa. Chi
 * era convocato solo perché mancava questa quota diventa titolare.
 */
async function togliQuotaCassa(quota: { id: string; eventId: string; cassaId: string }) {
  await prisma.quotaCassa.delete({ where: { id: quota.id } });
  await prisma.payment.deleteMany({
    where: {
      eventId: quota.eventId,
      cassaId: quota.cassaId,
      tipo: { not: 'RIMBORSO' },
      pagato: 0,
    },
  });

  const convocati = await prisma.eventRsvp.findMany({
    where: { eventId: quota.eventId, assegnazione: 'CONVOCATO' },
    select: { id: true, userId: true },
  });
  for (const c of convocati) {
    if (await quoteTutteSaldate(quota.eventId, c.userId)) {
      await prisma.eventRsvp.update({ where: { id: c.id }, data: { assegnazione: 'TITOLARE' } });
    }
  }
}

/**
 * Rilascio: qui la destinazione diventa obbligatoria, perché è il momento in
 * cui l'attività comincia a essere visibile a qualcuno.
 */
export async function rilasciaEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può rilasciare le attività.' };

  const id = str(fd, 'id');
  const visibilita = enumOpt(fd, 'visibilita', VISIBILITA);
  if (!visibilita) return { errore: 'Scegli a chi rilasciare l’attività.' };

  const attuale = await prisma.event.findUnique({ where: { id }, include: { tipo: true } });
  if (!attuale) return { errore: 'Attività non trovata.' };
  if (visibilita === 'TUTTI' && attuale.tipo?.soloInterno) {
    return {
      errore: `La tipologia "${attuale.tipo.nome}" è riservata alla squadra: non si può rilasciare a tutti.`,
    };
  }

  const evento = await prisma.event.update({
    where: { id },
    data: { status: 'RILASCIATA', visibilita },
  });

  aggiorna(id);
  return {
    ok:
      visibilita === 'TUTTI'
        ? `"${evento.titolo}" è ora visibile a tutti, nuovi compresi.`
        : visibilita === 'INVITO'
          ? `"${evento.titolo}" è ora su invito: la vede solo chi aggiungi fra i partecipanti.`
          : `"${evento.titolo}" è ora visibile alla squadra.`,
  };
}

/** Cambio di stato dai pulsanti della scheda: bozza, conclusa, annullata. */
export async function cambiaStatoEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può cambiare lo stato.' };

  const id = str(fd, 'id');
  const status = enumOpt(fd, 'status', STATI);
  if (!status) return { errore: 'Stato non valido.' };

  if (status === 'RILASCIATA') {
    const evento = await prisma.event.findUnique({ where: { id } });
    if (!evento?.visibilita) {
      return { errore: 'Per rilasciare l’attività scegli prima a chi è destinata.' };
    }
  }

  await prisma.event.update({ where: { id }, data: { status } });

  aggiorna(id);
  const messaggi: Record<string, string> = {
    CREATA: 'Attività riportata in bozza: non è più visibile agli operatori.',
    RILASCIATA: 'Attività rilasciata.',
    CONCLUSA: 'Attività conclusa.',
    ANNULLATA: 'Attività annullata: resta visibile ma non accetta adesioni.',
  };
  return { ok: messaggi[status] };
}

export async function eliminaEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può eliminare gli eventi.' };

  await prisma.event.delete({ where: { id: str(fd, 'id') } });
  aggiorna();
  redirect('/calendario');
}

/** Adesione del singolo: presente, assente o forse. */
export async function rispondiEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const eventId = str(fd, 'eventId');
  const status = enumVal(fd, 'status', RSVP, 'FORSE');

  const evento = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      tipo: true,
      _count: { select: { rsvps: { where: { status: 'PRESENTE' } } } },
    },
  });
  if (!evento) return { errore: 'Evento non trovato.' };

  if (evento.status === 'CREATA') return { errore: 'L’attività non è ancora stata rilasciata.' };

  // Chi è già fra i partecipanti risponde sempre: è stato aggiunto a mano — un
  // nuovo forzato, un invitato — e deve poter dire se viene o no. Gli altri
  // passano dalla regola di chi vede cosa.
  const giaDentro = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId: me.id } },
    select: { id: true },
  });
  if (!giaDentro) {
    if (evento.visibilita === 'INVITO') {
      return { errore: 'A questa attività si partecipa solo su invito.' };
    }
    if (evento.visibilita === 'TEAM' && !inSquadra(me.stato)) {
      return { errore: 'Questa attività è riservata alla squadra.' };
    }
  }
  if (evento.status === 'ANNULLATA') return { errore: 'L’attività è stata annullata.' };
  if (evento.chiusuraIscrizioni && evento.chiusuraIscrizioni < new Date()) {
    return { errore: 'Le adesioni per questo evento sono chiuse.' };
  }

  // senza certificato medico valido non si scende in campo: vale per chi è in
  // squadra, sulle tipologie che lo richiedono. I nuovi che vengono alle open
  // non hanno l'obbligo, e a una riunione non lo chiede nessuno
  if (status !== 'ASSENTE' && inSquadra(me.stato) && serveCertificato(evento.tipo)) {
    const certificati = await prisma.medicalCertificate.findMany({
      where: { userId: me.id },
      select: { status: true, scadeIl: true, tipo: true },
    });
    const serveAgonistico = evento.tipo?.certAgonistico ?? false;
    if (!idoneoPer(certificati, serveAgonistico)) {
      return { errore: `Non puoi segnarti. ${MOTIVO_NON_IDONEO(serveAgonistico)}` };
    }
  }

  const esistente = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId: me.id } },
  });

  // I posti non chiudono la porta a nessuno: la disponibilità la dà chiunque,
  // e se i disponibili superano i posti gli altri diventano riserve. Il tetto
  // vale al momento di schierare, che è quando qualcuno decide davvero — non
  // al momento di alzare la mano, che è solo dire "ci sarei".

  const note = strOpt(fd, 'note');
  await prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId: me.id } },
    create: { eventId, userId: me.id, status, note },
    update: { status, note, respondedAt: new Date() },
  });

  const quota = await allineaQuota(evento.id, me.id);

  aggiorna(eventId);
  revalidatePath('/pagamenti');
  revalidatePath('/admin/pagamenti');

  if (status === 'ASSENTE') return { ok: 'Risposta registrata.' };

  // se i disponibili hanno superato i posti conviene dirlo subito, invece di
  // farlo scoprire il giorno dell'attività guardando la formazione
  const oltre =
    status === 'PRESENTE' &&
    !!evento.maxPartecipanti &&
    evento._count.rsvps + (esistente?.status === 'PRESENTE' ? 0 : 1) > evento.maxPartecipanti;
  const avviso = oltre
    ? ` I posti sono ${evento.maxPartecipanti}: i disponibili sono già di più, chi resta fuori va in riserva.`
    : '';

  if (evento.tipo?.riserve) {
    return {
      ok: quota
        ? `Disponibilità registrata. Vale a quota saldata (${quota} €): sarà poi il TL a comporre la formazione.${avviso}`
        : `Disponibilità registrata: sarà il TL a comporre la formazione.${avviso}`,
    };
  }
  return {
    ok: quota
      ? `Adesione registrata. Il posto è confermato al saldo della quota di ${quota} €.${avviso}`
      : `Adesione registrata.${avviso}`,
  };
}

/**
 * Chi deve la quota di un'attività.
 *
 * Dove c'è la formazione la deve **chi scende in campo**: una riserva al club
 * non deve niente, perché non gioca. Dove la formazione non c'è, la deve chi si
 * è segnato presente — e lì essere presenti *è* partecipare.
 */
const deveLaQuota = (
  rsvp: { status: string; assegnazione: string; esenteQuota: boolean } | null,
  conFormazione: boolean,
) => {
  if (!rsvp || rsvp.status !== 'PRESENTE') return false;
  // subentrato al posto di chi aveva già pagato: il club la somma ce l'ha
  if (rsvp.esenteQuota) return false;
  // la sala controllo non paga: la quota paga il campo, e lì non ci va
  if (rsvp.assegnazione === 'TOC') return false;
  if (!conFormazione) return true;
  // convocato o titolare: in entrambi i casi il posto è suo e la quota è dovuta
  return occupaPosto(rsvp);
};

/**
 * Rimette la quota di una persona in pari con la realtà.
 *
 * Legge lo stato dal database invece di farselo passare, ed è la ragione per
 * cui funziona: la stessa chiamata serve quando uno risponde, quando il TL lo
 * schiera o lo toglie dalla formazione, quando viene aggiunto a mano e quando
 * cambia il costo dell'attività. Prima la quota nasceva solo al momento della
 * risposta, e bastava che il costo arrivasse dopo perché non nascesse mai.
 */
async function allineaQuota(eventId: string, userId: string): Promise<number | null> {
  const evento = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      tipo: { select: { riserve: true, tipoQuota: true } },
      quoteCasse: { include: { cassa: { select: { attiva: true } } } },
    },
  });
  if (!evento) return null;

  const [rsvp, chi, esistenti] = await Promise.all([
    prisma.eventRsvp.findUnique({ where: { eventId_userId: { eventId, userId } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { stato: true } }),
    // i rimborsi sono movimenti a sé e non si toccano
    prisma.payment.findMany({ where: { eventId, userId, tipo: { not: 'RIMBORSO' } } }),
  ]);

  const dovuta = deveLaQuota(rsvp, conFormazione(evento));

  // Una quota per cassa: quella del club, e una per ogni altra cassa che
  // l'attività prevede — il campo al club, l'istruttore a Mario. Le deve la
  // stessa persona, con la stessa regola; ognuna è un pagamento a sé, nella
  // sua cassa, e la conferma chi la gestisce.
  const club = quotaPer(evento, chi?.stato);
  const voci = [
    {
      cassaId: null as string | null,
      importo: club.importo,
      // una quota sola, anche quando è fatta di più voci: si paga in una volta
      // e il dettaglio racconta di cosa è composta
      note: club.dettaglio,
      descrizione: evento.titolo,
      apribile: true,
    },
    ...evento.quoteCasse.map((q) => ({
      cassaId: q.cassaId as string | null,
      importo: quotaPer({ costo: q.importo, costoEsterni: q.importoEsterni }, chi?.stato).importo,
      note: null,
      descrizione: `${evento.titolo} · ${q.descrizione}`,
      // una cassa spenta non riceve quote nuove: quelle che ci sono restano
      apribile: q.cassa.attiva,
    })),
  ];

  let totale = 0;
  for (const v of voci) {
    const esistente = esistenti.find((p) => p.cassaId === v.cassaId) ?? null;

    if (dovuta && v.importo > 0) {
      if (!esistente) {
        if (!v.apribile) continue;
        await prisma.payment.create({
          data: {
            userId,
            tipo: (evento.tipo?.tipoQuota ?? 'EVENTO') as 'EVENTO',
            descrizione: v.descrizione,
            note: v.note,
            importo: v.importo,
            status: 'DA_PAGARE',
            scadenza: evento.inizio,
            eventId: evento.id,
            cassaId: v.cassaId,
          },
        });
      } else if (
        Number(esistente.pagato) === 0 &&
        Number(esistente.importo) !== v.importo &&
        // una quota gestita fuori è chiusa: il suo importo non si ricalcola
        esistente.status !== 'NON_GESTITO'
      ) {
        // il costo è cambiato dopo: finché non è entrato un euro la quota si
        // adegua, altrimenti resterebbe ferma a una cifra che non esiste più
        await prisma.payment.update({
          where: { id: esistente.id },
          data: { importo: v.importo, note: v.note, descrizione: v.descrizione },
        });
      }
      totale += v.importo;
      continue;
    }

    // non la deve: la quota sparisce, ma solo se non è stato incassato nulla
    if (esistente && Number(esistente.pagato) === 0) {
      await prisma.payment.delete({ where: { id: esistente.id } });
    }
  }

  // I pagamenti di una cassa che l'attività non prevede non si toccano qui:
  // può averli registrati a mano la segreteria. Quando una quota viene tolta
  // dall'attività li ripulisce chi la toglie.
  return totale > 0 ? totale : null;
}

/** Ricalcola le quote di tutti: serve quando cambia il costo dell'attività. */
async function allineaQuoteEvento(eventId: string) {
  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId },
    select: { userId: true },
  });
  for (const r of rsvps) await allineaQuota(eventId, r.userId);
}

/** Schieramento: il TL decide chi è titolare e chi riserva. */
export async function schiera(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoSchierare(me.roles)) {
    return { errore: 'Solo un Team Leader può comporre la squadra.' };
  }

  const rsvpId = str(fd, 'rsvpId');
  const assegnazione = enumVal(fd, 'assegnazione', ASSEGNAZIONI, 'NON_ASSEGNATO');

  const attuale = await prisma.eventRsvp.findUnique({
    where: { id: rsvpId },
    include: { event: { select: { maxPartecipanti: true } } },
  });
  if (!attuale) return { errore: 'Adesione non trovata.' };

  // Qui sì che il tetto conta: i posti sono quelli, e nemmeno un TL ne fa
  // entrare uno in più. Chi avanza resta riserva — che è il motivo per cui
  // alzare la mano non è mai stato vietato a nessuno. I convocati occupano un
  // posto quanto i titolari: stanno solo aspettando di pagarlo.
  // il TOC non toglie un posto a nessuno: sta in sala controllo
  const entra = occupaPosto({ assegnazione });
  const gia = occupaPosto(attuale);
  const max = attuale.event.maxPartecipanti;

  if (entra && max && !gia) {
    const occupati = await prisma.eventRsvp.count({
      where: { eventId: attuale.eventId, assegnazione: { in: ['TITOLARE', 'CONVOCATO'] } },
    });
    if (occupati >= max) {
      return {
        errore: `I posti sono ${max} e sono già assegnati: togli qualcuno, o lascialo in riserva.`,
      };
    }
  }

  await prisma.eventRsvp.update({ where: { id: rsvpId }, data: { assegnazione } });

  // Schierare è il momento in cui la quota nasce, toglierlo dalla formazione
  // quello in cui sparisce: una riserva al club non deve niente.
  const quota = await allineaQuota(attuale.eventId, attuale.userId);

  // **Il posto si tiene pagando.** Se la quota è dovuta e non è ancora saldata,
  // chi il TL ha scelto resta convocato: il posto è suo, ma la formazione non
  // è chiusa finché i soldi non entrano. Su un'attività gratuita, o per chi ha
  // già pagato, si è titolari subito e questo passaggio non si vede nemmeno.
  let finale: string = assegnazione;
  // Con più quote — il club e il corso di Mario — titolare si diventa quando
  // sono chiuse tutte.
  if (assegnazione === 'TITOLARE' && quota !== null) {
    if (!(await quoteTutteSaldate(attuale.eventId, attuale.userId))) {
      await prisma.eventRsvp.update({
        where: { id: rsvpId },
        data: { assegnazione: 'CONVOCATO' },
      });
      finale = 'CONVOCATO';
    }
  }

  aggiorna(attuale.eventId);
  revalidatePath('/pagamenti');
  revalidatePath('/admin/pagamenti');

  if (finale === 'CONVOCATO') {
    return {
      ok: `Convocato: il posto è suo, e diventa titolare quando risulta saldato tutto (${quota} €).`,
    };
  }
  return { ok: quota !== null ? `Schierato titolare (quota ${quota} € già saldata).` : 'Schieramento aggiornato.' };
}

/**
 * Scambia un titolare con una riserva.
 *
 * Serve quando uno si fa male il giorno prima: la riserva subentra, e il TL
 * non deve smontare la formazione a mano.
 *
 * Il pezzo che conta sono i soldi. **Se chi esce aveva già pagato, chi entra
 * non paga**: la somma per quel posto il club l'ha incassata, e chiederla di
 * nuovo vorrebbe dire incassarla due volte per la stessa presenza. Il
 * pagamento di chi esce resta dov'è — se e come rimborsarlo è una decisione
 * di persone, non una regola da scrivere qui. Se invece non aveva pagato, la
 * sua quota sparisce e chi entra la trova addebitata come chiunque altro.
 */
export async function scambiaTitolare(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoSchierare(me.roles)) {
    return { errore: 'Solo un Team Leader può comporre la squadra.' };
  }

  const [esce, entra] = await Promise.all([
    prisma.eventRsvp.findUnique({ where: { id: str(fd, 'rsvpId') } }),
    prisma.eventRsvp.findUnique({ where: { id: str(fd, 'conRsvpId') } }),
  ]);
  if (!esce || !entra) return { errore: 'Adesione non trovata.' };
  if (esce.eventId !== entra.eventId) return { errore: 'Sono di due attività diverse.' };

  // Il posto è pagato se chi esce ha chiuso **tutte** le sue quote — il club e
  // le altre casse; gestita fuori vale come pagata. Chi non ne aveva nessuna
  // non ha pagato niente: lì non c'è un posto saldato da passare.
  const uscente = await prisma.payment.count({
    where: { eventId: esce.eventId, userId: esce.userId, tipo: { not: 'RIMBORSO' } },
  });
  const postoGiaPagato = uscente > 0 && (await quoteTutteSaldate(esce.eventId, esce.userId));

  await prisma.$transaction([
    prisma.eventRsvp.update({
      where: { id: esce.id },
      // chi esce torna riserva e non è più esente: se un domani rientra,
      // rientra alle condizioni di allora
      data: { assegnazione: 'RISERVA', esenteQuota: false },
    }),
    prisma.eventRsvp.update({
      where: { id: entra.id },
      data: { assegnazione: 'TITOLARE', esenteQuota: postoGiaPagato },
    }),
  ]);

  // le quote si rimettono in pari da sole: a chi esce sparisce se non aveva
  // pagato, a chi entra nasce solo se il posto non era già stato saldato
  await allineaQuota(esce.eventId, esce.userId);
  const quotaEntrante = await allineaQuota(entra.eventId, entra.userId);

  // e vale anche per chi subentra: se la quota gliela ritrova addebitata, il
  // posto se lo tiene pagando come tutti gli altri
  if (quotaEntrante !== null && !postoGiaPagato) {
    await prisma.eventRsvp.update({
      where: { id: entra.id },
      data: { assegnazione: 'CONVOCATO' },
    });
  }

  aggiorna(esce.eventId);
  revalidatePath('/pagamenti');
  revalidatePath('/admin/pagamenti');

  if (postoGiaPagato) {
    return {
      ok: 'Scambio fatto: subentra senza pagare, il posto era già stato saldato.',
    };
  }
  return {
    ok:
      quotaEntrante !== null
        ? `Scambio fatto: chi entra è convocato e diventa titolare al saldo della quota di ${quotaEntrante} €.`
        : 'Scambio fatto.',
  };
}

/**
 * Crea una riunione a partire da un'attività.
 *
 * Nasce dal modo in cui le cose succedono davvero: si guarda la gara di
 * domenica e si decide di vedersi mercoledì per prepararla. Il titolo arriva
 * già scritto — *"Riunione: Op. Silent Ridge"* — perché è quello che uno
 * scriverebbe comunque, e la data è l'unica cosa che deve digitare.
 *
 * La può fare anche il team leader: organizzare un ritrovo per parlare non è
 * decidere il calendario della squadra, ed è il genere di cosa che se richiede
 * un permesso non si fa.
 *
 * Nasce **rilasciata**: una riunione in bozza che nessuno vede non serve a
 * niente, e chi la crea l'ha decisa proprio in quel momento.
 */
export async function creaRiunione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoSchierare(me.roles)) {
    return { errore: 'Le riunioni le organizzano il team leader e l’admin.' };
  }

  const titolo = str(fd, 'titolo');
  const inizio = data(fd, 'inizio');
  if (!titolo) return { errore: 'Serve un titolo.' };
  if (!inizio) return { errore: 'Serve giorno e ora.' };

  // la tipologia deve essere una di quelle segnate come riunione: senza questo
  // controllo il modulo diventerebbe una scorciatoia per creare una gara
  const tipoId = strOpt(fd, 'tipoId');
  const tipo = tipoId
    ? await prisma.tipoAttivita.findFirst({ where: { id: tipoId, riunione: true } })
    : await prisma.tipoAttivita.findFirst({ where: { riunione: true, attivo: true } });
  if (!tipo) {
    return {
      errore:
        'Nessuna tipologia è segnata come riunione. Vai in Tipologie attività e spunta “È una riunione” su quella giusta.',
    };
  }

  const creata = await prisma.event.create({
    data: {
      titolo,
      descrizione: strOpt(fd, 'descrizione'),
      tipoId: tipo.id,
      inizio,
      fine: data(fd, 'fine'),
      luogo: strOpt(fd, 'luogo'),
      luogoLat: num(fd, 'luogoLat'),
      luogoLng: num(fd, 'luogoLng'),
      linkRiunione: strOpt(fd, 'linkRiunione'),
      stagioneId: (await stagioneAttiva()).id,
      createdById: me.id,
      status: 'RILASCIATA',
      visibilita: 'TEAM',
    },
  });

  // Chi c'era nell'attività di partenza si ritrova già dentro la riunione:
  // titolari, convocati, TOC e riserve. Se la riunione serve a preparare quella
  // gara, sono esattamente le persone che devono esserci — e riconvocarle una
  // per una a mano è il genere di lavoro che poi non si fa.
  const daEventId = strOpt(fd, 'daEventId');
  let invitati = 0;
  if (daEventId) {
    const origine = await prisma.event.findUnique({
      where: { id: daEventId },
      include: {
        tipo: { select: { riserve: true } },
        rsvps: { select: { userId: true, status: true, assegnazione: true } },
      },
    });

    if (origine) {
      // dove c'era una formazione conta chi ne faceva parte, a qualsiasi
      // titolo; dove non c'era, chi si era semplicemente segnato
      const chi = conFormazione(origine)
        ? origine.rsvps.filter((r) => r.assegnazione !== 'NON_ASSEGNATO')
        : origine.rsvps.filter((r) => r.status === 'PRESENTE');

      if (chi.length > 0) {
        const fatti = await prisma.eventRsvp.createMany({
          data: chi.map((r) => ({
            eventId: creata.id,
            userId: r.userId,
            status: 'PRESENTE' as const,
          })),
          skipDuplicates: true,
        });
        invitati = fatti.count;
      }
    }
  }

  aggiorna(creata.id);
  redirect(`/calendario/${creata.id}`);
}

/** Appello a evento concluso. */
export async function registraPresenze(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoSchierare(me.roles)) return { errore: 'Non hai i permessi per registrare le presenze.' };

  const eventId = str(fd, 'eventId');
  const presenti = new Set(fd.getAll('presenti').map((v) => v.toString()));

  const evento = await prisma.event.findUnique({
    where: { id: eventId },
    include: { tipo: { select: { riserve: true } } },
  });
  if (!evento) return { errore: 'Attività non trovata.' };

  // Dove c'è una formazione l'appello riguarda solo chi era atteso: titolari,
  // convocati e sala controllo. Spuntare anche le riserve vorrebbe dire
  // segnarle assenti a un'attività per cui non erano attese — comparirebbe
  // "non c'era" sulla loro scheda e peggiorerebbe la loro percentuale di
  // presenze, per una colpa che non hanno.
  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId },
    select: { id: true, assegnazione: true },
  });
  const daSpuntare = conFormazione(evento) ? rsvps.filter(schierato) : rsvps;
  await prisma.$transaction(
    daSpuntare.map((r) =>
      prisma.eventRsvp.update({ where: { id: r.id }, data: { presente: presenti.has(r.id) } }),
    ),
  );
  await prisma.event.update({ where: { id: eventId }, data: { status: 'CONCLUSA' } });

  aggiorna(eventId);
  return { ok: 'Presenze registrate ed evento chiuso.' };
}

/**
 * Aggiunge più operatori in una volta. Chi non ha il certificato in regola
 * viene scartato e segnalato: non è una svista, è una regola di sicurezza.
 */
export async function iscriviOperatori(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoSchierare(me.roles)) return { errore: 'Non hai i permessi.' };

  const eventId = str(fd, 'eventId');
  const userIds = fd.getAll('userIds').map((v) => v.toString());
  if (userIds.length === 0) return { errore: 'Seleziona almeno un operatore.' };

  const [evento, utenti] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, include: { tipo: true } }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        nome: true,
        cognome: true,
        stato: true,
        certificates: { select: { status: true, scadeIl: true, tipo: true } },
      },
    }),
  ]);
  if (!evento) return { errore: 'Attività non trovata.' };

  const serveAgonistico = evento.tipo?.certAgonistico ?? false;
  const serveCert = serveCertificato(evento.tipo);
  const ammessi = utenti.filter(
    (u) => !serveCert || !inSquadra(u.stato) || idoneoPer(u.certificates, serveAgonistico),
  );
  const scartati = utenti.filter((u) => !ammessi.includes(u));

  // Un nuovo paga il prezzo per gli esterni, o quello della squadra se il primo
  // non c'è. Se l'attività non ha né l'uno né l'altro, aggiungerlo vorrebbe dire
  // farlo giocare gratis senza averlo deciso — e poterlo assicurare senza che
  // abbia pagato. Il prezzo arriva allora insieme ai nomi, dal selettore, e lo
  // decide l'admin come ogni altra quota dell'attività.
  const nuovi = ammessi.filter((u) => !vedeAttivitaSquadra(u.stato));
  // Il prezzo c'è se c'è una quota qualsiasi, del club o di un'altra cassa: il
  // Corso CQB non chiede niente al club ma 40 € a SAT & Gaming, e chiedere di
  // decidere un prezzo che esiste già era un errore.
  const altreCasse = await prisma.quotaCassa.findMany({
    where: { eventId },
    select: { importo: true, importoEsterni: true },
  });
  const daDecidere =
    evento.costoEsterni === null &&
    !(Number(evento.costo ?? 0) > 0) &&
    !altreCasse.some((q) => Number(q.importo) > 0 || q.importoEsterni !== null);
  let prezzoFissato: number | null = null;
  if (nuovi.length > 0 && daDecidere) {
    if (!isAdmin(me.roles)) {
      return {
        errore:
          'L’attività non ha un prezzo per chi viene da fuori, e lo decide l’admin: chiediglielo, poi aggiungi i nuovi.',
      };
    }
    const esterni = await componiQuota(fd, {
      voci: 'tariffeEsterni',
      importo: 'costoEsterni',
      stagioneId: evento.stagioneId,
      giorni: giorniDi(evento.inizio, evento.fine).length,
      sommaAMano: true,
    });
    if (esterni.quota === null) {
      return {
        errore:
          'Scegli quanto paga chi viene da fuori — dal listino o a mano, zero se è offerta — poi aggiungi.',
      };
    }
    await prisma.event.update({
      where: { id: eventId },
      data: {
        costoEsterni: esterni.quota,
        dettaglioCostoEsterni: esterni.dettaglio,
        // per ritrovarla uguale nel modulo dell'attività: le voci spuntate, e
        // l'importo scritto a mano come una quota aggiunta
        vociEsterni: vociSpuntate(fd, 'tariffeEsterni'),
      },
    });
    const aMano = num(fd, 'costoEsterni');
    if (aMano !== null) {
      await prisma.voceAttivita.create({
        data: {
          eventId,
          perEsterni: true,
          nome: aMano === 0 ? 'Offerta' : 'Quota esterni',
          importo: aMano,
          scelta: true,
          // è il prezzo della giocata di chi viene da fuori: paga la polizza
          perPolizza: true,
        },
      });
    }
    prezzoFissato = esterni.quota;
  }

  for (const u of ammessi) {
    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId: u.id } },
      create: { eventId, userId: u.id, status: 'PRESENTE', note: 'Aggiunto dallo staff' },
      update: { status: 'PRESENTE' },
    });
    await allineaQuota(evento.id, u.id);
  }

  aggiorna(eventId);
  revalidatePath('/admin/pagamenti');

  if (ammessi.length === 0) {
    return {
      errore: `Nessuno aggiunto: ${scartati.map((u) => u.nome).join(', ')} senza certificato valido.`,
    };
  }

  const quota = evento.costo ? Number(evento.costo) : 0;
  return {
    ok:
      `Aggiunti ${ammessi.length} operatori` +
      (quota > 0 ? `, con quota di ${quota} € a testa` : '') +
      (scartati.length > 0
        ? `. Esclusi per il certificato: ${scartati.map((u) => u.nome).join(', ')}`
        : '') +
      (prezzoFissato !== null
        ? `. Chi viene da fuori paga ${prezzoFissato.toFixed(2)} €`
        : '') +
      '.',
  };
}

export async function rimuoviPartecipante(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoSchierare(me.roles)) return { errore: 'Non hai i permessi.' };

  const rsvp = await prisma.eventRsvp.delete({ where: { id: str(fd, 'rsvpId') } });

  // via lui, via la sua quota: restava addebitata a chi non c'era più
  await allineaQuota(rsvp.eventId, rsvp.userId);

  aggiorna(rsvp.eventId);
  revalidatePath('/pagamenti');
  return { ok: 'Partecipante rimosso.' };
}
