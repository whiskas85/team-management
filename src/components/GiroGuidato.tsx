'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icona } from './Icona';
import { segnaGiroVisto } from '@/actions/configura';

/**
 * Il giro guidato: al primo accesso si accendono una dopo l'altra le parti
 * del gestionale che servono a tutti — il menu, il calendario, i pagamenti, il
 * profilo, la ricerca, il chip col nome — con due righe che dicono a cosa
 * servono. Chi entra la prima volta non sa dove guardare, e un'applicazione
 * con trenta voci di menu non si spiega da sola.
 *
 * Non porta da nessuna parte: indica le cose dove stanno, nella pagina che si
 * ha davanti. Una voce che questa persona non vede (non ne ha l'incarico) o
 * che sul telefono non sta nella barra in basso si salta, o si indica il
 * pulsante Menu che la contiene.
 *
 * Parte da solo una volta; chiuso o finito, non riparte. Si rivede dal chip
 * col nome, «Rivedi il giro guidato», che lo avvia con avviaGiroGuidato().
 */

const EVENTO = 'giro-guidato';

/** Avvia il giro adesso, da qualunque punto dell'interfaccia. */
export function avviaGiroGuidato() {
  window.dispatchEvent(new Event(EVENTO));
}

type Tappa = {
  titolo: string;
  testo: string;
  /** Cosa accendere: senza, il riquadro sta al centro. */
  bersaglio?: string;
  /** Una voce di menu: la tappa c'è solo se questa persona la vede. */
  voce?: string;
  /** Una voce che sul telefono può stare dentro il Menu e non nella barra. */
  nelMenu?: boolean;
  soloAdmin?: boolean;
};

// le voci, non il logo in cima alla colonna che porta anche lui alla home
const voceMenu = (href: string) =>
  `[data-giro="menu"] li a[href="${href}"], nav[data-giro="menu"] > a[href="${href}"]`;

const TAPPE: Tappa[] = [
  {
    titolo: 'Benvenuto a bordo',
    testo:
      'Un minuto per mostrarti dove stanno le cose principali. Puoi saltarlo: lo ritrovi quando vuoi nel chip col tuo nome, in alto a destra.',
  },
  {
    titolo: 'Il menu',
    bersaglio: '[data-giro="menu"]',
    testo:
      'Tutte le sezioni che puoi aprire, divise per gruppi. Vedi solo quelle che ti riguardano: se ne manca una, dipende dai tuoi incarichi. I pallini contano le cose che ti aspettano.',
  },
  {
    titolo: 'Home',
    voce: '/dashboard',
    nelMenu: true,
    testo: 'Le prossime attività, quello che ti aspetta e le novità della squadra, in una pagina sola.',
  },
  {
    titolo: 'Calendario',
    voce: '/calendario',
    nelMenu: true,
    testo:
      'Giocate, allenamenti, riunioni. Aprine una per dire «Ci sono» o «Non ci sono», vedere dove si va, l’ora del ritrovo, il parcheggio e la quota. Il pallino conta le attività nuove che non hai ancora aperto.',
  },
  {
    titolo: 'Miei pagamenti',
    voce: '/pagamenti',
    nelMenu: true,
    testo:
      'Le quote da versare e quelle già pagate. Quando hai pagato premi «Ho pagato»: chi tiene la cassa lo conferma, e la quota esce dal pallino.',
  },
  {
    titolo: 'Miei certificati',
    voce: '/certificati',
    nelMenu: true,
    testo:
      'Qui carichi il certificato medico. Un mese prima che scada il pallino si accende: il tempo per prenotare la visita.',
  },
  {
    titolo: 'Profilo',
    voce: '/profilo',
    nelMenu: true,
    testo:
      'I tuoi dati, la foto, il callsign, i contatti da chiamare in caso di emergenza e le notifiche sul telefono.',
  },
  {
    titolo: 'Bacheche',
    voce: '/bacheca',
    nelMenu: true,
    testo: 'Le comunicazioni della squadra. Il pallino resta finché non le hai lette.',
  },
  {
    titolo: 'Sondaggi',
    voce: '/sondaggi',
    nelMenu: true,
    testo: 'Le domande aperte: quando si gioca, che maglia si fa. Il pallino resta finché non rispondi.',
  },
  {
    titolo: 'Mercatino',
    voce: '/mercatino',
    nelMenu: true,
    testo: 'L’usato fra soci: chi vende mette l’annuncio, chi cerca lo trova e scrive al venditore.',
  },
  {
    titolo: 'Comando',
    voce: '/admin/squadra',
    nelMenu: true,
    soloAdmin: true,
    testo:
      'Da amministratore, qui sotto ci sono la squadra, i campi, i ruoli, le stagioni e le tariffe. Le persone stanno in «Atleti & nuovi».',
  },
  {
    titolo: 'Cerca',
    bersaglio: '[data-giro="cerca"]',
    testo:
      'Scrivi il nome di una pagina, di una persona o di un’attività e ci salti senza passare dal menu. Da tastiera: Ctrl+K, o «/».',
  },
  {
    titolo: 'Stellina e aiuto',
    bersaglio: '[data-giro="titolo"]',
    testo:
      'Accanto al titolo di ogni pagina. La stellina la mette fra i preferiti — sul telefono finiscono nella barra in basso — e il «?» spiega la pagina che hai davanti.',
  },
  {
    titolo: 'Il tuo chip',
    bersaglio: '[data-giro="avatar"]',
    testo:
      'Il tuo profilo, l’aiuto, chiaro o scuro, l’uscita. E «Rivedi il giro guidato», se vuoi ripassare.',
  },
  {
    titolo: 'Tutto qui',
    testo: 'Il resto lo scopri usandolo, e ogni pagina ha il suo «?». Buon gioco!',
  },
];

