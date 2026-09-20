'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icona } from './Icona';
import type { VoceMenu } from './Nav';
import { cercaOvunque, type RisultatoRicerca } from '@/actions/ricerca';

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
 * Cerca in due tempi. **Le pagine** — e le viste dentro le pagine, «Calendario
 * · Storico» — sono già in mano al browser e compaiono mentre si scrive, senza
 * aspettare niente. **Le cose** — una giocata, una persona, un regolamento — le
 * sa solo il database: partono dopo un attimo di silenzio, così scrivendo
 * «torneo» non si fanno sei domande al server per arrivare alla settima.
 *
 * Le pagine sono quelle che questa persona può vedere: il menu è già filtrato
 * dai permessi, e questa riga non ne conosce altre. Le cose passano dai
 * permessi veri, quelli del calendario e delle schede, e non da una copia
 * scritta qui — una ricerca che trovasse un pezzo in più di quello che le
 * pagine mostrano sarebbe il modo più silenzioso di far uscire i dati.
 */
export function Omnisearch({ voci }: { voci: VoceMenu[] }) {
  const [testo, setTesto] = useState('');
  const [scelto, setScelto] = useState(0);
  const [aperto, setAperto] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const contenitore = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [trovate, setTrovate] = useState<RisultatoRicerca[]>([]);
  const [cercando, setCercando] = useState(false);

  const dalMenu = useMemo(() => cerca(voci, testo), [voci, testo]);

  /*
   * Un attimo di silenzio prima di chiedere al server.
   *
   * Scrivendo «torneo» si passa per t, to, tor, torn…: senza l'attesa sarebbero
   * sei domande per arrivare alla settima, e le prime sei tornerebbero fuori
   * tempo massimo, magari dopo l'ultima — con l'elenco che si riempie di
   * risultati di due lettere fa.
   */
  useEffect(() => {
    const q = testo.trim();
    if (q.length < 2) {
      setTrovate([]);
      setCercando(false);
      return;
    }
    setCercando(true);
    const attesa = setTimeout(() => {
      let valida = true;
      cercaOvunque(q)
        .then((r) => {
          if (valida) setTrovate(r);
        })
        .catch(() => {
          // la ricerca è un di più: se il server non risponde restano le
          // pagine, che sono già lì
          if (valida) setTrovate([]);
        })
        .finally(() => {
          if (valida) setCercando(false);
        });
      return () => {
        valida = false;
      };
    }, 250);
    return () => clearTimeout(attesa);
  }, [testo]);

  /** Tutto insieme, nell'ordine in cui si scorre con le frecce. */
  const risultati = useMemo(
    () => [
      ...dalMenu.map((v) => ({
        href: v.href,
        titolo: v.label,
        dettaglio: null as string | null,
        gruppo: v.gruppo,
        icona: v.icona,
        badge: v.badge,
      })),
      ...trovate.map((r) => ({
        href: r.href,
        titolo: r.titolo,
        dettaglio: r.dettaglio,
        gruppo: r.gruppo,
        icona: (r.gruppo === 'Persone'
          ? 'profilo'
          : r.gruppo === 'Documenti'
            ? 'bozza'
            : 'calendario') as VoceMenu['icona'],
        badge: undefined,
      })),
    ],
    [dalMenu, trovate],
  );

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
    /* Larga quanto la colonna sotto: il contenitore intorno le dà la stessa
       misura del contenuto, e lei la riempie tutta. */
    <div ref={contenitore} className="relative hidden w-full md:block">
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
        placeholder="Cerca…"
        aria-label="Cerca pagine, attività, persone"
        className="input h-10 w-full pl-9 pr-16 text-sm"
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
            <p className="px-3 py-2.5 text-sm text-muted">
              {cercando ? 'Sto cercando…' : 'Niente con questo nome.'}
            </p>
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
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{v.titolo}</span>
                      {/* la riga sotto distingue due gare che si chiamano
                          uguale: la data, il campo, «contatto» */}
                      {v.dettaglio && (
                        <span className="block truncate text-[11px] text-muted">{v.dettaglio}</span>
                      )}
                    </span>
                    {!!v.badge && (
                      <span className="num rounded-full bg-warn/20 px-1.5 text-[10px] text-warn">
                        {v.badge}
                      </span>
                    )}
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.06em] text-muted">
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

  /*
   * Le pagine e le viste dentro le pagine, nello stesso mucchio.
   *
   * Una vista si cerca col suo nome — «storico», «avvisi», «mese» — e chi la
   * cerca non sta pensando alla pagina che la contiene. Si scrive con il nome
   * di tutte e due, «Calendario · Storico», perché trovata da sola direbbe
   * «Storico» e basta, e di storici ce n'è più d'uno.
   */
  const cercabili: VoceMenu[] = voci.flatMap((v) => [
    v,
    ...(v.sotto ?? []).map((s) => ({ ...v, href: s.href, label: `${v.label} · ${s.label}` })),
  ]);

  const punteggio = (v: VoceMenu): number => {
    const label = normalizza(v.label);
    if (label.startsWith(q)) return 0;
    if (label.includes(q)) return 1;
    // anche il gruppo conta: «comando» tira su le voci di quel reparto
    if (normalizza(v.gruppo).includes(q)) return 2;
    return -1;
  };

  return cercabili
    .map((v) => ({ v, p: punteggio(v) }))
    .filter((r) => r.p >= 0)
    .sort((a, b) => a.p - b.p || a.v.label.localeCompare(b.v.label, 'it'))
    .slice(0, 8)
    .map((r) => r.v);
}
