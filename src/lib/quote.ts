import type { StatoOperatore } from '@prisma/client';
import { prisma } from './db';
import { vedeAttivitaSquadra } from './domain';
import { num } from './form';
import { quoteTutteSaldate } from './casse';
import { giorniDi } from './giorni';

/**
 * Quanto costa un'attività a una certa persona.
 *
 * Chi è in squadra paga la quota interna, chi non lo è quella esterni. Se la
 * quota esterni non è stata impostata paga come la squadra; se è zero la
 * giocata gli è stata offerta, ed è cosa diversa dal non averla decisa.
 */
export function quotaPer(
  evento: {
    costo: unknown;
    costoEsterni: unknown;
    dettaglioCosto?: string | null;
    dettaglioCostoEsterni?: string | null;
  },
  stato: StatoOperatore | null | undefined,
): { importo: number; dettaglio: string | null } {
  const cifra = (v: unknown) => (v === null || v === undefined ? null : Number(v));

  const squadra = { importo: cifra(evento.costo) ?? 0, dettaglio: evento.dettaglioCosto ?? null };
  if (!stato || vedeAttivitaSquadra(stato)) return squadra;

  const esterni = cifra(evento.costoEsterni);
  return esterni === null
    ? squadra
    : { importo: esterni, dettaglio: evento.dettaglioCostoEsterni ?? null };
}

/**
 * Il nome della quota aggiunta quando si sceglie «Nessuna quota» per chi viene
 * da fuori: zero euro, spuntata, e senza polizza. Si scrive come quota e non
 * come prezzo vuoto perché il modulo dell'attività la ritrovi com'era — un
 * prezzo vuoto, là, vuol dire «pagano come la squadra».
 */
export const NESSUNA_QUOTA = 'Nessuna quota';

/**
 * Il listino da mettere davanti a chi compone una quota: tutte le voci attive,
 * di ogni stagione. Quali valgano lo decide il modulo, che sa in che stagione
 * si sta lavorando.
 */
export async function listinoAttivo() {
  const voci = await prisma.tariffa.findMany({
    where: { attiva: true },
    orderBy: { nome: 'asc' },
    include: { cassa: { select: { nome: true } } },
  });
  return voci.map((t) => ({
    id: t.id,
    nome: t.nome,
    importo: Number(t.importo),
    usi: t.usi as string[],
    stagioneId: t.stagioneId,
    perGiorno: t.perGiorno,
    // di chi sono i soldi: vuota, del club
    cassaId: t.cassaId,
    cassa: t.cassa?.nome ?? null,
    perPolizza: t.perPolizza,
  }));
}

/** Le voci spuntate in un campo del modulo, come vanno salvate. */
export const vociSpuntate = (fd: FormData, campo: string) =>
  fd
    .getAll(campo)
    .map((v) => v.toString())
    .filter(Boolean);

/** Una riga di quota: una voce spuntata, con quanto vale su questa attività. */
export type RigaQuota = { nome: string; importo: number };

/** Una quota aggiunta con il + nel modulo, com'è arrivata dal browser. */
export type VoceAggiunta = {
  id: string | null;
  nome: string;
  importo: number;
  cassaId: string | null;
  scelta: boolean;
  perEsterni: boolean;
  /** Paga la polizza giornaliera. */
  perPolizza: boolean;
};

/** Le quote di un'attività come le ha lasciate il modulo, cassa per cassa. */
export type QuoteAttivita = {
  /** Quali card il modulo ha mostrato: quella nascosta non si tocca. */
  lati: { squadra: boolean; esterni: boolean };
  /** Le voci del tariffario spuntate, per riaprire il modulo com'era. */
  tariffe: { squadra: string[]; esterni: string[] };
  aggiunte: VoceAggiunta[];
  /** Le righe di ogni cassa; `null` è il club. */
  squadra: Map<string | null, RigaQuota[]>;
  esterni: Map<string | null, RigaQuota[]>;
};

/** Quanto fanno le righe di una cassa; nulla se non ce n'è nessuna. */
export const sommaRighe = (righe: RigaQuota[] | undefined) =>
  righe && righe.length > 0 ? righe.reduce((t, r) => t + r.importo, 0) : null;

/** «Costo Partita 10.00 € + Istruttore 30.00 €»: di cosa è fatta. */
export const spaccatoRighe = (righe: RigaQuota[] | undefined) =>
  righe && righe.length > 0
    ? righe.map((r) => `${r.nome} ${r.importo.toFixed(2)} €`).join(' + ')
    : null;

