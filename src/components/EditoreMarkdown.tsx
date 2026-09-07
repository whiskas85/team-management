'use client';

import { useRef, useState } from 'react';
import { Icona } from './Icona';
import { Markdown, type Menzioni } from './Markdown';

/**
 * La casella in cui si scrive un testo in Markdown.
 *
 * Non è un editor visuale e non vuole esserlo: quello che si scrive resta il
 * testo che finisce nel database, leggibile anche fuori di qui. I pulsanti
 * mettono i simboli al posto giusto attorno a quello che hai selezionato — chi
 * il Markdown lo sa già scrive dritto e non li guarda nemmeno.
 *
 * L'anteprima usa lo stesso componente che poi mostra il testo per davvero: se
 * qualcosa si vede storto qui, si vedrà storto anche là, e lo scopri subito.
 */

type Persona = { id: string; maniglia: string; nome: string };

// etichette e non icone: "B" e "I" li riconosce chiunque abbia scritto una
// mail, mentre una matita che vuol dire grassetto non la indovina nessuno
const PULSANTI: { etichetta: string; titolo: string; prima: string; dopo: string }[] = [
  { etichetta: 'B', titolo: 'Grassetto', prima: '**', dopo: '**' },
  { etichetta: 'I', titolo: 'Corsivo', prima: '*', dopo: '*' },
  { etichetta: 'Titolo', titolo: 'Titolo di sezione', prima: '## ', dopo: '' },
  { etichetta: 'Elenco', titolo: 'Voce di elenco', prima: '- ', dopo: '' },
  { etichetta: 'Link', titolo: 'Collegamento', prima: '[', dopo: '](https://)' },
];

export function EditoreMarkdown({
  nome,
  valore = '',
  righe = 10,
  segnaposto,
  persone,
  aiuto = true,
}: {
  /** Nome del campo nel form. */
  nome: string;
  valore?: string;
  righe?: number;
  segnaposto?: string;
  /** Se presente, la chiocciola apre l'elenco delle persone. */
  persone?: Persona[];
  aiuto?: boolean;
}) {
  const [testo, setTesto] = useState(valore);
  const [anteprima, setAnteprima] = useState(false);
  const [cerca, setCerca] = useState<{ da: number; testo: string } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const menzioni: Menzioni | undefined = persone
    ? Object.fromEntries(persone.map((p) => [p.maniglia, p.nome]))
    : undefined;

  /** Mette i simboli attorno alla selezione e rimette il cursore dove serve. */
  const avvolgi = (prima: string, dopo: string) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const scelto = testo.slice(a, b);
    const nuovo = testo.slice(0, a) + prima + scelto + dopo + testo.slice(b);
    setTesto(nuovo);

    // senza questo il cursore salta in fondo e si perde il filo del discorso
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + prima.length, a + prima.length + scelto.length);
    });
  };

  /** Guarda se il cursore sta scrivendo una chiocciola, per proporre i nomi. */
  const forseUnaChiocciola = (valore: string, cursore: number) => {
    if (!persone) return;
    const scritto = valore.slice(0, cursore);
    const m = scritto.match(/@([a-zA-Z0-9._-]*)$/);
    setCerca(m ? { da: cursore - m[0].length, testo: m[1].toLowerCase() } : null);
  };

  const completa = (p: Persona) => {
    if (!cerca) return;
    const el = area.current;
    const fine = cerca.da + 1 + cerca.testo.length;
    const nuovo = `${testo.slice(0, cerca.da)}@${p.maniglia} ${testo.slice(fine)}`;
    setTesto(nuovo);
    setCerca(null);

    const posizione = cerca.da + p.maniglia.length + 2;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(posizione, posizione);
    });
  };

  const proposte = cerca
    ? (persone ?? [])
        .filter((p) => p.maniglia.includes(cerca.testo) || p.nome.toLowerCase().includes(cerca.testo))
        .slice(0, 6)
    : [];

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {PULSANTI.map((b) => (
          <button
            key={b.titolo}
            type="button"
            title={b.titolo}
            onClick={() => avvolgi(b.prima, b.dopo)}
            className="rounded border border-line px-2 py-1 text-[11px] text-muted transition-colors hover:border-nvg/50 hover:text-nvg"
          >
            {b.etichetta}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setAnteprima((v) => !v)}
          className={`ml-auto rounded border px-2 py-1 text-[11px] transition-colors ${
            anteprima
              ? 'border-nvg/50 bg-nvg/10 text-nvg'
              : 'border-line text-muted hover:text-ink'
          }`}
        >
          <Icona nome="cerca" size={13} />
          {anteprima ? 'Torna a scrivere' : 'Anteprima'}
        </button>
      </div>

      {/* il testo viaggia sempre nel form, anche mentre si guarda l'anteprima */}
      <textarea name={nome} value={testo} readOnly hidden />

      {anteprima ? (
        <div className="min-h-[8rem] rounded-md border border-line bg-surface2 px-3 py-2">
          {testo.trim() ? (
            <Markdown testo={testo} menzioni={menzioni} />
          ) : (
            <p className="text-sm text-muted">Niente da vedere: non hai ancora scritto.</p>
          )}
        </div>
      ) : (
        <div className="relative">
          <textarea
            ref={area}
            rows={righe}
            value={testo}
            placeholder={segnaposto}
            onChange={(e) => {
              setTesto(e.target.value);
              forseUnaChiocciola(e.target.value, e.target.selectionStart);
            }}
            onClick={(e) => forseUnaChiocciola(testo, e.currentTarget.selectionStart)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && cerca) {
                e.preventDefault();
                setCerca(null);
              }
            }}
            onBlur={() => setTimeout(() => setCerca(null), 150)}
            className="input font-mono text-xs leading-relaxed"
          />

          {proposte.length > 0 && (
            <div className="absolute left-2 right-2 top-full z-20 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-lg sm:w-72">
              {proposte.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => completa(p)}
                  className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface2"
                >
                  <span className="num text-nvg">@{p.maniglia}</span>
                  <span className="min-w-0 truncate text-xs text-muted">{p.nome}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {aiuto && (
        <p className="mt-1.5 text-[11px] text-muted">
          <code>#</code> titoli · <code>-</code> elenchi · <code>**grassetto**</code> ·{' '}
          <code>*corsivo*</code> · <code>&gt;</code> citazioni
          {persone && (
            <>
              {' '}
              · <code>@</code> per nominare qualcuno
            </>
          )}
          . Una riga vuota separa i paragrafi.
        </p>
      )}
    </div>
  );
}
