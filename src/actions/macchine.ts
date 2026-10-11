'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { avvisaPersona } from '@/lib/avvisi';
import { fmtDateTime, fmtEuro, nomeCompleto } from '@/lib/format';
import { data, enumOpt, enumVal, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';
import { caricaMacchina, nomeDi, ruoloIn } from '@/lib/macchine';
import { marchio } from '@/lib/mia-squadra';

/**
 * Le macchinate: chi mette la macchina, chi sale, dove si passa, e quanto si è
 * speso. Tutto quello che c'è qui è un aiuto ad organizzarsi: non tocca le
 * quote, le casse né le presenze.
 */

const MODI = ['PRENDO', 'RITROVO'] as const;
const TIPI_SPESA = ['CARBURANTE', 'CASELLO', 'ALTRO'] as const;

const pagina = (eventId: string, macchinaId?: string) => {
  revalidatePath(`/calendario/${eventId}`);
  if (macchinaId) revalidatePath(`/calendario/${eventId}/viaggio/${macchinaId}`);
  revalidatePath('/calendario');
  revalidatePath('/dashboard');
};

const linkViaggio = (eventId: string, id: string) => `/calendario/${eventId}/viaggio/${id}`;

/** Le attività su cui si organizzano ancora i viaggi: rilasciate e non finite. */
const viaggiAperti = (status: string) => status === 'RILASCIATA';

/** La macchina, e io che ci posso fare. */
async function miaMacchina(id: string) {
  const me = await requireUser();
  const m = await caricaMacchina(id);
  if (!m) return { me, m: null, ruolo: null, guida: false } as const;
  const ruolo = ruoloIn(m, me);
  // l'autista la gestisce; l'admin anche, per rimediare quando serve
  const guida = ruolo === 'autista' || ruolo === 'admin';
  return { me, m, ruolo, guida } as const;
}

// ------------------------------------------------------------ la macchina

/** Metto la macchina: nasce coi suggerimenti già scritti, e si va al viaggio. */
export async function creaMacchina(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const eventId = str(fd, 'eventId');
  const evento = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      rsvps: { where: { userId: me.id }, select: { status: true } },
    },
  });
  if (!evento) return { errore: 'Attività non trovata.' };
  if (!viaggiAperti(evento.status)) {
    return { errore: 'Questa attività non è aperta: i viaggi si organizzano prima.' };
  }
  const mia = evento.rsvps[0]?.status;
  if (mia !== 'PRESENTE' && mia !== 'FORSE') {
    return { errore: 'Prima di mettere la macchina segnati all’attività.' };
  }
  const giaSu = await prisma.passeggeroMacchina.findFirst({
    where: { userId: me.id, stato: 'ACCETTATO', macchina: { eventId } },
    include: { macchina: { include: { autista: true } } },
  });
  if (giaSu) {
    return {
      errore: `Hai già un passaggio con ${nomeDi(giaSu.macchina.autista)}: scendi da quella prima di mettere la tua.`,
    };
  }

  let id: string;
  try {
    const m = await prisma.macchina.create({
      data: {
        eventId,
        autistaId: me.id,
        modo: enumVal(fd, 'modo', MODI, 'RITROVO'),
        posti: intOpt(fd, 'posti'),
        partenza: strOpt(fd, 'partenza'),
        partenzaLat: num(fd, 'partenzaLat'),
        partenzaLng: num(fd, 'partenzaLng'),
        partenzaOra: data(fd, 'partenzaOra'),
        arrivo: strOpt(fd, 'arrivo'),
        arrivoLat: num(fd, 'arrivoLat'),
        arrivoLng: num(fd, 'arrivoLng'),
        arrivoOra: data(fd, 'arrivoOra'),
        note: strOpt(fd, 'note'),
      },
    });
    id = m.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { errore: 'Per questa attività hai già messo la macchina.' };
    }
    throw e;
  }
  // gli inviti per cui ero in attesa su altre macchine non hanno più senso
  await prisma.passeggeroMacchina.updateMany({
    where: { userId: me.id, stato: 'INVITATO', macchina: { eventId } },
    data: { stato: 'RIFIUTATO', rispostoIl: new Date() },
  });
  pagina(eventId, id);
  redirect(linkViaggio(eventId, id));
}

