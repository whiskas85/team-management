'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin, puoGestirePagamenti } from '@/lib/domain';
import { puoGestireCassa } from '@/lib/casse';
import { data, enumVal, num, str, strOpt, type StatoForm } from '@/lib/form';

const TIPI = [
  'ISCRIZIONE',
  'TESSERA_FIGT',
  'TORNEO',
  'GARA',
  'ALLENAMENTO',
  'EVENTO',
  'RIMBORSO',
  'ALTRO',
] as const;

function aggiorna() {
  revalidatePath('/admin/pagamenti');
  revalidatePath('/cassa');
  revalidatePath('/admin/cassa');
  revalidatePath('/pagamenti');
  revalidatePath('/dashboard');
  revalidatePath('/admin/statistiche');
}

/** Deriva lo stato dall'importo incassato, così non resta mai incoerente. */
function statoDaImporti(importo: number, pagato: number) {
  if (pagato <= 0) return 'DA_PAGARE' as const;
  if (pagato + 0.001 >= importo) return 'PAGATO' as const;
  return 'PARZIALE' as const;
}

export async function salvaPagamento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Solo admin e segreteria gestiscono i pagamenti.' };
  }

  const id = str(fd, 'id');
  const importo = num(fd, 'importo');
  const descrizione = str(fd, 'descrizione');

  if (!descrizione) return { errore: 'La descrizione è obbligatoria.' };
  if (importo === null || importo <= 0) return { errore: 'Importo non valido.' };

  const pagato = num(fd, 'pagato') ?? 0;
  if (pagato < 0) return { errore: 'L’importo incassato non può essere negativo.' };
  if (pagato > importo + 0.001) {
    return { errore: 'L’incassato non può superare l’importo dovuto.' };
  }

  const status = statoDaImporti(importo, pagato);

  const valori = {
    tipo: enumVal(fd, 'tipo', TIPI, 'ALTRO'),
    descrizione,
    importo,
    pagato,
    status,
    metodoId: strOpt(fd, 'metodoId'),
    scadenza: data(fd, 'scadenza'),
    pagatoIl: status === 'PAGATO' ? (data(fd, 'pagatoIl') ?? new Date()) : null,
    note: strOpt(fd, 'note'),
    eventId: strOpt(fd, 'eventId'),
  };

  if (id) {
    const esistente = await prisma.payment.findUnique({ where: { id } });
    if (!esistente) return { errore: 'Movimento non trovato.' };
    // i pagamenti di un'altra cassa li gestisce chi ne è responsabile
    if (esistente.cassaId) {
      return { errore: 'Questo pagamento è di un’altra cassa: lo gestisce chi ne è responsabile.' };
    }

    // un incasso chiuso non si tocca più: la contabilità deve restare ferma
    if (esistente.status === 'PAGATO' && !isAdmin(me.roles)) {
      return {
        errore:
          'Questo movimento è già stato incassato e non è più modificabile. Se c’è un errore, chiedi all’admin di correggerlo.',
      };
    }

    await prisma.payment.update({ where: { id }, data: valori });
    aggiorna();
    return { ok: 'Movimento aggiornato.' };
  }

  const userId = str(fd, 'userId');
  if (!userId) return { errore: 'Seleziona l’operatore.' };

  // Una quota si può mettere nella cassa di un altro — il corso di Mario — ma
  // nasce sempre da incassare: l'incasso lo conferma chi gestisce quella
  // cassa, non la segreteria del club, e con uno dei suoi metodi
  const cassaId = strOpt(fd, 'cassaId');
  if (cassaId) {
    const cassa = await prisma.cassa.findUnique({ where: { id: cassaId }, select: { attiva: true } });
    if (!cassa?.attiva) return { errore: 'Quella cassa non c’è più o è spenta.' };
    await prisma.payment.create({
      data: {
        ...valori,
        pagato: 0,
        status: 'DA_PAGARE',
        pagatoIl: null,
        metodoId: null,
        cassaId,
        userId,
        recordedById: me.id,
      },
    });
    aggiorna();
    return { ok: 'Quota registrata nell’altra cassa: la incassa chi la gestisce.' };
  }

  await prisma.payment.create({ data: { ...valori, userId, recordedById: me.id } });
  aggiorna();
  return { ok: 'Movimento registrato.' };
}

