const dtf = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' });
const dtfLong = new Intl.DateTimeFormat('it-IT', { dateStyle: 'full' });
const dtfTime = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
const timeOnly = new Intl.DateTimeFormat('it-IT', { timeStyle: 'short' });

export const fmtDate = (d?: Date | string | null) => (d ? dtf.format(new Date(d)) : '—');
export const fmtDateLong = (d?: Date | string | null) => (d ? dtfLong.format(new Date(d)) : '—');
export const fmtDateTime = (d?: Date | string | null) => (d ? dtfTime.format(new Date(d)) : '—');
export const fmtTime = (d?: Date | string | null) => (d ? timeOnly.format(new Date(d)) : '—');

export const fmtEuro = (v?: number | string | null) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
};

/** Valore Decimal di Prisma -> number semplice, serializzabile verso i client component. */
export const dec = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  return Number(v.toString());
};

/** Giorni mancanti (negativi se già passato). */
export const giorniA = (d?: Date | string | null): number | null => {
  if (!d) return null;
  const target = new Date(d);
  const oggi = new Date();
  target.setHours(0, 0, 0, 0);
  oggi.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - oggi.getTime()) / 86400000);
};

export const iniziali = (nome: string, cognome: string) =>
  `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase();

export const nomeCompleto = (u: { nome: string; cognome: string; callsign?: string | null }) =>
  u.callsign ? `${u.nome} "${u.callsign}" ${u.cognome}` : `${u.nome} ${u.cognome}`;

type Persona = { nome: string; cognome: string; callsign?: string | null };

/** Cognome ridotto all'iniziale: "Mario R.". */
export const nomeRidotto = (u: { nome: string; cognome: string }) => {
  const iniziale = u.cognome.trim().charAt(0);
  return iniziale ? `${u.nome} ${iniziale.toUpperCase()}.` : u.nome;
};

/**
 * Come va mostrato qualcuno in un elenco, secondo chi sta guardando: etichetta
 * e iniziali dell'avatar, che devono raccontare la stessa cosa.
 *
 * 1. chi segue i contatti legge sempre l'anagrafica intera, callsign compreso;
 * 2. per tutti gli altri il callsign, quando c'è, prende il posto di nome e
 *    cognome, nudo e senza virgolette: in campo ci si chiama così e
 *    l'anagrafica non serve;
 * 3. senza callsign la squadra si conosce per nome e cognome, mentre chi non è
 *    (ancora) dentro resta "Mario R.".
 */
export function comeChiamare(
  u: Persona,
  { incarico, diSquadra }: { incarico: boolean; diSquadra: boolean },
): { nome: string; iniziali: string } {
  if (incarico) return { nome: nomeCompleto(u), iniziali: iniziali(u.nome, u.cognome) };

  if (u.callsign) {
    return { nome: u.callsign, iniziali: u.callsign.slice(0, 2).toUpperCase() };
  }

  return {
    nome: diSquadra ? nomeCompleto(u) : nomeRidotto(u),
    iniziali: iniziali(u.nome, u.cognome),
  };
}

/** Etichette leggibili per gli enum: MEZZO_TESTO -> Mezzo testo */
export const umanizza = (v?: string | null) => {
  if (!v) return '—';
  const s = v.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Input date HTML richiede yyyy-mm-dd. Va costruito sulle parti locali: con
 * toISOString a mezzanotte passata si otterrebbe il giorno prima.
 */
export const inputDate = (d?: Date | string | null) => {
  if (!d) return '';
  const data = new Date(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
};

/** Input datetime-local richiede yyyy-mm-ddThh:mm in ora locale. */
export const inputDateTime = (d?: Date | string | null) => {
  if (!d) return '';
  const date = new Date(d);
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16);
};

/** Stagione sportiva corrente, es. 2025/2026 (rinnovo a settembre). */
export const stagioneCorrente = (ref = new Date()) => {
  const y = ref.getFullYear();
  return ref.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
};
