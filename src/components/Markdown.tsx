import type { ReactNode } from 'react';

/** Maniglia (senza chiocciola) -> nome da mostrare al passaggio del mouse. */
export type Menzioni = Record<string, string>;

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
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|@[a-zA-Z0-9._-]{2,})/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let n = 0;

  while ((m = regola.exec(testo)) !== null) {
    if (m.index > ultimo) pezzi.push(testo.slice(ultimo, m.index));
    const t = m[0];
    const k = `${chiave}-${n++}`;

    if (t.startsWith('**')) pezzi.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) {
      pezzi.push(
        <code key={k} className="rounded bg-surface2 px-1 py-0.5 text-[0.9em]">
          {t.slice(1, -1)}
        </code>,
      );
    } else if (t.startsWith('[')) {
      const testoLink = t.slice(1, t.indexOf(']'));
      const url = m[2];
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
      const chi = menzioni?.[t.slice(1).toLowerCase()];
      pezzi.push(
        chi ? (
          <span key={k} title={chi} className="rounded bg-nvg/15 px-1 font-medium text-nvg">
            {t}
          </span>
        ) : (
          t
        ),
      );
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
          {voci.map((v, i) => (
            <li key={i}>{inline(v, `l${blocchi.length}-${i}`, menzioni)}</li>
          ))}
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

  const chiudiTutto = () => {
    chiudiParagrafo();
    chiudiElenco();
  };

  for (const riga of righe) {
    const r = riga.trimEnd();

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

  chiudiTutto();

  return <div className="max-w-3xl">{blocchi}</div>;
}
