/**
 * Il cambio dell'ora, quando cade dentro un'attività.
 *
 * Due volte l'anno, nella notte fra sabato e domenica, le lancette si
 * spostano: un'attività che passa la notte fuori (una notturna, una 24 ore) o
 * che comincia la domenica mattina si gioca con un'ora in più o in meno, e chi
 * non ci pensa arriva al ritrovo in anticipo, o in ritardo. Lo si dice.
 *
 * Il calcolo guarda lo scarto del fuso italiano fra **il mezzogiorno del giorno
 * prima** dell'inizio e la fine: se cambia, il cambio cade lì dentro. Così
 * vale per chi attraversa la notte e per chi parte la domenica stessa, e non
 * per un'attività del sabato pomeriggio che finisce prima di cena.
 */

const FUSO = 'Europe/Rome';

/** Lo scarto dal tempo universale, in minuti, in quel momento in Italia. */
function scarto(d: Date): number {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(d);
  const v = (t: string) => Number(parti.find((p) => p.type === t)?.value);
  const locale = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'));
  return Math.round((locale - d.getTime()) / 60_000);
}

export type CambioOra = {
  /** 'solare': le lancette tornano indietro (un'ora in più); 'legale': avanti. */
  verso: 'solare' | 'legale';
  /** L'istante del cambio. */
  quando: Date;
};

export function cambioOra(inizio: Date, fine?: Date | null): CambioOra | null {
  const a = new Date(inizio.getTime() - 36 * 3600_000);
  const b = fine && fine > inizio ? fine : inizio;
  // un'attività di settimane non ne ha bisogno, e non si cerca all'infinito
  if (b.getTime() - a.getTime() > 14 * 24 * 3600_000) return null;
  const prima = scarto(a);
  const dopo = scarto(b);
  if (prima === dopo) return null;

  // il momento esatto, a metà strada fino al minuto
  let lo = a.getTime();
  let hi = b.getTime();
  while (hi - lo > 60_000) {
    const m = Math.floor((lo + hi) / 2);
    if (scarto(new Date(m)) === prima) lo = m;
    else hi = m;
  }
  // il cambio vale solo se cade dal mezzogiorno del giorno prima in poi
  const quando = new Date(hi);
  const giornoPrima = mezzogiornoPrima(inizio);
  if (quando < giornoPrima) return null;
  return { verso: dopo > prima ? 'legale' : 'solare', quando };
}

/** Il mezzogiorno, ora italiana, del giorno prima di quello d'inizio. */
function mezzogiornoPrima(inizio: Date) {
  const g = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(inizio); // AAAA-MM-GG
  const [y, m, d] = g.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d - 1, 12));
  return new Date(utc.getTime() - scarto(utc) * 60_000);
}

const giorno = new Intl.DateTimeFormat('it-IT', {
  timeZone: FUSO,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** La frase per l'avviso: quale notte, cosa fanno le lancette, cosa vuol dire. */
export function testoCambioOra(c: CambioOra) {
  const dopo = giorno.format(c.quando);
  const primaGiorno = giorno.format(new Date(c.quando.getTime() - 24 * 3600_000));
  const notte = `Nella notte fra ${primaGiorno} e ${dopo}`;
  return c.verso === 'solare'
    ? `${notte} torna l’ora solare: alle 3:00 le lancette tornano alle 2:00. C’è un’ora in più: occhio alle sveglie e agli orari.`
    : `${notte} entra l’ora legale: alle 2:00 le lancette vanno avanti alle 3:00. C’è un’ora in meno: occhio alle sveglie e agli orari.`;
}