/**
 * Legge le quote dal modulo di un'attività.
 *
 * Nelle due card — squadra ed esterni — si spuntano le voci del tariffario,
 * di qualsiasi cassa, e quelle aggiunte con il +. Qui ognuna finisce nella
 * cassa a cui va: quelle del club fanno la quota di sempre, quelle di Marco la
 * quota di Marco. Gli importi del tariffario si rileggono dal database, mai dal
 * modulo; le voci «al giorno» contano per ogni giorno dell'attività.
 */
export async function leggiQuoteAttivita(
  fd: FormData,
  stagioneId: string | null,
  giorni: number,
): Promise<QuoteAttivita> {
  const lati = { squadra: fd.has('quote_squadra'), esterni: fd.has('quote_esterni') };
  const tariffe = {
    squadra: lati.squadra ? vociSpuntate(fd, 'tariffeSquadra') : [],
    esterni: lati.esterni ? vociSpuntate(fd, 'tariffeEsterni') : [],
  };

  const casseValide = new Set(
    (await prisma.cassa.findMany({ select: { id: true } })).map((c) => c.id),
  );
  const aggiunte: VoceAggiunta[] = [];
  for (const lato of ['squadra', 'esterni'] as const) {
    if (!lati[lato]) continue;
    for (const grezza of vociSpuntate(fd, `vociAttivita_${lato}`)) {
      try {
        const v = JSON.parse(grezza) as Record<string, unknown>;
        const nome = String(v.nome ?? '').trim();
        const importo = Number(v.importo);
        if (!nome || !Number.isFinite(importo) || importo < 0) continue;
        aggiunte.push({
          id: typeof v.id === 'string' && v.id ? v.id : null,
          nome,
          importo,
          cassaId: typeof v.cassaId === 'string' && casseValide.has(v.cassaId) ? v.cassaId : null,
          scelta: v.scelta !== false,
          perEsterni: lato === 'esterni',
          perPolizza: v.perPolizza === true,
        });
      } catch {
        // una riga illeggibile si salta: non deve far perdere le altre
      }
    }
  }

  const listino = await prisma.tariffa.findMany({
    where: {
      id: { in: [...tariffe.squadra, ...tariffe.esterni] },
      attiva: true,
      OR: [{ stagioneId: null }, ...(stagioneId ? [{ stagioneId }] : [])],
    },
    orderBy: { nome: 'asc' },
  });

  const righe = (lato: 'squadra' | 'esterni') => {
    const perCassa = new Map<string | null, RigaQuota[]>();
    const metti = (cassaId: string | null, r: RigaQuota) =>
      perCassa.set(cassaId, [...(perCassa.get(cassaId) ?? []), r]);
    for (const t of listino) {
      if (!tariffe[lato].includes(t.id)) continue;
      const volte = t.perGiorno ? giorni : 1;
      metti(t.cassaId, {
        nome: t.nome + (volte > 1 ? ` × ${volte} giorni` : ''),
        importo: Number(t.importo) * volte,
      });
    }
    for (const a of aggiunte) {
      if (a.scelta && a.perEsterni === (lato === 'esterni')) {
        metti(a.cassaId, { nome: a.nome, importo: a.importo });
      }
    }
    return perCassa;
  };

  return { lati, tariffe, aggiunte, squadra: righe('squadra'), esterni: righe('esterni') };
}

/**
 * Una quota composta dal listino: la somma delle voci spuntate, con il
 * dettaglio di cosa la compone.
 *
 * Gli importi si rileggono sempre dal database, mai dal modulo, così nessuno
 * può farsi lo sconto ritoccando la pagina.
 *
 * Sulle attività l'importo scritto a mano **si somma** alle voci: 40 € di corso
 * più la voce «Costo Partita» da 10 fanno 50, che è come lo legge chi lo
 * scrive. Prima vinceva sulla somma, e il dettaglio diceva «importo fissato a
 * 40» mentre chi l'aveva composto si aspettava 50. Zero senza voci resta il modo
 * di regalare una giocata. Le iscrizioni tengono la regola di prima — lì
 * l'importo scritto a mano sostituisce lo spaccato — ed è per questo che è
 * un'opzione e non il comportamento di tutti.
 */
