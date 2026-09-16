import webpush from 'web-push';
import { prisma } from './db';

/**
 * Le notifiche che arrivano sul telefono anche col gestionale chiuso.
 *
 * Funzionano solo su un indirizzo con un certificato vero — ed è per questo
 * che sono arrivate insieme al dominio, non prima.
 *
 * Le chiavi VAPID sono la carta d'identità del mittente: senza, i servizi di
 * push (Google, Apple, Mozilla) non accettano niente. Stanno nell'ambiente,
 * una coppia per installazione: quelle del test non valgono in produzione, e
 * va bene così — un dispositivo iscritto in test non deve poter ricevere gli
 * avvisi veri.
 */

export type Avviso = {
  titolo: string;
  testo: string;
  /** Dove porta il tocco sulla notifica. */
  url: string;
  /** Raggruppa: due avvisi con lo stesso tag non fanno due righe. */
  tag?: string;
};

function configurata(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export const chiavePubblica = () => process.env.VAPID_PUBLIC_KEY ?? null;

function preparaMittente() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:presidente@zerodarkteam.it',
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
}

/**
 * Manda un avviso a tutti i dispositivi di queste persone.
 *
 * **Non aspetta e non si lamenta.** Una notifica è un di più: se il servizio
 * di push è lento o irraggiungibile, chi ha appena premuto un pulsante non
 * deve restare a guardare la rotella — e men che meno vedere un errore per
 * qualcosa che è andato a buon fine.
 */
export async function avvisa(userIds: string[], avviso: Avviso): Promise<void> {
  if (!configurata() || userIds.length === 0) return;

  const iscrizioni = await prisma.iscrizionePush.findMany({
    where: { userId: { in: userIds } },
  });
  if (iscrizioni.length === 0) return;

  preparaMittente();
  const corpo = JSON.stringify(avviso);

  await Promise.all(
    iscrizioni.map(async (i) => {
      try {
        await webpush.sendNotification(
          { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
          corpo,
        );
      } catch (e) {
        // 404 e 410: quel dispositivo non esiste più — app disinstallata,
        // permesso revocato, browser ripulito. La riga se ne va con lui,
        // altrimenti ogni invio riproverebbe per sempre verso il nulla.
        const stato = (e as { statusCode?: number }).statusCode;
        if (stato === 404 || stato === 410) {
          await prisma.iscrizionePush.delete({ where: { id: i.id } }).catch(() => {});
        }
      }
    }),
  );
}

/**
 * Chi può vedere un'attività appena rilasciata, e quindi a chi ha senso
 * mandare l'avviso.
 *
 * Sono le stesse regole del calendario, dette per le notifiche: aperta a
 * tutti vuol dire anche i nuovi, di squadra vuol dire chi è in rosa, e **su
 * invito non si avvisa nessuno** — al momento del rilascio i partecipanti non
 * ci sono ancora, e mandare a tutti un avviso per una cosa che non possono
 * nemmeno aprire è il modo migliore per far spegnere le notifiche.
 *
 * Chi ha rilasciato l'attività resta fuori: lo sa già.
 */
export async function chiVedeAttivita(
  visibilita: string | null,
  escluso?: string,
): Promise<string[]> {
  if (visibilita === 'INVITO') return [];

  const stati =
    visibilita === 'TUTTI'
      ? (['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE', 'NUOVO'] as const)
      : (['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE'] as const);

  const utenti = await prisma.user.findMany({
    where: { stato: { in: [...stati] }, id: escluso ? { not: escluso } : undefined },
    select: { id: true },
  });
  return utenti.map((u) => u.id);
}

/** Chi tiene d'occhio le persone che bussano: a loro arrivano le registrazioni. */
export async function chiSegueINuovi(): Promise<string[]> {
  const utenti = await prisma.user.findMany({
    where: {
      stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] },
      roles: { hasSome: ['ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA'] },
    },
    select: { id: true },
  });
  return utenti.map((u) => u.id);
}
