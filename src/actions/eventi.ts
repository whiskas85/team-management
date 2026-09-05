'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { stagioneAttiva } from '@/lib/stagioni';
import { componiQuota, quotaPer } from '@/lib/quote';
import { requireUser } from '@/lib/auth';
import { MOTIVO_NON_IDONEO, idoneoPer, inSquadra, isAdmin, puoSchierare } from '@/lib/domain';
import { data, enumOpt, enumVal, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';

const VISIBILITA = ['TEAM', 'TUTTI'] as const;
const STATI = ['CREATA', 'RILASCIATA', 'ANNULLATA', 'CONCLUSA'] as const;
const RSVP = ['PRESENTE', 'ASSENTE', 'FORSE'] as const;
const ASSEGNAZIONI = ['NON_ASSEGNATO', 'TITOLARE', 'RISERVA'] as const;

function aggiorna(id?: string) {
  revalidatePath('/calendario');
  revalidatePath('/dashboard');
  revalidatePath('/admin/statistiche');
  if (id) revalidatePath(`/calendario/${id}`);
}

/** Crea o aggiorna un evento. Solo admin. */
export async function salvaEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può gestire il calendario.' };

  const id = str(fd, 'id');
  const titolo = str(fd, 'titolo');
  const inizio = data(fd, 'inizio');
  if (!titolo) return { errore: 'Il titolo è obbligatorio.' };
  if (!inizio) return { errore: 'La data di inizio è obbligatoria.' };

  const fine = data(fd, 'fine');
  if (fine && fine < inizio) return { errore: 'La fine non può precedere l’inizio.' };

  // la stagione resta quella in cui l'attività è nata: le voci di listino da
  // usare sono le sue, non quelle dell'anno in cui la si sta ritoccando
  const esistente = id ? await prisma.event.findUnique({ where: { id } }) : null;
  if (id && !esistente) return { errore: 'Attività non trovata.' };
  const stagioneId = esistente ? esistente.stagioneId : (await stagioneAttiva()).id;

  // due quote: chi è in squadra e chi viene da fuori non pagano la stessa cosa
  const squadra = await componiQuota(fd, {
    voci: 'tariffeSquadra',
    importo: 'costo',
    stagioneId,
  });
  const esterni = await componiQuota(fd, {
    voci: 'tariffeEsterni',
    importo: 'costoEsterni',
    stagioneId,
  });

  // stato e visibilità non passano da qui: si governano con i pulsanti sulla
  // scheda, così non si rilascia un'attività per sbaglio da una tendina
  const valori = {
    titolo,
    descrizione: strOpt(fd, 'descrizione'),
    tipoId: strOpt(fd, 'tipoId'),
    inizio,
    fine,
    ritrovo: strOpt(fd, 'ritrovo'),
    oraRitrovo: data(fd, 'oraRitrovo'),
    fieldId: strOpt(fd, 'fieldId'),
    costo: squadra.quota,
    dettaglioCosto: squadra.dettaglio,
    costoEsterni: esterni.quota,
    dettaglioCostoEsterni: esterni.dettaglio,
    maxPartecipanti: intOpt(fd, 'maxPartecipanti'),
    chiusuraIscrizioni: data(fd, 'chiusuraIscrizioni'),
    note: strOpt(fd, 'note'),
  };

  if (id) {
    await prisma.event.update({ where: { id }, data: valori });
    aggiorna(id);
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
  aggiorna(creato.id);
  return { ok: 'Attività creata in bozza. Rilasciala quando è pronta.' };
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
  if (evento.visibilita === 'TEAM' && !inSquadra(me.stato)) {
    return { errore: 'Questa attività è riservata alla squadra.' };
  }
  if (evento.status === 'ANNULLATA') return { errore: 'L’attività è stata annullata.' };
  if (evento.chiusuraIscrizioni && evento.chiusuraIscrizioni < new Date()) {
    return { errore: 'Le adesioni per questo evento sono chiuse.' };
  }

  // senza certificato medico valido non si scende in campo: vale per chi è in
  // squadra, i nuovi che vengono alle open non hanno l'obbligo
  if (status !== 'ASSENTE' && inSquadra(me.stato)) {
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

  if (
    status === 'PRESENTE' &&
    evento.maxPartecipanti &&
    esistente?.status !== 'PRESENTE' &&
    evento._count.rsvps >= evento.maxPartecipanti
  ) {
    return { errore: 'Posti esauriti per questo evento.' };
  }

  const note = strOpt(fd, 'note');
  await prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId: me.id } },
    create: { eventId, userId: me.id, status, note },
    update: { status, note, respondedAt: new Date() },
  });

  const quota = await allineaQuota(evento, me.id, status);

  aggiorna(eventId);
  revalidatePath('/pagamenti');
  revalidatePath('/admin/pagamenti');

  if (status === 'ASSENTE') return { ok: 'Risposta registrata.' };
  if (evento.tipo?.riserve) {
    return {
      ok: quota
        ? `Disponibilità registrata. Vale a quota saldata (${quota} €): sarà poi il TL a comporre la formazione.`
        : 'Disponibilità registrata: sarà il TL a comporre la formazione.',
    };
  }
  return {
    ok: quota
      ? `Adesione registrata. Il posto è confermato al saldo della quota di ${quota} €.`
      : 'Adesione registrata.',
  };
}

