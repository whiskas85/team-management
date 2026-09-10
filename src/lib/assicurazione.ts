import type { StatoAssicurazione, StatoOperatore } from '@prisma/client';
import { prisma } from './db';
import { vedeAttivitaSquadra, type Tono } from './domain';
import { iniziali, nomeCompleto } from './format';
import { chiaveDaColonna, chiaveGiorno, dataLocale, giorniDi } from './giorni';

/**
 * Chi gioca da ospite va coperto con una giornaliera.
 *
 * Due condizioni insieme: non essere della squadra — i soci hanno la loro
 * tessera annuale, e segnalarli qui riempirebbe ogni attività di allarmi che
 * riguardano un'altra pagina — e non avere comunque un'annuale valida nel
 * giorno dell'attività, perché capita l'ospite già tesserato altrove.
 */
export function serveGiornaliera(
  diSquadra: boolean,
  stato: StatoOperatore,
  tessere: { status: string; scadeIl: Date | null }[],
  quando: Date,
): boolean {
  if (diSquadra) return false;
  if (stato === 'DISABILITATO' || stato === 'RIFIUTATO') return false;

  const coperto = tessere.some(
    (t) => t.status === 'ATTIVA' && (!t.scadeIl || t.scadeIl >= quando),
  );
  return !coperto;
}

export const ETICHETTA_ASSICURAZIONE: Record<StatoAssicurazione, string> = {
  NON_ASSICURATO: 'non assicurato',
  RICHIESTA: 'richiesta inviata',
  ASSICURATO: 'assicurato',
  ERRORE: 'assicurazione fallita',
};

export const TONO_ASSICURAZIONE: Record<StatoAssicurazione, Tono> = {
  NON_ASSICURATO: 'danger',
  RICHIESTA: 'warn',
  ASSICURATO: 'ok',
  ERRORE: 'danger',
};

// i giorni stanno in un modulo loro, senza database: li usa anche il browser
export {
  chiaveDaColonna,
  chiaveGiorno,
  dataLocale,
  etichettaGiorno,
  giornoDaChiave,
  giorniDi,
} from './giorni';

/**
 * La quota di un'attività è saldata?
 *
 * Nessuna quota vuol dire niente da pagare — un'attività gratuita, o una
 * riserva che il posto non ce l'ha — e non "non ha pagato": trattarli allo
 * stesso modo bloccherebbe la copertura di chi non deve un euro a nessuno.
 */
export const quotaSaldata = (quota: { status: string } | null | undefined) =>
  !quota || quota.status === 'PAGATO';

/**
 * Si può assicurare?
 *
 * Saldata davvero, **oppure** dichiarata dal diretto interessato: chi ha detto
 * «te li do in contanti» ci ha messo la faccia sui pagamenti, e la segreteria
 * ha solo da confermare l'incasso. Aspettare quella conferma vorrebbe dire
 * lasciare scoperto in campo qualcuno che ha già fatto la sua parte.
 *
 * Resta fuori solo chi non ha né pagato né detto niente: la polizza la paga il
 * club e non torna indietro, quindi il rischio si prende quando qualcuno se
 * l'è preso prima.
 */
export const quotaOnorata = (
  quota: { status: string; dichiaratoIl: Date | null } | null | undefined,
) => quotaSaldata(quota) || quota?.dichiaratoIl != null;

/** La copertura di un ospite in un giorno dell'attività. */
export type GiornoDaCoprire = {
  /** «2026-09-12». */
  giorno: string;
  /** Gli serve la giornaliera, o ha già un'annuale valida quel giorno. */
  serve: boolean;
  copertura: StatoAssicurazione;
  codice: string | null;
};

export type NuovoDaCoprire = {
  id: string;
  /** Per esteso, callsign compreso: chi apre questa pagina segue le persone. */
  nome: string;
  iniziali: string;
  stato: StatoOperatore;
  /** Ha risposto "forse": conta comunque, ma non è ancora detto che venga. */
  forse: boolean;
  /**
   * Un'attività di due giorni vuole due polizze: una voce per giorno, e
   * ognuna si fa per conto suo.
   */
  giorni: GiornoDaCoprire[];
  /** Ha detto lui di aver pagato: la segreteria deve ancora confermare. */
  dichiarata: boolean;
  /** Saldata o dichiarata: è la condizione per poterlo assicurare. */
  copribile: boolean;
  /** La quota di quella giornata è saldata. Quanto sia, qui, non si dice. */
  pagato: boolean;
  /** Ha una quota aperta: senza, "non pagato" non vorrebbe dire niente. */
  haQuota: boolean;
  /** Senza data e luogo di nascita il portale non emette niente. */
  datiCompleti: boolean;
};

