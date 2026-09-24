'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Una riga che resta in cima mentre si scorre, subito sotto la barra dell'app.
 *
 * «Subito sotto» cambia di continuo: sul telefono la barra si nasconde quando
 * si scende e ricompare quando si risale, e nel test c'è anche la striscia
 * gialla dell'ambiente. Un `top` scritto a mano sarebbe giusto in un caso e
 * sbagliato negli altri — o un buco sopra la riga, o la riga sotto la barra.
 * Qui si guarda dove finisce davvero quello che c'è sopra, e ci si attacca lì.
 */
export function TestataFissa({ children }: { children: ReactNode }) {
  const [sopra, setSopra] = useState(0);
  const [staccata, setStaccata] = useState(false);
  const riga = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let giro = 0;
    let finoA = 0;

    const misura = () => {
      // le fasce fisse in cima: la striscia del test e la barra dell'app
      const fasce = [...document.querySelectorAll<HTMLElement>('body > * [class*="sticky"][class*="top-0"]')]
        .filter((el) => el !== riga.current && !riga.current?.contains(el))
        .filter((el) => !el.closest('[role="dialog"]'));
      const fondo = fasce.reduce((m, el) => Math.max(m, el.getBoundingClientRect().bottom), 0);
      setSopra(Math.max(0, Math.round(fondo)));
      const r = riga.current?.getBoundingClientRect();
      setStaccata(!!r && window.scrollY > 0 && r.top <= Math.max(0, fondo) + 1);
    };

    // mentre la barra scorre dentro o fuori si rimisura a ogni fotogramma,
    // altrimenti la riga la seguirebbe a scatti
    const inseguiPer = (ms: number) => {
      finoA = performance.now() + ms;
      if (giro) return;
      const passo = () => {
        misura();
        giro = performance.now() < finoA ? requestAnimationFrame(passo) : 0;
      };
      giro = requestAnimationFrame(passo);
    };

    // subito, e poi per tutta l'animazione della barra: se i fotogrammi si
    // fermano — scheda in secondo piano, risparmio energetico — la misura
    // del momento c'e' comunque
    const alloScroll = () => {
      misura();
      inseguiPer(300);
    };
    misura();
    window.addEventListener('scroll', alloScroll, { passive: true });
    window.addEventListener('resize', alloScroll);
    return () => {
      window.removeEventListener('scroll', alloScroll);
      window.removeEventListener('resize', alloScroll);
      if (giro) cancelAnimationFrame(giro);
    };
  }, []);

  return (
    <div
      ref={riga}
      style={{ top: sopra }}
      className={`sticky z-20 -mx-4 mb-2 px-4 py-2 transition-colors md:-mx-8 md:px-8 ${
        staccata ? 'border-b border-line bg-bg/95 backdrop-blur-sm' : 'border-b border-transparent'
      }`}
    >
      {children}
    </div>
  );
}
