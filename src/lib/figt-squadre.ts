import { aModo, BASE, entra, type CredenzialiFigt } from './figt';

/**
 * Le società affiliate FIGT, lette dal portale federale.
 *
 * Stanno nella pagina delle statistiche del comitato regionale
 * (`statistiche_scheda2.php?annostat=<anno>&idanagrafica=<comitato>`), dietro
 * lo stesso accesso che si usa per le tessere: niente API, solo HTML. Ogni
 * società è un blocco con a sinistra nome, indirizzo, telefono ed email, e a
 * destra la disciplina e le cariche (presidente, vicepresidente, segretario).
 *
 * La stessa pagina si può anche salvare dal browser e caricare a mano — da
 * sola o dentro un HAR — quando l'accesso automatico non c'è.
 */

/** Il comitato regionale Piemonte e Valle d'Aosta. */
export const COMITATO_PREDEFINITO = '14';

export type CaricaPortale = {
  ruolo: string;
  nome: string;
  email: string | null;
  telefono: string | null;
};

export type SquadraPortale = {
  /** Come la scrive il portale, identico: è la chiave per ritrovarla. */
  nomeFigt: string;
  /** Lo stesso nome, scritto a modo. */
  nome: string;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string | null;
  /** «Air soft», «Laser tag»… senza la tutela legale, che non interessa. */
  disciplina: string | null;
  settoreGiovanile: boolean;
  cariche: CaricaPortale[];
};

const ENTITA: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  acute: "'",
  rsquo: "'",
  lsquo: "'",
  deg: '°',
  agrave: 'à',
  egrave: 'è',
  eacute: 'é',
  igrave: 'ì',
  ograve: 'ò',
  ugrave: 'ù',
  Agrave: 'À',
  Egrave: 'È',
  Eacute: 'É',
  Igrave: 'Ì',
  Ograve: 'Ò',
  Ugrave: 'Ù',
};

function testo(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (tutto, nome) => ENTITA[nome] ?? tutto)
    .replace(/´/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
}

/** Le sigle restano sigle: «A.S.D.», «ASD», «101^» non si toccano. */
const SIGLE = new Set(['ASD', 'SSD', 'APS', 'ASSD', 'ADS', 'CSI', 'ACSI']);
export function nomeAModo(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => (p.includes('.') || SIGLE.has(p) || !/[A-Z]/.test(p) ? p : aModo(p)))
    .join(' ');
}

/** «BERTELLO FLAVIO» diventa «Bertello Flavio». */
const personaAModo = (nome: string) => nome.split(/\s+/).filter(Boolean).map(aModo).join(' ');

const telefonoPulito = (t: string | null | undefined) => {
  const n = (t ?? '').replace(/[^\d+]/g, '');
  return n.length >= 6 ? n : null;
};

/** La chiave con cui due nomi della stessa squadra si riconoscono. */
export function chiaveNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(a\.?\s?s\.?\s?d\.?|s\.?\s?s\.?\s?d\.?|aps|associazione|sportiva|dilettantistica)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}

