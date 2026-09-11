import type { StatoOperatore } from '@prisma/client';
import { prisma } from './db';
import { vedeAttivitaSquadra } from './domain';
import { num } from './form';

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
  }));
}

/**
 * Le voci spuntate che vanno ad altre casse, cassa per cassa.
 *
 * Su un'attività una voce del corso di Mario non si somma alla quota del
 * club: diventa la quota della sua cassa, con il nome delle voci come
 * descrizione. Come per il club, gli importi si rileggono dal database.
 */
export async function vociDiAltreCasse(
  fd: FormData,
  {
    voci: campoVoci,
    stagioneId,
    giorni = 1,
  }: { voci: string; stagioneId: string | null; giorni?: number },
): Promise<Map<string, { importo: number; descrizione: string }>> {
  const perCassa = new Map<string, { importo: number; descrizione: string }>();
  const ids = fd
    .getAll(campoVoci)
    .map((v) => v.toString())
    .filter(Boolean);
  if (ids.length === 0) return perCassa;

  const voci = await prisma.tariffa.findMany({
    where: {
      id: { in: ids },
      attiva: true,
      cassaId: { not: null },
      OR: [{ stagioneId: null }, ...(stagioneId ? [{ stagioneId }] : [])],
    },
    orderBy: { nome: 'asc' },
  });
  for (const v of voci) {
    const volte = v.perGiorno ? giorni : 1;
    const nome = v.nome + (volte > 1 ? ` × ${volte} giorni` : '');
    const gia = perCassa.get(v.cassaId!);
    perCassa.set(v.cassaId!, {
      importo: (gia?.importo ?? 0) + Number(v.importo) * volte,
      descrizione: gia ? `${gia.descrizione} + ${nome}` : nome,
    });
  }
  return perCassa;
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