/** Scorciatoia: segna l'intero importo come incassato. */
export async function segnaPagato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const id = str(fd, 'id');
  const pagamento = await prisma.payment.findUnique({ where: { id } });
  if (!pagamento) return { errore: 'Movimento non trovato.' };
  // quelli del club li incassa la segreteria, quelli di un'altra cassa chi la
  // gestisce: ognuno i suoi, e nessuno quelli degli altri
  if (!(await puoGestireCassa(me, pagamento.cassaId))) {
    return {
      errore: pagamento.cassaId
        ? 'Questo pagamento è di un’altra cassa: lo conferma chi la gestisce.'
        : 'Solo admin e segreteria gestiscono i pagamenti del club.',
    };
  }
  if (pagamento.status === 'PAGATO') return { errore: 'Risulta già saldato.' };

  // importo, data e metodo si possono correggere qui: è il momento in cui la
  // segreteria mette nero su bianco com'è andata davvero
  const dovuto = Number(pagamento.importo);
  const incassato = num(fd, 'pagato') ?? dovuto;
  if (incassato <= 0) return { errore: 'Indica quanto hai incassato.' };
  if (incassato > dovuto + 0.001) {
    return { errore: 'L’incassato non può superare l’importo dovuto.' };
  }

  const quando = data(fd, 'pagatoIl') ?? pagamento.dichiaratoIl ?? new Date();
  if (quando > new Date()) return { errore: 'La data non può essere nel futuro.' };

  // il metodo dev'essere della stessa cassa: il bonifico al club non salda
  // una quota del corso di Mario
  const metodoScelto = strOpt(fd, 'metodoId');
  if (metodoScelto) {
    const metodo = await prisma.metodoPagamento.findUnique({
      where: { id: metodoScelto },
      select: { cassaId: true },
    });
    if (!metodo || metodo.cassaId !== pagamento.cassaId) {
      return { errore: 'Quel metodo non è di questa cassa.' };
    }
  }

  const status = statoDaImporti(dovuto, incassato);

  await prisma.payment.update({
    where: { id },
    data: {
      pagato: incassato,
      status,
      pagatoIl: status === 'PAGATO' ? quando : null,
      metodoId: metodoScelto ?? pagamento.metodoId,
      note: strOpt(fd, 'note') ?? pagamento.note,
      recordedById: me.id,
    },
  });

  // Il posto in formazione si tiene pagando: registrato l'incasso, chi era
  // convocato diventa titolare da solo. Senza questo passaggio la segreteria
  // incasserebbe e il TL dovrebbe ricordarsi di andare a promuoverlo a mano,
  // cioè prima o poi non lo farebbe.
  let promosso = false;
  if (status === 'PAGATO' && pagamento.eventId) {
    const passati = await prisma.eventRsvp.updateMany({
      where: {
        eventId: pagamento.eventId,
        userId: pagamento.userId,
        assegnazione: 'CONVOCATO',
      },
      data: { assegnazione: 'TITOLARE' },
    });
    promosso = passati.count > 0;
    if (promosso) revalidatePath(`/calendario/${pagamento.eventId}`);
  }

  aggiorna();
  if (status === 'PARZIALE') return { ok: 'Acconto registrato: resta il saldo da incassare.' };
  if (promosso) return { ok: 'Incasso registrato: da convocato passa a titolare.' };
  return {
    ok:
      pagamento.tipo === 'RIMBORSO'
        ? 'Rimborso erogato.'
        : 'Incasso registrato: da adesso il movimento non è più modificabile.',
  };
}

export async function eliminaPagamento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Solo admin e segreteria gestiscono i pagamenti.' };
  }

  const id = str(fd, 'id');
  const pagamento = await prisma.payment.findUnique({ where: { id } });
  if (!pagamento) return { errore: 'Movimento non trovato.' };

  // la segreteria non tocca i pagamenti di un'altra cassa
  if (pagamento.cassaId) {
    return { errore: 'Questo pagamento è di un’altra cassa: non si elimina da qui.' };
  }
  if (pagamento.status === 'PAGATO' && !isAdmin(me.roles)) {
    return { errore: 'Un movimento incassato non si elimina: serve l’admin.' };
  }

  await prisma.payment.delete({ where: { id } });
  aggiorna();
  return { ok: 'Movimento eliminato.' };
}

