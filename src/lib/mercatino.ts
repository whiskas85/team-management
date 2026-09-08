import type { Prisma, StatoOperatore, Role } from '@prisma/client';
import { prisma } from './db';
import { isAdmin, inSquadra, puoGestirePagamenti, vedeAttivitaSquadra } from './domain';

/**
 * Il mercatino, che sono due bacheche diverse.
 *
 * **L'usato lo vedono tutti**, contatti compresi: roba che passa di mano fra
 * soci, che alla squadra non costa niente. Pubblicare lì è dietro consenso per
 * chi non è ancora dentro — non è diffidenza, è che un annuncio ha un prezzo e
 * un contatto privato dietro.
 *
 * **Il merchandising no**: le magliette le fa fare e le paga il club, sono
 * soldi del team, e chi al team non appartiene ancora non ne sfoglia il
 * catalogo. Lo apre solo l'admin e lo legge solo chi è dentro.
 */

/** L'unica riga di impostazioni, creata al primo bisogno. */
export async function impostazioni() {
  return (
    (await prisma.impostazioni.findUnique({ where: { id: 'app' } })) ??
    prisma.impostazioni.create({ data: { id: 'app' } })
  );
}

/**
 * Chi può mettere in vendita.
 *
 * Chi è in squadra sempre; chi non lo è ancora solo se l'interruttore è acceso.
 * Sta nelle impostazioni e non nel codice proprio perché la risposta può
 * cambiare senza rifare un rilascio.
 */
export async function puoVendere(utente: { stato: StatoOperatore; roles: Role[] }) {
  if (vedeAttivitaSquadra(utente.stato)) return true;
  const conf = await impostazioni();
  return conf.nuoviPossonoVendere;
}

/**
 * Chi può battezzare un annuncio come merchandising ufficiale.
 *
 * Solo l'admin, e non è gerarchia: quel bollino decide che ordinarne uno genera
 * una quota nella cassa della squadra, quindi non può metterselo chi vuole.
 */
export const puoFareUfficiale = (roles: Role[]) => isAdmin(roles);

/**
 * Chi vede il merchandising del team.
 *
 * Solo chi è dentro. **Non è la stessa regola dell'usato**, ed è voluto: il
 * mercatino è roba che passa di mano fra soci e non costa niente alla squadra,
 * mentre le magliette il club le fa fare e le paga — sono soldi del team, e chi
 * al team non appartiene ancora non ha motivo di sfogliarne il catalogo.
 */
export const puoVedereMerchandising = (stato: StatoOperatore) => vedeAttivitaSquadra(stato);

/**
 * Cosa si vede in bacheca: il pubblicato, più il proprio anche se in bozza.
 *
 * Le bozze altrui non esistono per nessuno, nemmeno per l'admin: uno prepara un
 * annuncio con calma e non deve sentirsi guardato mentre lo scrive.
 */
export const filtroBacheca = (userId: string): Prisma.AnnuncioWhereInput => ({
  OR: [{ stato: { in: ['PUBBLICATO', 'RITIRATO'] } }, { venditoreId: userId }],
});

/**
 * L'indirizzo di un annuncio.
 *
 * Il catalogo del team ha una porta sua: se si aprisse tutto da /mercatino, il
 * menu si sposterebbe su *Usato* ogni volta che si guarda una maglietta.
 */
export const stradaAnnuncio = (a: { id: string; ufficiale: boolean }) =>
  `${a.ufficiale ? '/merchandising' : '/mercatino'}/${a.id}`;

/** Chi può metterci mano: chi l'ha scritto. L'admin può solo ritirarlo. */
export const eMio = (annuncio: { venditoreId: string }, userId: string) =>
  annuncio.venditoreId === userId;

/**
 * Da un titolo alla maniglia con cui si nomina la voce in un commento.
 *
 * Unica dentro il suo annuncio e non in tutto il mercatino: due persone che
 * vendono una radio M devono poterla chiamare tutte e due `@radio-m`.
 */
export const manigliaVoce = (titolo: string) =>
  titolo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'voce';

export type VoceLetta = {
  id: string;
  titolo: string;
  maniglia: string;
  prezzo: unknown;
  trattabile: boolean;
  descrizione: string | null;
  natura: 'PEZZO_UNICO' | 'RIORDINABILE';
  stato: 'DISPONIBILE' | 'PRENOTATA' | 'VENDUTA';
};

/**
 * Una voce ancora prendibile.
 *
 * Spenta non lo è mai, comunque sia messa. Sulle riordinabili lo stato di
 * vendita non vuol dire niente — non c'è niente da esaurire — quindi conta
 * solo l'interruttore.
 */
export const disponibile = (v: { natura: string; stato: string; attiva?: boolean }) =>
  v.attiva !== false && (v.natura === 'RIORDINABILE' || v.stato === 'DISPONIBILE');

/**
 * Il prezzo che la card mostra: la cifra secca se la voce è una, l'intervallo
 * se sono tante. Si guardano solo le voci ancora prendibili — un annuncio dove
 * resta la mesh non deve continuare a dire "da 50".
 */
export function prezzoDa(
  voci: { prezzo: unknown; natura: string; stato: string; attiva?: boolean }[],
) {
  const vive = voci.filter(disponibile);
  // se non resta niente di prendibile si mostra comunque il giro dei prezzi di
  // quello che c'era: una card muta non dice a nessuno di cosa si trattava
  const cifre = (vive.length ? vive : voci).map((v) => Number(v.prezzo));
  if (cifre.length === 0) return null;

  const min = Math.min(...cifre);
  const max = Math.max(...cifre);
  return { min, max, unico: min === max };
}

