import type { ReactNode } from 'react';

/**
 * Maniglia (senza chiocciola) -> cosa c'è dietro.
 *
 * Una persona è un nome da mostrare al passaggio del mouse. Un documento è un
 * nome **e un indirizzo**: la chiocciola diventa un link che lo apre.
 */
export type Menzioni = Record<string, string | { nome: string; href: string }>;

/**
 * Le immagini: solo da indirizzi sicuri o da casa nostra.
 *
 * Un'immagine si carica da sola appena si apre la pagina, senza che nessuno la
 * tocchi: da un indirizzo `http` in chiaro, o da uno strano, sarebbe un modo
 * per sapere chi ha letto cosa e quando. Restano `https` e i nostri `/api/`.
 */
const immagineAmmessa = (url: string) => /^https:\/\//.test(url) || url.startsWith('/api/');

/**
 * Un Markdown ridotto all'osso: titoli, elenchi, citazioni, righe orizzontali,
 * grassetto, corsivo, codice e collegamenti.
 *
 * Niente libreria per due motivi. Il primo è che questo basta a uno statuto e a
 * un regolamento, e una dipendenza in più va aggiornata per sempre. Il secondo
 * conta di più: qui si producono elementi React, non HTML da iniettare nella
 * pagina — così quello che si scrive nella casella di testo resta testo, e non
 * può diventare codice.
 */

/** Grassetto, corsivo, codice e collegamenti dentro una riga. */
function inline(testo: string, chiave: string, menzioni?: Menzioni): ReactNode[] {
  const pezzi: ReactNode[] = [];
  // l'ordine conta: il grassetto (**) va cercato prima del corsivo (*)
  const regola =
    /(!\[[^\]]*\]\(([^)\s]+)\)|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|@[a-zA-Z0-9._-]{2,})/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let n = 0;

  while ((m = regola.exec(testo)) !== null) {
    if (m.index > ultimo) pezzi.push(testo.slice(ultimo, m.index));
    const t = m[0];
    const k = `${chiave}-${n++}`;

    if (t.startsWith('![')) {
      const alt = t.slice(2, t.indexOf(']'));
      const url = m[2];
      pezzi.push(
        immagineAmmessa(url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={url} alt={alt} className="my-2 block max-h-96 max-w-full rounded-md" />
        ) : (
          t
        ),
      );
    } else if (t.startsWith('**')) pezzi.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('~~')) pezzi.push(<del key={k}>{t.slice(2, -2)}</del>);
    else if (t.startsWith('`')) {
      pezzi.push(
        <code key={k} className="rounded bg-surface2 px-1 py-0.5 text-[0.9em]">
          {t.slice(1, -1)}
        </code>,
      );
    } else if (t.startsWith('[')) {
      const testoLink = t.slice(1, t.indexOf(']'));
      const url = m[3];
      pezzi.push(
        <a
          key={k}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-nvg underline underline-offset-2"
        >
          {testoLink}
        </a>,
      );
    } else if (t.startsWith('@')) {
      // una chiocciola si evidenzia solo se dietro c'è davvero qualcuno: chi
      // annota di corsa scrive "@campo" intendendo il posto, e colorarlo
      // farebbe credere di aver nominato una persona
      // Il punto finale di una frase non fa parte della maniglia: «leggi
      // @verbale.pdf.» deve trovare il verbale, non cercare «verbale.pdf.»
      const scritto = t.slice(1).toLowerCase();
      const pulito = scritto.replace(/[._-]+$/, '');
      const chi = menzioni?.[scritto] ?? menzioni?.[pulito];
      const avanzo = menzioni?.[scritto] ? '' : t.slice(1 + pulito.length);
      if (chi && typeof chi === 'object') {
        pezzi.push(
          <a
            key={k}
            href={chi.href}
            target="_blank"
            rel="noreferrer"
            title={`Apri ${chi.nome}`}
            className="rounded bg-nvg/15 px-1 font-medium text-nvg underline-offset-2 hover:underline"
          >
            📎 {chi.nome}
          </a>,
          avanzo,
        );
      } else {
        pezzi.push(
          chi ? (
            <span key={k} title={chi} className="rounded bg-nvg/15 px-1 font-medium text-nvg">
              @{menzioni?.[scritto] ? scritto : pulito}
            </span>
          ) : (
            t
          ),
          chi ? avanzo : '',
        );
      }
    } else pezzi.push(<em key={k}>{t.slice(1, -1)}</em>);

    ultimo = m.index + t.length;
  }

  if (ultimo < testo.length) pezzi.push(testo.slice(ultimo));
  return pezzi;
}

