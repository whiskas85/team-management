'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Stato = {
  collegato: boolean;
  numero: string | null;
  qr: string | null;
  errore: string | null;
};

/**
 * Il codice da inquadrare, che si rinfresca da solo.
 *
 * **WhatsApp cambia il codice ogni venti secondi circa.** Disegnato una volta
 * sola — com'era fino alla 2.33.2 — quello che si inquadrava era quasi sempre
 * già scaduto, e il telefono non faceva niente: da fuori sembrava che il QR
 * "non funzionasse".
 *
 * C'è anche un secondo momento in cui serve stare a guardare: appena il
 * telefono accetta, WhatsApp chiude la connessione con un errore 515 e il
 * ponte riparte da capo per completare l'abbinamento. Per qualche secondo non
 * c'è né codice né collegamento, e senza qualcuno che continui a chiedere si
 * resterebbe davanti a una pagina vuota convinti che sia andata male.
 */
export function CodiceWhatsapp({ iniziale }: { iniziale: Stato }) {
  const [stato, setStato] = useState<Stato>(iniziale);
  const router = useRouter();

  useEffect(() => {
    if (stato.collegato) return;

    let vivo = true;
    const chiedi = async () => {
      try {
        const r = await fetch('/api/whatsapp/stato', { cache: 'no-store' });
        if (!r.ok || !vivo) return;
        const nuovo: Stato = await r.json();
        setStato(nuovo);
        // collegato: la pagina intorno ha altre cose da mostrare — i gruppi,
        // il pulsante per rivendicare il numero — e le sa solo il server
        if (nuovo.collegato) router.refresh();
      } catch {
        /* il ponte sta ripartendo: al prossimo giro risponde */
      }
    };

    const t = setInterval(chiedi, 4000);
    void chiedi();
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [stato.collegato, router]);

  if (stato.collegato) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-3 border-t border-line pt-4">
      <p className="text-sm text-muted">
        Su WhatsApp: <strong className="text-ink">Impostazioni → Dispositivi collegati → Collega
        un dispositivo</strong>, poi inquadra.
      </p>

      {stato.qr ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stato.qr}
            alt="Codice da inquadrare con WhatsApp"
            className="rounded-lg bg-white p-2"
            width={280}
            height={280}
          />
          <p className="text-[11px] text-muted">
            Il codice si rinnova da solo ogni pochi secondi: inquadra quello che vedi adesso.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">
          Nessun codice in questo momento: il ponte sta ripartendo. Resta qui, fra poco ricompare.
        </p>
      )}

      {stato.errore && <p className="text-[11px] text-warn">{stato.errore}</p>}
    </div>
  );
}
