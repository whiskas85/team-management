import { prisma } from './db';
import { avvisa, type Avviso } from './push';
import { perWhatsapp } from './telefono';
import { inviaWhatsapp } from './whatsapp';

/**
 * Come si avvisa una persona: **una porta sola, e la sceglie il gestionale**.
 *
 * La regola è una e vale per tutti gli avvisi, da qui in avanti: chi ha acceso
 * le notifiche sul telefono riceve quelle; **chi non le ha accese riceve un
 * WhatsApp**. Mai tutti e due — lo stesso avviso che arriva due volte da due
 * strade insegna a ignorarli entrambi — e mai nessuno dei due per una scelta
 * fatta mesi prima davanti a una finestra del browser.
 *
 * Prima ogni avviso decideva per conto suo: la polizza attivata andava sempre
 * su WhatsApp, anche a chi aveva le notifiche; il certificato in scadenza
 * andava solo in push, e chi le notifiche non le aveva non sapeva niente. Due
 * regole diverse per la stessa domanda, e in mezzo le persone che non venivano
 * avvisate.
 *
 * **Le notifiche vincono** perché sono il canale nostro: arrivano dentro il
 * gestionale, portano dove serve con un tocco, e non dipendono da un ponte che
 * qualcuno deve tenere collegato. WhatsApp è la rete di sicurezza, non la
 * prima scelta.
 */

export type EsitoAvviso = 'push' | 'whatsapp' | 'niente';

export async function avvisaPersona(
  userId: string,
  avviso: Avviso & {
    /**
     * Lo stesso avviso, ma scritto per WhatsApp.
     *
     * Non è lo stesso testo con un'altra confezione: una notifica si legge in
     * due righe sulla schermata bloccata e il resto lo apre il tocco, un
     * messaggio resta nella chat e deve bastare a sé stesso — il numero della
     * polizza, la data, cosa farne. Senza questo testo, a chi non ha le
     * notifiche non si manda niente: meglio niente che un messaggio monco.
     */
    whatsapp?: string;
  },
): Promise<EsitoAvviso> {
  const persona = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telefono: true,
      // basta una sola iscrizione: chi ha il telefono e il computer di casa
      // riceve su tutti e due, ed è quello che si aspetta
      _count: { select: { iscrizioniPush: true } },
    },
  });
  if (!persona) return 'niente';

  if (persona._count.iscrizioniPush > 0) {
    await avvisa([userId], avviso);
    return 'push';
  }

  const numero = perWhatsapp(persona.telefono);
  if (!numero || !avviso.whatsapp) return 'niente';

  // Il ponte può essere scollegato, il numero può non avere WhatsApp: un
  // avviso è un di più, e non deve far fallire il gesto che l'ha generato.
  const esito = await inviaWhatsapp(numero, avviso.whatsapp).catch(
    () => ({ ok: false }) as const,
  );
  return esito.ok ? 'whatsapp' : 'niente';
}

/** Come si racconta a voce dove è finito l'avviso: «gliel'ho detto su…». */
export const doveArrivato: Record<EsitoAvviso, string | null> = {
  push: 'Gli è arrivata la notifica.',
  whatsapp: 'Gli ho mandato i dati su WhatsApp.',
  niente: null,
};