export function Markdown({ testo, menzioni }: { testo: string; menzioni?: Menzioni }) {
  const righe = testo.replace(/\r\n/g, '\n').split('\n');
  const blocchi: ReactNode[] = [];

  // le righe di un elenco o di un paragrafo si accumulano finché non finiscono
  let elenco: { ordinato: boolean; voci: string[] } | null = null;
  let paragrafo: string[] = [];
  // un blocco di codice raccoglie tutto com'è, finché non si chiude
  let codice: string[] | null = null;
  let tabella: string[] = [];

  const chiudiElenco = () => {
    if (!elenco) return;
    const { ordinato, voci } = elenco;
    const classe = 'my-3 space-y-1 pl-5 text-sm ' + (ordinato ? 'list-decimal' : 'list-disc');
    blocchi.push(
      ordinato ? (
        <ol key={`l${blocchi.length}`} className={classe}>
          {voci.map((v, i) => (
            <li key={i}>{inline(v, `l${blocchi.length}-${i}`, menzioni)}</li>
          ))}
        </ol>
      ) : (
        <ul key={`l${blocchi.length}`} className={classe}>
          {voci.map((v, i) => {
            // «- [ ]» e «- [x]»: le cose da fare, con la casella al posto del pallino
            const fatto = v.match(/^\[( |x|X)\]\s+(.*)$/);
            return fatto ? (
              <li key={i} className="-ml-5 flex list-none items-baseline gap-2">
                <input type="checkbox" checked={fatto[1] !== ' '} readOnly disabled className="translate-y-0.5" />
                <span className={fatto[1] !== ' ' ? 'text-muted line-through' : ''}>
                  {inline(fatto[2], `l${blocchi.length}-${i}`, menzioni)}
                </span>
              </li>
            ) : (
              <li key={i}>{inline(v, `l${blocchi.length}-${i}`, menzioni)}</li>
            );
          })}
        </ul>
      ),
    );
    elenco = null;
  };

  const chiudiParagrafo = () => {
    if (paragrafo.length === 0) return;
    blocchi.push(
      <p key={`p${blocchi.length}`} className="my-3 text-sm leading-relaxed">
        {inline(paragrafo.join(' '), `p${blocchi.length}`, menzioni)}
      </p>,
    );
    paragrafo = [];
  };

  /*
   * Una tabella: la prima riga è l'intestazione, la seconda i trattini che la
   * separano. Una riga di trattini sola non è una tabella: la si lascia
   * com'è, invece di inventarsi colonne che chi scriveva non voleva.
   */
  const chiudiTabella = () => {
    if (tabella.length === 0) return;
    const celle = (r: string) =>
      r
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());
    const separatore = tabella.length >= 2 && /^\s*\|?\s*:?-{2,}/.test(tabella[1]);
    if (!separatore) {
      paragrafo.push(...tabella);
      tabella = [];
      chiudiParagrafo();
      return;
    }
    const k = `t${blocchi.length}`;
    const testa = celle(tabella[0]);
    const corpo = tabella.slice(2).map(celle);
    blocchi.push(
      <div key={k} className="my-3 overflow-x-auto">
        <table className="tabella text-sm">
          <thead>
            <tr>
              {testa.map((c, i) => (
                <th key={i}>{inline(c, `${k}-h${i}`, menzioni)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {corpo.map((r, j) => (
              <tr key={j}>
                {testa.map((_, i) => (
                  <td key={i}>{inline(r[i] ?? '', `${k}-${j}-${i}`, menzioni)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tabella = [];
  };

  const chiudiTutto = () => {
    chiudiParagrafo();
    chiudiElenco();
    chiudiTabella();
  };

  for (const riga of righe) {
    const r = riga.trimEnd();

    // dentro un blocco di codice non vale nessuna regola: si copia com'è
    if (codice) {
      if (/^\s*```/.test(r)) {
        blocchi.push(
          <pre
            key={`c${blocchi.length}`}
            className="my-3 overflow-x-auto rounded-md bg-surface2 px-3 py-2 text-xs leading-relaxed"
          >
            <code>{codice.join('\n')}</code>
          </pre>,
        );
        codice = null;
      } else codice.push(riga);
      continue;
    }
    if (/^\s*```/.test(r)) {
      chiudiTutto();
      codice = [];
      continue;
    }

    if (/^\s*\|/.test(r)) {
      chiudiParagrafo();
      chiudiElenco();
      tabella.push(r);
      continue;
    }
    chiudiTabella();

    if (!r.trim()) {
      chiudiTutto();
      continue;
    }

    const titolo = r.match(/^(#{1,4})\s+(.*)$/);
    if (titolo) {
      chiudiTutto();
      const livello = titolo[1].length;
      const testoTitolo = inline(titolo[2], `h${blocchi.length}`, menzioni);
      const classe =
        livello === 1
          ? 'mt-6 mb-2 text-xl font-semibold'
          : livello === 2
            ? 'mt-6 mb-2 text-base font-semibold text-nvg'
            : 'mt-4 mb-1 text-sm font-semibold';
      blocchi.push(
        livello === 1 ? (
          <h2 key={blocchi.length} className={classe}>
            {testoTitolo}
          </h2>
        ) : livello === 2 ? (
          <h3 key={blocchi.length} className={classe}>
            {testoTitolo}
          </h3>
        ) : (
          <h4 key={blocchi.length} className={classe}>
            {testoTitolo}
          </h4>
        ),
      );
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(r.trim())) {
      chiudiTutto();
      blocchi.push(<hr key={blocchi.length} className="my-5 border-line" />);
      continue;
    }

    const citazione = r.match(/^>\s?(.*)$/);
    if (citazione) {
      chiudiTutto();
      blocchi.push(
        <blockquote
          key={blocchi.length}
          className="my-3 border-l-2 border-nvg/40 pl-3 text-sm italic text-ink/80"
        >
          {inline(citazione[1], `q${blocchi.length}`, menzioni)}
        </blockquote>,
      );
      continue;
    }

    const puntato = r.match(/^\s*[-*+]\s+(.*)$/);
    const numerato = r.match(/^\s*\d+[.)]\s+(.*)$/);
    if (puntato || numerato) {
      chiudiParagrafo();
      const ordinato = !!numerato;
      if (elenco && elenco.ordinato !== ordinato) chiudiElenco();
      if (!elenco) elenco = { ordinato, voci: [] };
      elenco.voci.push((puntato ?? numerato)![1]);
      continue;
    }

    chiudiElenco();
    paragrafo.push(r.trim());
  }

  // un blocco di codice lasciato aperto si mostra lo stesso: perdere il testo
  // perché manca la chiusura sarebbe punire una svista
  if (codice) {
    blocchi.push(
      <pre key={`c${blocchi.length}`} className="my-3 overflow-x-auto rounded-md bg-surface2 px-3 py-2 text-xs">
        <code>{(codice as string[]).join('\n')}</code>
      </pre>,
    );
  }
  chiudiTutto();

  return <div className="max-w-3xl">{blocchi}</div>;
}
