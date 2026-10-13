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
      '**grassetto**, *corsivo*, # titolo, - elenco, [testo](https://link), [[Pulsante]](https://link), --- per una riga.',
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

/** I colori del Markdown impaginato: chiaro di partenza, scuro per lo stile della squadra. */
type Tavolozza = { link: string; linea: string; citazione: string; bordo: string; accento: string };

const CHIARA: Tavolozza = {
  link: '#2f7d12',
  linea: '#dddddd',
  citazione: '#555555',
  bordo: '#cccccc',
  accento: '#2f7d12',
};

/** Testo nero o bianco sopra un colore pieno: quello che si legge meglio. */
function inchiostro(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#000000';
  const n = parseInt(m[1], 16);
  const l = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return l > 140 ? '#000000' : '#ffffff';
}

/**
 * Un pulsante che regge in tutti i client di posta: una tabella col colore
 * pieno nella cella (Outlook ignora lo sfondo dei link) e il link sopra.
 */
export function pulsante(testo: string, url: string, accento: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr><td bgcolor="${accento}" style="background:${accento};border-radius:6px"><a href="${linkSicuro(url)}" style="display:inline-block;padding:12px 22px;font:bold 15px/1.2 Arial,Helvetica,sans-serif;color:${inchiostro(accento)};text-decoration:none;border-radius:6px">${testo}</a></td></tr></table>`;
}

/** Grassetto, corsivo, codice e link dentro una riga (già con l'HTML neutralizzato). */
function inLinea(t: string, c: Tavolozza = CHIARA) {
  return t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_, testo: string, url: string) =>
        `<a href="${linkSicuro(url)}" style="color:${c.link}">${testo}</a>`,
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
export function markdownInHtml(md: string, c: Tavolozza = CHIARA): string {
  const righe = esc(md.replace(/\r\n?/g, '\n')).split('\n');
  const fuori: string[] = [];
  let paragrafo: string[] = [];
  let elenco: { tipo: 'ul' | 'ol'; voci: string[] } | null = null;

  const chiudiParagrafo = () => {
    if (paragrafo.length) {
      fuori.push(
        `<p style="margin:0 0 14px">${paragrafo.map((r) => inLinea(r, c)).join('<br>')}</p>`,
      );
      paragrafo = [];
    }
  };
  const chiudiElenco = () => {
    if (elenco) {
      fuori.push(
        `<${elenco.tipo} style="margin:0 0 14px;padding-left:22px">${elenco.voci
          .map((v) => `<li>${inLinea(v, c)}</li>`)
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
    // [[Testo del pulsante]](link): un pulsante pieno, da solo sulla riga
    const bottone = /^\s*\[\[([^\]]+)\]\]\(([^)\s]+)\)\s*$/.exec(riga);
    if (bottone) {
      chiudiParagrafo();
      chiudiElenco();
      fuori.push(pulsante(bottone[1], bottone[2], c.accento));
    } else if (!riga.trim()) {
      chiudiParagrafo();
      chiudiElenco();
    } else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(riga)) {
      chiudiParagrafo();
      chiudiElenco();
      fuori.push(`<hr style="border:0;border-top:1px solid ${c.linea};margin:18px 0">`);
    } else if (titolo) {
      chiudiParagrafo();
      chiudiElenco();
      const n = titolo[1].length;
      const misura = n === 1 ? 22 : n === 2 ? 18 : 16;
      fuori.push(
        `<h${n} style="margin:0 0 12px;font-size:${misura}px">${inLinea(titolo[2], c)}</h${n}>`,
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
        `<blockquote style="margin:0 0 14px;padding-left:12px;border-left:3px solid ${c.bordo};color:${c.citazione}">${inLinea(citazione[1], c)}</blockquote>`,
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

export type StileSquadra = { accento: string; nome: string; motto: string };

/** Il segno che una pagina è nata dallo stile della squadra. */
export const SEGNO_STILE = '<!-- stile-squadra -->';

/**
 * L'email vestita come il gestionale: fondo scuro, la scheda col filo
 * dell'accento in cima, e sotto, come firma, il logo. **Nessuna parola in
 * più**: il testo è tutto e solo quello scritto da chi gestisce.
 *
 * Tutto in tabelle e stili in linea, perché è l'unica cosa che i client di
 * posta capiscono tutti; i colori anche come `bgcolor`, che Outlook rispetta.
 * Il logo è {logoUrl}: lo riempie l'invio con l'indirizzo pubblico del
 * gestionale, così l'immagine è sempre quella caricata in «La mia squadra».
 */
export function paginaSquadra(corpo: string, s: StileSquadra) {
  const font = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
${SEGNO_STILE}
</head>
<body style="margin:0;padding:0;background:#050605">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050605" style="background:#050605">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td bgcolor="#0e110e" style="background:#0e110e;border:1px solid #232a23;border-top:3px solid ${s.accento};border-radius:10px;padding:28px 26px;color:#e7ede7;font:15px/1.6 ${font}">
${corpo}
</td></tr>
<tr><td style="padding:24px 4px 0">
<img src="{logoUrl}" width="64" height="64" alt="${esc(s.nome)}" style="display:block;width:64px;height:64px;border-radius:50%;border:1px solid #232a23">
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** I colori del Markdown dentro lo stile della squadra. */
const scura = (accento: string): Tavolozza => ({
  link: accento,
  linea: '#232a23',
  citazione: '#7f8a7f',
  bordo: accento,
  accento,
});

/** Un testo semplice in HTML così com'è: paragrafi e a capo, niente altro. */
function semplice(testo: string) {
  return esc(testo.replace(/\r\n?/g, '\n').trim())
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/**
 * Un testo trasformato in un'email HTML con lo stile della squadra.
 *
 * **Il testo resta quello**, parola per parola: cambia solo come si presenta.
 * Il Markdown diventa la sua impaginazione (grassetti, elenchi, pulsanti
 * scritti con [[…]](…)), il testo semplice resta testo, con i suoi a capo.
 * Il risultato è HTML normale: si può ritoccare a mano come qualunque altro.
 */
export function inStileSquadra(testo: string, formato: string, s: StileSquadra) {
  const corpo = formato === 'MARKDOWN' ? markdownInHtml(testo, scura(s.accento)) : semplice(testo);
  return paginaSquadra(corpo, s);
}

/** Il pulsante per la pagina dei certificati, da inserire dove si vuole. */
export const PULSANTE_CERTIFICATI = { testo: 'Vai ai miei certificati', url: '{linkCertificati}' };

/** Lo stesso pulsante scritto nel formato dell'email. */
export function pulsanteNelFormato(formato: string, accento: string) {
  const { testo, url } = PULSANTE_CERTIFICATI;
  return formato === 'HTML'
    ? pulsante(esc(testo), url, accento)
    : `[[${testo}]](${url})`;
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
  linkCertificati: 'https://gestionale.esempio.it/certificati',
  linkGestionale: 'https://gestionale.esempio.it',
  logoUrl: '/api/squadra/logo',
};
