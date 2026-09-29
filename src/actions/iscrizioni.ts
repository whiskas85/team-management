'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoAmministrare } from '@/lib/domain';
import { stagioneAttiva, tariffa } from '@/lib/stagioni';
import { componiQuota } from '@/lib/quote';
import { CALLSIGN_PRESO, callsignOccupato } from '@/lib/callsign';
import { data, enumVal, num, str, strOpt, type StatoForm } from '@/lib/form';

const TIPI = ['ISCRIZIONE', 'REISCRIZIONE'] as const;
const STATI = ['INVITATA', 'COMPILATA', 'ATTIVA', 'RIFIUTATA', 'SCADUTA'] as const;

function aggiorna() {
  revalidatePath('/admin/inviti');
  revalidatePath('/admin/richieste');
  revalidatePath('/admin/operatori');
  revalidatePath('/admin/nuovi');
  revalidatePath('/profilo');
  revalidatePath('/dashboard');
}

/** La quota di una richiesta: voci "tariffe", importo a mano nel campo "quota". */
const quotaRichiesta = (fd: FormData, stagioneId: string) =>
  componiQuota(fd, { voci: 'tariffe', importo: 'quota', stagioneId });

/** La stagione scelta a mano, altrimenti quella in corso. */
async function risolviStagione(id: string | null) {
  if (id) {
    const scelta = await prisma.stagione.findUnique({ where: { id } });
    if (scelta) return scelta;
  }
  return stagioneAttiva();
}

/**
 * L'amministrazione inoltra la richiesta di iscrizione. Il tipo determina la
 * quota: da qui l'operatore passa in ATTESA_COMPILAZIONE.
 */
