import type { CertStatus, Role, StatoOperatore } from '@prisma/client';

// ---------------------------------------------------------------- permessi
// Un operatore ha più ruoli: i permessi si leggono sempre dall'insieme.

export const ha = (roles: Role[], ...cercati: Role[]) => roles.some((r) => cercati.includes(r));

export const isAdmin = (roles: Role[]) => ha(roles, 'ADMIN');

/** Amministrazione: iscrizioni, certificati medici, tessere FIGT. */
export const puoAmministrare = (roles: Role[]) => ha(roles, 'ADMIN', 'AMMINISTRAZIONE');

/** Segreteria: quote e pagamenti. */
export const puoGestirePagamenti = (roles: Role[]) => ha(roles, 'ADMIN', 'SEGRETERIA');

/**
 * Moderatore: tiene pulite le conversazioni.
 *
 * È un mestiere a parte da comandare la squadra, e per questo è un ruolo suo:
 * legge le segnalazioni e cancella i messaggi fuori posto, e non può fare
 * nient'altro. Chi scrive una cosa che urta qualcuno non deve trovarsi
 * giudicato da chi decide anche se giochi la domenica.
 */
export const puoModerareChat = (roles: Role[]) => ha(roles, 'ADMIN', 'MODERATORE');

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

/**
 * Chi tiene aggiornati statuto e regolamento.
 *
 * Non solo l'admin: sono i testi che l'amministrazione e la segreteria si
 * ritrovano fra le mani quando cambia una quota o una regola di condotta, e
 * farli passare ogni volta da chi ha le chiavi di tutto vuol dire che restano
 * vecchi. Leggerli invece è di tutta la squadra.
 */
export const puoScrivereDocumenti = (roles: Role[]) =>
  ha(roles, 'ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA');

/**
 * Chi vede la memoria della squadra.
 *
 * Il debriefing racconta com'è andata una giocata: lo scrive chi c'era e lo
 * rilegge chi gioca — atleti, team leader, admin. Un incarico da scrivania non
 * basta a vederlo, e non è diffidenza: chi tiene i conti o le tessere non ha
 * niente da farci, e una voce di menu che non si apre mai è una voce che
 * allunga l'elenco a tutti. Chi amministra **e** gioca lo vede lo stesso: i
 * ruoli sono un insieme, e basta averne uno di quelli giusti.
 */
export const vedeDebriefing = (roles: Role[]) => ha(roles, 'ADMIN', 'TL', 'ATLETA');

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
 * Se per questa attività il certificato medico è dovuto.
 *
 * Lo decide la tipologia: a una riunione o a una cena si va anche senza, e
 * pretenderlo terrebbe fuori dalla sala chi non gioca. Senza tipologia si
 * resta prudenti e lo si chiede.
 */
export const serveCertificato = (tipo?: { certMedico: boolean } | null) => tipo?.certMedico ?? true;

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
  INVITO: 'Su invito',
};

/**
 * Se un'attività ha una formazione da comporre.
 *
 * Ce l'ha quando la tipologia prevede le riserve, **e anche quando i posti
 * sono contati**: un limite che nessuno può far rispettare non è un limite.
 *
 * Sta qui e non in tre punti diversi perché da questa risposta dipendono cose
 * che devono restare d'accordo fra loro: chi paga la quota, chi occupa un
 * posto, e chi finisce nell'appello. Se divergessero, si arriverebbe a
 * chiedere i soldi a una riserva o a segnarla assente per un'attività che non
 * ha giocato.
 */
export const conFormazione = (e: {
  maxPartecipanti: number | null;
  tipo?: { riserve: boolean } | null;
}) => (e.tipo?.riserve ?? false) || e.maxPartecipanti !== null;

/**
 * Chi occupa un posto in campo — e quindi paga la quota.
 *
 * I convocati il posto ce l'hanno già, aspettano solo di pagarlo. Il TOC no:
 * sta in sala controllo, non toglie un posto a nessuno e la quota paga il
 * campo, non la giornata.
 */
export const occupaPosto = (r: { assegnazione: string }) =>
  r.assegnazione === 'TITOLARE' || r.assegnazione === 'CONVOCATO';

