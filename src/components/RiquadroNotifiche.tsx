'use client';

import { useEffect, useState } from 'react';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import { giaIscritto, iscriviDispositivo, supportate } from '@/lib/push-browser';

type Stato = 'ignoto' | 'accese' | 'spente' | 'negate' | 'non-supportate';

/**
 * In home, finché le notifiche su questo dispositivo non sono accese.
 *
 * L'invito nell'angolo si può rimandare; questo no: sta in cima alla pagina
 * che si apre entrando, e se ne va solo quando le notifiche ci sono. Il
 * pulsante è il gesto che il browser vuole per chiedere il permesso.
 *
 * Dove attivarle non si può, dice perché e cosa fare: bloccate a mano si
 * sbloccano dalle impostazioni del browser, e su iPhone il gestionale va
 * prima installato dalla schermata iniziale.
 */
export function RiquadroNotifiche() {
  const [stato, setStato] = useState<Stato>('ignoto');
  const [attesa, setAttesa] = useState(false);

  useEffect(() => {
    if (!supportate()) {
      setStato('non-supportate');
      return;
    }
    if (Notification.permission === 'denied') {
      setStato('negate');
      return;
    }
    void (async () => {
      if (await giaIscritto()) return setStato('accese');
      // il permesso c'è già ma l'iscrizione no (cache svuotata, iscrizione
      // scaduta): ci si riscrive senza chiedere niente a nessuno
      if (Notification.permission === 'granted' && (await iscriviDispositivo()) === 'ok') {
        return setStato('accese');
      }
      setStato('spente');
    })();
  }, []);

  if (stato === 'ignoto' || stato === 'accese') return null;

  const accendi = async () => {
    setAttesa(true);
    const esito = await iscriviDispositivo();
    setAttesa(false);
    if (esito === 'ok') {
      setStato('accese');
      mostraToast('Notifiche attive su questo dispositivo.', 'ok');
    } else if (esito === 'negato') {
      setStato('negate');
    } else {
      mostraToast('Non sono riuscito ad attivarle qui. Riprova dal profilo.', 'errore');
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 sm:flex-row sm:items-center">
      <span className="text-warn">
        <Icona nome="avvisi" size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Le notifiche sono spente su questo dispositivo</p>
        <p className="mt-0.5 text-sm text-muted">
          {stato === 'spente' &&
            'Attività nuove, annunci, sondaggi, risposte alle tue segnalazioni: accendile e ti arrivano anche col gestionale chiuso.'}
          {stato === 'negate' &&
            'Le hai bloccate per questo sito. Si riattivano dalle impostazioni del browser, alla voce Notifiche: da qui non si possono più chiedere.'}
          {stato === 'non-supportate' &&
            'Questo browser non le gestisce. Su iPhone installa prima il gestionale dalla schermata iniziale (Condividi → Aggiungi a Home) e aprilo da lì.'}
        </p>
      </div>
      {stato === 'spente' && (
        <button
          type="button"
          onClick={accendi}
          disabled={attesa}
          className="btn-primary btn-sm shrink-0 self-start sm:self-auto"
        >
          <Icona nome="avvisi" size={15} /> {attesa ? 'Attivo…' : 'Attiva le notifiche'}
        </button>
      )}
    </div>
  );
}
