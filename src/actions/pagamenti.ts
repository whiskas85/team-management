'use server';

import { marchio } from '@/lib/mia-squadra';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin, puoGestirePagamenti } from '@/lib/domain';
import { puoGestireCassa, quoteTutteSaldate } from '@/lib/casse';
import { data, enumVal, num, str, strOpt, type StatoForm } from '@/lib/form';
import {
  pagaConCredito,
  parteDaCredito,
  passaCredito,
  quotaInCredito,
  riprendiCredito,
  saldoCredito,
} from '@/lib/credito';
import { fmtEuro, nomeCompleto } from '@/lib/format';
import { eliminaAllegato } from '@/lib/storage';
import { avvisaPersona } from '@/lib/avvisi';

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

/** Il «metodo» credito: non è una riga del database, è il credito della persona. */
const CREDITO = 'CREDITO';

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

    // Una quota gestita fuori resta tale anche se se ne corregge la
    // descrizione o l'importo: lo stato ricalcolato dagli importi la
    // riporterebbe «da pagare» senza che nessuno l'abbia chiesto. Se invece
    // si scrive un incasso, vuol dire che è rientrata nel gestionale
    const restaFuori = esistente.status === 'NON_GESTITO' && pagato === 0;
    await prisma.payment.update({
      where: { id },
      data: restaFuori ? { ...valori, status: 'NON_GESTITO', pagatoIl: null } : valori,
    });
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
  if (pagamento.status === 'NON_GESTITO') {
    return { errore: 'Questa quota è gestita fuori dal gestionale: rimettila da gestire, prima.' };
  }

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

  // Col credito: non entra niente, si usa quello che la persona ha già in
  // cassa. Fin dove arriva: il resto, se c'è, resta da incassare.
  if (strOpt(fd, 'metodoId') === CREDITO) {
    const usato = await pagaConCredito(id, incassato - Number(pagamento.pagato));
    aggiorna();
    if (usato <= 0) return { errore: 'Non ha credito in questa cassa.' };
    const dopo = await prisma.payment.findUnique({ where: { id }, select: { status: true } });
    return {
      ok:
        dopo?.status === 'PAGATO'
          ? `Pagata col credito (${fmtEuro(usato)}).`
          : `${fmtEuro(usato)} pagati col credito: il resto è ancora da incassare.`,
    };
  }

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
  // Con più quote — il club e il corso di Mario — si passa quando sono chiuse
  // tutte: pagare il campo e non l'istruttore non basta.
  let promosso = false;
  if (
    status === 'PAGATO' &&
    pagamento.eventId &&
    (await quoteTutteSaldate(pagamento.eventId, pagamento.userId))
  ) {
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

  // se l'aveva pagata il credito, quei soldi tornano credito: cancellandola e
  // basta sparirebbero dalla cassa
  await riprendiCredito(id);
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

  // la parte pagata col credito non si rimborsa in contanti: se la quota non è
  // più dovuta, quei soldi tornano credito da soli
  const inContanti = Number(pagamento.pagato) - (await parteDaCredito(pagamento.id));
  if (inContanti <= 0.001) {
    return {
      errore:
        'Questa quota l’ha pagata il tuo credito: se non partecipi più, torna credito da sola.',
    };
  }

  await prisma.payment.create({
    data: {
      userId: pagamento.userId,
      tipo: 'RIMBORSO',
      descrizione: `Rimborso · ${pagamento.event?.titolo ?? pagamento.descrizione}`,
      importo: inContanti,
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

/**
 * Una quota che si paga fuori dal gestionale.
 *
 * Capita: l'istruttore incassa a mano, la cosa si regola a parte. Tenerla
 * «da pagare» vorrebbe dire solleciti, pallini e un'assicurazione bloccata per
 * un pagamento che c'è stato davvero, solo non di qui. Segnata così è chiusa —
 * conta come pagata per l'assicurazione, per la formazione e per i conteggi —
 * ma **l'incassato resta zero**: nella cassa non entra niente, perché i soldi
 * non sono passati dal gestionale.
 *
 * La decide chi gestisce la cassa di quella quota, e solo su una quota ancora
 * tutta da pagare: su un acconto già registrato non si mescolano le due cose.
 */
export async function segnaNonGestito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const pagamento = await prisma.payment.findUnique({ where: { id: str(fd, 'id') } });
  if (!pagamento) return { errore: 'Movimento non trovato.' };
  if (!(await puoGestireCassa(me, pagamento.cassaId))) {
    return { errore: 'Questo pagamento lo gestisce chi ne tiene la cassa.' };
  }
  if (pagamento.tipo === 'RIMBORSO') {
    return { errore: 'Un rimborso non si segna come gestito fuori.' };
  }
  if (pagamento.status !== 'DA_PAGARE' || Number(pagamento.pagato) > 0) {
    return {
      errore: 'Si può fare solo su una quota ancora tutta da pagare: qui c’è già un incasso.',
    };
  }

  const traccia = `Gestita fuori dal gestionale (${me.nome} ${me.cognome}, ${new Date().toLocaleDateString('it-IT')})`;
  await prisma.payment.update({
    where: { id: pagamento.id },
    data: {
      status: 'NON_GESTITO',
      // una segnalazione fatta prima non deve restare «da confermare»
      dichiaratoIl: null,
      recordedById: me.id,
      note: [pagamento.note, traccia].filter(Boolean).join(' · '),
    },
  });

  // come a quota pagata: chi era convocato diventa titolare, se non gli resta
  // un'altra quota aperta
  if (pagamento.eventId) {
    if (await quoteTutteSaldate(pagamento.eventId, pagamento.userId)) {
      await prisma.eventRsvp.updateMany({
        where: { eventId: pagamento.eventId, userId: pagamento.userId, assegnazione: 'CONVOCATO' },
        data: { assegnazione: 'TITOLARE' },
      });
    }
    revalidatePath(`/calendario/${pagamento.eventId}`);
  }

  aggiorna();
  return { ok: 'Gestita fuori: per il gestionale è chiusa, e in cassa non entra niente.' };
}

/** Il ripensamento: la quota torna da incassare nel gestionale. */
export async function tornaDaGestire(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const pagamento = await prisma.payment.findUnique({ where: { id: str(fd, 'id') } });
  if (!pagamento) return { errore: 'Movimento non trovato.' };
  if (!(await puoGestireCassa(me, pagamento.cassaId))) {
    return { errore: 'Questo pagamento lo gestisce chi ne tiene la cassa.' };
  }
  if (pagamento.status !== 'NON_GESTITO') return { errore: 'Questa quota è già nel gestionale.' };

  await prisma.payment.update({
    where: { id: pagamento.id },
    data: { status: 'DA_PAGARE', recordedById: me.id },
  });
  if (pagamento.eventId) revalidatePath(`/calendario/${pagamento.eventId}`);

  aggiorna();
  return { ok: 'La quota torna da incassare nel gestionale.' };
}

/**
 * Soldi versati senza una quota di mezzo: entrano in cassa come credito della
 * persona, che li spende quando paga. Lo registra chi gestisce la cassa, con
 * uno dei suoi metodi.
 */
export async function registraCredito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const cassaId = strOpt(fd, 'cassaId');
  if (!(await puoGestireCassa(me, cassaId))) {
    return { errore: 'Il credito lo registra chi gestisce questa cassa.' };
  }

  const userId = str(fd, 'userId');
  if (!userId) return { errore: 'Scegli chi ha versato.' };
  const importo = num(fd, 'importo');
  if (importo === null || importo <= 0) return { errore: 'Indica quanto ha versato.' };
  const quando = data(fd, 'data') ?? new Date();
  if (quando > new Date()) return { errore: 'La data non può essere nel futuro.' };

  const metodoId = strOpt(fd, 'metodoId');
  if (metodoId) {
    const metodo = await prisma.metodoPagamento.findUnique({
      where: { id: metodoId },
      select: { cassaId: true },
    });
    if (!metodo || metodo.cassaId !== cassaId) return { errore: 'Quel metodo non è di questa cassa.' };
  }

  await prisma.movimentoCredito.create({
    data: {
      userId,
      cassaId,
      tipo: 'VERSAMENTO',
      importo,
      metodoId,
      descrizione: 'Versamento a credito',
      note: strOpt(fd, 'note'),
      data: quando,
      registratoDaId: me.id,
    },
  });

  const resta = await saldoCredito(userId, cassaId);
  aggiorna();
  return { ok: `Credito registrato: ora ne ha ${fmtEuro(resta)}, da spendere quando paga.` };
}

/**
 * Il credito restituito: la persona si riprende i soldi che non ha usato, e
 * quei soldi escono dalla cassa. Solo fino a quanto ne ha.
 */
export async function restituisciCredito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const cassaId = strOpt(fd, 'cassaId');
  if (!(await puoGestireCassa(me, cassaId))) {
    return { errore: 'Il credito lo restituisce chi gestisce questa cassa.' };
  }
  const userId = str(fd, 'userId');
  const credito = await saldoCredito(userId, cassaId);
  if (credito <= 0) return { errore: 'Non ha credito da restituire.' };
  const importo = num(fd, 'importo') ?? credito;
  if (importo <= 0) return { errore: 'Indica quanto restituisci.' };
  if (importo > credito + 0.001) {
    return { errore: `Il credito è di ${fmtEuro(credito)}: di più non si restituisce.` };
  }

  await prisma.movimentoCredito.create({
    data: {
      userId,
      cassaId,
      tipo: 'RESO',
      importo: -importo,
      metodoId: strOpt(fd, 'metodoId'),
      descrizione: 'Credito restituito',
      note: strOpt(fd, 'note'),
      registratoDaId: me.id,
    },
  });
  aggiorna();
  return { ok: `Restituiti ${fmtEuro(importo)}.` };
}

/**
 * Il credito passa a un'altra persona, nella stessa cassa.
 *
 * Lo fa chi lo possiede — «i miei 40 € li lascio a Pluto» — o chi tiene la
 * cassa, quando due si sono accordati fra loro: Zio Paperone prende il credito
 * di Pippo e lo passa a Pluto. Solo fino a quanto ce n'è; senza importo passa
 * tutto. Chi lo riceve è avvisato, e chi lo dà anche, se non l'ha fatto lui.
 */
export async function cediCredito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const cassaId = strOpt(fd, 'cassaId');
  const da = str(fd, 'daUserId') || me.id;
  const a = str(fd, 'aUserId');
  if (!a) return { errore: 'Scegli a chi passa il credito.' };
  if (a === da) return { errore: 'Chi lo riceve è la stessa persona che lo dà.' };
  const suo = da === me.id;
  if (!suo && !(await puoGestireCassa(me, cassaId))) {
    return { errore: 'Il credito di un altro lo sposta chi tiene la cassa.' };
  }

  const [chiDa, chiA] = await Promise.all([
    prisma.user.findUnique({
      where: { id: da },
      select: { nome: true, cognome: true, callsign: true },
    }),
    prisma.user.findUnique({
      where: { id: a },
      select: { nome: true, cognome: true, callsign: true, stato: true },
    }),
  ]);
  if (!chiDa || !chiA || chiA.stato === 'DISABILITATO' || chiA.stato === 'RIFIUTATO') {
    return { errore: 'Persona non trovata.' };
  }

  const credito = await saldoCredito(da, cassaId);
  if (credito <= 0) return { errore: 'Non c’è credito da passare in questa cassa.' };
  const importo = num(fd, 'importo') ?? credito;
  if (importo <= 0) return { errore: 'Indica quanto credito passa.' };
  if (importo > credito + 0.001) {
    return { errore: `Il credito è di ${fmtEuro(credito)}: di più non si passa.` };
  }

  const passato = await passaCredito({
    da,
    a,
    cassaId,
    importo,
    descrizione: `Credito passato da ${nomeCompleto(chiDa)} a ${nomeCompleto(chiA)}`,
    note: strOpt(fd, 'note'),
    registratoDaId: me.id,
  });
  if (passato <= 0) return { errore: 'Il credito nel frattempo è cambiato: riprova.' };

  await avvisaCreditoRicevuto({
    da,
    a,
    nomeDa: nomeCompleto(chiDa),
    nomeA: nomeCompleto(chiA),
    importo: passato,
    cassaId,
    perChi: me.id,
    cosa: 'del suo credito',
  });

  aggiorna();
  return { ok: `Passati ${fmtEuro(passato)} di credito a ${nomeCompleto(chiA)}.` };
}

