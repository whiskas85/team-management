import { prisma } from './db';
import { chiaveGiorno } from './giorni';

/**
 * Le assicurazioni giornaliere (polizza prova FIGT) viste da chi è assicurato.
 *
 * **Quanto vale.** Fino a `valeIl`, se il portale l'ha scritto; altrimenti il
 * giorno solare della copertura, fino a mezzanotte. Finché vale conta nel
 * pallino del menu e sta fra le valide; dopo va nello storico, da sola.
 */

/** Il giorno coperto, «2026-10-17»: è una data senza ora, salvata così. */
const giornoDi = (g: { giorno: Date }) => g.giorno.toISOString().slice(0, 10);

export function valeAncora(g: { giorno: Date; valeIl: Date | null }, adesso = new Date()) {
  return g.valeIl ? g.valeIl > adesso : giornoDi(g) >= chiaveGiorno(adesso);
}

/** Quante delle mie assicurazioni valgono adesso (o valgono per un giorno che deve venire). */
export async function assicurazioniValide(userId: string): Promise<number> {
  const ieri = new Date(Date.now() - 2 * 86_400_000);
  const righe = await prisma.tesseraGiornaliera.findMany({
    where: { userId, stato: 'ASSICURATO', giorno: { gte: ieri } },
    select: { giorno: true, valeIl: true },
  });
  return righe.filter((r) => valeAncora(r)).length;
}