/** Cambia i dati della macchina: modo, posti, partenza, arrivo, note. */
export async function salvaMacchina(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (!guida) return { errore: 'La macchina la sistema chi guida.' };

  const modo = enumVal(fd, 'modo', MODI, m.modo);
  const posti = intOpt(fd, 'posti');
  const saliti = m.passeggeri.filter((p) => p.stato === 'ACCETTATO').length;
  if (posti !== null && posti < saliti) {
    return { errore: `A bordo ci sono già ${saliti} passeggeri: i posti non possono essere meno.` };
  }

  await prisma.$transaction(async (tx) => {
    // cambiando modo le tappe di prima non valgono più: in uno sono case, nell'altro ritrovi
    if (modo !== m.modo) {
      await tx.passeggeroMacchina.updateMany({
        where: { macchinaId: m.id },
        data: { tappaId: null },
      });
      await tx.tappaMacchina.deleteMany({ where: { macchinaId: m.id } });
    }
    await tx.macchina.update({
      where: { id: m.id },
      data: {
        modo,
        posti,
        partenza: strOpt(fd, 'partenza'),
        partenzaLat: num(fd, 'partenzaLat'),
        partenzaLng: num(fd, 'partenzaLng'),
        partenzaOra: data(fd, 'partenzaOra'),
        arrivo: strOpt(fd, 'arrivo'),
        arrivoLat: num(fd, 'arrivoLat'),
        arrivoLng: num(fd, 'arrivoLng'),
        arrivoOra: data(fd, 'arrivoOra'),
        note: strOpt(fd, 'note'),
      },
    });
  });

  if (modo !== m.modo && saliti > 0) {
    const nome = nomeDi(m.autista);
    for (const p of m.passeggeri.filter((p) => p.stato === 'ACCETTATO')) {
      await avvisaPersona(p.userId, {
        titolo: `Viaggio per ${m.event.titolo}`,
        testo:
          modo === 'PRENDO'
            ? `${nome} passa a prenderti: digli dove.`
            : `${nome} ha cambiato: ci si trova a un punto di ritrovo.`,
        url: linkViaggio(m.eventId, m.id),
        tag: `viaggio-${m.id}`,
      }).catch(() => null);
    }
  }
  pagina(m.eventId, m.id);
  return {
    ok:
      modo !== m.modo
        ? 'Salvato. Cambiando modo le tappe sono ripartite da zero.'
        : 'Macchina aggiornata.',
  };
}

/** Tolgo la macchina: i passeggeri restano a piedi, e lo sanno. */
export async function eliminaMacchina(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (!guida) return { errore: 'La macchina la toglie chi guida.' };

  await prisma.macchina.delete({ where: { id: m.id } });
  const nome = nomeDi(m.autista);
  for (const p of m.passeggeri.filter((p) => p.stato !== 'RIFIUTATO')) {
    await avvisaPersona(p.userId, {
      titolo: `Niente passaggio per ${m.event.titolo}`,
      testo: `${nome} non porta più la macchina: cerca un altro passaggio.`,
      url: `/calendario/${m.eventId}`,
      tag: `viaggio-${m.id}`,
      whatsapp: `Niente passaggio per ${m.event.titolo}

${nome} non porta più la macchina: cerca un altro passaggio.`,
    }).catch(() => null);
  }
  pagina(m.eventId);
  redirect(`/calendario/${m.eventId}`);
}

// ------------------------------------------------------------ i passeggeri