export async function componiQuota(
  fd: FormData,
  {
    voci: campoVoci,
    importo: campoImporto,
    stagioneId,
    giorni = 1,
    sommaAMano = false,
    cassaId = null,
  }: {
    voci: string;
    importo: string;
    stagioneId: string | null;
    /** Quanti giorni occupa l'attività: le voci «al giorno» contano per ognuno. */
    giorni?: number;
    /** L'importo scritto a mano si aggiunge alle voci invece di sostituirle. */
    sommaAMano?: boolean;
    /**
     * Di quale cassa: vuota, il club. Le voci delle altre casse qui restano
     * fuori — sulle attività diventano la loro quota, con `vociDiAltreCasse`.
     */
    cassaId?: string | null;
  },
): Promise<{ quota: number | null; dettaglio: string | null }> {
  const aMano = num(fd, campoImporto);
  const ids = fd
    .getAll(campoVoci)
    .map((v) => v.toString())
    .filter(Boolean);

  if (ids.length === 0) return { quota: aMano, dettaglio: null };

  const voci = await prisma.tariffa.findMany({
    where: {
      id: { in: ids },
      attiva: true,
      cassaId,
      OR: [{ stagioneId: null }, ...(stagioneId ? [{ stagioneId }] : [])],
    },
    orderBy: { nome: 'asc' },
  });
  if (voci.length === 0) return { quota: aMano, dettaglio: null };

  // una voce «al giorno» conta una volta per ogni giorno: la giornaliera vale
  // un giorno, e una 24 ore da sabato a domenica ne consuma due. Nel dettaglio
  // la moltiplicazione si scrive, così chi legge la quota sa da dove viene
  const volte = (v: { perGiorno: boolean }) => (v.perGiorno ? giorni : 1);
  const somma = voci.reduce((t, v) => t + Number(v.importo) * volte(v), 0);
  const spaccato = voci
    .map(
      (v) =>
        `${v.nome} ${Number(v.importo).toFixed(2)} €` +
        (volte(v) > 1 ? ` × ${volte(v)} giorni` : ''),
    )
    .join(' + ');

  // sulle attività l'importo scritto a mano si aggiunge alle voci, e il
  // dettaglio lo mette in testa: chi legge la quota rifà il conto da solo
  if (sommaAMano) {
    if (aMano === null || aMano === 0) return { quota: somma, dettaglio: spaccato };
    return { quota: aMano + somma, dettaglio: `importo ${aMano.toFixed(2)} € + ${spaccato}` };
  }

  // altrove l'importo scritto a mano sostituisce la somma: se non coincide il
  // dettaglio da solo mentirebbe, e si dice che è stato fissato
  const forzato = aMano !== null && aMano !== somma;
  const dettaglio = forzato ? `${spaccato} · importo fissato a ${aMano.toFixed(2)} €` : spaccato;

  return { quota: aMano ?? somma, dettaglio };
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
export async function salvaQuoteCasse(eventId: string, quote: QuoteAttivita) {
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
export async function togliQuotaCassa(quota: { id: string; eventId: string; cassaId: string }) {
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
 * Quanto costa il kit a noleggio su un'attività, e in che cassa entra.
 *
 * Lo dice il Tariffario: le voci attive con l'uso «Noleggio attrezzatura»,
 * quelle della stagione dell'attività se ce ne sono, altrimenti quelle senza
 * stagione. Una voce «per giorno» conta una volta per ogni giorno di gioco.
 * Null se nel listino il noleggio non c'è: senza prezzo non si offre.
 */
export async function prezzoNoleggio(evento: {
  stagioneId: string | null;
  inizio: Date;
  fine: Date | null;
}): Promise<{ importo: number; cassaId: string | null } | null> {
  const voci = await prisma.tariffa.findMany({
    where: { attiva: true, usi: { has: 'AFFITTO' } },
    select: { importo: true, perGiorno: true, stagioneId: true, cassaId: true },
  });
  const diStagione = voci.filter((v) => evento.stagioneId && v.stagioneId === evento.stagioneId);
  const valide = diStagione.length ? diStagione : voci.filter((v) => !v.stagioneId);
  if (valide.length === 0) return null;
  const giorni = giorniDi(evento.inizio, evento.fine).length || 1;
  const importo = valide.reduce((t, v) => t + Number(v.importo) * (v.perGiorno ? giorni : 1), 0);
  return { importo: Math.round(importo * 100) / 100, cassaId: valide[0].cassaId };
}
