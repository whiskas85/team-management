/**
 * I colori del gestionale.
 *
 * Due livelli. Il **tema della squadra** lo sceglie l'admin in «La mia
 * squadra» e vale per tutti: un colore d'accento e scuro o chiaro. Poi ognuno,
 * dal suo profilo, può seguirlo (di partenza) o passare a un **tema di
 * accessibilità**: alto contrasto scuro o chiaro, per chi vede poco, e due temi
 * per chi distingue male i colori. Quelli non si colorano: sono pensati per
 * funzionare, e restano come sono.
 *
 * Tutti i colori passano da variabili CSS (`--c-…`, tre numeri r g b) che
 * Tailwind legge: `bg-nvg/10` continua a funzionare, e cambiare tema è
 * cambiare dieci righe in testa alla pagina, non le pagine.
 *
 * **Il contrasto lo garantisce il codice, non chi sceglie.** Un giallo chiaro
 * su tema chiaro renderebbe illeggibile ogni testo verde: qui l'accento si
 * scurisce (o schiarisce) finché non arriva al rapporto minimo delle linee
 * guida WCAG — 4,5:1 per il testo, 7:1 nei temi ad alto contrasto — e sopra i
 * pulsanti pieni il testo è nero o bianco, quello che si legge meglio.
 */

export type ModoTema = 'scuro' | 'chiaro';
export type TemaSquadra = { accento: string; modo: ModoTema };

/** Cosa ha scelto la persona: seguire la squadra, o un tema di accessibilità. */
export const TEMI_PERSONALI = {
  squadra: {
    nome: 'Tema della squadra',
    descrizione: 'I colori scelti dalla squadra. È quello di partenza.',
  },
  'contrasto-scuro': {
    nome: 'Alto contrasto scuro',
    descrizione:
      'Per chi vede poco: bianco su nero, bordi marcati, testo sempre almeno 7 volte più chiaro del fondo.',
  },
  'contrasto-chiaro': {
    nome: 'Alto contrasto chiaro',
    descrizione:
      'Per chi vede poco o sta al sole: nero su bianco, bordi marcati, contrasto massimo.',
  },
  'daltonismo-rv': {
    nome: 'Daltonismo rosso-verde',
    descrizione:
      'Protanopia e deuteranopia, le più comuni: niente rosso contro verde. Conferme in azzurro, avvisi in giallo, errori in arancio-rosso.',
  },
  'daltonismo-by': {
    nome: 'Daltonismo blu-giallo',
    descrizione:
      'Tritanopia: niente blu contro verde né giallo contro viola. Conferme in turchese, avvisi in rosa, errori in rosso.',
  },
} as const;
export type TemaPersonale = keyof typeof TEMI_PERSONALI;
export const eTemaPersonale = (v: unknown): v is TemaPersonale =>
  typeof v === 'string' && v in TEMI_PERSONALI;

/** Colori pronti da toccare, in «La mia squadra». */
export const ACCENTI_PRONTI = [
  { nome: 'Verde visore', colore: '#4cff00' },
  { nome: 'Oliva', colore: '#9bb53a' },
  { nome: 'Sabbia', colore: '#d4b483' },
  { nome: 'Arancio', colore: '#ff8a1f' },
  { nome: 'Rosso', colore: '#ff4d4d' },
  { nome: 'Azzurro', colore: '#38bdf8' },
  { nome: 'Blu', colore: '#3b6fff' },
  { nome: 'Viola', colore: '#a78bfa' },
] as const;

export const TEMA_PARTENZA: TemaSquadra = { accento: '#4cff00', modo: 'scuro' };

/** Dove resta notte/giorno di chi guarda una pagina pubblica senza profilo. */
export const COOKIE_MODO = 'zd-modo';

// ----------------------------------------------------------------- colore

type Rgb = [number, number, number];

export function daHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const aHex = ([r, g, b]: Rgb) =>
  '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');