/**
 * Chi riceve del credito lo deve sapere: la notifica a chi le ha accese, il
 * WhatsApp agli altri. Chi lo dà riceve due righe se a farlo non è stato lui.
 */
async function avvisaCreditoRicevuto(p: {
  da: string;
  a: string;
  nomeDa: string;
  nomeA: string;
  importo: number;
  cassaId: string | null;
  perChi: string;
  /** Cosa è passato: «la quota di «Op. X»», «del suo credito». */
  cosa: string;
}) {
  const cassa = p.cassaId
    ? await prisma.cassa.findUnique({ where: { id: p.cassaId }, select: { nome: true } })
    : null;
  const dove = cassa?.nome ?? (await marchio()).nome;
  const euro = fmtEuro(p.importo);
  const tag = `credito-ricevuto-${p.da}-${p.a}-${Date.now()}`;
  await avvisaPersona(p.a, {
    titolo: `Hai ricevuto ${euro} di credito`,
    testo: `${p.nomeDa} ti ha passato ${p.cosa}: ${euro} di credito presso ${dove}, da usare quando paghi le prossime quote di quella cassa.`,
    url: '/pagamenti#credito',
    tag,
    whatsapp: `Hai ricevuto del credito

${p.nomeDa} ti ha passato ${p.cosa}: ora hai ${euro} di credito in più presso ${dove}.

Lo usi quando paghi le prossime quote di quella cassa: te lo proponiamo per primo. Lo trovi in Miei pagamenti.`,
  }).catch(() => null);
  if (p.perChi !== p.da) {
    await avvisaPersona(p.da, {
      titolo: 'Il tuo credito è passato',
      testo: `${euro} presso ${dove} sono passati a ${p.nomeA}.`,
      url: '/pagamenti#credito',
      tag,
      whatsapp: `Il tuo credito è passato

${euro} presso ${dove} sono passati a ${p.nomeA}.`,
    }).catch(() => null);
  }
}