export async function inviaRichiesta(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per inviare inviti.' };

  const userId = str(fd, 'userId');
  const stagione = await risolviStagione(strOpt(fd, 'stagioneId'));
  const tipo = enumVal(fd, 'tipo', TIPI, 'ISCRIZIONE');
  // la quota nasce dalle voci di listino spuntate; se non se ne sceglie nessuna
  // si ripiega su quella agganciata all'automatismo del tipo di richiesta
  const composta = await quotaRichiesta(fd, stagione.id);
  const quota = composta.quota ?? (await tariffa(tipo, stagione.id));

  const utente = await prisma.user.findUnique({ where: { id: userId } });
  if (!utente) return { errore: 'Operatore non trovato.' };

  const esistente = await prisma.membership.findUnique({
    where: { userId_stagioneId: { userId, stagioneId: stagione.id } },
  });
  if (esistente) {
    return { errore: `Esiste già un’iscrizione ${esistente.status.toLowerCase()} per ${stagione.nome}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.create({
      data: {
        userId,
        stagioneId: stagione.id,
        tipo,
        status: 'INVITATA',
        quota,
        dettaglioQuota: composta.dettaglio,
        messaggio: strOpt(fd, 'messaggio'),
        invitedById: me.id,
      },
    });
    // finché non compila resta in attesa: lo stato lo racconta anche a lui
    if (utente.stato === 'NUOVO' || utente.stato === 'RIFIUTATO') {
      await tx.user.update({ where: { id: userId }, data: { stato: 'ATTESA_COMPILAZIONE' } });
    }
  });

  aggiorna();
  return { ok: `Richiesta di ${tipo.toLowerCase()} inviata a ${utente.nome} ${utente.cognome}.` };
}

/** Invio in blocco a più operatori selezionati. */
export async function inviaRichiesteMultiple(
  _prev: StatoForm,
  fd: FormData,
): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per inviare inviti.' };

  const ids = fd.getAll('userIds').map((v) => v.toString());
  if (ids.length === 0) return { errore: 'Seleziona almeno un operatore.' };

  const stagione = await risolviStagione(strOpt(fd, 'stagioneId'));
  const tipo = enumVal(fd, 'tipo', TIPI, 'ISCRIZIONE');
  const composta = await quotaRichiesta(fd, stagione.id);
  const quota = composta.quota ?? (await tariffa(tipo, stagione.id));
  const messaggio = strOpt(fd, 'messaggio');

  const gia = await prisma.membership.findMany({
    where: { stagioneId: stagione.id, userId: { in: ids } },
    select: { userId: true },
  });
  const daInvitare = ids.filter((id) => !gia.some((g) => g.userId === id));
  if (daInvitare.length === 0) {
    return { errore: 'Tutti i selezionati hanno già un’iscrizione per questa stagione.' };
  }

  await prisma.$transaction([
    prisma.membership.createMany({
      data: daInvitare.map((userId) => ({
        userId,
        stagioneId: stagione.id,
        tipo,
        status: 'INVITATA' as const,
        quota,
        dettaglioQuota: composta.dettaglio,
        messaggio,
        invitedById: me.id,
      })),
    }),
    prisma.user.updateMany({
      where: { id: { in: daInvitare }, stato: { in: ['NUOVO', 'RIFIUTATO'] } },
      data: { stato: 'ATTESA_COMPILAZIONE' },
    }),
  ]);

  aggiorna();
  const saltate = ids.length - daInvitare.length;
  return {
    ok:
      (daInvitare.length === 1
        ? 'Inviata 1 richiesta'
        : `Inviate ${daInvitare.length} richieste`) +
      (saltate > 0 ? ` (${saltate} già presenti)` : '') +
      '.',
  };
}

/**
 * L'operatore compila e conferma i propri dati: la richiesta passa in
 * valutazione. I campi anagrafici arrivano dallo stesso modulo.
 */
export async function compilaRichiesta(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');

  const iscrizione = await prisma.membership.findUnique({ where: { id } });
  if (!iscrizione || iscrizione.userId !== me.id) return { errore: 'Richiesta non trovata.' };
  if (iscrizione.status !== 'INVITATA') {
    return { errore: 'Questa richiesta è già stata inviata.' };
  }

  const nome = str(fd, 'nome');
  const cognome = str(fd, 'cognome');
  const codiceFiscale = str(fd, 'codiceFiscale');
  const dataNascita = data(fd, 'dataNascita');
  const telefono = str(fd, 'telefono');

  if (!nome || !cognome) return { errore: 'Nome e cognome sono obbligatori.' };
  if (!dataNascita) return { errore: 'La data di nascita è obbligatoria per il tesseramento.' };
  if (codiceFiscale.length !== 16) return { errore: 'Il codice fiscale deve avere 16 caratteri.' };
  if (!telefono) return { errore: 'Il numero di telefono è obbligatorio.' };
  if (!str(fd, 'emergenzaNome') || !str(fd, 'emergenzaTel')) {
    return { errore: 'Indica un contatto di emergenza con il relativo numero.' };
  }

  const callsign = strOpt(fd, 'callsign');
  if (callsign) {
    const preso = await callsignOccupato(callsign, me.id);
    if (preso) return { errore: CALLSIGN_PRESO(callsign, preso) };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: me.id },
      data: {
        nome,
        cognome,
        callsign,
        telefono,
        dataNascita,
        luogoNascita: strOpt(fd, 'luogoNascita'),
        codiceFiscale: codiceFiscale.toUpperCase(),
        indirizzo: strOpt(fd, 'indirizzo'),
        citta: strOpt(fd, 'citta'),
        cap: strOpt(fd, 'cap'),
        provincia: strOpt(fd, 'provincia')?.toUpperCase() ?? null,
        emergenzaNome: strOpt(fd, 'emergenzaNome'),
        emergenzaTel: strOpt(fd, 'emergenzaTel'),
        gruppoSanguigno: strOpt(fd, 'gruppoSanguigno'),
        allergie: strOpt(fd, 'allergie'),
        stato: 'ATTESA_ACCETTAZIONE',
      },
    });
    await tx.membership.update({
      where: { id },
      data: {
        status: 'COMPILATA',
        compilataIl: new Date(),
        compilato: strOpt(fd, 'note'),
      },
    });
  });

  aggiorna();
  return { ok: 'Modulo inviato. La richiesta è ora in valutazione.' };
}

/**
 * Accettazione: l'operatore entra in squadra e, se prevista, viene generata la
 * quota da incassare insieme alla riga della tessera FIGT da recuperare.
 */
export async function approvaIscrizione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per approvare.' };

  const id = str(fd, 'id');
  const quotaForm = num(fd, 'quota');
  const scadeIl = data(fd, 'scadeIl');

  const iscrizione = await prisma.membership.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nome: true, roles: true } },
      stagione: { select: { nome: true } },
    },
  });
  if (!iscrizione) return { errore: 'Richiesta non trovata.' };

  const quota = quotaForm ?? (iscrizione.quota ? Number(iscrizione.quota) : null);

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id },
      data: {
        status: 'ATTIVA',
        quota,
        scadeIl,
        note: strOpt(fd, 'note'),
        decisaIl: new Date(),
        decidedById: me.id,
      },
    });

    await tx.user.update({
      where: { id: iscrizione.userId },
      data: {
        stato: 'SQUADRA',
        roles: iscrizione.user.roles.length === 0 ? ['ATLETA'] : iscrizione.user.roles,
      },
    });

    if (quota && quota > 0) {
      await tx.payment.create({
        data: {
          userId: iscrizione.userId,
          tipo: 'ISCRIZIONE',
          descrizione: iscrizione.dettaglioQuota
            ? `${iscrizione.dettaglioQuota} · ${iscrizione.stagione.nome}`
            : `Quota ${iscrizione.tipo === 'REISCRIZIONE' ? 'rinnovo' : 'iscrizione'} ${iscrizione.stagione.nome}`,
          importo: quota,
          status: 'DA_PAGARE',
          scadenza: scadeIl,
          membershipId: iscrizione.id,
          recordedById: me.id,
        },
      });
    }

    // la tessera federale va poi recuperata dal portale: predisponiamo la riga
    const tesseraEsistente = await tx.figtCard.findFirst({
      where: { userId: iscrizione.userId, stagioneId: iscrizione.stagioneId },
    });
    if (!tesseraEsistente) {
      await tx.figtCard.create({
        data: {
          userId: iscrizione.userId,
          stagioneId: iscrizione.stagioneId,
          status: 'DA_RECUPERARE',
        },
      });
    }
  });

  aggiorna();
  revalidatePath('/admin/pagamenti');
  revalidatePath('/admin/tessere');
  return { ok: `${iscrizione.user.nome} è ora in squadra.` };
}

export async function rifiutaIscrizione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per rifiutare.' };

  const id = str(fd, 'id');
  const note = str(fd, 'note');
  if (!note) return { errore: 'Indica il motivo del rifiuto: resta a storico.' };

  const iscrizione = await prisma.membership.update({
    where: { id },
    data: { status: 'RIFIUTATA', note, decisaIl: new Date(), decidedById: me.id },
  });

  await prisma.user.update({
    where: { id: iscrizione.userId },
    data: { stato: 'RIFIUTATO' },
  });

  aggiorna();
  return { ok: 'Richiesta rifiutata e conservata a storico.' };
}

/**
 * Cancellazione per errore: la riga sparisce e l'operatore torna allo stato
 * precedente, senza lasciare traccia di un rifiuto che non c'è stato.
 */
export async function cancellaIscrizione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per cancellare.' };

  const id = str(fd, 'id');
  const iscrizione = await prisma.membership.findUnique({
    where: { id },
    include: { payments: { select: { id: true, pagato: true } } },
  });
  if (!iscrizione) return { errore: 'Iscrizione non trovata.' };

  const incassato = iscrizione.payments.some((p) => Number(p.pagato) > 0);
  if (incassato) {
    return {
      errore: 'Su questa iscrizione risultano incassi: annulla prima il pagamento collegato.',
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { membershipId: id } });
    await tx.membership.delete({ where: { id } });

    // se non ha altre iscrizioni valide torna a essere un contatto
    const altre = await tx.membership.count({
      where: { userId: iscrizione.userId, status: { in: ['ATTIVA', 'COMPILATA', 'INVITATA'] } },
    });
    if (altre === 0) {
      const u = await tx.user.findUnique({ where: { id: iscrizione.userId } });
      if (u && u.stato !== 'SQUADRA') {
        await tx.user.update({ where: { id: iscrizione.userId }, data: { stato: 'NUOVO' } });
      }
    }
  });

  aggiorna();
  revalidatePath('/admin/pagamenti');
  return { ok: 'Iscrizione cancellata: nessuna traccia di rifiuto.' };
}

/** Modifica di un'iscrizione già registrata. */
export async function salvaIscrizione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi.' };

  await prisma.membership.update({
    where: { id: str(fd, 'id') },
    data: {
      status: enumVal(fd, 'status', STATI, 'ATTIVA'),
      tipo: enumVal(fd, 'tipo', TIPI, 'ISCRIZIONE'),
      quota: num(fd, 'quota'),
      scadeIl: data(fd, 'scadeIl'),
      note: strOpt(fd, 'note'),
    },
  });

  aggiorna();
  return { ok: 'Iscrizione aggiornata.' };
}