/** Il primo elemento che si vede davvero: sidebar e barra in basso non ci sono insieme. */
function visibile(selettore: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selettore)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
  }
  return null;
}

type Pronta = Tappa & { el: HTMLElement | null; inMenu: boolean };

/** Le tappe che hanno qualcosa da indicare su questo schermo, per questa persona. */
function preparaTappe(voci: Set<string>, admin: boolean): Pronta[] {
  return TAPPE.flatMap((t): Pronta[] => {
    if (t.soloAdmin && !admin) return [];
    if (t.voce && !voci.has(t.voce)) return [];
    const selettore = t.voce ? voceMenu(t.voce) : t.bersaglio;
    if (!selettore) return [{ ...t, el: null, inMenu: false }];
    const el = visibile(selettore);
    if (el) return [{ ...t, el, inMenu: false }];
    // sul telefono: la voce sta dentro il Menu, in fondo a destra
    const menu = t.nelMenu ? visibile('[data-giro="apri-menu"]') : null;
    return menu ? [{ ...t, el: menu, inMenu: true }] : [];
  });
}

const MARGINE = 12;
const BORDO = 6;

export function GiroGuidato({
  automatico,
  voci,
  admin,
}: {
  /** Mai visto: parte da solo. */
  automatico: boolean;
  /** Le voci di menu di questa persona. */
  voci: string[];
  admin: boolean;
}) {
  const [tappe, setTappe] = useState<Pronta[] | null>(null);
  const [i, setI] = useState(0);
  const [rett, setRett] = useState<DOMRect | null>(null);
  const [vista, setVista] = useState({ l: 0, a: 0 });
  const riquadro = useRef<HTMLDivElement>(null);
  const [altezza, setAltezza] = useState(180);
  const vociRef = useRef(voci);
  vociRef.current = voci;
  const partito = useRef(false);

  const avvia = useCallback(() => {
    const pronte = preparaTappe(new Set(vociRef.current), admin);
    setI(0);
    setTappe(pronte);
  }, [admin]);

  const chiudi = useCallback(() => {
    setTappe(null);
    // visto, o saltato: non riparte da solo. Se non si riesce a segnarlo,
    // riparte al prossimo accesso, che è il male minore
    void segnaGiroVisto().catch(() => null);
  }, []);

  // la prima volta parte da solo, appena la pagina si è sistemata
  useEffect(() => {
    if (!automatico || partito.current) return;
    partito.current = true;
    const t = setTimeout(avvia, 700);
    return () => clearTimeout(t);
  }, [automatico, avvia]);

  // e dal chip col nome, quando lo si chiede
  useEffect(() => {
    window.addEventListener(EVENTO, avvia);
    return () => window.removeEventListener(EVENTO, avvia);
  }, [avvia]);

  const tappa = tappe?.[i];

  // dove sta la cosa da accendere: si rimisura a ogni scorrimento e
  // ridimensionamento, perché l'intestazione del telefono si nasconde e la
  // colonna del menu scorre
  useLayoutEffect(() => {
    if (!tappa) return;
    const el = tappa.el;
    if (el && el.isConnected) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const misura = () => {
      setVista({ l: window.innerWidth, a: window.innerHeight });
      setRett(el && el.isConnected ? el.getBoundingClientRect() : null);
      if (riquadro.current) setAltezza(riquadro.current.offsetHeight);
    };
    misura();
    const raf = requestAnimationFrame(misura);
    window.addEventListener('resize', misura);
    window.addEventListener('scroll', misura, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', misura);
      window.removeEventListener('scroll', misura, true);
    };
  }, [tappa]);

  // da tastiera: frecce per muoversi, Esc per uscire
  useEffect(() => {
    if (!tappe) return;
    const tasti = (e: KeyboardEvent) => {
      if (e.key === 'Escape') chiudi();
      else if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, tappe.length - 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    document.addEventListener('keydown', tasti);
    return () => document.removeEventListener('keydown', tasti);
  }, [tappe, chiudi]);

  if (!tappe || !tappa || typeof document === 'undefined') return null;

  const ultima = i === tappe.length - 1;
  const larghezza = Math.min(360, vista.l - 2 * MARGINE);

  // il riquadro sta dalla parte dove c'è più spazio: sotto una cosa in alto,
  // sopra una cosa in basso, accanto alla colonna del menu sul computer
  let pos: React.CSSProperties;
  if (!rett) {
    pos = {
      left: (vista.l - larghezza) / 2,
      top: Math.max(MARGINE, (vista.a - altezza) / 2),
    };
  } else {
    const alto = rett.height > vista.a * 0.6;
    // la colonna del menu e le sue voci, sul computer: il riquadro sta accanto,
    // non sopra le voci vicine
    const aSinistra = rett.left < vista.l / 3 && rett.width < vista.l / 3;
    if ((alto || aSinistra) && rett.right + BORDO + 2 * MARGINE + larghezza <= vista.l) {
      const centro = alto ? vista.a / 2 : rett.top + rett.height / 2;
      pos = {
        left: rett.right + BORDO + MARGINE,
        top: Math.max(MARGINE, Math.min(centro - altezza / 2, vista.a - altezza - MARGINE)),
      };
    } else {
      const left = Math.max(
        MARGINE,
        Math.min(rett.left + rett.width / 2 - larghezza / 2, vista.l - larghezza - MARGINE),
      );
      const sotto = rett.bottom + BORDO + MARGINE;
      const top =
        sotto + altezza <= vista.a - MARGINE || rett.top < vista.a / 2
          ? Math.min(sotto, vista.a - altezza - MARGINE)
          : Math.max(MARGINE, rett.top - BORDO - MARGINE - altezza);
      pos = { left, top };
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Giro guidato">
      {/* il velo, con il buco sulla cosa di cui si parla; un tocco fuori non
          chiude: si chiude dalla X o da «Salta», non per sbaglio */}
      {rett ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-lg ring-2 ring-nvg transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{
            left: rett.left - BORDO,
            top: rett.top - BORDO,
            width: rett.width + 2 * BORDO,
            height: rett.height + 2 * BORDO,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.62)',
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-black/60" />
      )}

      <div
        ref={riquadro}
        style={{ ...pos, width: larghezza }}
        className="fixed rounded-xl border border-line bg-surface p-4 shadow-2xl transition-[left,top] duration-300 ease-out motion-reduce:transition-none"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="num text-[10px] uppercase tracking-[0.2em] text-nvg">
            {i + 1} di {tappe.length}
          </p>
          <button
            type="button"
            onClick={chiudi}
            className="-mr-1.5 -mt-1.5 rounded-md p-1.5 text-muted hover:text-ink"
            aria-label="Chiudi il giro guidato"
          >
            <Icona nome="chiudi" size={15} />
          </button>
        </div>
        <h2 className="mt-1 text-base font-semibold">{tappa.titolo}</h2>
        <p className="mt-1.5 text-sm text-ink/85">{tappa.testo}</p>
        {tappa.inMenu && (
          <p className="mt-2 text-xs text-muted">Sul telefono la trovi qui, dentro «Menu».</p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          {i === 0 ? (
            <button type="button" onClick={chiudi} className="btn-ghost btn-sm">
              Salta
            </button>
          ) : (
            <button type="button" onClick={() => setI(i - 1)} className="btn-ghost btn-sm">
              Indietro
            </button>
          )}
          {/* i passi, come puntini: quanto manca si vede senza contare */}
          <span className="hidden gap-1 sm:flex" aria-hidden>
            {tappe.map((_, n) => (
              <span
                key={n}
                className={`h-1.5 w-1.5 rounded-full ${n === i ? 'bg-nvg' : 'bg-surface2'}`}
              />
            ))}
          </span>
          <button
            type="button"
            onClick={() => (ultima ? chiudi() : setI(i + 1))}
            className="btn-primary btn-sm"
            autoFocus
          >
            {ultima ? 'Fine' : i === 0 ? 'Cominciamo' : 'Avanti'}
            {!ultima && <Icona nome="freccia" size={14} />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
