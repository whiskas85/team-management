'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { aiutoPer, cercaAiuto } from '@/lib/aiuto';
import { Icona } from './Icona';
import { VoceAiutoVista } from './VoceAiutoVista';

/**
 * Il «?» accanto al titolo di ogni pagina: apre l'aiuto di quella pagina, e
 * sopra una ricerca in tutto l'aiuto — per quando la domanda riguarda
 * un'altra pagina, o non si sa quale.
 */
export function AiutoPagina() {
  const pathname = usePathname();
  const voce = useMemo(() => aiutoPer(pathname), [pathname]);
  const [aperto, setAperto] = useState(false);
  const [cerca, setCerca] = useState('');
  const trovate = useMemo(() => cercaAiuto(cerca), [cerca]);

  useEffect(() => {
    if (!aperto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAperto(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [aperto]);

  const chiudi = () => {
    setAperto(false);
    setCerca('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        title="Aiuto su questa pagina"
        className="rounded-md p-1.5 text-muted transition-colors hover:text-ink"
      >
        <Icona nome="aiuto" size={18} />
        <span className="sr-only">Aiuto su questa pagina</span>
      </button>
      {aperto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={chiudi} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Aiuto"
            className="relative flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <Icona nome="aiuto" size={18} />
              <p className="flex-1 font-semibold">Aiuto</p>
              <button
                type="button"
                onClick={chiudi}
                className="btn-ghost btn-sm"
                aria-label="Chiudi l’aiuto"
              >
                <Icona nome="chiudi" size={15} />
              </button>
            </div>
            <div className="border-b border-line px-5 py-3">
              <label className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <Icona nome="cerca" size={15} />
                </span>
                <input
                  value={cerca}
                  onChange={(e) => setCerca(e.target.value)}
                  className="input pl-9"
                  placeholder="Cerca nell’aiuto: pagare, certificato, invito…"
                  aria-label="Cerca nell’aiuto"
                  autoFocus
                />
              </label>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {cerca.trim() ? (
                trovate.length > 0 ? (
                  <div className="space-y-6">
                    {trovate.slice(0, 8).map((v) => (
                      <VoceAiutoVista key={v.chiave} voce={v} onVai={chiudi} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Niente per «{cerca}». Prova con un’altra parola, o guarda tutto l’aiuto.
                  </p>
                )
              ) : voce ? (
                <VoceAiutoVista voce={voce} link={false} />
              ) : (
                <p className="text-sm text-muted">
                  Per questa pagina non c’è ancora una spiegazione: cerca qui sopra, o apri l’aiuto
                  generale.
                </p>
              )}
              <p className="mt-6 border-t border-line pt-3 text-sm">
                <Link href="/aiuto" onClick={chiudi} className="text-nvg hover:underline">
                  Tutto l’aiuto →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
