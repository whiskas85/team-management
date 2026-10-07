import { prisma } from './db';
import { decifra } from './segreti';
import { affiliazioneValida, scopriAssociazione, type AffiliazionePortale } from './figt';

/**
 * Le affiliazioni FIGT conservate qui, e il codice giusto per un giorno.
 *
 * L'associazione rinnova l'affiliazione ogni anno, e ogni anno il codice
 * cambia: le polizze prova vogliono quello valido il giorno della giocata. Lo
 * si ricava dalle date di validità, non lo si chiede a nessuno.
 */

/** Le affiliazioni lette dal portale, al posto di quelle di prima. */
export async function conservaAffiliazioni(affiliazioni: AffiliazionePortale[]) {
  await prisma.$transaction([
    prisma.affiliazioneFigt.deleteMany({
      where: { codice: { notIn: affiliazioni.map((a) => a.codice) } },
    }),
    ...affiliazioni.map((a) =>
      prisma.affiliazioneFigt.upsert({
        where: { codice: a.codice },
        create: { ...a, lettaIl: new Date() },
        update: { ...a, lettaIl: new Date() },
      }),
    ),
  ]);
}

/**
 * Rilegge dal portale col collegamento salvato, conserva, e aggiorna il codice
 * in uso. Restituisce il codice valido nel giorno chiesto, se c'è.
 */
export async function rileggiAffiliazioni(giorno = new Date()): Promise<string | null> {
  const salvate = await prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } });
  if (!salvate) throw new Error('il portale non è collegato');
  const scoperta = await scopriAssociazione({
    login: salvate.login,
    password: decifra(salvate.passwordCifrata),
  });
  await conservaAffiliazioni(scoperta.affiliazioni);
  await prisma.credenzialeFigt.update({
    where: { id: 'figt' },
    data: {
      idAnagrafica: scoperta.idAnagrafica,
      idAffiliazione: affiliazioneValida(scoperta.affiliazioni)?.codice ?? salvate.idAffiliazione,
      ultimoAccesso: new Date(),
    },
  });
  return affiliazioneValida(scoperta.affiliazioni, giorno)?.codice ?? null;
}

/**
 * Il codice affiliazione per una giocata: quello conservato che copre quel
 * giorno; se nessuno lo copre (a gennaio, appena rinnovata) si rilegge il
 * portale. Come ultima risorsa, quello salvato col collegamento.
 */
export async function affiliazionePerIl(giorno: Date, ripiego: string | null): Promise<string | null> {
  const conservate = await prisma.affiliazioneFigt.findMany();
  const valida = affiliazioneValida(conservate, giorno);
  if (valida) return valida.codice;
  const riletta = await rileggiAffiliazioni(giorno).catch(() => null);
  return riletta ?? ripiego;
}