/** Invito dei compagni: ognuno riceve l'avviso e risponde dalla pagina del viaggio. */
export async function invitaPasseggeri(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (!guida) return { errore: 'I passeggeri li invita chi guida.' };
  if (!viaggiAperti(m.event.status)) return { errore: 'L’attività non è più aperta.' };

  const scelti = [...new Set(fd.getAll('userId').map(String).filter(Boolean))].filter(
    (u) => u !== m.autistaId,
  );
  if (scelti.length === 0) return { errore: 'Scegli chi invitare.' };

  const giaQui = new Map(m.passeggeri.map((p) => [p.userId, p]));
  const altrove = await prisma.passeggeroMacchina.findMany({
    where: {
      userId: { in: scelti },
      stato: 'ACCETTATO',
      macchina: { eventId: m.eventId, id: { not: m.id } },
    },
    select: { userId: true },
  });
  const autisti = await prisma.macchina.findMany({
    where: { eventId: m.eventId, autistaId: { in: scelti } },
    select: { autistaId: true },
  });
  const occupati = new Set([...altrove.map((a) => a.userId), ...autisti.map((a) => a.autistaId)]);

  const nuovi = scelti.filter(
    (u) => !occupati.has(u) && (!giaQui.has(u) || giaQui.get(u)!.stato === 'RIFIUTATO'),
  );
  if (nuovi.length === 0) {
    return { errore: 'Sono già tutti invitati, o hanno già un passaggio.' };
  }

  for (const u of nuovi) {
    await prisma.passeggeroMacchina.upsert({
      where: { macchinaId_userId: { macchinaId: m.id, userId: u } },
      create: { macchinaId: m.id, userId: u },
      update: { stato: 'INVITATO', invitatoIl: new Date(), rispostoIl: null, tappaId: null },
    });
  }

  const nome = nomeDi(m.autista);
  const quando = fmtDateTime(m.event.inizio);
  const sito = (await marchio()).nomeGestionale;
  for (const u of nuovi) {
    await avvisaPersona(u, {
      titolo: `Passaggio per ${m.event.titolo}`,
      testo: `${nome} ti offre un posto in macchina. Rispondi dal gestionale.`,
      url: linkViaggio(m.eventId, m.id),
      tag: `viaggio-${m.id}`,
      whatsapp: `${sito} — passaggio per ${m.event.titolo} (${quando})

${nome} ti offre un posto in macchina. Rispondi dal gestionale, nella pagina dell'attività.`,
    }).catch(() => null);
  }

  pagina(m.eventId, m.id);
  const saltati = scelti.length - nuovi.length;
  return {
    ok:
      `${nuovi.length === 1 ? 'Invito mandato' : `${nuovi.length} inviti mandati`}.` +
      (saltati > 0 ? ` ${saltati} saltati: già invitati o con un altro passaggio.` : ''),
  };
}

/**
 * La risposta di un passeggero.
 *
 * Nel modo «passo a prenderti» accettare vuol dire anche dire **dove**: il
 * profilo suggerisce casa, ma si sceglie, e si conferma di volerlo far sapere
 * all'autista. Lo stesso modulo serve a cambiare il punto dopo.
 */
