'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icona } from './Icona';
import type { VoceMenu } from './Nav';

/**
 * La riga per andare dove si vuole, senza cercarla nel menu.
 *
 * **Solo sul computer**, ed è una scelta: sul telefono la tastiera si mangia
 * metà schermo e le voci sono già a portata di pollice nella barra in basso.
 * Qui invece la colonna di sinistra è lunga — comando, amministrazione,
 * segreteria — e chi ci lavora tutto il giorno sa già dove vuole andare:
 * scrivere «tar» e premere invio è più corto che cercare *Tariffario* con
 * l'occhio.
 *
 * Cerca **fra le voci che questa persona può vedere**: il menu è già filtrato
 * dai permessi, e questa riga non ne conosce altre. Nessuno può scoprire da
 * qui una pagina che non gli spetta.
 */
export function Omnisearch({ voci }: { voci: VoceMenu[] }) {
  const [testo, setTesto] = useState('');
  const [scelto, setScelto] = useState(0);
  const [aperto, setAperto] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const contenitore = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const risultati = useMemo(() => cerca(voci, testo), [voci, testo]);

  // Ctrl+K (o cmd+K sul Mac): la scorciatoia che chi usa altri programmi
  // prova per istinto. Anche "/" da sola, come nei gestori di posta.
  useEffect(() => {
    const tasti = (e: KeyboardEvent) => {
      const scrivendo =
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !scrivendo)) {
        e.preventDefault();
        campo.current?.focus();
        campo.current?.select();
      }
    };
    window.addEventListener('keydown', tasti);
    return () => window.removeEventListener('keydown', tasti);
  }, []);

  // un clic fuori chiude l'elenco: restare aperto sopra la pagina che si sta
  // già guardando è solo un ostacolo
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: MouseEvent) => {
      if (!contenitore.current?.contains(e.target as Node)) setAperto(false);
    };
    document.addEventListener('mousedown', fuori);
    return () => document.removeEventListener('mousedown', fuori);
  }, [aperto]);

  const vai = (href?: string) => {
    const dove = href ?? risultati[scelto]?.href;
    if (!dove) return;
    setAperto(false);
    setTesto('');
    campo.current?.blur();
    router.push(dove);
  };

  return (
    <div ref={contenitore} className="relative mx-auto hidden w-full max-w-sm md:block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <Icona nome="cerca" size={15} />
      </span>

      <input
        ref={campo}
        value={testo}
        onChange={(e) => {
          setTesto(e.target.value);
          setScelto(0);
          setAperto(true);
        }}
        onFocus={() => setAperto(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setScelto((s) => Math.min(s + 1, risultati.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setScelto((s) => Math.max(s - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            vai();
          } else if (e.key === 'Escape') {
            setAperto(false);
            campo.current?.blur();
          }
        }}
        placeholder="Vai a…"
        aria-label="Cerca nel menu"
        className="input h-9 w-full pl-9 pr-12 text-sm"
      />

      {/* la scorciatoia si impara vedendola scritta, non leggendo un manuale */}
      {!testo && (
        <span className="num pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 py-px text-[10px] text-muted">
          ctrl K
        </span>
      )}

      {aperto && testo.trim() !== '' && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-2xl">
          {risultati.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">Nessuna voce con questo nome.</p>
          ) : (
            <ul>
              {risultati.map((v, i) => (
                <li key={v.href}>
                  <button
                    type="button"
                    onMouseEnter={() => setScelto(i)}
                    onClick={() => vai(v.href)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                      i === scelto ? 'bg-nvg/10 text-nvg' : 'text-ink/85'
                    }`}
                  >
                    <Icona nome={v.icona} size={16} />
                    <span className="flex-1 truncate">{v.label}</span>
                    {!!v.badge && (
                      <span className="num rounded-full bg-warn/20 px-1.5 text-[10px] text-warn">
                        {v.badge}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-[0.06em] text-muted">
                      {v.gruppo}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Senza accenti e senza maiuscole: «Attività» si trova scrivendo «attivita». */
const normalizza = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Chi scrive «tar» cerca il *Tariffario*, non le *Tessere*: quello che comincia
 * con quelle lettere viene prima di quello che le contiene in mezzo.
 */
function cerca(voci: VoceMenu[], testo: string): VoceMenu[] {
  const q = normalizza(testo.trim());
  if (!q) return [];

  const punteggio = (v: VoceMenu): number => {
    const label = normalizza(v.label);
    if (label.startsWith(q)) return 0;
    if (label.includes(q)) return 1;
    // anche il gruppo conta: «comando» tira su le voci di quel reparto
    if (normalizza(v.gruppo).includes(q)) return 2;
    return -1;
  };

  return voci
    .map((v) => ({ v, p: punteggio(v) }))
    .filter((r) => r.p >= 0)
    .sort((a, b) => a.p - b.p || a.v.label.localeCompare(b.v.label, 'it'))
    .slice(0, 8)
    .map((r) => r.v);
}
