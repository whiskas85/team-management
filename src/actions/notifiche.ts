'use server';

import { requireUser } from '@/lib/auth';
import { provaAvviso } from '@/lib/push';
import type { StatoForm } from '@/lib/form';

/**
 * «Le notifiche mi arrivano?»
 *
 * Una domanda che senza questo pulsante non ha risposta: si resta ad aspettare
 * che succeda qualcosa di vero — una registrazione, un'attività — per
 * scoprire che non funzionava. Qui si prova subito, e se non funziona si legge
 * il motivo invece del silenzio.
 */
export async function provaNotifiche(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const esito = await provaAvviso(me.id);

  if (esito.dispositivi === 0) {
    return {
      errore:
        'Nessun dispositivo iscritto: attiva le notifiche qui sopra, e falle anche dal telefono — sono due iscrizioni diverse.',
    };
  }

  if (esito.arrivati === 0) {
    return { errore: `Non è arrivata a nessuno dei ${esito.dispositivi}: ${esito.motivo}.` };
  }

  return {
    ok:
      esito.arrivati === esito.dispositivi
        ? `Mandata a ${esito.arrivati} ${esito.arrivati === 1 ? 'dispositivo' : 'dispositivi'}: dovrebbe comparire adesso.`
        : `Arrivata a ${esito.arrivati} dispositivi su ${esito.dispositivi}. Sugli altri: ${esito.motivo}.`,
  };
}
