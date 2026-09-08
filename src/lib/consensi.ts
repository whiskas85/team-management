import { prisma } from './db';
import { VERSIONE_PRIVACY } from './gdpr';
import { vedeAttivitaSquadra } from './domain';

/**
 * Le tre cose che si accettano prima di entrare.
 *
 * **L'informativa privacy** e **le regole del club** sono obbligatorie, e per
 * ragioni diverse: la prima perché senza non si possono trattare i dati di
 * nessuno, la seconda perché il club è fatto di regole e chi non le ha lette
 * non può prendervi parte. Sono le due porte, e si passano una volta sola —
 * finché non cambia il testo.
 *
 * **Le foto no.** Quella è una scelta, e una scelta ha due risposte buone: si
 * chiede, si registra quella che arriva, e si va avanti in tutti e due i casi.
 * Quello che non si può fare è non chiederla e decidere per conto proprio.
 */

/** Che cosa manca ancora a questa persona. */
export type Mancanze = {
  privacy: boolean;
  regole: boolean;
  foto: boolean;
  /** I documenti da leggere prima di accettare: statuto e regolamenti. */
  documenti: { id: string; slug: string; titolo: string; tipo: string; aggiornatoIl: Date }[];
};

/**
 * Cosa deve ancora accettare, e quali documenti valgono adesso.
 *
 * I documenti si guardano tutti: statuto e regolamenti sono le regole del
 * club, e leggerne metà non è averle lette. Se uno di loro cambia si torna a
 * chiedere — le regole nuove non le ha accettate nessuno.
 */
export async function mancanze(userId: string): Promise<Mancanze> {
  const utente = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      stato: true,
      privacyAccettataIl: true,
      privacyVersione: true,
      consensoImmaginiIl: true,
    },
  });

  // A chi si è appena affacciato si chiede la privacy e nient'altro: le regole
  // del club riguardano chi al club prende parte, e lo statuto lui non lo vede
  // nemmeno.
  const dentro = vedeAttivitaSquadra(utente.stato);

  const documenti = dentro
    ? await prisma.documento.findMany({
        where: { testo: { not: '' } },
        orderBy: [{ tipo: 'asc' }, { ordine: 'asc' }],
        select: {
          id: true,
          slug: true,
          titolo: true,
          tipo: true,
          aggiornatoIl: true,
          accettazioni: { where: { userId: utente.id }, select: { versione: true } },
        },
      })
    : [];

  const daLeggere = documenti.filter((d) => {
    const gia = d.accettazioni[0];
    return !gia || gia.versione < d.aggiornatoIl;
  });

  return {
    privacy:
      utente.privacyAccettataIl === null || utente.privacyVersione !== VERSIONE_PRIVACY,
    regole: daLeggere.length > 0,
    // la data c'è solo se la domanda è stata fatta: il consenso a false senza
    // data vuol dire "non gliel'ha chiesto nessuno", che è un'altra cosa da
    // "ha detto di no"
    foto: utente.consensoImmaginiIl === null,
    documenti: documenti.map((d) => ({
      id: d.id,
      slug: d.slug,
      titolo: d.titolo,
      tipo: d.tipo,
      aggiornatoIl: d.aggiornatoIl,
    })),
  };
}

/** Se manca qualcosa, il gestionale non si apre. */
export const qualcosaManca = (m: Mancanze) => m.privacy || m.regole || m.foto;