/**
 * Paga una quota col proprio credito: lo fa chi la deve, dalla finestra «Paga»,
 * o chi gestisce la cassa. Niente da confermare: i soldi sono già in cassa.
 */
export async function pagaColCredito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');
  const pagamento = await prisma.payment.findUnique({ where: { id } });
  if (!pagamento) return { errore: 'Quota non trovata.' };
  if (pagamento.userId !== me.id && !(await puoGestireCassa(me, pagamento.cassaId))) {
    return { errore: 'Col credito si pagano solo le proprie quote.' };
  }
  const usato = await pagaConCredito(id);
  aggiorna();
  if (usato <= 0) return { errore: 'Non c’è credito da usare, o la quota è già pagata.' };
  const dopo = await prisma.payment.findUnique({
    where: { id },
    select: { status: true, importo: true, pagato: true },
  });
  if (dopo?.status === 'PAGATO') return { ok: `Pagata col credito: ${fmtEuro(usato)}.` };
  return {
    ok: `${fmtEuro(usato)} pagati col credito: restano ${fmtEuro(
      Number(dopo?.importo ?? 0) - Number(dopo?.pagato ?? 0),
    )} da pagare con un altro metodo.`,
  };
}

/**
 * Una quota pagata diventa credito invece di essere rimborsata.
 *
 * Chi gestisce la cassa lo fa sempre — anche da una richiesta di rimborso, se
 * la persona preferisce tenere i soldi. Chi l'ha pagata lo fa da sé quando la
 * quota non gli serve più: l'attività è annullata, o non ci va.
 */
