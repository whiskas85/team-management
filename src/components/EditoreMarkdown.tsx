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

type Pulsante = {
  etichetta: string;
  titolo: string;
  prima: string;
  dopo: string;
  /**
   * Il simbolo va davanti a **ogni riga** scelta, non attorno al blocco.
   *
   * È la differenza fra un elenco e un pasticcio: selezionando tre righe e
   * premendo «Elenco», il trattino va davanti a tutte e tre. Senza, finiva
   * davanti alla prima e le altre restavano un paragrafo solo.
   */
  perRiga?: boolean;
  /** Va a capo prima e dopo: tabelle, righe, blocchi di codice. */
  blocco?: boolean;
};

/*
 * La barra degli strumenti.
 *
 * **Etichette e non icone**: «B» e «I» li riconosce chiunque abbia scritto una
 * mail, mentre una matita che vuol dire grassetto non la indovina nessuno. Chi
 * il Markdown lo sa già scrive dritto e non le guarda; chi non lo sa deve poter
 * scrivere un book di missione senza impararlo.
 *
 * Sono in tre gruppi, nell'ordine in cui servono scrivendo: il testo, la
 * struttura, quello che si attacca.
 */
const PULSANTI: Pulsante[] = [
  // --- il testo
  { etichetta: 'B', titolo: 'Grassetto', prima: '**', dopo: '**' },
  { etichetta: 'I', titolo: 'Corsivo', prima: '*', dopo: '*' },
  { etichetta: 'S', titolo: 'Barrato', prima: '~~', dopo: '~~' },
  { etichetta: '</>', titolo: 'Codice', prima: '`', dopo: '`' },

  // --- la struttura
  { etichetta: 'H1', titolo: 'Titolo', prima: '# ', dopo: '', perRiga: true },
  { etichetta: 'H2', titolo: 'Sezione', prima: '## ', dopo: '', perRiga: true },
  { etichetta: 'H3', titolo: 'Sottosezione', prima: '### ', dopo: '', perRiga: true },
  { etichetta: '\u201c', titolo: 'Citazione', prima: '> ', dopo: '', perRiga: true },
  { etichetta: 'Elenco', titolo: 'Elenco puntato', prima: '- ', dopo: '', perRiga: true },
  { etichetta: '1.', titolo: 'Elenco numerato', prima: '1. ', dopo: '', perRiga: true },
  { etichetta: '\u2610', titolo: 'Cose da fare', prima: '- [ ] ', dopo: '', perRiga: true },

  // --- quello che si attacca
  { etichetta: 'Link', titolo: 'Collegamento', prima: '[', dopo: '](https://)' },
  { etichetta: 'Foto', titolo: 'Immagine', prima: '![', dopo: '](https://)' },
  {
    etichetta: 'Tabella',
    titolo: 'Tabella',
    prima: '| Cosa | Chi | Quando |\n|---|---|---|\n| | | |',
    dopo: '',
    blocco: true,
  },
  { etichetta: 'Codice', titolo: 'Blocco di codice', prima: '```\n', dopo: '\n```', blocco: true },
  { etichetta: '\u2014', titolo: 'Riga di separazione', prima: '---', dopo: '', blocco: true },
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

  /** Mette i simboli al posto giusto e rimette il cursore dove serve. */
  const applica = (b: Pulsante) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: da, selectionEnd: a } = el;

    if (b.perRiga) {
      // si allarga la selezione all'intera riga: un «- » in mezzo a una parola
      // non fa un elenco, fa un trattino in mezzo a una parola
      const inizioRiga = testo.lastIndexOf('\n', da - 1) + 1;
      const fineRiga = testo.indexOf('\n', a) === -1 ? testo.length : testo.indexOf('\n', a);
      const righe = testo.slice(inizioRiga, fineRiga).split('\n');
      // premuto due volte si toglie: è il modo in cui si corregge un errore
      const gia = righe.every((r) => r.startsWith(b.prima));
      const rifatte = righe
        .map((r) => (gia ? r.slice(b.prima.length) : b.prima + r))
        .join('\n');
      const nuovo = testo.slice(0, inizioRiga) + rifatte + testo.slice(fineRiga);
      setTesto(nuovo);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(inizioRiga, inizioRiga + rifatte.length);
      });
      return;
    }

    if (b.blocco) {
      // un blocco vuole aria intorno: attaccato al paragrafo di sopra, il
      // Markdown non lo riconosce nemmeno
      const primaCapo = da > 0 && testo[da - 1] !== '\n' ? '\n\n' : '';
      const scelto = testo.slice(da, a);
      const corpo = b.dopo ? b.prima + scelto + b.dopo : b.prima;
      const dopoCapo = a < testo.length && testo[a] !== '\n' ? '\n\n' : '';
      const nuovo = testo.slice(0, da) + primaCapo + corpo + dopoCapo + testo.slice(a);
      setTesto(nuovo);
      const posizione = da + primaCapo.length + corpo.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(posizione, posizione);
      });
      return;
    }

    const scelto = testo.slice(da, a);
    const nuovo = testo.slice(0, da) + b.prima + scelto + b.dopo + testo.slice(a);
    setTesto(nuovo);

    // senza questo il cursore salta in fondo e si perde il filo del discorso
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(da + b.prima.length, da + b.prima.length + scelto.length);
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
            onClick={() => applica(b)}
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
