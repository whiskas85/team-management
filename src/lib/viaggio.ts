/**
 * I conti di una macchinata: quanto è costato il viaggio, quanto tocca a
 * ciascuno, e chi deve dare quanto a chi.
 *
 * **È solo un aiuto**: non muove soldi, non registra pagamenti e non insegue
 * nessuno. Dice una cifra e si ferma lì.
 *
 * Le regole, in ordine:
 *
 * 1. **Il costo vero.** Il carburante si conta dai chilometri (consumo per
 *    prezzo al litro), i caselli da quanto sono costati davvero. Chi dichiara
 *    di aver fatto 150 € di pieno su un viaggio che ne consuma 10 non ha
 *    pagato il viaggio 150 €: al viaggio ne vanno 10, il resto del serbatoio
 *    resta suo. Se il costo vero non è scritto, conta quello dichiarato.
 * 2. **Chi ha pagato cosa.** Quando le dichiarazioni superano il costo vero,
 *    ognuno se ne vede riconoscere la sua parte in proporzione. Quando non ci
 *    arrivano, il resto l'ha pagato l'autista: **se nessuno dichiara niente,
 *    ha pagato tutto lui**.
 * 3. **Le parti.** Il totale si divide in parti uguali fra tutti quelli a
 *    bordo, autista compreso.
 * 4. **Chi deve a chi.** Chi ha pagato meno della sua parte dà a chi ha pagato
 *    di più, col minor numero di passaggi.
 *
 * Tutto in centesimi, così le parti tornano al centesimo: quello che avanza
 * dalla divisione va un centesimo per uno ai primi della fila.
 */

export type TipoSpesa = 'CARBURANTE' | 'CASELLO' | 'ALTRO';

export type SpesaDichiarata = { userId: string; tipo: TipoSpesa; importo: number };

export type DatiViaggio = {
  autistaId: string;
  /** Tutti quelli a bordo, autista compreso. */
  persone: string[];
  km: number | null;
  /** Litri ogni 100 km. */
  consumo: number | null;
  prezzoLitro: number | null;
  /** Il costo vero dei caselli, se qualcuno l'ha scritto. */
  caselli: number | null;
  spese: SpesaDichiarata[];
};

export type VoceCosto = {
  tipo: TipoSpesa;
  /** Il costo che conta, in euro. */
  costo: number;
  /** Quanto è stato dichiarato. */
  dichiarato: number;
  /** Da dove viene il costo: calcolato, scritto, o la somma delle dichiarazioni. */
  da: 'calcolato' | 'scritto' | 'dichiarato';
  /** Quanto ne mette a carico l'autista perché nessuno l'ha dichiarato. */
  restoAutista: number;
};

export type RigaConto = {
  userId: string;
  /** Quanto gli si riconosce di aver pagato per il viaggio. */
  pagato: number;
  /** La sua parte. */
  parte: number;
  /** Positivo: deve ricevere. Negativo: deve dare. */
  saldo: number;
};

export type Passaggio = { da: string; a: string; importo: number };

export type ContiViaggio = {
  voci: VoceCosto[];
  totale: number;
  righe: RigaConto[];
  passaggi: Passaggio[];
  /** Dichiarazioni di chi non è più a bordo: non contano, ma si dice. */
  ignorate: SpesaDichiarata[];
};

const cent = (euro: number) => Math.round(euro * 100);
const euro = (c: number) => c / 100;

/** Il costo del carburante dai chilometri, se ci sono i tre dati. */
export function costoCarburante(
  km: number | null,
  consumo: number | null,
  prezzoLitro: number | null,
): number | null {
  if (!km || !consumo || !prezzoLitro) return null;
  return euro(cent((km * consumo * prezzoLitro) / 100));
}