export async function trasformaInCredito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const esito = await quotaCheNonServe(me, str(fd, 'id'));
  if ('errore' in esito) return esito;
  const { pagamento } = esito;

  const credito = await quotaInCredito(pagamento.id, `${me.nome} ${me.cognome}`);
  aggiorna();
  if (pagamento.eventId) revalidatePath(`/calendario/${pagamento.eventId}`);
  return credito > 0
    ? { ok: `${fmtEuro(credito)} tenuti come credito: si spendono alla prossima quota.` }
    : { errore: 'Non c’era niente da trasformare in credito.' };
}

/**
 * La quota pagata che non serve più passa direttamente a un altro: la
 * scorciatoia di «tienila come credito» e poi «passa il credito». Diventa
 * credito di chi la riceve, nella cassa della quota, e lui la spende sulle
 * sue prossime quote di quella cassa.
 */
export async function passaQuota(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const a = str(fd, 'aUserId');
  if (!a) return { errore: 'Scegli a chi la passi.' };
  const esito = await quotaCheNonServe(me, str(fd, 'id'));
  if ('errore' in esito) return esito;
  const { pagamento } = esito;
  if (a === pagamento.userId) return { errore: 'È già sua: scegli un’altra persona.' };

  const [chiDa, chiA] = await Promise.all([
    prisma.user.findUnique({
      where: { id: pagamento.userId },
      select: { nome: true, cognome: true, callsign: true },
    }),
    prisma.user.findUnique({
      where: { id: a },
      select: { nome: true, cognome: true, callsign: true, stato: true },
    }),
  ]);
  if (!chiDa || !chiA || chiA.stato === 'DISABILITATO' || chiA.stato === 'RIFIUTATO') {
    return { errore: 'Persona non trovata.' };
  }

  const credito = await quotaInCredito(
    pagamento.id,
    `${me.nome} ${me.cognome}, passata a ${chiA.nome} ${chiA.cognome}`,
  );
  if (credito <= 0) return { errore: 'Non c’era niente da passare.' };
  const passato = await passaCredito({
    da: pagamento.userId,
    a,
    cassaId: pagamento.cassaId,
    importo: credito,
    descrizione: `«${pagamento.descrizione}» passata da ${nomeCompleto(chiDa)} a ${nomeCompleto(chiA)}`,
    registratoDaId: me.id,
  });
  aggiorna();
  if (pagamento.eventId) revalidatePath(`/calendario/${pagamento.eventId}`);
  if (passato <= 0) {
    return { errore: `${fmtEuro(credito)} sono tuo credito, ma non è stato possibile passarli: riprova da «Il tuo credito».` };
  }
  await avvisaCreditoRicevuto({
    da: pagamento.userId,
    a,
    nomeDa: nomeCompleto(chiDa),
    nomeA: nomeCompleto(chiA),
    importo: passato,
    cassaId: pagamento.cassaId,
    perChi: me.id,
    cosa: `la quota di «${pagamento.descrizione}»`,
  });
  return { ok: `${fmtEuro(passato)} passati a ${nomeCompleto(chiA)} come credito.` };
}