export async function rispondiPassaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { me, m } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  const io = m.passeggeri.find((p) => p.userId === me.id);
  if (!io || io.stato === 'RIFIUTATO') return { errore: 'Non sei invitato su questa macchina.' };

  const accetta = str(fd, 'accetta') === '1';
  const nome = nomeCompleto(io.user);

  if (!accetta) {
    await prisma.$transaction(async (tx) => {
      await tx.passeggeroMacchina.update({
        where: { id: io.id },
        data: { stato: 'RIFIUTATO', rispostoIl: new Date(), tappaId: null },
      });
      // la sua tappa a casa sua non serve più
      if (m.modo === 'PRENDO' && io.tappaId) {
        await tx.tappaMacchina.delete({ where: { id: io.tappaId } }).catch(() => null);
      }
    });
    await avvisaPersona(m.autistaId, {
      titolo: `Viaggio per ${m.event.titolo}`,
      testo:
        io.stato === 'ACCETTATO'
          ? `${nome} non sale più in macchina.`
          : `${nome} non viene in macchina.`,
      url: linkViaggio(m.eventId, m.id),
      tag: `viaggio-${m.id}`,
    }).catch(() => null);
    pagina(m.eventId, m.id);
    return { ok: io.stato === 'ACCETTATO' ? 'Sei sceso dalla macchina.' : 'Risposta mandata.' };
  }

  if (!viaggiAperti(m.event.status)) return { errore: 'L’attività non è più aperta.' };

  if (io.stato === 'INVITATO') {
    const altro = await prisma.passeggeroMacchina.findFirst({
      where: {
        userId: me.id,
        stato: 'ACCETTATO',
        macchina: { eventId: m.eventId, id: { not: m.id } },
      },
      include: { macchina: { include: { autista: true } } },
    });
    if (altro) {
      return {
        errore: `Sei già in macchina con ${nomeDi(altro.macchina.autista)}: scendi da quella prima.`,
      };
    }
    const guido = await prisma.macchina.findFirst({
      where: { eventId: m.eventId, autistaId: me.id },
    });
    if (guido)
      return { errore: 'Per questa attività guidi tu: non puoi salire su un’altra macchina.' };
    const saliti = m.passeggeri.filter((p) => p.stato === 'ACCETTATO').length;
    if (m.posti !== null && saliti >= m.posti) return { errore: 'La macchina è piena.' };
  }

  // dove sale: nel modo PRENDO lo dice lui, con il suo consenso
  let tappa: { luogo: string; lat: number | null; lng: number | null } | null = null;
  if (m.modo === 'PRENDO') {
    const luogo = str(fd, 'dove');
    if (!luogo) return { errore: 'Scrivi dove passare a prenderti.' };
    if (str(fd, 'consenso') !== 'on') {
      return {
        errore: 'Per farti passare a prendere, l’autista deve sapere dove: spunta la conferma.',
      };
    }
    tappa = { luogo, lat: num(fd, 'doveLat'), lng: num(fd, 'doveLng') };
  }

  await prisma.$transaction(async (tx) => {
    let tappaId = io.tappaId;
    if (tappa) {
      if (tappaId) {
        await tx.tappaMacchina.update({ where: { id: tappaId }, data: tappa });
      } else {
        const ultima = await tx.tappaMacchina.aggregate({
          where: { macchinaId: m.id },
          _max: { ordine: true },
        });
        const t = await tx.tappaMacchina.create({
          data: { macchinaId: m.id, ordine: (ultima._max.ordine ?? -1) + 1, ...tappa },
        });
        tappaId = t.id;
      }
    } else if (!tappaId && m.tappe.length === 1) {
      // un ritrovo solo: si va lì, senza che l'autista debba spuntarlo
      tappaId = m.tappe[0].id;
    }
    await tx.passeggeroMacchina.update({
      where: { id: io.id },
      data: { stato: 'ACCETTATO', rispostoIl: io.rispostoIl ?? new Date(), tappaId },
    });
    // gli altri inviti per la stessa attività decadono: un posto basta
    if (io.stato === 'INVITATO') {
      await tx.passeggeroMacchina.updateMany({
        where: {
          userId: me.id,
          stato: 'INVITATO',
          macchina: { eventId: m.eventId, id: { not: m.id } },
        },
        data: { stato: 'RIFIUTATO', rispostoIl: new Date() },
      });
    }
  });

  if (io.stato === 'INVITATO') {
    await avvisaPersona(m.autistaId, {
      titolo: `Viaggio per ${m.event.titolo}`,
      testo:
        m.modo === 'PRENDO'
          ? `${nome} sale in macchina: la sua tappa è nell'itinerario.`
          : `${nome} sale in macchina.`,
      url: linkViaggio(m.eventId, m.id),
      tag: `viaggio-${m.id}`,
    }).catch(() => null);
  }
  pagina(m.eventId, m.id);
  return {
    ok: io.stato === 'INVITATO' ? 'Sei in macchina.' : 'Fatto: il punto è aggiornato.',
  };
}

