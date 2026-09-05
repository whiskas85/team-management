import type { CertStatus, Role, StatoOperatore } from '@prisma/client';

// ---------------------------------------------------------------- permessi
// Un operatore ha più ruoli: i permessi si leggono sempre dall'insieme.

export const ha = (roles: Role[], ...cercati: Role[]) => roles.some((r) => cercati.includes(r));

export const isAdmin = (roles: Role[]) => ha(roles, 'ADMIN');

/** Amministrazione: iscrizioni, certificati medici, tessere FIGT. */
export const puoAmministrare = (roles: Role[]) => ha(roles, 'ADMIN', 'AMMINISTRAZIONE');

/** Segreteria: quote e pagamenti. */
export const puoGestirePagamenti = (roles: Role[]) => ha(roles, 'ADMIN', 'SEGRETERIA');

/** Team leader: schiera titolari e riserve. */
export const puoSchierare = (roles: Role[]) => ha(roles, 'ADMIN', 'TL');

/** Chi vede la scheda di un operatore (anagrafica, note, storico). */
export const puoVedereOperatori = (roles: Role[]) =>
  ha(roles, 'ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA', 'TL');

/**
 * Chi segue i contatti non ancora in squadra: solo per loro un nuovo ha nome e
 * cognome per intero e una scheda apribile. Agli altri — team leader compresi —
 * resta "Mario R.": in campo basta per chiamarlo, e chi passa di qui una volta
 * sola non lascia il proprio cognome in giro per l'app.
 */
export const puoVedereNuovi = (roles: Role[]) =>
  ha(roles, 'ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA');

/** Qualsiasi incarico che dia accesso a un'area riservata. */
export const haIncarichi = (roles: Role[]) =>
  ha(roles, 'ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA', 'TL');

// ---------------------------------------------------------------- stati operatore

/** Membro effettivo: vede gli eventi della squadra, ha certificati e tessera. */
export const inSquadra = (stato: StatoOperatore) => stato === 'SQUADRA' || stato === 'SOSPESO';

/**
 * Chi può vedere le attività riservate alla squadra.
 *
 * Non è la stessa cosa di essere in rosa: chi aspetta la riconferma dopo
 * l'apertura di una stagione era dentro fino al giorno prima, e togliergli il
 * calendario vorrebbe dire spegnere l'app a tutta la squadra a ogni cambio
 * d'anno. Vedere però non è partecipare: per segnarsi serve essere in rosa.
 */
export const vedeAttivitaSquadra = (stato: StatoOperatore) =>
  inSquadra(stato) || stato === 'DA_RICONFERMARE';

/** Sta percorrendo l'iter di ingresso o è ancora un contatto. */
export const isNuovo = (stato: StatoOperatore) =>
  stato === 'NUOVO' || stato === 'ATTESA_COMPILAZIONE' || stato === 'ATTESA_ACCETTAZIONE';

/** Gli stati che popolano l'elenco "Nuovi": l'iter di ingresso e chi si è fermato. */
export const STATI_CONTATTO: StatoOperatore[] = [
  'NUOVO',
  'ATTESA_COMPILAZIONE',
  'ATTESA_ACCETTAZIONE',
  'RIFIUTATO',
];

/** Non è in squadra e non lo è mai stato: la sua scheda è riservata. */
export const isContatto = (stato: StatoOperatore) => STATI_CONTATTO.includes(stato);

/** Le sezioni "certificati", "iscrizione" e "tessera" hanno senso solo in squadra. */
export const vedeAreaTesseramento = (stato: StatoOperatore) => stato === 'SQUADRA' || stato === 'SOSPESO';

export const etichettaStato: Record<StatoOperatore, string> = {
  NUOVO: 'Nuovo',
  ATTESA_COMPILAZIONE: 'Attesa compilazione',
  ATTESA_ACCETTAZIONE: 'Attesa accettazione',
  SQUADRA: 'In squadra',
  DA_RICONFERMARE: 'Da riconfermare',
  RIFIUTATO: 'Rifiutato',
  SOSPESO: 'Sospeso',
  DISABILITATO: 'Disabilitato',
};

// ---------------------------------------------------------------- certificati medici

/**
 * Lo stato salvato non si aggiorna da solo: un certificato approvato diventa
 * SCADUTO quando passa la data di scadenza. Qui calcoliamo lo stato reale.
 */
export function statoEffettivo(cert: {
  status: CertStatus;
  scadeIl: Date | string | null;
}): CertStatus {
  if (cert.status !== 'VALIDO') return cert.status;
  if (!cert.scadeIl) return 'VALIDO';
  return new Date(cert.scadeIl).getTime() < Date.now() ? 'SCADUTO' : 'VALIDO';
}

export const GIORNI_PREAVVISO_SCADENZA = 30;

/** Il certificato medico vale sempre 364 giorni dal rilascio. */
export const GIORNI_VALIDITA_CERTIFICATO = 364;

export function scadenzaCertificato(rilascio: Date): Date {
  const scadenza = new Date(rilascio);
  scadenza.setDate(scadenza.getDate() + GIORNI_VALIDITA_CERTIFICATO);
  return scadenza;
}

/** Versione per gli input date (yyyy-mm-dd), usata anche lato client. */
export function scadenzaDaInput(rilascio: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rilascio)) return '';
  const [a, m, g] = rilascio.split('-').map(Number);
  // aritmetica in UTC: niente sorprese al cambio dell'ora legale
  const scadenza = new Date(Date.UTC(a, m - 1, g + GIORNI_VALIDITA_CERTIFICATO));
  return scadenza.toISOString().slice(0, 10);
}