/**
 * Chi è atteso all'attività, TOC compreso.
 *
 * È la lista dell'appello: la sala controllo c'era anche se non ha sparato un
 * colpo, e segnarla assente sarebbe falso.
 */
export const schierato = (r: { assegnazione: string }) =>
  occupaPosto(r) || r.assegnazione === 'TOC';

export const etichettaAssegnazione: Record<string, string> = {
  NON_ASSEGNATO: 'Da assegnare',
  CONVOCATO: 'Convocato',
  TITOLARE: 'Titolare',
  TOC: 'TOC',
  RISERVA: 'Riserva',
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
  MODERATORE: 'info',
  ATLETA: 'ok',
};

export const etichettaRuolo: Record<Role, string> = {
  ADMIN: 'Admin',
  AMMINISTRAZIONE: 'Amministrazione',
  SEGRETERIA: 'Segreteria',
  TL: 'Team Leader',
  MODERATORE: 'Moderatore',
  ATLETA: 'Atleta',
};

/**
 * A cosa serve ogni ruolo, in una riga.
 *
 * Sta qui accanto ai permessi e non in una pagina: se un domani cambia chi può
 * fare cosa, la spiegazione da correggere è a due righe di distanza dalla
 * regola, non in un altro file che nessuno si ricorda di aggiornare.
 */
export const SPIEGA_RUOLO: Record<Role, string> = {
  ADMIN: 'Comanda il gestionale: può fare tutto quello che fanno gli altri, e in più i dati di base.',
  AMMINISTRAZIONE: 'Segue le persone: chi entra, chi è in regola con i documenti, chi è tesserato.',
  SEGRETERIA: 'Segue i soldi: quote da incassare, pagamenti dichiarati, cassa.',
  TL: 'Porta la squadra in campo: decide chi gioca e registra chi c’era davvero.',
  MODERATORE:
    'Tiene pulite le conversazioni: riceve le segnalazioni e toglie i messaggi fuori posto.',
  ATLETA: 'Membro della squadra: è il ruolo di chi gioca e basta.',
};

/** Cosa può fare, in concreto: le voci corrispondono ai permessi qui sopra. */
export const POTERI_RUOLO: Record<Role, string[]> = {
  ADMIN: [
    'Calendario: crea, modifica, rilascia e annulla le attività',
    'Operatori: crea, cambia ruoli e stato, azzera password, elimina',
    'Dati di base: tipologie, campi, squadre esterne, tariffario, metodi di pagamento, stagioni',
    'Statistiche del team',
    'Tutto ciò che possono fare gli altri ruoli',
  ],
  AMMINISTRAZIONE: [
    'Invio delle richieste di iscrizione e valutazione dei moduli compilati',
    'Certificati medici: approva, rifiuta, tiene d’occhio le scadenze',
    'Tessere FIGT: importa dal portale federale e le abbina alle persone',
    'Contatti nuovi: li vede con nome e cognome e ne apre la scheda',
    'Dati sanitari (ICE) e giornaliere assicurative',
  ],
  SEGRETERIA: [
    'Pagamenti: conferma gli incassi dichiarati, registra quote e rimborsi',
    'Cassa: entrate e uscite, saldo, polizze prova',
    'Contatti nuovi: li vede con nome e cognome e ne apre la scheda',
    'Schede operatore, per sapere chi deve cosa',
  ],
  TL: [
    'Formazione: schiera titolari e riserve sulle attività che la prevedono',
    'Aggiunge partecipanti e fa l’appello a fine attività',
    'Assicura con la giornaliera chi gioca senza tessera',
    'Schede operatore e dati sanitari, che in gara servono',
  ],
  MODERATORE: [
    'Segnalazioni: le riceve e le chiude',
    'Commenti: toglie quelli fuori posto, sotto le attività e sotto gli annunci',
  ],
  ATLETA: [
    'Calendario della squadra e adesioni',
    'I propri certificati, la propria iscrizione, i propri pagamenti',
    'Schede dei compagni: recapiti e presenze, niente dati personali',
  ],
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
export const URL_ASNWG = 'https://www.intranetasnwg.it/';