/** L'autista fa scendere qualcuno, o ritira un invito. */
export async function togliPasseggero(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (!guida) return { errore: 'Lo può fare solo chi guida.' };
  const p = m.passeggeri.find((x) => x.userId === str(fd, 'userId'));
  if (!p) return { errore: 'Non è su questa macchina.' };

  await prisma.$transaction(async (tx) => {
    await tx.passeggeroMacchina.delete({ where: { id: p.id } });
    if (m.modo === 'PRENDO' && p.tappaId) {
      await tx.tappaMacchina.delete({ where: { id: p.tappaId } }).catch(() => null);
    }
  });
  if (p.stato !== 'RIFIUTATO') {
    await avvisaPersona(p.userId, {
      titolo: `Viaggio per ${m.event.titolo}`,
      testo: `${nomeDi(m.autista)} non ti porta più: cerca un altro passaggio.`,
      url: `/calendario/${m.eventId}`,
      tag: `viaggio-${m.id}`,
    }).catch(() => null);
  }
  pagina(m.eventId, m.id);
  return { ok: `${nomeCompleto(p.user)} non è più sulla macchina.` };
}

// ------------------------------------------------------------ le tappe

/** I passeggeri spuntati vanno su questa tappa; quelli tolti restano da assegnare. */
async function assegna(
  tx: Prisma.TransactionClient,
  macchinaId: string,
  tappaId: string,
  userIds: string[],
) {
  await tx.passeggeroMacchina.updateMany({
    where: { macchinaId, tappaId, userId: { notIn: userIds } },
    data: { tappaId: null },
  });
  await tx.passeggeroMacchina.updateMany({
    where: { macchinaId, userId: { in: userIds }, stato: 'ACCETTATO' },
    data: { tappaId },
  });
}

/** Un punto di ritrovo nuovo, con chi ci si trova. */
export async function aggiungiTappa(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (!guida) return { errore: 'Le tappe le decide chi guida.' };
  if (m.modo !== 'RITROVO')
    return { errore: 'Nel modo «passo a prenderli» le tappe sono le case dei passeggeri.' };
  const luogo = str(fd, 'luogo');
  if (!luogo) return { errore: 'Scrivi dov’è il ritrovo.' };

  await prisma.$transaction(async (tx) => {
    const ultima = await tx.tappaMacchina.aggregate({
      where: { macchinaId: m.id },
      _max: { ordine: true },
    });
    const t = await tx.tappaMacchina.create({
      data: {
        macchinaId: m.id,
        ordine: (ultima._max.ordine ?? -1) + 1,
        luogo,
        lat: num(fd, 'luogoLat'),
        lng: num(fd, 'luogoLng'),
        ora: data(fd, 'ora'),
      },
    });
    await assegna(tx, m.id, t.id, fd.getAll('userId').map(String));
  });
  pagina(m.eventId, m.id);
  return { ok: 'Ritrovo aggiunto.' };
}

/** Cambia una tappa: dove, a che ora e — se è un ritrovo — chi ci si trova. */
export async function modificaTappa(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (!guida) return { errore: 'Le tappe le decide chi guida.' };
  const t = m.tappe.find((x) => x.id === str(fd, 'tappaId'));
  if (!t) return { errore: 'Tappa non trovata.' };
  const luogo = str(fd, 'luogo');
  if (!luogo) return { errore: 'Scrivi dov’è la tappa.' };

  await prisma.$transaction(async (tx) => {
    await tx.tappaMacchina.update({
      where: { id: t.id },
      data: { luogo, lat: num(fd, 'luogoLat'), lng: num(fd, 'luogoLng'), ora: data(fd, 'ora') },
    });
    if (m.modo === 'RITROVO') await assegna(tx, m.id, t.id, fd.getAll('userId').map(String));
  });
  pagina(m.eventId, m.id);
  return { ok: 'Tappa aggiornata.' };
}

