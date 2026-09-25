'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import { giaIscritto, iscriviDispositivo, supportate } from '@/lib/push-browser';

/** Quanto sta zitto dopo un «non ora»: due settimane. */
const RINVIO = 14 * 24 * 60 * 60 * 1000;
const CHIAVE = 'zd-notifiche-rinviate';

/**
 * L'invito ad accendere le notifiche, per chi non ce le ha.
 *
 * **Attivarle da soli non si può**: il browser vuole che sia la persona a
 * premere, e un permesso chiesto appena si apre una pagina viene negato per
 * riflesso — negato una volta, non si può più chiedere. Quindi si fa la cosa
 * più vicina possibile: lo chiediamo noi, una volta, in un angolo, senza
 * coprire quello che si stava leggendo.
 *
 * Due strade si prendono da sole, senza disturbare nessuno:
 * - **permesso già concesso ma iscrizione mancante** — succede svuotando la
 *   cache, o quando l'iscrizione scade: ci si riscrive e basta;
 * - **permesso negato** — l'invito non compare: non c'è niente da proporre, e
 *   insistere sarebbe solo fastidio.
 *
 * «Non ora» non è un no per sempre: torna fra due settimane. Chi le vuole
 * spegnere davvero lo fa dal profilo, e da lì in poi non si viene più
 * disturbati — perché a quel punto l'iscrizione c'è stata e questo invito non
 * ha più motivo di comparire.
 */
export function InvitoNotifiche() {
  const [mostra, setMostra] = useState(false);
  const [attesa, setAttesa] = useState(false);
  // in home c'è già il riquadro in cima: due inviti insieme sarebbero uno di troppo
  const inHome = usePathname() === '/dashboard';

  useEffect(() => {
    if (!supportate() || Notification.permission === 'denied') return;

    let vivo = true;
    void (async () => {
      if (await giaIscritto()) return;

      // Il permesso c'è già: non si chiede niente a nessuno, ci si riscrive.
      if (Notification.permission === 'granted') {
        await iscriviDispositivo();
        return;
      }

      const rinviato = Number(localStorage.getItem(CHIAVE) ?? 0);
      if (Date.now() - rinviato < RINVIO) return;

      // un attimo di respiro: comparire nello stesso istante in cui la pagina
      // si apre è il modo migliore per essere scacciati senza essere letti
      setTimeout(() => {
        if (vivo) setMostra(true);
      }, 4000);
    })();

    return () => {
      vivo = false;
    };
  }, []);

  if (!mostra || inHome) return null;

  const rinvia = () => {
    try {
      localStorage.setItem(CHIAVE, String(Date.now()));
    } catch {
      /* finestra anonima: pazienza, lo si richiederà */
    }
    setMostra(false);
  };

  const accendi = async () => {
    setAttesa(true);
    const esito = await iscriviDispositivo();
    setAttesa(false);
    setMostra(false);

    if (esito === 'ok') mostraToast('Notifiche attive su questo dispositivo.', 'ok');
    else if (esito === 'negato') {
      mostraToast('Hai detto di no: si riattivano dalle impostazioni del browser.', 'warn');
    } else mostraToast('Non sono riuscito ad attivarle qui.', 'errore');
  };

  return (
    <div
      aria-label="Attiva le notifiche"
      /* sopra la barra del telefono, in un angolo sul computer: non copre mai
         quello che si stava leggendo */
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 rounded-lg border border-nvg/40 bg-surface/98 p-3 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-5 md:right-5 md:w-80"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-nvg">
          <Icona nome="whatsapp" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Ti avviso io</p>
          <p className="mt-0.5 text-xs text-muted">
            Un&apos;attività nuova, una richiesta da approvare: arrivano sul telefono anche col
            gestionale chiuso. Si spengono quando vuoi, dal tuo profilo.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={accendi} disabled={attesa} className="btn-primary btn-sm">
              {attesa ? 'Attivo…' : 'Attivale'}
            </button>
            <button type="button" onClick={rinvia} className="btn-ghost btn-sm">
              Non ora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
