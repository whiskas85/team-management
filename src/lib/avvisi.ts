import { prisma } from './db';
import { avvisa, type Avviso } from './push';

/**
 * Come si avvisa una persona: **solo con le notifiche sul telefono**.
 *
 * Gli avvisi automatici (polizza attivata, passaggi in macchina, pagamenti,
 * sondaggi, certificato in scadenza…) partono in push e basta. Niente WhatsApp
 * e niente email di ripiego: una strada sola, la nostra, che porta dove serve
 * con un tocco e non dipende da un ponte che qualcuno deve tenere collegato.
 * Chi le notifiche non le ha accese non riceve avvisi automatici: lo dice
 * l'elenco delle persone, e il gestionale invita ad accenderle.
 *
 * Restano a parte, e restano com'erano, le cose che si mandano a mano (i
 * messaggi WhatsApp della pagina Messaggi) e le email dei certificati medici
 * configurate nella loro pagina.
 */

export type EsitoAvviso = 'push' | 'niente';

export async function avvisaPersona(userId: string, avviso: Avviso): Promise<EsitoAvviso> {
  // basta una sola iscrizione: chi ha il telefono e il computer di casa
  // riceve su tutti e due, ed è quello che si aspetta
  const iscrizioni = await prisma.iscrizionePush.count({ where: { userId } });
  if (!iscrizioni) return 'niente';
  await avvisa([userId], avviso);
  return 'push';
}

/** Come si racconta a voce dove è finito l'avviso: «gliel'ho detto su…». */
export const doveArrivato: Record<EsitoAvviso, string | null> = {
  push: 'Gli è arrivata la notifica.',
  niente: null,
};
