'use client';

import { useEffect, useState } from 'react';
import { mostraToast } from './Toast';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { provaNotifiche } from '@/actions/notifiche';
import {
  disiscriviDispositivo,
  giaIscritto,
  iscriviDispositivo,
  supportate,
} from '@/lib/push-browser';

/**
 * «Avvisami sul telefono.»
 *
 * Il permesso lo chiede il browser, e lo chiede **solo dopo un gesto**: un
 * avviso che spunta da solo appena si apre una pagina viene negato per
 * riflesso, e negato una volta non si può più richiedere — tocca andare nelle
 * impostazioni del telefono. Per questo qui c'è un pulsante e non un popup al
 * caricamento.
 *
 * Su iPhone funziona solo se il gestionale è stato **installato** dalla
 * schermata iniziale: è una regola di Apple, non nostra, e va detta invece di
 * lasciare la gente a chiedersi perché non succede niente.
 */
export function Notifiche() {
  const [stato, setStato] = useState<'ignoto' | 'non-supportate' | 'spente' | 'accese' | 'negate'>(
    'ignoto',
  );
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
    void giaIscritto().then((c) => setStato(c ? 'accese' : 'spente'));
  }, []);

  async function accendi() {
    setAttesa(true);
    const esito = await iscriviDispositivo();
    setAttesa(false);

    if (esito === 'ok') {
      setStato('accese');
      mostraToast('Notifiche attive su questo dispositivo.', 'ok');
    } else if (esito === 'negato') {
      setStato('negate');
    } else {
      mostraToast('Non sono riuscito ad attivare le notifiche qui.', 'errore');
    }
  }

  async function spegni() {
    setAttesa(true);
    try {
      await disiscriviDispositivo();
      setStato('spente');
      mostraToast('Niente più notifiche su questo dispositivo.', 'ok');
    } finally {
      setAttesa(false);
    }
  }

  if (stato === 'ignoto') return null;

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-medium">Notifiche sul dispositivo</h2>
        <p className="mt-1 text-sm text-muted">
          Arrivano anche col gestionale chiuso: una registrazione da approvare, e col tempo il
          resto. Valgono per <em>questo</em> dispositivo: telefono e computer si accendono
          separatamente.
        </p>
      </div>

      {stato === 'non-supportate' && (
        <p className="text-sm text-muted">
          Questo browser non le gestisce. Su iPhone bisogna prima installare il gestionale dalla
          schermata iniziale: Condividi → Aggiungi a Home.
        </p>
      )}

      {stato === 'negate' && (
        <p className="text-sm text-warn">
          Le hai bloccate per questo sito. Si riattivano dalle impostazioni del browser, alla voce
          notifiche: da qui non si può più chiedere.
        </p>
      )}

      {stato === 'spente' && (
        <button type="button" onClick={accendi} disabled={attesa} className="btn-primary btn-sm">
          {attesa ? 'Attivo…' : 'Attiva le notifiche qui'}
        </button>
      )}

      {stato === 'accese' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-nvg">Attive su questo dispositivo.</span>
          {/* «Mi arrivano?» è una domanda che senza questo pulsante ha come
              unica risposta l'attesa di qualcosa di vero. Qui si prova subito,
              e se non arriva si legge il motivo invece del silenzio. */}
          <FormAzione azione={provaNotifiche} className="contents">
            <Invia icona="whatsapp" className="btn-ghost btn-sm">
              Mandami una prova
            </Invia>
          </FormAzione>
          <button type="button" onClick={spegni} disabled={attesa} className="btn-ghost btn-sm">
            Disattiva
          </button>
        </div>
      )}
    </div>
  );
}
