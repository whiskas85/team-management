'use client';

import { useEffect, useState } from 'react';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import {
  installa,
  installata,
  offertaPronta,
  safari,
  suCambio,
  telefono,
  type Telefono,
} from '@/lib/installa-browser';

/**
 * «Installa l'app»: per chi usa il gestionale dal browser del telefono.
 *
 * Gli avvisi arrivano solo come notifica, e su iPhone le notifiche arrivano
 * solo all'app installata: per chi ha un iPhone questo pulsante è la porta
 * degli avvisi. Su Android si installa con un tocco (la finestra del
 * browser); dove il browser non lo offre, e su iPhone sempre, si mostrano i
 * passaggi da fare, scritti per quel telefono.
 *
 * - `riquadro`: in cima alla home, solo sul telefono e solo finché l'app non
 *   è installata. Su Android «Non ora» lo nasconde per due settimane; su
 *   iPhone resta, come il riquadro delle notifiche che lì prende il posto.
 * - `scheda`: nel profilo, sempre, finché si usa il browser: anche sul
 *   computer, se il browser sa installarla (Chrome, Edge).
 */

const RINVIO = 14 * 24 * 60 * 60 * 1000;
const CHIAVE = 'zd-installa-rinviata';

type Stato = { tel: Telefono; pronta: boolean } | null;

export function InstallaApp({ forma }: { forma: 'riquadro' | 'scheda' }) {
  const [stato, setStato] = useState<Stato>(null);
  const [passi, setPassi] = useState(false);

  useEffect(() => {
    const aggiorna = () => {
      if (installata()) return setStato(null);
      const tel = telefono();
      const pronta = offertaPronta();
      // sul computer solo se il browser sa installarla, e mai in home
      if (tel === 'altro' && (!pronta || forma === 'riquadro')) return setStato(null);
      if (forma === 'riquadro' && tel !== 'iphone') {
        let rinviato = 0;
        try {
          rinviato = Number(localStorage.getItem(CHIAVE) ?? 0);
        } catch {
          /* finestra anonima: si mostra */
        }
        if (Date.now() - rinviato < RINVIO) return setStato(null);
      }
      setStato({ tel, pronta });
    };
    aggiorna();
    return suCambio(aggiorna);
  }, [forma]);

  if (!stato) return null;

  const premi = async () => {
    if (!stato.pronta) return setPassi((p) => !p);
    if (await installa()) mostraToast('Fatto: la trovi fra le app del telefono.', 'ok');
  };

  const rinvia = () => {
    try {
      localStorage.setItem(CHIAVE, String(Date.now()));
    } catch {
      /* pazienza */
    }
    setStato(null);
  };

  const perche =
    stato.tel === 'iphone'
      ? 'Su iPhone le notifiche arrivano solo all’app installata: senza, non ti arriva nessun avviso. Si apre dall’icona, a tutto schermo, come le altre app.'
      : 'Si apre dall’icona, a tutto schermo, come le altre app, e le notifiche arrivano anche col telefono in tasca.';

  const pulsante = (
    <button
      type="button"
      onClick={premi}
      aria-expanded={stato.pronta ? undefined : passi}
      className="btn-primary btn-sm shrink-0"
    >
      <Icona nome="scarica" size={15} /> Installa l’app
    </button>
  );

  const istruzioni = passi && !stato.pronta && (
    <ol className="mt-3 space-y-2 rounded-md border border-line bg-surface2/60 px-3 py-2.5 text-sm">
      {stato.tel === 'iphone' ? (
        <>
          <Passo n={1}>
            Tocca <strong>Condividi</strong> <SimboloCondividi />{' '}
            {safari() ? 'nella barra in basso di Safari' : 'nella barra degli indirizzi'}.
          </Passo>
          <Passo n={2}>
            Scorri e tocca <strong>Aggiungi alla schermata Home</strong> <SimboloAggiungi />.
          </Passo>
          <Passo n={3}>
            Tocca <strong>Aggiungi</strong>, in alto a destra.
          </Passo>
          <Passo n={4}>
            Apri il gestionale <strong>dall’icona</strong> sulla schermata Home e attiva le
            notifiche.
          </Passo>
          <li className="text-xs text-muted">
            Non trovi la voce? Succede quando il link è stato aperto dentro WhatsApp, Instagram o
            un’altra app: apri la pagina in Safari e ripeti.
          </li>
        </>
      ) : (
        <>
          <Passo n={1}>
            Tocca il menu <strong>⋮</strong> del browser, in alto a destra (in Samsung Internet è ☰
            in basso).
          </Passo>
          <Passo n={2}>
            Tocca <strong>Installa app</strong> o <strong>Aggiungi a schermata Home</strong>.
          </Passo>
          <Passo n={3}>Conferma, poi apri il gestionale dall’icona e attiva le notifiche.</Passo>
          <li className="text-xs text-muted">
            Non c’è la voce? Apri il gestionale in Chrome e riprova.
          </li>
        </>
      )}
    </ol>
  );

  if (forma === 'scheda') {
    return (
      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <h2 className="font-medium">L’app sul telefono</h2>
            <p className="mt-1 text-sm text-muted">{perche}</p>
          </div>
          <div className="self-start">{pulsante}</div>
        </div>
        {istruzioni}
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-nvg/40 bg-nvg/10 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="text-nvg">
          <Icona nome="scarica" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Installa il gestionale sul telefono</p>
          <p className="mt-0.5 text-sm text-muted">{perche}</p>
        </div>
        <div className="flex shrink-0 gap-2 self-start sm:self-auto">
          {pulsante}
          {stato.tel !== 'iphone' && (
            <button type="button" onClick={rinvia} className="btn-ghost btn-sm">
              Non ora
            </button>
          )}
        </div>
      </div>
      {istruzioni}
    </div>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="num mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nvg/20 text-xs text-nvg">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

/** Il simbolo di Condividi di iPhone: un quadrato con la freccia in su. */
function SimboloCondividi() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-label="(il quadrato con la freccia in su)"
      className="inline -mt-1 text-info"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M8 7l4-4 4 4M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
    </svg>
  );
}

/** Il simbolo di «Aggiungi alla schermata Home»: un quadrato con il più. */
function SimboloAggiungi() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-label="(il quadrato con il più)"
      className="inline -mt-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