/**
 * Correzione di un incasso sbagliato. Riservata all'admin e con il motivo
 * scritto in nota: senza una via d'uscita un errore resterebbe per sempre.
 */
export async function correggiIncasso(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) {
    return { errore: 'Solo l’admin può correggere un incasso già registrato.' };
  }

  const id = str(fd, 'id');
  const nuovoPagato = num(fd, 'pagato');
  const motivo = str(fd, 'motivo');

  if (nuovoPagato === null || nuovoPagato < 0) return { errore: 'Importo non valido.' };
  if (!motivo) return { errore: 'Scrivi il motivo della correzione: resta agli atti.' };

  const pagamento = await prisma.payment.findUnique({ where: { id } });
  if (!pagamento) return { errore: 'Movimento non trovato.' };
  if (pagamento.cassaId) {
    return { errore: 'Questo incasso è di un’altra cassa: lo corregge chi la gestisce.' };
  }

  const importo = Number(pagamento.importo);
  if (nuovoPagato > importo + 0.001) {
    return { errore: 'L’incassato non può superare l’importo dovuto.' };
  }

  const status = statoDaImporti(importo, nuovoPagato);
  const traccia =
    `Correzione del ${new Date().toLocaleDateString('it-IT')} ` +
    `(${me.nome} ${me.cognome}): incassato ${Number(pagamento.pagato).toFixed(2)} → ` +
    `${nuovoPagato.toFixed(2)} · ${motivo}`;

  await prisma.payment.update({
    where: { id },
    data: {
      pagato: nuovoPagato,
      status,
      pagatoIl: status === 'PAGATO' ? (pagamento.pagatoIl ?? new Date()) : null,
      note: [pagamento.note, traccia].filter(Boolean).join(' · '),
    },
  });

  aggiorna();
  return { ok: 'Incasso corretto, con annotazione del motivo.' };
}

/**
 * Chiede indietro una quota già versata per un'attività a cui non si partecipa
 * più. Nasce come voce separata di tipo Rimborso, da erogare.
 */
export async function chiediRimborso(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');

  const pagamento = await prisma.payment.findUnique({
    where: { id },
    include: { rimborso: true, event: { select: { titolo: true } } },
  });
  if (!pagamento) return { errore: 'Movimento non trovato.' };

  // un rimborso non si rimborsa: senza questo si potrebbe incatenare all'infinito
  if (pagamento.tipo === 'RIMBORSO') {
    return { errore: 'Questo movimento è già un rimborso.' };
  }

  const suo = pagamento.userId === me.id;
  if (!suo && !puoGestirePagamenti(me.roles)) {
    return { errore: 'Puoi chiedere il rimborso solo delle tue quote.' };
  }
  if (Number(pagamento.pagato) <= 0) {
    return { errore: 'Su questa quota non risulta alcun versamento da restituire.' };
  }
  if (pagamento.rimborso) return { errore: 'Il rimborso è già stato richiesto.' };

  await prisma.payment.create({
    data: {
      userId: pagamento.userId,
      tipo: 'RIMBORSO',
      descrizione: `Rimborso · ${pagamento.event?.titolo ?? pagamento.descrizione}`,
      importo: pagamento.pagato,
      status: 'DA_PAGARE',
      eventId: pagamento.eventId,
      rimborsoDiId: pagamento.id,
      // il rimborso esce dalla stessa cassa in cui erano entrati i soldi
      cassaId: pagamento.cassaId,
      note: suo ? 'Richiesto dall’operatore' : `Aperto da ${me.nome} ${me.cognome}`,
      recordedById: me.id,
    },
  });

  aggiorna();
  return {
    ok: `Rimborso di ${Number(pagamento.pagato).toFixed(2)} € richiesto: ${
      pagamento.cassaId ? 'lo erogherà chi gestisce la cassa' : 'la segreteria lo erogherà'
    }.`,
  };
}