/** Luminanza relativa, come la definiscono le WCAG. */
function luminanza([r, g, b]: Rgb) {
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

/** Il rapporto di contrasto fra due colori: da 1 (uguali) a 21 (nero e bianco). */
export function contrasto(a: Rgb, b: Rgb) {
  const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const mescola = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * Lo stesso colore, spinto verso il bianco (su fondo scuro) o verso il nero
 * (su fondo chiaro) quanto basta a leggerlo sul fondo col contrasto chiesto.
 * Si cambia il meno possibile: il colore resta riconoscibile.
 */
export function leggibile(colore: Rgb, fondo: Rgb, minimo: number): Rgb {
  if (contrasto(colore, fondo) >= minimo) return colore;
  const verso: Rgb = luminanza(fondo) < 0.2 ? [255, 255, 255] : [0, 0, 0];
  for (let t = 0.05; t <= 1; t += 0.05) {
    const c = mescola(colore, verso, t);
    if (contrasto(c, fondo) >= minimo) return c;
  }
  return verso;
}

/** Nero o bianco, quello che si legge meglio sopra questo colore. */
const testoSopra = (c: Rgb): Rgb =>
  contrasto(c, [0, 0, 0]) >= contrasto(c, [255, 255, 255]) ? [0, 0, 0] : [255, 255, 255];

// ---------------------------------------------------------------- palette

/** I nomi dei colori, come li usa Tailwind (vedi tailwind.config.ts). */
export const TOKEN = [
  'bg',
  'surface',
  'surface2',
  'line',
  'ink',
  'muted',
  'nvg',
  'nvgdim',
  'nvgink',
  'info',
  'viola',
  'warn',
  'danger',
] as const;
type Token = (typeof TOKEN)[number];

/** Le tinte delle tipologie nel calendario: stessa chiave di COLORI_TIPOLOGIA. */
const TINTE: Record<string, string> = {
  verde: '#4cff00',
  turchese: '#2dd4bf',
  azzurro: '#38bdf8',
  blu: '#5b8def',
  viola: '#a78bfa',
  fucsia: '#e879f9',
  rosa: '#f9a8d4',
  rosso: '#ff5a4f',
  arancione: '#fb923c',
  ambra: '#ffb300',
  giallo: '#fde047',
  sabbia: '#d4b483',
  bianco: '#e7ede7',
  grigio: '#7f8a7f',
};
export const NOMI_TINTE = Object.keys(TINTE);

type Base = Record<Exclude<Token, 'nvg' | 'nvgdim' | 'nvgink'>, string> & {
  accento: string;
  scuro: boolean;
  /** Il contrasto minimo del testo: 4,5 (AA) o 7 (AAA, alto contrasto). */
  minimo: number;
};

const SCURO = {
  bg: '#050605',
  surface: '#0e110e',
  surface2: '#151a15',
  line: '#232a23',
  ink: '#e7ede7',
  muted: '#7f8a7f',
  info: '#7dd3fc',
  viola: '#c4b5fd',
  warn: '#ffb300',
  danger: '#ff4438',
};

const CHIARO = {
  bg: '#f3f5f3',
  surface: '#ffffff',
  surface2: '#eef1ee',
  line: '#cfd6cf',
  ink: '#121712',
  muted: '#566056',
  info: '#0369a1',
  viola: '#6d28d9',
  warn: '#9a5b00',
  danger: '#c62828',
};

/** I temi di accessibilità: fissi, controllati uno per uno sulle linee guida. */
const ACCESSIBILI: Record<Exclude<TemaPersonale, 'squadra'>, Base> = {
  'contrasto-scuro': {
    bg: '#000000',
    surface: '#000000',
    surface2: '#141414',
    // bordi che si vedono: più di 3:1 sul nero (WCAG 1.4.11)
    line: '#8c8c8c',
    ink: '#ffffff',
    muted: '#e0e0e0',
    accento: '#00e5ff',
    info: '#b8c8ff',
    viola: '#e2c2ff',
    warn: '#ffd84a',
    danger: '#ff8080',
    scuro: true,
    minimo: 7,
  },
  'contrasto-chiaro': {
    bg: '#ffffff',
    surface: '#ffffff',
    surface2: '#f0f0f0',
    line: '#595959',
    ink: '#000000',
    muted: '#262626',
    accento: '#003fb3',
    info: '#00566e',
    viola: '#5b1491',
    warn: '#6b3d00',
    danger: '#a30015',
    scuro: false,
    minimo: 7,
  },
  // Okabe-Ito, la tavolozza pensata per chi non distingue rosso e verde:
  // azzurro, giallo e vermiglione restano diversi anche per loro
  'daltonismo-rv': {
    ...SCURO,
    bg: '#07090c',
    surface: '#0f1216',
    surface2: '#171b21',
    line: '#2a313a',
    ink: '#eef2f6',
    muted: '#9aa4ae',
    accento: '#56b4e9',
    info: '#c9d7e8',
    viola: '#cc79a7',
    warn: '#f0e442',
    danger: '#ff8a4c',
    scuro: true,
    minimo: 4.5,
  },
  // chi non distingue blu e giallo vede bene rosso, rosa e turchese, e le
  // differenze di chiarezza: si gioca su quelle
  'daltonismo-by': {
    ...SCURO,
    bg: '#0a0808',
    surface: '#131010',
    surface2: '#1c1818',
    line: '#342c2c',
    ink: '#f4efef',
    muted: '#a59c9c',
    accento: '#2ee6d6',
    info: '#d0d0d0',
    viola: '#e7a6ff',
    warn: '#ff9ed2',
    danger: '#ff4d4d',
    scuro: true,
    minimo: 4.5,
  },
};

export type Tavolozza = {
  colori: Record<Token, string>;
  tinte: Record<string, string>;
  /** L'accento sul nero, per la schermata d'accesso. */
  notte: string;
  scuro: boolean;
  /** Alto contrasto: bordi e fuoco più marcati. */
  forte: boolean;
};

/** Da un tema (della squadra o personale) ai colori veri, con il contrasto a posto. */
export function tavolozza(squadra: TemaSquadra, personale: TemaPersonale = 'squadra'): Tavolozza {
  const accessibile = personale !== 'squadra' ? ACCESSIBILI[personale] : null;
  const base: Base = accessibile ?? {
    ...(squadra.modo === 'chiaro' ? CHIARO : SCURO),
    accento: daHex(squadra.accento) ? squadra.accento : TEMA_PARTENZA.accento,
    scuro: squadra.modo !== 'chiaro',
    minimo: 4.5,
  };
  const fondo = daHex(base.surface)!;
  const sfondo = daHex(base.bg)!;
  const regola = (hex: string) => aHex(leggibile(daHex(hex)!, fondo, base.minimo));

  const accento = leggibile(daHex(base.accento)!, fondo, base.minimo);
  const colori: Record<Token, string> = {
    bg: base.bg,
    surface: base.surface,
    surface2: base.surface2,
    line: base.line,
    ink: base.ink,
    muted: regola(base.muted),
    nvg: aHex(accento),
    // l'accento spento, per i bordi al passaggio del mouse
    nvgdim: aHex(mescola(accento, sfondo, 0.35)),
    nvgink: aHex(testoSopra(accento)),
    info: regola(base.info),
    viola: regola(base.viola),
    warn: regola(base.warn),
    danger: regola(base.danger),
  };
  const tinte = Object.fromEntries(
    Object.entries(TINTE).map(([k, hex]) => {
      // il «bianco» su fondo chiaro diventa grigio scuro: resta il colore neutro
      const partenza = !base.scuro && k === 'bianco' ? '#3a403a' : hex;
      return [k, regola(partenza)];
    }),
  );
  // l'accento per la schermata d'accesso, che è sempre notturna: lo stesso
  // colore, schiarito se serve a leggerlo sul nero
  const notte = aHex(leggibile(daHex(base.accento)!, [0, 0, 0], 7));
  return { colori, tinte, notte, scuro: base.scuro, forte: base.minimo >= 7 };
}

const canali = (hex: string) => daHex(hex)!.join(' ');

/** Le variabili CSS del tema, da mettere in testa alla pagina. */
export function cssTema(t: Tavolozza, testoGrande = false): string {
  const righe = [
    ...TOKEN.map((k) => `--c-${k}:${canali(t.colori[k])}`),
    ...Object.entries(t.tinte).map(([k, v]) => `--t-${k}:${canali(v)}`),
    `--c-notte:${canali(t.notte)}`,
    `color-scheme:${t.scuro ? 'dark' : 'light'}`,
    // il testo più grande: tutto è in rem, quindi cresce tutto insieme
    ...(testoGrande ? ['font-size:112.5%'] : []),
  ];
  return `:root{${righe.join(';')}}`;
}
