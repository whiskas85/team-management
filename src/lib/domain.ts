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

/**
 * Chi vede la scheda di un operatore (anagrafica, note, storico) e la tabella
 * degli operatori.
 *
 * Il team leader non c'è, dalla 2.82.2: schiera e fa l'appello, e i compagni
 * li vede come chiunque in squadra, dalla scheda di squadra. L'anagrafica
 * intera — date di nascita, certificati, tessere, soldi — è di chi tiene le
 * carte del club.
 */
export const puoVedereOperatori = (roles: Role[]) =>
  ha(roles, 'ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA');

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

/** Si è registrato da solo e aspetta il via libera: non vede ancora niente. */
export const inAttesaDiApprovazione = (stato: StatoOperatore) => stato === 'REGISTRATO';

/**
 * Gli stati che popolano l'elenco "Nuovi": l'iter di ingresso e chi si è
 * fermato. `REGISTRATO` c'è dentro perché anche lui è un contatto e la sua
 * scheda va protetta come le altre — nella pagina però sta a parte, in cima,
 * fra le richieste da approvare.
 */
export const STATI_CONTATTO: StatoOperatore[] = [
  'REGISTRATO',
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
  REGISTRATO: 'Da approvare',
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
  REGISTRATO: 'warn',
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
  NON_GESTITO: 'neutro',
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

/**
 * Chi può essere messo come referente di un'attività.
 *
 * **Solo chi ha il ruolo atleta.** Il referente è il nome a cui chiedere come
 * ci si veste, a che ora si parte, dove si parcheggia: sono risposte che sa
 * chi in campo ci va. Chi tiene i conti o le tessere è prezioso altrove e non
 * ha niente da dire su quella domenica — e trovarsi messo come riferimento di
 * una giocata vuol dire ricevere telefonate a cui non si sa rispondere.
 *
 * Chi gioca **e** amministra resta candidabile: i ruoli sono un insieme, e
 * basta avere anche questo.
 */
export const puoEssereReferente = (roles: Role[]) => eAtleta(roles);

/**
 * **Il libro atleti**: chi in campo ci va.
 *
 * È il ruolo `ATLETA`, e da qui in avanti è **una regola sola** invece di sei
 * controlli scritti a mano. Serve perché in squadra non ci sono solo giocatori:
 * c'è anche chi tiene i conti, le tessere, la segreteria — gente preziosa che
 * in campo non ci mette piede. Contarla insieme agli altri faceva due danni
 * silenziosi: **abbassava le percentuali** (l'affluenza media divisa per una
 * rosa più grande di quella vera, la regolarità dei certificati divisa per
 * gente a cui il certificato non si chiede) e la **offriva da schierare**,
 * mettendo in una giocata un nome che quella domenica non ci sarebbe andato.
 *
 * «In squadra» e «nel libro atleti» restano due cose diverse: un non atleta
 * è del club a tutti gli effetti — si iscrive, paga, viene alle cene — e
 * toglierlo dalla squadra sarebbe dirgli che non conta. Non è quello che si
 * vuole dire: si vuole solo dire che **in campo non ci va**.
 *
 * Chi gioca **e** amministra è nel libro: i ruoli sono un insieme, e basta
 * avere anche questo.
 */
export const eAtleta = (roles: Role[]) => ha(roles, 'ATLETA');

/**
 * Il libro atleti detto a Prisma, per non riscrivere il filtro ogni volta.
 *
 * Si mette in `AND` con lo stato: il libro dice **chi gioca**, lo stato dice
 * **chi c'è adesso**, e sono due domande diverse — un atleta disabilitato è
 * nel libro ma non è in rosa.
 */
export const soloAtleti = { roles: { has: 'ATLETA' as Role } };

/**
 * Chi tiene in mano una singola attività.
 *
 * L'admin e i team leader perché è il loro mestiere ovunque, **e i referenti di
 * quella attività**: sono i nomi scritti nella scheda come persone a cui
 * chiedere, e chi riceve le domande deve poter fare le cose che le domande
 * comportano — mandare il link a una squadra ospite, caricare il book.
 *
 * È un permesso che vale per un'attività sola: fuori di lì un referente non può
 * niente di più degli altri.
 */
export const tieneInMano = (
  me: { id: string; roles: Role[] },
  referenti: { userId: string }[],
) => isAdmin(me.roles) || puoSchierare(me.roles) || referenti.some((r) => r.userId === me.id);

/**
 * A chi si chiede il certificato medico: **a chi ha il ruolo atleta**.
 *
 * Il certificato serve a scendere in campo. Chi tiene i conti, le tessere o la
 * segreteria e in campo non ci va non ne ha bisogno, e metterlo fra i «senza
 * certificato» gonfiava un elenco che si guarda per sapere chi non può giocare
 * — con nomi di gente che non ha mai chiesto di farlo. Chi gioca **e**
 * amministra resta dentro: i ruoli sono un insieme, e basta avere anche questo.
 *
 * Non vieta niente: un non atleta che il certificato lo carica lo stesso se lo
 * vede gestito come tutti. Dice solo a chi va **chiesto**.
 */
export const devePortareCertificato = (roles: Role[]) => eAtleta(roles);

/** Chi gestisce il calendario vede anche le bozze. */
export const puoGestireEventi = (roles: Role[]) => ha(roles, 'ADMIN');

/**
 * La nota che lo staff lascia quando è lui a segnare qualcuno.
 *
 * Sta qui e non scritta a mano in due punti perché è insieme quello che si
 * **scrive** aggiungendo un partecipante e quello che si **riconosce**
 * mostrandolo: se le due stringhe divergono, la riga resta ma nessuno la vede
 * più per quello che è — e torna a mescolarsi con le note vere, che le persone
 * scrivono di loro pugno.
 */
export const NOTA_AGGIUNTO_STAFF = 'Aggiunto dallo staff';

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

/**
 * I colori delle tipologie di attività: **un colore solo per voce**, e da lì
 * tutto il resto.
 *
 * - `tinta`: il colore, in esadecimale. È quello della fetta nella torta
 *   della home, e quello dei quadratini.
 * - `bordo`: la scheda di un'attività nel calendario, con fondo velato, bordo
 *   e testo della stessa tinta.
 * - `pieno`: il quadratino della legenda e del selettore, a tinta piena.
 *
 * Prima le schede mescolavano due famiglie di colore (un fondo rosso scuro
 * con il testo rosa, un bordo azzurro con il testo di un altro azzurro), i
 * quadratini erano velati e la torta a tinta piena: la stessa PLR aveva tre
 * facce diverse. Ora le tre classi ripetono la stessa tinta, e vanno cambiate
 * insieme. Le classi sono scritte per intero perché Tailwind le trova solo
 * così: costruite a pezzi a runtime non esisterebbero nel CSS.
 *
 * Il nome della chiave è quello salvato nel database: si possono aggiungere
 * colori, ma una chiave già usata non si rinomina.
 */
export const COLORI_TIPOLOGIA: Record<
  string,
  { etichetta: string; tinta: string; bordo: string; pieno: string }
> = {
  verde: {
    etichetta: 'Verde',
    tinta: '#4cff00',
    bordo: 'border-[#4cff00]/40 bg-[#4cff00]/20 text-[#4cff00]',
    pieno: 'bg-[#4cff00]',
  },
  turchese: {
    etichetta: 'Turchese',
    tinta: '#2dd4bf',
    bordo: 'border-[#2dd4bf]/40 bg-[#2dd4bf]/20 text-[#2dd4bf]',
    pieno: 'bg-[#2dd4bf]',
  },
  azzurro: {
    etichetta: 'Azzurro',
    tinta: '#38bdf8',
    bordo: 'border-[#38bdf8]/40 bg-[#38bdf8]/20 text-[#38bdf8]',
    pieno: 'bg-[#38bdf8]',
  },
  blu: {
    etichetta: 'Blu',
    tinta: '#5b8def',
    bordo: 'border-[#5b8def]/40 bg-[#5b8def]/20 text-[#5b8def]',
    pieno: 'bg-[#5b8def]',
  },
  viola: {
    etichetta: 'Viola',
    tinta: '#a78bfa',
    bordo: 'border-[#a78bfa]/40 bg-[#a78bfa]/20 text-[#a78bfa]',
    pieno: 'bg-[#a78bfa]',
  },
  fucsia: {
    etichetta: 'Fucsia',
    tinta: '#e879f9',
    bordo: 'border-[#e879f9]/40 bg-[#e879f9]/20 text-[#e879f9]',
    pieno: 'bg-[#e879f9]',
  },
  rosa: {
    etichetta: 'Rosa',
    tinta: '#f9a8d4',
    bordo: 'border-[#f9a8d4]/40 bg-[#f9a8d4]/20 text-[#f9a8d4]',
    pieno: 'bg-[#f9a8d4]',
  },
  rosso: {
    etichetta: 'Rosso',
    tinta: '#ff5a4f',
    bordo: 'border-[#ff5a4f]/40 bg-[#ff5a4f]/20 text-[#ff5a4f]',
    pieno: 'bg-[#ff5a4f]',
  },
  arancione: {
    etichetta: 'Arancione',
    tinta: '#fb923c',
    bordo: 'border-[#fb923c]/40 bg-[#fb923c]/20 text-[#fb923c]',
    pieno: 'bg-[#fb923c]',
  },
  ambra: {
    etichetta: 'Ambra',
    tinta: '#ffb300',
    bordo: 'border-[#ffb300]/40 bg-[#ffb300]/20 text-[#ffb300]',
    pieno: 'bg-[#ffb300]',
  },
  giallo: {
    etichetta: 'Giallo',
    tinta: '#fde047',
    bordo: 'border-[#fde047]/40 bg-[#fde047]/20 text-[#fde047]',
    pieno: 'bg-[#fde047]',
  },
  sabbia: {
    etichetta: 'Sabbia',
    tinta: '#d4b483',
    bordo: 'border-[#d4b483]/40 bg-[#d4b483]/20 text-[#d4b483]',
    pieno: 'bg-[#d4b483]',
  },
  bianco: {
    etichetta: 'Bianco',
    tinta: '#e7ede7',
    bordo: 'border-[#e7ede7]/40 bg-[#e7ede7]/20 text-[#e7ede7]',
    pieno: 'bg-[#e7ede7]',
  },
  grigio: {
    etichetta: 'Grigio',
    tinta: '#7f8a7f',
    bordo: 'border-[#7f8a7f]/40 bg-[#7f8a7f]/20 text-[#7f8a7f]',
    pieno: 'bg-[#7f8a7f]',
  },
};

/** La scheda di un'attività nel calendario. */
export const classeColore = (colore?: string | null) =>
  COLORI_TIPOLOGIA[colore ?? 'grigio']?.bordo ?? COLORI_TIPOLOGIA.grigio.bordo;

/** Il quadratino a tinta piena: legenda, selettore, elenco delle tipologie. */
export const classePiena = (colore?: string | null) =>
  COLORI_TIPOLOGIA[colore ?? 'grigio']?.pieno ?? COLORI_TIPOLOGIA.grigio.pieno;

/** La tinta in esadecimale, per quello che si disegna in SVG (la torta). */
export const tintaColore = (colore?: string | null) =>
  COLORI_TIPOLOGIA[colore ?? 'grigio']?.tinta ?? COLORI_TIPOLOGIA.grigio.tinta;

/** Portale federale da cui si recupera il codice tessera. */
export const URL_ASNWG = 'https://www.intranetasnwg.it/';