export function leggiSquadre(html: string): SquadraPortale[] {
  const blocchi = html.split(/<div style="border-bottom:\s*solid 1px #666;[^"]*">/i).slice(1);
  return blocchi.flatMap((blocco) => {
    const nomeGrezzo = blocco.match(/<strong>([\s\S]*?)<\/strong>/i)?.[1];
    if (!nomeGrezzo) return [];
    const nomeFigt = testo(nomeGrezzo);
    if (!nomeFigt) return [];

    // la colonna di sinistra: una riga per <div>, nell'ordine del portale
    const sinistra = blocco.split(/<div class="float-left">/i)[0];
    const righe = [...sinistra.matchAll(/<div>([\s\S]*?)<\/div>/gi)]
      .map((m) => ({ html: m[1], testo: testo(m[1]) }))
      .filter((r) => r.testo && !/<strong>/i.test(r.html));

    let indirizzo: string | null = null;
    let cap: string | null = null;
    let citta: string | null = null;
    let provincia: string | null = null;
    let telefono: string | null = null;
    let email: string | null = null;
    for (const r of righe) {
      const posta = r.html.match(/mailto:([^"']+)/i)?.[1];
      const comune = r.testo.match(/^(.*?)\s*(\d{5})\s*\(([A-Z]{2})\)$/);
      if (posta) email = posta.trim().toLowerCase();
      // «T. 3397339853 - F. 0173659859»: il fax non serve a nessuno
      else if (/^T\.\s*/i.test(r.testo))
        telefono = telefonoPulito(r.testo.replace(/^T\.\s*/i, '').split(/\s-\s*F\./i)[0]);
      else if (comune) {
        citta = comune[1].trim() || null;
        cap = comune[2];
        provincia = comune[3];
      } else if (!indirizzo && r.testo !== ',' && r.testo !== '.') {
        indirizzo = r.testo.replace(/\s*,\s*/g, ', ').replace(/,\s*$/, '') || null;
      }
    }

    // la fascia gialla: «AIR SOFT - SETTORE GIOVANILE - TUTELA LEGALE»
    const titolo = testo(blocco.match(/#ffffcc[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] ?? '');
    const voci = titolo
      .split(/\s+-\s+/)
      .map((v) => v.trim())
      .filter(Boolean);
    const settoreGiovanile = voci.some((v) => /settore giovanile/i.test(v));
    const disciplina =
      voci
        .filter((v) => !/tutela legale|settore giovanile/i.test(v))
        .map((v) => v.charAt(0) + v.slice(1).toLowerCase())
        .join(', ') || null;

    const cariche = [
      ...blocco.matchAll(
        /width:\s*115px;?">\s*([^<:]+):\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/gi,
      ),
    ].flatMap((m) => {
      const cella = m[2];
      const posta = cella.match(/mailto:([^"']+)/i)?.[1]?.trim().toLowerCase() ?? null;
      const resto = testo(cella.replace(/<a[\s\S]*?<\/a>/gi, ' '));
      const numero = resto.match(/[+\d][\d\s/.]{5,}$/)?.[0] ?? null;
      const nome = (numero ? resto.slice(0, -numero.length) : resto).trim();
      if (!nome) return [];
      return [
        {
          ruolo: aModo(m[1].trim()),
          nome: personaAModo(nome),
          email: posta,
          telefono: telefonoPulito(numero),
        },
      ];
    });

    return [
      {
        nomeFigt,
        nome: nomeAModo(nomeFigt),
        indirizzo,
        cap,
        citta,
        provincia,
        telefono,
        email,
        disciplina,
        settoreGiovanile,
        cariche,
      },
    ];
  });
}

/**
 * La pagina da un file caricato: l'HTML salvato dal browser, o un HAR — dove
 * si cerca la risposta che contiene l'elenco delle società.
 */
export function htmlDaFile(contenuto: string): string {
  const inizio = contenuto.trimStart();
  if (!inizio.startsWith('{')) return contenuto;
  try {
    const har = JSON.parse(inizio) as {
      log?: {
        entries?: { response?: { content?: { text?: string; encoding?: string } } }[];
      };
    };
    for (const voce of har.log?.entries ?? []) {
      const c = voce.response?.content;
      if (!c?.text) continue;
      const html = c.encoding === 'base64' ? Buffer.from(c.text, 'base64').toString('utf8') : c.text;
      if (/affiliate/i.test(html) && /<strong>/i.test(html)) return html;
    }
  } catch {
    // non era JSON: si prova a leggerlo come pagina
  }
  return contenuto;
}

/** Entra sul portale e legge le società affiliate al comitato, per l'anno. */
export async function scaricaSquadre(
  cred: CredenzialiFigt,
  comitato: string,
  anno: number,
): Promise<SquadraPortale[]> {
  const cookie = await entra(cred);
  const pagina = await fetch(
    `${BASE}/statistiche_scheda2.php?annostat=${anno}&idanagrafica=${encodeURIComponent(comitato)}`,
    { headers: cookie ? { cookie } : {} },
  );
  if (!pagina.ok) throw new Error(`Il portale ha risposto ${pagina.status}.`);
  // il portale scrive in Latin-1: letto come UTF-8 le lettere accentate si rompono
  const byte = new Uint8Array(await pagina.arrayBuffer());
  const tipo = pagina.headers.get('content-type') ?? '';
  const codifica = /utf-?8/i.test(tipo) ? 'utf-8' : 'windows-1252';
  return leggiSquadre(new TextDecoder(codifica).decode(byte));
}