/**
 * La quota è legata all'attività: chi si segna se la vede addebitata, chi si
 * ritira se la vede tolta — purché non abbia già versato qualcosa.
 */
async function allineaQuota(
  evento: {
    id: string;
    titolo: string;
    costo: unknown;
    costoEsterni: unknown;
    inizio: Date;
    tipo: { tipoQuota: string } | null;
  },
  userId: string,
  status: string,
): Promise<number | null> {
  const chi = await prisma.user.findUnique({ where: { id: userId }, select: { stato: true } });
  const { importo: costo, dettaglio } = quotaPer(evento, chi?.stato);
  if (costo <= 0) return null;

  const esistente = await prisma.payment.findFirst({
    where: { eventId: evento.id, userId },
  });

  if (status === 'PRESENTE') {
    if (!esistente) {
      // una quota sola, anche quando è fatta di più voci: si paga in una volta
      // e il dettaglio racconta di cosa è composta
      await prisma.payment.create({
        data: {
          userId,
          tipo: (evento.tipo?.tipoQuota ?? 'EVENTO') as 'EVENTO',
          descrizione: evento.titolo,
          note: dettaglio,
          importo: costo,
          status: 'DA_PAGARE',
          scadenza: evento.inizio,
          eventId: evento.id,
        },
      });
    }
    return costo;
  }

  // ritirandosi la quota sparisce, ma solo se non è stato incassato nulla
  if (esistente && Number(esistente.pagato) === 0) {
    await prisma.payment.delete({ where: { id: esistente.id } });
  }
  return null;
}

/** Schieramento: il TL decide chi è titolare e chi riserva. */
export async function schiera(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoSchierare(me.roles)) {
    return { errore: 'Solo un Team Leader può comporre la squadra.' };
  }

  const rsvpId = str(fd, 'rsvpId');
  const assegnazione = enumVal(fd, 'assegnazione', ASSEGNAZIONI, 'NON_ASSEGNATO');

  const rsvp = await prisma.eventRsvp.update({
    where: { id: rsvpId },
    data: { assegnazione },
  });

  aggiorna(rsvp.eventId);
  return { ok: 'Schieramento aggiornato.' };
}

/** Appello a evento concluso. */
export async function registraPresenze(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoSchierare(me.roles)) return { errore: 'Non hai i permessi per registrare le presenze.' };

  const eventId = str(fd, 'eventId');
  const presenti = new Set(fd.getAll('presenti').map((v) => v.toString()));

  const rsvps = await prisma.eventRsvp.findMany({ where: { eventId }, select: { id: true } });
  await prisma.$transaction(
    rsvps.map((r) =>
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
  const ammessi = utenti.filter(
    (u) => !inSquadra(u.stato) || idoneoPer(u.certificates, serveAgonistico),
  );
  const scartati = utenti.filter((u) => !ammessi.includes(u));

  for (const u of ammessi) {
    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId: u.id } },
      create: { eventId, userId: u.id, status: 'PRESENTE', note: 'Aggiunto dallo staff' },
      update: { status: 'PRESENTE' },
    });
    await allineaQuota(evento, u.id, 'PRESENTE');
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
      '.',
  };
}

export async function rimuoviPartecipante(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoSchierare(me.roles)) return { errore: 'Non hai i permessi.' };

  const rsvp = await prisma.eventRsvp.delete({ where: { id: str(fd, 'rsvpId') } });
  aggiorna(rsvp.eventId);
  return { ok: 'Partecipante rimosso.' };
}
