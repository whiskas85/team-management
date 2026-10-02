'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Il foglio che sale dal fondo: il menu del telefono e tutte le finestre.
 *
 * Un solo meccanismo per tutti, perché chi ha imparato a chiudere il menu
 * tirandolo giù prova lo stesso gesto su ogni finestra:
 *
 * - **sale** dal fondo quando si apre e **scende** quando si chiude, in
 *   qualunque modo — la X, il velo, Esc, un modulo salvato, una voce scelta;
 * - **si tira giù col dito** dalla testata, o dal contenuto quando è già in
 *   cima: segue il dito, e lasciato oltre la soglia scende fino in fondo;
 * - **la testata sta ferma** e scorre solo il contenuto sotto: la barra di
 *   scorrimento comincia sotto il titolo, non gli passa accanto;
 * - la pagina dietro è ferma, non rimbalza e non si ricarica.
 *
 * Dal tablet in su la finestra sta al centro e compare sfumando: il gesto
 * del dito lì non c'è.
 *
 * Il genitore lo monta quando apre e lo smonta in `onChiuso`, che arriva a
 * discesa finita. Per chiudere dall'interno: il `chiudi` che ricevono
 * testata e contenuto, o `useFoglio()`.
 */

const DURATA = 260;
const ContestoFoglio = createContext<{ chiudi: () => void } | null>(null);
export const useFoglio = () => useContext(ContestoFoglio);

