/**
 * Il corpo di un'email scritta da chi gestisce: testo semplice, Markdown o
 * HTML, con i segnaposto fra graffe — {nome}, {scadenza}.
 *
 * Sta da solo, senza database né server, perché lo usano tutti e due i lati:
 * il server quando l'email parte, e il modulo per l'anteprima accanto mentre
 * la si scrive. Così quello che si vede è quello che arriva.
 *
 * In HTML e Markdown i valori dei segnaposto entrano **sempre come testo**:
 * un nome con dentro «<» non deve poter diventare un pezzo di pagina.
 */

export type FormatoEmail = 'TESTO' | 'MARKDOWN' | 'HTML';

export const FORMATI: Record<FormatoEmail, { nome: string; spiega: string }> = {
  MARKDOWN: {
    nome: 'Markdown',
    spiega:
      '**grassetto**, *corsivo*, # titolo, - elenco, [testo](https://link), --- per una riga.',
  },
  HTML: {
    nome: 'HTML',
    spiega:
      'Una pagina tua: stili in linea (style="…"), niente script. I client di posta li ignorano.',
  },
  TESTO: { nome: 'Testo semplice', spiega: 'Arriva così com’è scritto, a capo compresi.' },
};

export const esc = (t: string) =>
  t.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** I segnaposto riempiti. Uno conosciuto ma vuoto sparisce; uno sconosciuto resta com'è. */
export function riempi(testo: string, v: Record<string, string>) {
  return testo.replace(/\{(\w+)\}/g, (tutto, k: string) => (k in v ? v[k] : tutto));
}

/** Solo i link che hanno senso in un'email: niente javascript: e simili. */
const linkSicuro = (u: string) =>
  /^(https?:|mailto:|tel:)/i.test(u.trim()) || /^\{\w+\}$/.test(u.trim()) ? u.trim() : '#';

/** Grassetto, corsivo, codice e link dentro una riga (già con l'HTML neutralizzato). */
function inLinea(t: string) {
  return t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_, testo: string, url: string) =>
        `<a href="${linkSicuro(url)}" style="color:#2f7d12">${testo}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
}

/**
 * Il Markdown che serve a un'email, e niente di più: titoli, paragrafi, a capo,
 * grassetto e corsivo, link, elenchi puntati e numerati, citazioni, righe. Chi
 * scrive HTML dentro il Markdown lo vede scritto, non eseguito.
 */
export function markdownInHtml(md: string): string {
  const righe = esc(md.replace(/\r\n?/g, '\n')).split('\n');
  const fuori: string[] = [];
  let paragrafo: string[] = [];
  let elenco: { tipo: 'ul' | 'ol'; voci: string[] } | null = null;

  const chiudiParagrafo = () => {
    if (paragrafo.length) {
      fuori.push(`<p style="margin:0 0 14px">${paragrafo.map(inLinea).join('<br>')}</p>`);
      paragrafo = [];
    }
  };
  const chiudiElenco = () => {
    if (elenco) {
      fuori.push(
        `<${elenco.tipo} style="margin:0 0 14px;padding-left:22px">${elenco.voci
          .map((v) => `<li>${inLinea(v)}</li>`)
          .join('')}</${elenco.tipo}>`,
      );
      elenco = null;
    }
  };

  for (const riga of righe) {
    const titolo = /^(#{1,3})\s+(.*)$/.exec(riga);
    const puntata = /^\s*[-*+]\s+(.*)$/.exec(riga);
    const numerata = /^\s*\d+[.)]\s+(.*)$/.exec(riga);
    const citazione = /^&gt;\s?(.*)$/.exec(riga);
    if (!riga.trim()) {
      chiudiParagrafo();
      chiudiElenco();
    } else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(riga)) {
      chiudiParagrafo();
      chiudiElenco();
      fuori.push('<hr style="border:0;border-top:1px solid #ddd;margin:18px 0">');
    } else if (titolo) {
      chiudiParagrafo();
      chiudiElenco();
      const n = titolo[1].length;
      const misura = n === 1 ? 22 : n === 2 ? 18 : 16;
      fuori.push(
        `<h${n} style="margin:0 0 12px;font-size:${misura}px">${inLinea(titolo[2])}</h${n}>`,
      );
    } else if (puntata || numerata) {
      chiudiParagrafo();
      const tipo = puntata ? 'ul' : 'ol';
      if (elenco && elenco.tipo !== tipo) chiudiElenco();
      elenco ??= { tipo, voci: [] };
      elenco.voci.push((puntata ?? numerata)![1]);
    } else if (citazione) {
      chiudiParagrafo();
      chiudiElenco();
      fuori.push(
        `<blockquote style="margin:0 0 14px;padding-left:12px;border-left:3px solid #ccc;color:#555">${inLinea(citazione[1])}</blockquote>`,
      );
    } else {
      chiudiElenco();
      paragrafo.push(riga);
    }
  }
  chiudiParagrafo();
  chiudiElenco();
  return fuori.join('\n');
}

/** La versione di solo testo di un HTML, per i client che non lo mostrano. */
export function testoDaHtml(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Un corpo HTML qualunque dentro una pagina pulita, se non è già una pagina intera. */
const pagina = (corpo: string) =>
  /<html[\s>]/i.test(corpo)
    ? corpo
    : `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:24px;background:#ffffff;color:#1a1a1a;font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${corpo}</body></html>`;

/** L'email com'è da mandare: la versione HTML e quella di solo testo. */
export function componiCorpo(
  formato: string,
  testo: string,
  valori: Record<string, string>,
): { html: string; testo: string } {
  const sicuri = Object.fromEntries(Object.entries(valori).map(([k, v]) => [k, esc(v)]));
  if (formato === 'HTML') {
    const html = pagina(riempi(testo, sicuri));
    return { html, testo: testoDaHtml(html) };
  }
  if (formato === 'MARKDOWN') {
    return { html: pagina(riempi(markdownInHtml(testo), sicuri)), testo: riempi(testo, valori) };
  }
  const semplice = riempi(testo, valori);
  return {
    html: pagina(`<div style="white-space:pre-wrap">${esc(semplice)}</div>`),
    testo: semplice,
  };
}

/** Valori finti per l'anteprima: si vede com'è fatta, senza i dati di nessuno. */
export const VALORI_ESEMPIO: Record<string, string> = {
  nome: 'Mario',
  cognome: 'Rossi',
  callsign: 'Falco',
  email: 'mario.rossi@esempio.it',
  telefono: '+39 333 123 4567',
  codiceFiscale: 'RSSMRA85M01F205Z',
  dataNascita: '1 ago 1985',
  luogoNascita: 'Milano',
  indirizzo: 'Via Roma 1, 20100 Milano (MI)',
  tipo: 'agonistico',
  rilascio: '12 ott 2026',
  scadenza: '12 ott 2027',
  giorni: '30',
  approvatoDa: 'Luca Bianchi',
  squadra: 'La squadra',
};