/**
 * La quota pagata che si può togliere dal suo posto: tenerla come credito,
 * o passarla a un altro. La propria, quando non serve più (attività
 * annullata, o non ci si va); chi tiene la cassa, sempre.
 */
async function quotaCheNonServe(
  me: Awaited<ReturnType<typeof requireUser>>,
  id: string,
): Promise<{ errore: string } | { pagamento: NonNullable<Awaited<ReturnType<typeof leggiQuota>>> }> {
  let pagamento = await prisma.payment.findUnique({
    where: { id },
    include: { event: { select: { status: true } } },
  });
  if (!pagamento) return { errore: 'Quota non trovata.' };

  // da una richiesta di rimborso si lavora sulla quota a cui si riferisce
  if (pagamento.tipo === 'RIMBORSO') {
    if (!pagamento.rimborsoDiId) return { errore: 'Questo rimborso non viene da una quota.' };
    pagamento = await prisma.payment.findUnique({
      where: { id: pagamento.rimborsoDiId },
      include: { event: { select: { status: true } } },
    });
    if (!pagamento) return { errore: 'La quota di questo rimborso non c’è più.' };
  }
  if (Number(pagamento.pagato) <= 0) return { errore: 'Su questa quota non è stato pagato niente.' };

  const gestisce = await puoGestireCassa(me, pagamento.cassaId);
  if (!gestisce) {
    if (pagamento.userId !== me.id) return { errore: 'Puoi farlo solo con le tue quote.' };
    const rsvp = pagamento.eventId
      ? await prisma.eventRsvp.findUnique({
          where: { eventId_userId: { eventId: pagamento.eventId, userId: me.id } },
          select: { status: true },
        })
      : null;
    const nonServe = pagamento.event?.status === 'ANNULLATA' || (pagamento.eventId && rsvp?.status !== 'PRESENTE');
    if (!nonServe) {
      return {
        errore:
          'La quota è di un’attività a cui partecipi: si può tenere come credito se l’attività è annullata o se non ci vai più.',
      };
    }
  }

  return { pagamento };
}

