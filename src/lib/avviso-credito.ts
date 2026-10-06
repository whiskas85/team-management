import { prisma } from './db';
import { avvisaPersona } from './avvisi';
import { fmtEuro } from './format';
import { marchio } from './mia-squadra';

/**
 * Del credito è arrivato a qualcuno: lo deve sapere, sempre.
 *
 * Una porta sola per tutte le strade da cui il credito arriva — un versamento
 * confermato o registrato da chi tiene la cassa, una quota messa a credito
 * dalla segreteria, il credito passato da un altro, quello tornato da una
 * quota tolta. Prima avvisava solo qualcuna, e il credito compariva senza che
 * nessuno lo dicesse.
 *
 * Non avvisa chi il credito se l'è fatto da sé: l'ha appena visto succedere.
 * La notifica a chi le ha accese, il WhatsApp agli altri (avvisaPersona).
 * Il pallino di Miei pagamenti si accende comunque, dal registro.
 */
export async function avvisaCreditoArrivato(p: {
  userId: string;
  importo: number;
  cassaId: string | null;
  /** Da dove viene, detto a lui: «Mario Rossi ti ha passato la sua quota». */
  perche: string;
  /** Chi l'ha fatto: se è lui stesso, niente avviso. */
  chiId?: string | null;
  /** Lo stesso avviso non si ripete per lo stesso fatto. */
  tag?: string;
}): Promise<void> {
  if (p.importo <= 0.001 || (p.chiId && p.chiId === p.userId)) return;
  const cassa = p.cassaId
    ? await prisma.cassa.findUnique({ where: { id: p.cassaId }, select: { nome: true } })
    : null;
  const dove = cassa?.nome ?? (await marchio()).nome;
  const euro = fmtEuro(p.importo);
  await avvisaPersona(p.userId, {
    titolo: `Hai ${euro} di credito in più`,
    testo: `${p.perche}: ${euro} di credito presso ${dove}, da usare quando paghi le prossime quote di quella cassa.`,
    url: '/pagamenti#credito',
    tag: p.tag ?? `credito-${p.userId}-${Date.now()}`,
    whatsapp: `Hai del credito in più

${p.perche}: ora hai ${euro} di credito in più presso ${dove}.

Lo usi quando paghi le prossime quote di quella cassa: te lo proponiamo per primo. Lo trovi in Miei pagamenti.`,
  }).catch(() => null);
}
