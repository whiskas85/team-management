/**
 * I testi e i link del sito, tutti qui.
 *
 * Staccati dall'impaginazione apposta: correggere una frase, aggiungere un
 * link o cambiare una foto non deve voler dire cercare dentro le pagine. Le
 * foto si mettono in `public/sito/` con il nome scritto qui accanto a ogni
 * sezione: se il file c'è si vede la foto, altrimenti un disegno al suo posto.
 */

export const LINK_SOCIAL = [
  { testo: 'Instagram · @zero.dark.team', url: 'https://www.instagram.com/zero.dark.team/' },
  { testo: 'YouTube · SAT & Gaming', url: 'https://www.youtube.com/@SATgaming1' },
];

/** Cosa ci appassiona: la riga sotto «chi siamo». */
export const INTERESSI = [
  {
    nome: 'Softair',
    testo:
      'Il gioco tattico come lo intendiamo noi: pianificazione, movimento coordinato, comunicazione. Vince la squadra, non il singolo.',
  },
  {
    nome: 'Tracking',
    testo:
      'Leggere il terreno: tracce, segni di passaggio, direzioni. Sapere dove è passato qualcuno, e far sì che nessuno sappia dove siamo passati noi.',
  },
  {
    nome: 'Cartografia',
    testo:
      'Carta topografica, bussola e coordinate. Il percorso si decide prima di partire, e quando il GPS tace la carta parla ancora.',
  },
  {
    nome: 'ATAK',
    testo:
      'La mappa condivisa sul telefono: posizioni, obiettivi e rotte della squadra in tempo reale. La tecnologia al servizio della pattuglia.',
  },
];

/**
 * I valori del softair: il codice che ci diamo in campo.
 *
 * Il softair si regge sulla parola: nessun arbitro vede ogni colpo, e il gioco
 * funziona solo se chi viene colpito lo dichiara. Tutto il resto viene da lì.
 */
export const VALORI = [
  {
    nome: 'Lealtà',
    testo: 'Chi è colpito lo dichiara, sempre. Il gioco si regge sulla parola di chi gioca, e la nostra vale.',
  },
  {
    nome: 'Rispetto',
    testo: 'Per gli avversari, per gli arbitri, per le regole. Si stringe la mano prima e dopo, qualunque sia il risultato.',
  },
  {
    nome: 'Squadra',
    testo: 'Nessuno resta indietro. Si parte insieme, si arriva insieme: il più lento detta il passo, non il più veloce.',
  },
  {
    nome: 'Sicurezza',
    testo: 'Protezioni sempre indossate, regole di ingaggio rispettate, repliche in regola. Il divertimento viene dopo, mai prima.',
  },
  {
    nome: 'Preparazione',
    testo: 'Ci si allena, si studia, si prova. In campo si fa quello che si è preparato, e si impara da quello che non ha funzionato.',
  },
  {
    nome: 'Natura',
    testo: 'Giochiamo nei boschi e li lasciamo come li abbiamo trovati. Niente resta a terra, niente si rovina.',
  },
];

/** Le nostre ambizioni: i campi dove vogliamo misurarci. */
export const AMBIZIONI = [
  {
    sigla: 'PCR',
    nome: 'Pattuglia a Corto Raggio',
    foto: 'pcr.jpg',
    codice: 'OBJ · SHORT RANGE',
    testo:
      'Il circuito FIGT dell’azione: obiettivi ravvicinati uno dopo l’altro, poche ore di gioco intenso. Conta l’esecuzione — ogni prova fatta bene porta punti, anche se poi la squadra viene fermata. Radio, coordinazione e sangue freddo.',
  },
  {
    sigla: 'PLR',
    nome: 'Pattuglia a Lungo Raggio',
    foto: 'plr.jpg',
    codice: 'NAV · LONG RANGE',
    testo:
      'Il campionato FIGT più duro: missioni da molte ore, anche di notte, con infiltrazione e navigazione libera su terreni vasti. Carta e bussola, gestione di acqua ed energie, silenzio. Arriva in fondo chi resta lucido fino all’ultimo obiettivo.',
  },
  {
    sigla: 'MILSIM',
    nome: 'Simulazione militare',
    foto: 'milsim.jpg',
    codice: 'OPS · MULTI-DAY',
    testo:
      'Eventi di più giorni con scenari realistici: catena di comando, ruoli, logistica, briefing e debriefing. Si vive in campo, si pianifica e si esegue come un’unità vera.',
  },
  {
    sigla: 'CORSI',
    nome: 'Formazione interna',
    foto: 'corsi.jpg',
    codice: 'TRN · IN-HOUSE',
    testo:
      'Ci aggiorniamo tra di noi: cartografia e orientamento, radio e procedure di comunicazione, ATAK per condividere posizioni e obiettivi. Chi sa una cosa la insegna agli altri, e la squadra cresce insieme.',
  },
];

/**
 * L'associazione di riferimento: e' lei, e non la squadra, il soggetto con cui
 * si firma — titolare dei dati del modulo, affiliata a federazione ed ente.
 */
export const ASSOCIAZIONE = 'SAT & Gaming ASD';

/** Le affiliazioni, con i loro canali ufficiali. */
export const AFFILIAZIONI = [
  {
    sigla: 'FIGT',
    nome: 'Federazione Italiana Gioco Tattico · ASNWG',
    testo: 'La federazione del softair in Italia: regolamenti, campionati PCR e PLR, tesseramento.',
    link: [
      { testo: 'Documenti', url: 'https://www.figt.it/documenti-figt-asnwg/' },
      { testo: 'Facebook', url: 'https://www.facebook.com/figt.it/?locale=it_IT' },
      { testo: 'Instagram', url: 'https://www.instagram.com/figtasnwg/' },
      { testo: 'YouTube', url: 'https://www.youtube.com/channel/UCJUQKzB4ydwMnJ5XsWs8Hsg' },
    ],
  },
  {
    sigla: 'CORP',
    nome: 'Comitato Regionale Piemonte · FIGT',
    testo: 'Il comitato regionale della FIGT: il riferimento delle squadre piemontesi.',
    link: [{ testo: 'Facebook', url: 'https://www.facebook.com/corpfigt' }],
  },
  {
    sigla: 'ACSI',
    nome: 'Associazione Centri Sportivi Italiani',
    testo: 'L’ente di promozione sportiva a cui siamo affiliati.',
    link: [
      { testo: 'Sito', url: 'https://www.acsi.it/' },
      { testo: 'Facebook', url: 'https://www.facebook.com/acsi1960/?locale=it_IT' },
      { testo: 'Instagram', url: 'https://www.instagram.com/acsisocial/' },
    ],
  },
];