export type AttivitaDaCoprire = {
  id: string;
  titolo: string;
  quando: Date;
  tipo: string | null;
  dove: string | null;
  /** I giorni ancora da giocare: quelli passati non si coprono più. */
  giorni: string[];
  nuovi: NuovoDaCoprire[];
  /**
   * Quante polizze aspettano davvero: una per ospite e per giorno, con la
   * quota saldata o dichiarata e i dati a posto.
   */
  daFare: number;
};

/**
 * Le attività in programma con gli ospiti che ci vengono.
 *
 * Sta qui e non nella pagina perché la stessa risposta serve al pallino del
 * menu: contare le cose da fare con una query diversa da quella che le mostra
 * è il modo sicuro per avere un pallino che dice tre e una pagina che ne
 * elenca due.
 *
 * Solo le attività **rilasciate e non ancora passate**: su una giocata di
 * marzo non c'è più niente da assicurare, e su una bozza non si è ancora
 * segnato nessuno.
 */
export async function attivitaDaCoprire(): Promise<AttivitaDaCoprire[]> {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const eventi = await prisma.event.findMany({
    // anche quelle cominciate ieri e non ancora finite: una 24 ore partita
    // sabato ha ancora la domenica da coprire
    where: {
      status: 'RILASCIATA',
      OR: [{ inizio: { gte: oggi } }, { fine: { gte: oggi } }],
    },
    orderBy: { inizio: 'asc' },
    include: {
      tipo: { select: { nome: true } },
      field: { select: { nome: true } },
      giornaliere: { select: { userId: true, giorno: true, stato: true, codice: true } },
      // i rimborsi sono movimenti a sé: non dicono niente su cosa è dovuto
      payments: {
        where: { tipo: { not: 'RIMBORSO' } },
        select: { userId: true, status: true, dichiaratoIl: true },
      },
      rsvps: {
        where: { status: { not: 'ASSENTE' } },
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              callsign: true,
              stato: true,
              dataNascita: true,
              luogoNascita: true,
              figtCards: { select: { status: true, scadeIl: true } },
            },
          },
        },
      },
    },
  });

  return eventi.map((e) => {
    // una copertura per persona e per giorno
    const coperture = new Map(
      e.giornaliere.map((g) => [`${g.userId}|${chiaveDaColonna(g.giorno)}`, g]),
    );
    // i giorni già passati non si coprono più: il portale non torna indietro
    const giorni = giorniDi(e.inizio, e.fine).filter((g) => g >= chiaveGiorno(oggi));
    const quote = new Map(e.payments.map((p) => [p.userId, p]));

    const nuovi = e.rsvps
      .filter((r) => !vedeAttivitaSquadra(r.user.stato))
      .map((r) => {
        const quota = quote.get(r.userId) ?? null;
        return {
          id: r.userId,
          nome: nomeCompleto(r.user),
          iniziali: iniziali(r.user.nome, r.user.cognome),
          stato: r.user.stato,
          forse: r.status === 'FORSE',
          giorni: giorni.map((giorno) => {
            const g = coperture.get(`${r.userId}|${giorno}`);
            return {
              giorno,
              serve: serveGiornaliera(false, r.user.stato, r.user.figtCards, dataLocale(giorno)),
              copertura: g?.stato ?? 'NON_ASSICURATO',
              codice: g?.codice ?? null,
            };
          }),
          pagato: quotaSaldata(quota),
          // dichiarata ma non ancora confermata: basta per coprire, non per
          // dire che i soldi sono entrati — sono due cose diverse e si leggono
          // diverse
          dichiarata: quota?.dichiaratoIl != null,
          copribile: quotaOnorata(quota),
          haQuota: quota !== null,
          datiCompleti: r.user.dataNascita !== null && r.user.luogoNascita !== null,
        } satisfies NuovoDaCoprire;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

    return {
      id: e.id,
      titolo: e.titolo,
      quando: e.inizio,
      tipo: e.tipo?.nome ?? null,
      dove: e.field?.nome ?? e.luogo ?? null,
      giorni,
      nuovi,
      // per giorno, e con la stessa condizione del pulsante: saldata o
      // dichiarata. Contare solo le saldate faceva dire al pallino meno di
      // quanto la pagina lasciasse fare
      daFare: nuovi.reduce(
        (t, n) =>
          t +
          (n.copribile && n.datiCompleti
            ? n.giorni.filter((g) => g.serve && g.copertura !== 'ASSICURATO').length
            : 0),
        0,
      ),
    };
  });
}