const leggiQuota = (id: string) =>
  prisma.payment.findUnique({ where: { id }, include: { event: { select: { status: true } } } });

/**
 * Un pagamento segnalato che non è arrivato: la segnalazione si annulla, con
 * il perché scritto.
 *
 * La quota torna com'era prima — da pagare, con «Paga» davanti alla persona —
 * e la ricevuta allegata se ne va con la segnalazione: raccontava un
 * pagamento che non c'è. Nelle note resta che la segnalazione c'era e chi
 * l'ha tolta, e la persona viene avvisata, perché altrimenti crederebbe di
 * aver pagato.
 */
export async function rifiutaSegnalazione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const pagamento = await prisma.payment.findUnique({ where: { id: str(fd, 'id') } });
  if (!pagamento) return { errore: 'Movimento non trovato.' };
  if (!(await puoGestireCassa(me, pagamento.cassaId))) {
    return { errore: 'Questo pagamento lo gestisce chi ne tiene la cassa.' };
  }
  if (!pagamento.dichiaratoIl || (pagamento.status !== 'DA_PAGARE' && pagamento.status !== 'PARZIALE')) {
    return { errore: 'Non c’è una segnalazione da togliere.' };
  }

  // il perché è obbligatorio: resta nelle note e arriva alla persona
  const motivo = strOpt(fd, 'motivo');
  if (!motivo) return { errore: 'Scrivi perché annulli il pagamento: lo legge anche chi l’aveva segnalato.' };

  const segnalato = pagamento.dichiaratoIl.toLocaleDateString('it-IT');
  const traccia = `Pagamento segnalato il ${segnalato} annullato: ${motivo} (${me.nome} ${me.cognome}, ${new Date().toLocaleDateString('it-IT')})`;
  await prisma.payment.update({
    where: { id: pagamento.id },
    data: {
      dichiaratoIl: null,
      allegatoPath: null,
      allegatoNome: null,
      allegatoTipo: null,
      allegatoTitolo: null,
      note: [pagamento.note, traccia].filter(Boolean).join(' · '),
    },
  });
  if (pagamento.allegatoPath) await eliminaAllegato(pagamento.allegatoPath).catch(() => null);

  await avvisaPersona(pagamento.userId, {
    titolo: 'Pagamento annullato',
    testo: `Il pagamento che avevi segnalato per «${pagamento.descrizione}» è stato annullato: ${motivo}. La quota è di nuovo da pagare.`,
    url: '/pagamenti',
    tag: `pagamento-${pagamento.id}`,
    whatsapp: `${(await marchio()).nomeGestionale} — pagamento annullato

Il pagamento che avevi segnalato il ${segnalato} per «${pagamento.descrizione}» (${fmtEuro(Number(pagamento.importo) - Number(pagamento.pagato))}) è stato annullato.
Motivo: ${motivo}

La quota è di nuovo da pagare: la trovi in Miei pagamenti. Se hai pagato davvero, scrivi a chi tiene la cassa.`,
  }).catch(() => null);

  aggiorna();
  if (pagamento.eventId) revalidatePath(`/calendario/${pagamento.eventId}`);
  return { ok: 'Pagamento annullato: la quota è di nuovo da pagare, e la persona è stata avvisata con il motivo.' };
}