export function contiViaggio(d: DatiViaggio): ContiViaggio {
  const persone = d.persone.includes(d.autistaId) ? d.persone : [d.autistaId, ...d.persone];
  const aBordo = new Set(persone);
  const valide = d.spese.filter((s) => aBordo.has(s.userId) && s.importo > 0);
  const ignorate = d.spese.filter((s) => !aBordo.has(s.userId) && s.importo > 0);

  // quanto si riconosce a ciascuno, in centesimi
  const pagato = new Map<string, number>(persone.map((p) => [p, 0]));
  const voci: VoceCosto[] = [];

  const veri: Record<TipoSpesa, { costo: number | null; da: VoceCosto['da'] }> = {
    CARBURANTE: { costo: costoCarburante(d.km, d.consumo, d.prezzoLitro), da: 'calcolato' },
    CASELLO: { costo: d.caselli, da: 'scritto' },
    ALTRO: { costo: null, da: 'dichiarato' },
  };

  for (const tipo of ['CARBURANTE', 'CASELLO', 'ALTRO'] as const) {
    const sue = valide.filter((s) => s.tipo === tipo);
    const dichiaratoC = sue.reduce((t, s) => t + cent(s.importo), 0);
    const vero = veri[tipo];
    const costoC = vero.costo != null ? cent(vero.costo) : dichiaratoC;
    if (costoC <= 0 && dichiaratoC <= 0) continue;

    let restoC = 0;
    if (dichiaratoC <= costoC) {
      // tutto quello dichiarato conta, e il resto l'ha messo l'autista
      for (const s of sue) pagato.set(s.userId, pagato.get(s.userId)! + cent(s.importo));
      restoC = costoC - dichiaratoC;
      pagato.set(d.autistaId, pagato.get(d.autistaId)! + restoC);
    } else {
      // dichiarato più del costo vero: a ognuno la sua quota, in proporzione
      let assegnati = 0;
      sue.forEach((s, i) => {
        const parte =
          i === sue.length - 1
            ? costoC - assegnati
            : Math.round((cent(s.importo) * costoC) / dichiaratoC);
        assegnati += parte;
        pagato.set(s.userId, pagato.get(s.userId)! + parte);
      });
    }

    voci.push({
      tipo,
      costo: euro(costoC),
      dichiarato: euro(dichiaratoC),
      da: vero.costo != null ? vero.da : 'dichiarato',
      restoAutista: euro(restoC),
    });
  }

  const totaleC = voci.reduce((t, v) => t + cent(v.costo), 0);
  const n = persone.length;
  const base = Math.floor(totaleC / n);
  const avanzo = totaleC - base * n;

  const righe: RigaConto[] = persone.map((userId, i) => {
    const parteC = base + (i < avanzo ? 1 : 0);
    const pagatoC = pagato.get(userId) ?? 0;
    return { userId, pagato: euro(pagatoC), parte: euro(parteC), saldo: euro(pagatoC - parteC) };
  });

  return { voci, totale: euro(totaleC), righe, passaggi: chiDeveAChi(righe), ignorate };
}

/**
 * Chi deve a chi: il più indebitato dà al più in credito, finché qualcuno non
 * è a posto, e si ricomincia. Non è sempre il minimo assoluto di passaggi, ma
 * in una macchina da cinque ci arriva, ed è un conto che si capisce.
 */
export function chiDeveAChi(righe: Pick<RigaConto, 'userId' | 'saldo'>[]): Passaggio[] {
  const dare = righe
    .filter((r) => r.saldo < 0)
    .map((r) => ({ id: r.userId, c: -cent(r.saldo) }))
    .sort((a, b) => b.c - a.c);
  const avere = righe
    .filter((r) => r.saldo > 0)
    .map((r) => ({ id: r.userId, c: cent(r.saldo) }))
    .sort((a, b) => b.c - a.c);

  const passaggi: Passaggio[] = [];
  let i = 0;
  let j = 0;
  while (i < dare.length && j < avere.length) {
    const c = Math.min(dare[i].c, avere[j].c);
    if (c > 0) passaggi.push({ da: dare[i].id, a: avere[j].id, importo: euro(c) });
    dare[i].c -= c;
    avere[j].c -= c;
    if (dare[i].c === 0) i++;
    if (avere[j].c === 0) j++;
  }
  return passaggi;
}

/**
 * Il link di Google Maps per tutto il viaggio: dalla partenza all'arrivo,
 * passando per le tappe nell'ordine. Google ne accetta una decina; oltre, le
 * ultime si perdono, ma una macchina non ne ha così tante.
 */
export function linkViaggio(punti: string[]): string | null {
  const p = punti.filter(Boolean);
  if (p.length === 0) return null;
  if (p.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p[0])}&travelmode=driving`;
  }
  const [origine, ...resto] = p;
  const destinazione = resto.pop()!;
  const tappe = resto.slice(0, 9);
  return (
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origine)}` +
    `&destination=${encodeURIComponent(destinazione)}` +
    (tappe.length ? `&waypoints=${encodeURIComponent(tappe.join('|'))}` : '') +
    '&travelmode=driving'
  );
}

/** Come si chiama un modo, detto alla gente. */
export const etichettaModo = {
  PRENDO: 'Passo a prenderli',
  RITROVO: 'Punto di ritrovo',
} as const;

export const etichettaSpesa: Record<TipoSpesa, string> = {
  CARBURANTE: 'Carburante',
  CASELLO: 'Caselli',
  ALTRO: 'Altro',
};