export function Foglio({
  onChiuso,
  testata,
  children,
  etichetta,
  maniglia = true,
  esterno = '',
  foglio = '',
  contenuto = '',
  z = 'z-50',
  soloDaDentro = false,
}: {
  onChiuso: () => void;
  testata: (chiudi: () => void) => ReactNode;
  children: (chiudi: () => void) => ReactNode;
  etichetta?: string;
  /** La barretta in cima che dice «si tira giù» (solo sul telefono). */
  maniglia?: boolean;
  /** Classi in più per lo strato che copre lo schermo (es. md:hidden). */
  esterno?: string;
  /** Classi del foglio: larghezza dal tablet in su, altezza massima. */
  foglio?: string;
  /** Classi della parte che scorre: i margini interni. */
  contenuto?: string;
  z?: string;
  /**
   * Si chiude solo dai pulsanti dentro: niente velo, Esc o dito. Per quello
   * che chiuso per sbaglio non si rivede (la password di benvenuto).
   */
  soloDaDentro?: boolean;
}) {
  const [salito, setSalito] = useState(false);
  const [scendendo, setScendendo] = useState(false);
  // quanto il foglio è tirato giù col dito, in pixel
  const [tirato, setTirato] = useState(0);
  const tiratoRef = useRef(0);
  tiratoRef.current = tirato;
  const foglioRef = useRef<HTMLDivElement>(null);
  const scorreRef = useRef<HTMLDivElement>(null);
  const presa = useRef<{ y: number; t: number; valida: boolean } | null>(null);
  const onChiusoRef = useRef(onChiuso);
  onChiusoRef.current = onChiuso;
  const chiudendo = useRef(false);

  // nasce giù, fuori dallo schermo, e al fotogramma dopo sale
  useEffect(() => {
    let f2 = 0;
    const f1 = requestAnimationFrame(() => {
      f2 = requestAnimationFrame(() => setSalito(true));
    });
    return () => {
      cancelAnimationFrame(f1);
      cancelAnimationFrame(f2);
    };
  }, []);

  const chiudi = useCallback(() => {
    if (chiudendo.current) return;
    chiudendo.current = true;
    setScendendo(true);
    setTimeout(() => onChiusoRef.current(), DURATA);
  }, []);

  useEffect(() => {
    if (soloDaDentro) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && chiudi();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [chiudi, soloDaDentro]);

  // La pagina sotto è ferma. Su iPhone «overflow: hidden» sul body non basta:
  // la si inchioda dov'era e la si rimette lì alla chiusura. E niente
  // rimbalzo né «tira per ricaricare» di Android mentre si tira il foglio.
  useEffect(() => {
    const y = window.scrollY;
    const b = document.body.style;
    const radice = document.documentElement.style;
    const prima = {
      position: b.position,
      top: b.top,
      width: b.width,
      overflow: b.overflow,
      rimbalzo: [radice.overscrollBehaviorY, b.overscrollBehaviorY],
    };
    const giaFerma = b.position === 'fixed';
    if (!giaFerma) {
      b.position = 'fixed';
      b.top = `-${y}px`;
      b.width = '100%';
    }
    b.overflow = 'hidden';
    radice.overscrollBehaviorY = 'none';
    b.overscrollBehaviorY = 'none';
    return () => {
      b.position = prima.position;
      b.top = prima.top;
      b.width = prima.width;
      b.overflow = prima.overflow;
      radice.overscrollBehaviorY = prima.rimbalzo[0];
      b.overscrollBehaviorY = prima.rimbalzo[1];
      if (!giaFerma) window.scrollTo(0, y);
    };
  }, []);

  // Mentre il foglio segue il dito nessun altro scorrimento, e la testata non
  // trascina la pagina dietro: l'ascolto è «non passivo» perché React non
  // lascia fermare il tocco dai suoi eventi.
  useEffect(() => {
    const el = foglioRef.current;
    if (!el) return;
    const ferma = (e: TouchEvent) => {
      const t = e.target as Element;
      const scorre = scorreRef.current?.contains(t) || !!t.closest?.('[data-scorre]');
      if (tiratoRef.current > 0 || !scorre) e.preventDefault();
    };
    el.addEventListener('touchmove', ferma, { passive: false });
    return () => el.removeEventListener('touchmove', ferma);
  }, []);

  const telefono = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
  const giu = scendendo || !salito;

  return (
    <div
      className={`fixed inset-0 ${z} flex items-end justify-center sm:items-center sm:p-4 ${esterno}`}
    >
      <div
        className="absolute inset-0 bg-black/70"
        style={{
          // il velo si schiarisce col foglio che se ne va
          opacity: giu ? 0 : 1 - Math.min(tirato / 400, 0.7),
          transition: tirato && !scendendo ? 'none' : `opacity ${DURATA}ms ease-out`,
        }}
        onClick={soloDaDentro ? undefined : chiudi}
      />
      <div
        ref={foglioRef}
        role="dialog"
        aria-modal="true"
        aria-label={etichetta}
        /* whitespace-normal: la finestra spesso si apre da una cella con
           white-space: nowrap, che verrebbe ereditato */
        className={`foglio relative flex max-h-[92dvh] w-full flex-col overflow-hidden whitespace-normal rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl ${foglio}`}
        data-giu={giu ? '' : undefined}
        style={{
          ...(tirato && !scendendo ? { transform: `translateY(${tirato}px)` } : {}),
          transition: tirato && !scendendo ? 'none' : undefined,
        }}
        onTouchStart={(e) => {
          if (!telefono() || soloDaDentro) return;
          const t = e.target as Element;
          const scorre = scorreRef.current;
          presa.current = {
            y: e.touches[0].clientY,
            t: Date.now(),
            // si tira dalla testata, o dal contenuto quando è in cima; mai
            // da un elenco che scorre per conto suo
            valida:
              // né da quello che si trascina col dito per conto suo: il
              // ritaglio della foto, la maniglia di un elenco da riordinare
              !t.closest?.('[data-scorre], .touch-none, [style*="touch-action: none"]') &&
              (!scorre || !scorre.contains(t) || scorre.scrollTop <= 0),
          };
        }}
        onTouchMove={(e) => {
          const p = presa.current;
          if (!p?.valida) return;
          // una pressione lunga è un'altra cosa (il riordino dei preferiti)
          if (Date.now() - p.t > 400 && !tirato) {
            p.valida = false;
            return;
          }
          const dy = e.touches[0].clientY - p.y;
          const scorre = scorreRef.current;
          if (dy > 0 && (!scorre || scorre.scrollTop <= 0)) setTirato(dy);
          else if (tirato) setTirato(0);
        }}
        onTouchEnd={() => {
          presa.current = null;
          if (tirato > 90) chiudi();
          else setTirato(0);
        }}
      >
        {maniglia && !soloDaDentro && (
          <span
            className="mx-auto mt-1.5 block h-1 w-20 shrink-0 rounded-full bg-muted/50 sm:hidden"
            aria-hidden
          />
        )}
        <ContestoFoglio.Provider value={{ chiudi }}>
          {/* sopra il contenuto: gli elenchi che si aprono dalla testata
              (la ricerca) ci passano sopra */}
          <div className="relative z-10 shrink-0">
            {testata(chiudi)}
            {/* Niente riga sotto il titolo: la testata finisce a vetro, come
                la barra in alto delle pagine. Uno strato sfocato scende sotto
                la testata e si spegne con una maschera: il contenuto ci passa
                sotto sfocato e riemerge a fuoco, senza un taglio netto. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-surface via-surface/92 to-transparent backdrop-blur-sm [mask-image:linear-gradient(to_bottom,black_62%,transparent)]"
            />
          </div>
          <div
            ref={scorreRef}
            className={`min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-contain ${
              tirato > 0 ? 'overflow-y-hidden' : 'overflow-y-auto'
            } ${contenuto}`}
          >
            {children(chiudi)}
          </div>
        </ContestoFoglio.Provider>
      </div>
    </div>
  );
}
