'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin, puoSchierare } from '@/lib/domain';
import { intOpt, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Le squadre di fuori invitate a giocare con noi.
 *
 * Non hanno un account, e non serve: ricevono un link, vedono quello che
 * serve a loro — quando, dove, in quanti siamo — e dicono in quanti vengono.
 * Ogni squadra ha il suo link, così si sa sempre chi ha risposto e chi no.
 */

function aggiorna(eventId: string) {
  revalidatePath(`/calendario/${eventId}`);
  revalidatePath('/calendario');
}

/** Chi organizza l'attività: l'admin e chi schiera la squadra. */
const puoInvitare = (roles: Parameters<typeof isAdmin>[0]) =>
  isAdmin(roles) || puoSchierare(roles);

export async function aggiungiSquadraOspite(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoInvitare(me.roles)) return { errore: 'Non puoi invitare squadre a questa attività.' };

  const eventId = str(fd, 'eventId');

  // Due modi di scrivere lo stesso nome: preso dall'anagrafica delle squadre
  // conosciute, o battuto a mano per chi non c'è ancora. Il nome si copia
  // comunque: se un domani quella squadra viene cancellata dall'anagrafica,
  // l'invito resta leggibile invece di diventare una riga vuota.
  const squadraId = strOpt(fd, 'squadraId');
  let nome = strOpt(fd, 'nome') ?? '';

  if (squadraId) {
    const conosciuta = await prisma.squadraEsterna.findUnique({ where: { id: squadraId } });
    if (!conosciuta) return { errore: 'Quella squadra non è più in anagrafica.' };
    nome = conosciuta.nome;
  }
  if (!nome) return { errore: 'Scegli una squadra o scrivi il nome di chi viene.' };

  const esiste = await prisma.squadraOspite.findFirst({ where: { eventId, nome } });
  if (esiste) return { errore: `"${nome}" è già fra gli ospiti di questa attività.` };

  await prisma.squadraOspite.create({
    data: {
      eventId,
      squadraId: squadraId || null,
      nome,
      // la chiave della porta: sta in chiaro perché il link va mostrato e
      // copiato, e non apre niente di più della pagina di quell'invito
      token: randomBytes(16).toString('base64url'),
    },
  });

  aggiorna(eventId);
  return { ok: `${nome} è fra gli ospiti: manda il link al loro referente.` };
}

export async function togliSquadraOspite(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoInvitare(me.roles)) return { errore: 'Non puoi togliere le squadre ospiti.' };

  const id = str(fd, 'id');
  const ospite = await prisma.squadraOspite.findUnique({ where: { id } });
  if (!ospite) return { errore: 'Invito non trovato.' };

  await prisma.squadraOspite.delete({ where: { id } });

  aggiorna(ospite.eventId);
  return { ok: `${ospite.nome} non è più fra gli ospiti: il suo link non apre più niente.` };
}

/**
 * Il numero scritto da noi, al posto loro.
 *
 * Capita, ed è normale: il referente lo dice a voce, in chat o al telefono, e
 * pretendere che apra il link per forza vorrebbe dire lasciare il conteggio a
 * metà per un formalismo. Vale quanto quello scritto da loro — è lo stesso
 * campo — e chi lo scrive vede la stessa riga aggiornarsi.
 */
export async function segnaOperatoriOspite(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoInvitare(me.roles)) return { errore: 'Non puoi toccare i numeri degli ospiti.' };

  const id = str(fd, 'id');
  const operatori = intOpt(fd, 'operatori');
  if (operatori === null) return { errore: 'Scrivi quanti operatori portano.' };
  if (operatori < 0 || operatori > 500) return { errore: 'Quel numero non sembra vero: controlla.' };

  const ospite = await prisma.squadraOspite.findUnique({ where: { id } });
  if (!ospite) return { errore: 'Invito non trovato.' };

  await prisma.squadraOspite.update({
    where: { id },
    data: { operatori, rispostoIl: new Date() },
  });

  aggiorna(ospite.eventId);
  return { ok: `${ospite.nome}: segnati ${operatori} operatori.` };
}

/**
 * «Veniamo in sette.»
 *
 * È l'unica cosa che si può fare da fuori, e si fa **senza account**: la
 * chiave è il link. Chi non ce l'ha non arriva qui; chi ce l'ha può cambiare
 * solo il proprio numero, e nient'altro di quell'attività.
 */
export async function rispondiInvito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const token = str(fd, 'token');
  const operatori = intOpt(fd, 'operatori');

  if (operatori === null) return { errore: 'Scrivi quanti operatori portate.' };
  if (operatori < 0) return { errore: 'Il numero non può essere negativo.' };
  // un tetto qualsiasi, ma un tetto: serve a fermare la mano sulla tastiera,
  // non a giudicare quanto grande sia una squadra
  if (operatori > 500) return { errore: 'Quel numero non sembra vero: controlla.' };

  const ospite = await prisma.squadraOspite.findUnique({
    where: { token },
    include: { event: { select: { status: true, inizio: true, fine: true } } },
  });
  if (!ospite) return { errore: 'Questo link non è più valido.' };

  // A cose fatte non si cambia più niente: la pagina lo dice già, ma il
  // rifiuto va detto anche qui — una scheda rimasta aperta dal venerdì non
  // deve poter scrivere il lunedì.
  const e = ospite.event;
  if (e.status === 'ANNULLATA') return { errore: 'Questa attività è stata annullata.' };
  if (e.status === 'CONCLUSA' || (e.fine ?? e.inizio) < new Date()) {
    return { errore: 'Questa attività è finita: il numero non si cambia più.' };
  }

  await prisma.squadraOspite.update({
    where: { id: ospite.id },
    data: { operatori, rispostoIl: new Date() },
  });

  aggiorna(ospite.eventId);
  revalidatePath(`/invito/${token}`);
  return {
    ok:
      operatori === 0
        ? 'Segnato: non venite. Grazie di averlo detto.'
        : `Segnato: siete in ${operatori}. Puoi tornare qui e cambiarlo quando vuoi.`,
  };
}
