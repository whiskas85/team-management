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
  const voci = await prisma.tariffa.findMany({ where: { attiva: true }, orderBy: { nome: 'asc' } });
  return voci.map((t) => ({
    id: t.id,
    nome: t.nome,
    importo: Number(t.importo),
    usi: t.usi as string[],
    stagioneId: t.stagioneId,
  }));
}

/**
 * Una quota composta dal listino: la somma delle voci spuntate, con il
 * dettaglio di cosa la compone.
 *
 * Gli importi si rileggono sempre dal database, mai dal modulo, così nessuno
 * può farsi lo sconto ritoccando la pagina. Un importo scritto a mano ha la
 * precedenza sulla somma: è lì che si regala una giocata (0) o si chiede una
 * cifra tonda diversa dal listino.
 */
export async function componiQuota(
  fd: FormData,
  {
    voci: campoVoci,
    importo: campoImporto,
    stagioneId,
  }: { voci: string; importo: string; stagioneId: string | null },
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
      OR: [{ stagioneId: null }, ...(stagioneId ? [{ stagioneId }] : [])],
    },
    orderBy: { nome: 'asc' },
  });
  if (voci.length === 0) return { quota: aMano, dettaglio: null };

  const somma = voci.reduce((t, v) => t + Number(v.importo), 0);
  const spaccato = voci.map((v) => `${v.nome} ${Number(v.importo).toFixed(2)} €`).join(' + ');

  // se l'importo scritto a mano non è la somma delle voci il dettaglio da solo
  // mentirebbe: si dice che è stato forzato, invece di far tornare i conti a chi legge
  const forzato = aMano !== null && aMano !== somma;
  const dettaglio = forzato ? `${spaccato} · importo fissato a ${aMano.toFixed(2)} €` : spaccato;

  return { quota: aMano ?? somma, dettaglio };
}
