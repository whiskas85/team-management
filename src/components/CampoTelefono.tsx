'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icona } from './Icona';

type Contatto = { numero: string; nome: string | null; notify: string | null; gruppi: string[] };

/**
 * Se la rubrica WhatsApp c'è, per chi guarda: una domanda sola per pagina,
 * anche con dieci campi telefono. Chi non gestisce anagrafiche, o un ponte
 * spento, risponde «no» e i campi restano campi normali.
 */
let disponibile: Promise<boolean> | null = null;
function rubricaDisponibile() {
  disponibile ??= fetch('/api/whatsapp/contatti')
    .then((r) => r.json())
    .then((d: { collegato?: boolean }) => Boolean(d.collegato))
    .catch(() => false);
  return disponibile;
}

/** I numeri italiani come li scrive il resto del gestionale: senza +39. */
function comeNumero(cifre: string) {
  return cifre.startsWith('39') && cifre.length >= 11 && cifre.length <= 13
    ? cifre.slice(2)
    : `+${cifre}`;
}

/**
 * Un campo telefono che, finché è vuoto, offre la rubrica del WhatsApp
 * collegato: l'icona sulla destra apre una ricerca per nome, numero o gruppo,
 * e il numero scelto finisce nel campo.
 *
 * Con `campoNome` riempie anche il nome della persona, se è ancora vuoto: lo
 * cerca vicino — nello stesso `[data-gruppo-contatto]`, se c'è, altrimenti
 * nello stesso modulo.
 */
export function CampoTelefono({
  name,
  defaultValue,
  required,
  placeholder,
  id,
  campoNome,
  className = 'input',
  ariaLabel,
}: {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  id?: string;
  campoNome?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [valore, setValore] = useState(defaultValue ?? '');
  const [conRubrica, setConRubrica] = useState(false);
  const [aperta, setAperta] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    void rubricaDisponibile().then((si) => vivo && setConRubrica(si));
    return () => {
      vivo = false;
    };
  }, []);

  const scegli = (c: Contatto) => {
    setValore(comeNumero(c.numero));
    setAperta(false);
    const nome = c.nome ?? c.notify;
    if (campoNome && nome && campo.current) {
      const vicino = campo.current.closest('[data-gruppo-contatto]') ?? campo.current.form;
      const bersaglio = vicino?.querySelector<HTMLInputElement>(`[name="${campoNome}"]`);
      if (bersaglio && !bersaglio.value.trim()) bersaglio.value = nome;
    }
    campo.current?.focus();
  };

  const mostraIcona = conRubrica && !valore.trim();

  return (
    <div className="relative">
      <input
        ref={campo}
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        required={required}
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={valore}
        onChange={(e) => setValore(e.target.value)}
        className={`${className} ${mostraIcona ? 'pr-10' : ''}`}
      />
      {mostraIcona && (
        <button
          type="button"
          onClick={() => setAperta(true)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#25D366] hover:bg-[#25D366]/10"
          title="Cerca nella rubrica WhatsApp"
          aria-label="Cerca nella rubrica WhatsApp"
        >
          <Icona nome="whatsapp" size={17} />
        </button>
      )}
      {aperta && <CercaRubrica onScegli={scegli} onChiudi={() => setAperta(false)} />}
    </div>
  );
}

/** La ricerca, in alto sullo schermo come una omnibar: scrivi, frecce, invio. */
function CercaRubrica({
  onScegli,
  onChiudi,
}: {
  onScegli: (c: Contatto) => void;
  onChiudi: () => void;
}) {
  const [q, setQ] = useState('');
  const [risultati, setRisultati] = useState<Contatto[]>([]);
  const [totale, setTotale] = useState<number | null>(null);
  const [attesa, setAttesa] = useState(false);
  const [scelto, setScelto] = useState(0);
  const elenco = useRef<HTMLUListElement>(null);

  // la pagina sotto non scorre; si rimette com'era, anche se sotto c'è
  // un'altra finestra che l'aveva già bloccata
  useEffect(() => {
    const prima = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prima;
    };
  }, []);

  useEffect(() => {
    const testo = q.trim();
    if (!testo) {
      setRisultati([]);
      return;
    }
    setAttesa(true);
    const ferma = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/whatsapp/contatti?q=${encodeURIComponent(testo)}`, { signal: ferma.signal })
        .then((r) => r.json())
        .then((d: { contatti: Contatto[]; totale: number }) => {
          setRisultati(d.contatti ?? []);
          setTotale(d.totale ?? 0);
          setScelto(0);
          setAttesa(false);
        })
        .catch(() => setAttesa(false));
    }, 180);
    return () => {
      clearTimeout(t);
      ferma.abort();
    };
  }, [q]);

  useEffect(() => {
    elenco.current
      ?.querySelector<HTMLElement>(`[data-indice="${scelto}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [scelto]);

  const tasti = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      // chiude solo lei: la finestra sotto, se c'è, resta aperta
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onChiudi();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setScelto((s) => Math.min(s + 1, risultati.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setScelto((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      // l'invio sceglie, non manda il modulo che sta sotto
      e.preventDefault();
      if (risultati[scelto]) onScegli(risultati[scelto]);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onChiudi} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cerca nella rubrica WhatsApp"
        className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <span className="text-[#25D366]">
            <Icona nome="whatsapp" size={18} />
          </span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={tasti}
            placeholder="Cerca per nome, numero o gruppo…"
            aria-label="Cerca nella rubrica WhatsApp"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-base outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={onChiudi}
            className="shrink-0 p-1 text-muted hover:text-ink"
            aria-label="Chiudi"
          >
            <Icona nome="chiudi" size={16} />
          </button>
        </div>

        <ul ref={elenco} className="min-h-0 overflow-y-auto py-1 empty:hidden" role="listbox">
          {risultati.map((c, i) => {
            const nome = c.nome ?? c.notify ?? 'Senza nome';
            return (
              <li key={c.numero} role="option" aria-selected={i === scelto}>
                <button
                  type="button"
                  data-indice={i}
                  onMouseEnter={() => setScelto(i)}
                  onClick={() => onScegli(c)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                    i === scelto ? 'bg-surface2' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{nome}</span>
                    <span className="block truncate text-xs text-muted">
                      {c.nome && c.notify && c.notify !== c.nome && <>~{c.notify} · </>}
                      {c.gruppi.length > 0 && c.gruppi.slice(0, 2).join(', ')}
                    </span>
                  </span>
                  <span className="num shrink-0 text-xs text-muted">+{c.numero}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
          {!q.trim()
            ? 'Scrivi un nome, un pezzo di numero o il nome di un gruppo.'
            : attesa
              ? 'Cerco…'
              : risultati.length === 0
                ? totale === 0
                  ? 'La rubrica è ancora vuota: si riempie mentre il telefono collegato si sincronizza.'
                  : 'Nessuno trovato.'
                : '↑↓ per scorrere · Invio per scegliere · Esc per chiudere'}
        </p>
      </div>
    </div>,
    document.body,
  );
}