export async function eliminaTappa(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (!guida) return { errore: 'Le tappe le decide chi guida.' };
  if (m.modo === 'PRENDO') {
    return { errore: 'È la tappa di un passeggero: per toglierla fallo scendere.' };
  }
  await prisma.tappaMacchina.deleteMany({ where: { id: str(fd, 'tappaId'), macchinaId: m.id } });
  pagina(m.eventId, m.id);
  return { ok: 'Ritrovo tolto: chi era lì resta da assegnare.' };
}

/** L'ordine delle tappe, trascinando. */
export async function riordinaTappe(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (!guida) return { errore: 'Le tappe le decide chi guida.' };
  const ids = str(fd, 'ids').split(',').filter(Boolean);
  const mie = new Set(m.tappe.map((t) => t.id));
  if (ids.some((i) => !mie.has(i))) return { errore: 'Tappe non riconosciute.' };
  await prisma.$transaction(
    ids.map((tid, i) => prisma.tappaMacchina.update({ where: { id: tid }, data: { ordine: i } })),
  );
  pagina(m.eventId, m.id);
  return {};
}

// ------------------------------------------------------------ i costi

/** Il costo vero del viaggio: chilometri, consumo, prezzo, caselli. */
export async function salvaCostiViaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (!guida) return { errore: 'I costi del viaggio li scrive chi guida.' };
  const km = intOpt(fd, 'km');
  const consumo = num(fd, 'consumo');
  const prezzo = num(fd, 'prezzoLitro');
  const caselli = num(fd, 'caselli');
  if ([km, consumo, prezzo, caselli].some((v) => v !== null && v < 0)) {
    return { errore: 'Niente numeri negativi.' };
  }
  await prisma.macchina.update({
    where: { id: m.id },
    data: { km, consumo, prezzoLitro: prezzo, caselli },
  });
  pagina(m.eventId, m.id);
  return { ok: 'Costi del viaggio aggiornati.' };
}

/** Ho pagato io: un pieno, un casello, il parcheggio. */
export async function aggiungiSpesaViaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { me, m, ruolo, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  if (ruolo !== 'autista' && ruolo !== 'passeggero' && ruolo !== 'admin') {
    return { errore: 'Le spese le segna chi era a bordo.' };
  }
  const tipo = enumOpt(fd, 'tipo', TIPI_SPESA);
  if (!tipo) return { errore: 'Scegli cosa hai pagato.' };
  const importo = num(fd, 'importo');
  if (importo === null || importo <= 0) return { errore: 'Scrivi quanto.' };
  // l'autista può segnare anche per gli altri: è lui che tiene il conto
  const chi = guida ? str(fd, 'userId') || me.id : me.id;
  const bordo = [
    m.autistaId,
    ...m.passeggeri.filter((p) => p.stato === 'ACCETTATO').map((p) => p.userId),
  ];
  if (!bordo.includes(chi)) return { errore: 'Può pagare solo chi era a bordo.' };

  await prisma.spesaViaggio.create({
    data: { macchinaId: m.id, userId: chi, tipo, importo, note: strOpt(fd, 'note') },
  });
  pagina(m.eventId, m.id);
  return { ok: `Segnato: ${fmtEuro(importo)}.` };
}

export async function eliminaSpesaViaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const { me, m, guida } = await miaMacchina(str(fd, 'id'));
  if (!m) return { errore: 'Macchina non trovata.' };
  const s = m.spese.find((x) => x.id === str(fd, 'spesaId'));
  if (!s) return { errore: 'Spesa non trovata.' };
  if (!guida && s.userId !== me.id) return { errore: 'Puoi togliere solo le tue spese.' };
  await prisma.spesaViaggio.delete({ where: { id: s.id } });
  pagina(m.eventId, m.id);
  return { ok: 'Spesa tolta.' };
}