export function certificatoInScadenza(scadeIl: Date | string | null) {
  if (!scadeIl) return false;
  const giorni = (new Date(scadeIl).getTime() - Date.now()) / 86400000;
  return giorni >= 0 && giorni <= GIORNI_PREAVVISO_SCADENZA;
}

export function inRegola(certs: { status: CertStatus; scadeIl: Date | string | null }[]) {
  return certs.some((c) => statoEffettivo(c) === 'VALIDO');
}

/**
 * Idoneità per una specifica attività. Dove serve il certificato agonistico
 * quello non agonistico non basta: vale come non averlo.
 */
export function idoneoPer(
  certs: { status: CertStatus; scadeIl: Date | string | null; tipo?: string }[],
  richiedeAgonistico = false,
) {
  const validi = certs.filter((c) => statoEffettivo(c) === 'VALIDO');
  if (validi.length === 0) return false;
  return richiedeAgonistico ? validi.some((c) => c.tipo === 'AGONISTICO') : true;
}

export const MOTIVO_NON_IDONEO = (richiedeAgonistico: boolean) =>
  richiedeAgonistico
    ? 'Serve il certificato agonistico: quello non agonistico non basta.'
    : 'Certificato medico mancante o scaduto.';

// ---------------------------------------------------------------- colori dei badge

export type Tono = 'ok' | 'warn' | 'danger' | 'info' | 'neutro';

export const tonoCertificato: Record<CertStatus, Tono> = {
  VALIDO: 'ok',
  IN_ATTESA: 'warn',
  SCADUTO: 'danger',
  RIFIUTATO: 'danger',
};

export const tonoStato: Record<StatoOperatore, Tono> = {
  SQUADRA: 'ok',
  NUOVO: 'info',
  ATTESA_COMPILAZIONE: 'warn',
  ATTESA_ACCETTAZIONE: 'warn',
  DA_RICONFERMARE: 'warn',
  RIFIUTATO: 'danger',
  SOSPESO: 'warn',
  DISABILITATO: 'neutro',
};

export const tonoPagamento: Record<string, Tono> = {
  PAGATO: 'ok',
  PARZIALE: 'warn',
  DA_PAGARE: 'danger',
  ANNULLATO: 'neutro',
};

export const tonoEvento: Record<string, Tono> = {
  CREATA: 'warn',
  RILASCIATA: 'ok',
  ANNULLATA: 'danger',
  CONCLUSA: 'neutro',
};

export const etichettaEvento: Record<string, string> = {
  CREATA: 'Bozza',
  RILASCIATA: 'Rilasciata',
  ANNULLATA: 'Annullata',
  CONCLUSA: 'Conclusa',
};

export const etichettaVisibilita: Record<string, string> = {
  TEAM: 'Solo squadra',
  TUTTI: 'Tutti',
};

/** Chi gestisce il calendario vede anche le bozze. */
export const puoGestireEventi = (roles: Role[]) => ha(roles, 'ADMIN');

export const tonoRsvp: Record<string, Tono> = {
  PRESENTE: 'ok',
  FORSE: 'warn',
  ASSENTE: 'danger',
};

/** La propria risposta raccontata come sui pulsanti con cui la si dà. */
export const etichettaRisposta: Record<string, string> = {
  PRESENTE: 'Ci sono',
  FORSE: 'Forse',
  ASSENTE: 'Non ci sono',
};

export const tonoAssegnazione: Record<string, Tono> = {
  TITOLARE: 'ok',
  RISERVA: 'warn',
  NON_ASSEGNATO: 'neutro',
};

export const tonoIscrizione: Record<string, Tono> = {
  ATTIVA: 'ok',
  COMPILATA: 'warn',
  INVITATA: 'info',
  RIFIUTATA: 'danger',
  SCADUTA: 'neutro',
};

export const tonoFigt: Record<string, Tono> = {
  ATTIVA: 'ok',
  DA_RECUPERARE: 'warn',
  SCADUTA: 'danger',
  REVOCATA: 'neutro',
};

export const tonoRuolo: Record<Role, Tono> = {
  ADMIN: 'danger',
  AMMINISTRAZIONE: 'info',
  SEGRETERIA: 'info',
  TL: 'warn',
  ATLETA: 'ok',
};

export const etichettaRuolo: Record<Role, string> = {
  ADMIN: 'Admin',
  AMMINISTRAZIONE: 'Amministrazione',
  SEGRETERIA: 'Segreteria',
  TL: 'Team Leader',
  ATLETA: 'Atleta',
};

/** Tinte disponibili per le tipologie di attività, usate nel calendario. */
export const COLORI_TIPOLOGIA: Record<string, { bordo: string; etichetta: string }> = {
  verde: { bordo: 'border-nvg/40 bg-nvg/20 text-nvg', etichetta: 'Verde' },
  rosso: { bordo: 'border-itred/40 bg-itred/20 text-[#ff8a80]', etichetta: 'Rosso' },
  ambra: { bordo: 'border-warn/40 bg-warn/20 text-warn', etichetta: 'Ambra' },
  azzurro: { bordo: 'border-sky-400/40 bg-sky-400/15 text-sky-300', etichetta: 'Azzurro' },
  viola: { bordo: 'border-violet-400/40 bg-violet-400/15 text-violet-300', etichetta: 'Viola' },
  grigio: { bordo: 'border-line bg-surface2 text-muted', etichetta: 'Grigio' },
};

export const classeColore = (colore?: string | null) =>
  COLORI_TIPOLOGIA[colore ?? 'grigio']?.bordo ?? COLORI_TIPOLOGIA.grigio.bordo;

/** Portale federale da cui si recupera il codice tessera. */
export const URL_ASNWG = 'https://www.asnwg.it';