/** Un annuncio dell'usato è finito quando non resta più niente da prendere. */
export const tuttoVenduto = (voci: { natura: string; stato: string; attiva?: boolean }[]) =>
  voci.length > 0 && !voci.some(disponibile);

/**
 * Da un commento alle voci che nomina.
 *
 * Le maniglie sono uniche dentro l'annuncio, quindi basta confrontarle con le
 * sue: la radio M di un annuncio non c'entra con quella di un altro.
 */
export function vociCitate(
  testo: string,
  voci: { id: string; maniglia: string }[],
): string[] {
  const scritte = new Set(
    [...testo.matchAll(/@([a-z0-9._-]{2,})/gi)].map((m) => m[1].toLowerCase()),
  );
  return voci.filter((v) => scritte.has(v.maniglia)).map((v) => v.id);
}

// ------------------------------------------------------------------ magazzino

/** Gli stati in cui un ordine tiene occupata della merce. */
export const IMPEGNA = ['RACCOLTA', 'ORDINATO', 'ARRIVATO'];

export type Giacenza = {
  caricate: number;
  /** Promesse a qualcuno ma non ancora consegnate. */
  impegnate: number;
  consegnate: number;
  disponibili: number;
  /** Quanto è costato al team un pezzo, in media sui carichi fatti. */
  costoMedio: number | null;
  /** Quanto ci è stato speso in tutto. */
  spesa: number;
};

/**
 * Cosa resta di una voce tenuta in magazzino.
 *
 * *Impegnate* e *consegnate* sono due cose diverse: una patch promessa a
 * qualcuno non è più disponibile per un altro, anche se sta ancora nella
 * scatola. Contare solo le consegnate vorrebbe dire venderla due volte.
 */
export function giacenzaDi(
  carichi: { quantita: number; costoUnitario: unknown }[],
  righe: { quantita: number; stato: string }[],
): Giacenza {
  const caricate = carichi.reduce((s, c) => s + c.quantita, 0);
  const spesa = carichi.reduce((s, c) => s + c.quantita * Number(c.costoUnitario), 0);
  const consegnate = righe
    .filter((r) => r.stato === 'CONSEGNATO')
    .reduce((s, r) => s + r.quantita, 0);
  const impegnate = righe
    .filter((r) => IMPEGNA.includes(r.stato))
    .reduce((s, r) => s + r.quantita, 0);

  return {
    caricate,
    impegnate,
    consegnate,
    disponibili: caricate - consegnate - impegnate,
    costoMedio: caricate > 0 ? spesa / caricate : null,
    spesa,
  };
}

// ------------------------------------------------------------------ ordini

/**
 * Chi vede gli ordini di tutti.
 *
 * È la segreteria, e l'admin con lei: un ordine è una quota da incassare, e
 * chi si occupa delle quote se ne occupa qui come altrove. Il proprio ordine
 * invece lo vede sempre chi l'ha fatto, sotto l'annuncio.
 */
export const puoVedereOrdini = puoGestirePagamenti;

/**
 * Cosa si può mettere nel carrello.
 *
 * Solo le voci che si riordinano: le magliette non finiscono, se ne chiedono
 * altre e basta. Un pezzo unico non si ordina — si prenota, e a segnarlo è chi
 * vende, altrimenti due persone comprerebbero la stessa radio.
 */
export const ordinabile = (v: { natura: string; attiva?: boolean }) =>
  v.attiva !== false && v.natura === 'RIORDINABILE';

/** Lo slug del regolamento che apre il mercatino. */
export const SLUG_REGOLAMENTO = 'mercatino';

export const ETICHETTA_ORDINE: Record<string, string> = {
  RACCOLTA: 'in raccolta',
  ORDINATO: 'ordinato al fornitore',
  ARRIVATO: 'arrivato, da consegnare',
  CONSEGNATO: 'consegnato',
  ANNULLATO: 'annullato',
};

/**
 * Un ordine conta nel "quanti pezzi servono" solo finché la raccolta è aperta.
 *
 * È la risposta a *sette da quando?*: un riepilogo che somma tutti gli ordini
 * mai fatti serve una volta sola, al secondo giro mescola le magliette già
 * ordinate al fornitore con quelle nuove e diventa un numero di cui non ci si
 * può fidare — cioè peggio di niente.
 */
export const inRaccolta = (o: { stato: string }) => o.stato === 'RACCOLTA';

/** Quanto costa un carrello: le righe hanno già il prezzo congelato. */
export const totaleRighe = (righe: { prezzo: unknown; quantita: number }[]) =>
  righe.reduce((s, r) => s + Number(r.prezzo) * r.quantita, 0);

/** Cosa c'è dentro, in una riga sola: "Maglietta M × 2, Patch × 1". */
export const dettaglioRighe = (righe: { titolo: string; quantita: number }[]) =>
  righe.map((r) => `${r.titolo} × ${r.quantita}`).join(', ');

/** Serve solo a non ripetere la stessa `include` in quattro punti. */
export const CON_TUTTO = {
  venditore: { select: { id: true, nome: true, cognome: true, callsign: true, stato: true } },
  voci: { orderBy: { ordine: 'asc' } },
  foto: { orderBy: { ordine: 'asc' } },
  copertina: true,
} satisfies Prisma.AnnuncioInclude;

export const inSquadraOra = inSquadra;
