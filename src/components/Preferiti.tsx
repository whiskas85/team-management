'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { Icona } from './Icona';
import { mostraToast } from './Toast';
import { commutaPreferito, riordinaPreferiti } from '@/actions/preferiti';
import { useVoceCorrente } from './ContestoMenu';
import type { VoceMenu } from './Nav';

/** Quanto si tiene premuto prima che l'elenco si sganci: mezzo secondo scarso. */
const ATTESA_PRESSIONE = 450;
/** Oltre questi pixel il dito sta scorrendo la pagina, non tenendo premuto. */
const TOLLERANZA = 8;

/**
 * La stellina: mette da parte la pagina che si sta guardando.
 *
 * Compare solo dove c'è qualcosa da mettere da parte, cioè sulle pagine che
 * **sono** una voce di menu. Sulla scheda di una singola attività non c'è: un
 * preferito è una porta, non un foglio, e riempire il menu di indirizzi che un
 * mese dopo non vogliono più dire niente lo renderebbe inutile.
 */
export function Stellina() {
  const voce = useVoceCorrente();
  const [inCorso, avvia] = useTransition();
  // si accende subito sotto il dito e si corregge se il server dice di no:
  // aspettare il giro completo fa sembrare che il tocco non sia arrivato
  const [acceso, setAcceso] = useState(voce?.preferito ?? false);

  useEffect(() => setAcceso(voce?.preferito ?? false), [voce?.href, voce?.preferito]);

  if (!voce) return null;

  const premi = () => {
    const prima = acceso;
    setAcceso(!prima);
    avvia(async () => {
      const esito = await commutaPreferito(voce.href);
      if (esito.errore) {
        setAcceso(prima);
        mostraToast(esito.errore, 'errore');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={premi}
      disabled={inCorso}
      aria-pressed={acceso}
      title={acceso ? `Togli "${voce.label}" dai preferiti` : `Metti "${voce.label}" nei preferiti`}
      className={`rounded-md p-1.5 transition-colors ${
        acceso ? 'text-nvg hover:text-nvg/70' : 'text-muted hover:text-ink'
      }`}
    >
      <Icona nome="titolare" size={18} riempi={acceso} />
      <span className="sr-only">
        {acceso ? 'Togli dai preferiti' : 'Metti nei preferiti'}
      </span>
    </button>
  );
}

/**
 * I preferiti in elenco, riordinabili tenendo premuto.
 *
 * **Un gesto solo, dall'inizio alla fine**: si tiene premuto finché la riga si
 * stacca, si trascina dove va, si lascia. Niente modalità da entrare e uscire,
 * niente frecce su e giù — che su un elenco di sei voci vogliono dire sei
 * tocchi per spostarne una.
 *
 * È a pressione lunga e non a trascinamento perché questo elenco vive anche
 * sul telefono, dove il trascinamento HTML non esiste e dove i preferiti
 * servono di più: sono le voci della barra in basso.
 *
 * Finché non si è tenuto premuto abbastanza, la riga resta un link normale e
 * si apre al tocco. Dopo, il tocco non naviga più — o si finirebbe su una
 * pagina ogni volta che si sposta una voce.
 */
export function ElencoPreferiti({
  voci,
  acceso,
  onVai,
  riga,
}: {
  voci: VoceMenu[];
  /** L'href della voce accesa, per evidenziarla come nel resto del menu. */
  acceso: string | null;
  /** Chiamata dopo la navigazione: sul telefono serve a chiudere il pannello. */
  onVai?: () => void;
  /** Come si disegna una riga: la barra laterale e il pannello sono diversi. */
  riga: (voce: VoceMenu, stato: { attivo: boolean; presa: boolean }) => ReactNode;
}) {
  const [ordine, setOrdine] = useState(voci);
  const [presa, setPresa] = useState<string | null>(null);
  const [, avvia] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partenza = useRef<{ x: number; y: number } | null>(null);
  // dopo un riordino il click che arriva col dito che si alza non deve
  // navigare: questa bandierina se lo mangia
  const spostato = useRef(false);
  const precedente = useRef(voci);

  // il menu si ricostruisce dopo ogni salvataggio: si riparte da quello che
  // dice il server, non da quello che è rimasto sullo schermo
  useEffect(() => {
    setOrdine(voci);
    precedente.current = voci;
  }, [voci]);

  const ferma = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const salva = (nuovo: VoceMenu[]) => {
    const prima = precedente.current;
    avvia(async () => {
      const esito = await riordinaPreferiti(nuovo.map((v) => v.href));
      if (esito.errore) {
        setOrdine(prima);
        mostraToast(esito.errore, 'errore');
      }
    });
  };

  const prendi = (href: string, e: React.PointerEvent) => {
    partenza.current = { x: e.clientX, y: e.clientY };
    spostato.current = false;
    ferma();
    timer.current = setTimeout(() => {
      setPresa(href);
      // un colpetto per dire che si è staccata: sul telefono è l'unico modo di
      // accorgersene senza guardare
      navigator.vibrate?.(25);
    }, ATTESA_PRESSIONE);
  };

  const muovi = (e: React.PointerEvent) => {
    // non ancora staccata: se il dito scorre, sta scorrendo la pagina
    if (!presa) {
      const p = partenza.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > TOLLERANZA) ferma();
      return;
    }

    e.preventDefault();
    const sotto = document.elementFromPoint(e.clientX, e.clientY);
    const bersaglio = sotto?.closest<HTMLElement>('[data-preferito]')?.dataset.preferito;
    if (!bersaglio || bersaglio === presa) return;

    setOrdine((attuale) => {
      const da = attuale.findIndex((v) => v.href === presa);
      const a = attuale.findIndex((v) => v.href === bersaglio);
      if (da < 0 || a < 0) return attuale;
      const nuovo = [...attuale];
      const [presa2] = nuovo.splice(da, 1);
      nuovo.splice(a, 0, presa2);
      spostato.current = true;
      return nuovo;
    });
  };

  const lascia = () => {
    ferma();
    partenza.current = null;
    if (presa) {
      setPresa(null);
      if (spostato.current) salva(ordine);
    }
  };

  if (ordine.length === 0) return null;

  return (
    <ul className="space-y-0.5" onPointerMove={muovi} onPointerUp={lascia} onPointerCancel={lascia}>
      {ordine.map((v) => (
        <li
          key={v.href}
          data-preferito={v.href}
          // mentre si trascina il dito non deve far scorrere la pagina sotto
          style={{ touchAction: presa ? 'none' : undefined }}
        >
          <Link
            href={v.href}
            onPointerDown={(e) => prendi(v.href, e)}
            onClick={(e) => {
              if (presa || spostato.current) {
                e.preventDefault();
                spostato.current = false;
                return;
              }
              onVai?.();
            }}
            draggable={false}
            className="block select-none"
          >
            {riga(v, { attivo: acceso === v.href, presa: presa === v.href })}
          </Link>
        </li>
      ))}
    </ul>
  );
}
