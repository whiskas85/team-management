/**
 * L'aiuto in linea: una voce per pagina, più qualche argomento che attraversa
 * più pagine. Lo legge il «?» accanto al titolo di ogni pagina, che apre la
 * voce di quella pagina, e la pagina Aiuto, che le mostra tutte e le cerca.
 *
 * Scritto per chi usa il gestionale, non per chi lo programma: cosa si fa qui,
 * e i gesti che servono. Quando una pagina cambia, si cambia anche qui.
 */

export type Passo = { titolo: string; testo: string };

export type VoceAiuto = {
  /** Il percorso della pagina, con [id] per i pezzi che cambiano. Vuoto: un argomento. */
  percorso?: string;
  /** Chiave per i link: /aiuto#chiave. */
  chiave: string;
  titolo: string;
  /** Cosa si fa qui, in una o due frasi. */
  cosa: string;
  /** Chi la vede, se non tutti. */
  perChi?: string;
  passi: Passo[];
  /** Altre parole con cui qualcuno la cercherebbe. */
  parole?: string;
  area: 'Operativo' | 'Squadra' | 'Soldi' | 'Comunicazione' | 'Amministrazione' | 'Altre squadre' | 'Account';
};

export const AIUTO: VoceAiuto[] = [
  // ------------------------------------------------------------ operativo
  {
    percorso: '/dashboard',
    chiave: 'home',
    area: 'Operativo',
    titolo: 'Home',
    cosa: 'Il quadro della tua situazione: le prossime attività, cosa devi fare (certificato, tessera, pagamenti) e i tuoi numeri della stagione.',
    passi: [
      { titolo: 'Da gestire', testo: 'In cima trovi gli avvisi che ti riguardano: un certificato in scadenza, una quota da pagare, un sondaggio a cui rispondere. Ogni avviso porta alla pagina dove sistemarlo.' },
      { titolo: 'Prossime attività', testo: 'Le attività in arrivo: rispondi Ci sono / Forse / Non ci sono direttamente dalla card.' },
      { titolo: 'I tuoi numeri', testo: 'Presenze, parola mantenuta (quante volte sei venuto quando avevi detto di sì) e il grafico mese per mese.' },
    ],
    parole: 'cruscotto riepilogo inizio',
  },
  {
    percorso: '/calendario',
    chiave: 'calendario',
    area: 'Operativo',
    titolo: 'Calendario',
    cosa: 'Tutte le attività della squadra: in programma, per mese e lo storico. Da qui ci si segna e, per chi gestisce, si creano le attività.',
    passi: [
      { titolo: 'Segnarsi', testo: 'Su ogni card: Ci sono, Forse o Non ci sono. Puoi cambiare idea finché le adesioni sono aperte.' },
      { titolo: 'Viste', testo: 'In programma (le prossime), Mese (la griglia del mese, con la legenda delle tipologie) e Storico (quelle passate).' },
      { titolo: 'Inviti', testo: 'Per l’admin: le attività a cui ci invitano le squadre collegate. Si accettano (scegliendo la nostra tipologia e le quote), si rifiutano col motivo, si cancellano senza dirlo, o si apre un sondaggio «Partecipiamo?».' },
      { titolo: 'Nuova attività', testo: 'Per l’admin: il pulsante in alto crea una bozza. Diventa visibile solo quando la rilasci dalla sua scheda.' },
    ],
    parole: 'eventi giocate partite allenamenti adesioni presenze inviti',
  },
  {
    percorso: '/calendario/[id]',
    chiave: 'attivita',
    area: 'Operativo',
    titolo: 'Scheda dell’attività',
    cosa: 'Tutto su un’attività: quando, dove (con mappa di parcheggio e ritrovo), chi viene, quote, referenti, allegati e formazione.',
    passi: [
      { titolo: 'La tua adesione', testo: 'Nel riquadro a destra: Ci sono / Forse / Non ci sono, con una nota (es. arrivo tardi). Se serve il certificato e non è valido, te lo dice.' },
      { titolo: 'Dove e come arrivare', testo: 'Campo o luogo, ritrovo con la sua ora, e una mappa sola con i due punti: P · Parcheggio e R · Ritrovo. «Come arrivare» apre il navigatore.' },
      { titolo: 'Modifica (admin)', testo: 'A schede: Cosa e quando, Dove, Responsabili, Partecipanti, Pagamenti, Note. Nelle quote si spuntano le voci del listino o si aggiunge una quota col +: quella aggiunta alla squadra compare anche negli esterni.' },
      { titolo: 'Stato (admin)', testo: 'Bozza → Rilasciata (a squadra, a tutti o su invito) → Conclusa. Si può annullare o bloccare le iscrizioni.' },
      { titolo: 'Squadre ospiti', testo: 'Inviti squadre esterne col link o, se hanno il gestionale collegato, direttamente nel loro calendario. Per ognuna vedi presenti, dovuto, pagato e scoperto, e i permessi (modificarla, invitare altre squadre).' },
      { titolo: 'Organizzata da un’altra squadra', testo: 'In cima c’è il badge dell’organizzatore, chi viene squadra per squadra e — solo per l’admin — quanto chiedono, Info pagamenti e Paga.' },
    ],
    parole: 'evento giocata mappa parcheggio ritrovo quota formazione ospiti allegati book',
  },
  {
    percorso: '/debriefing',
    chiave: 'debriefing',
    area: 'Operativo',
    titolo: 'Debriefing',
    cosa: 'Il racconto delle giocate fatte: cosa è andato bene, cosa migliorare.',
    passi: [
      { titolo: 'Scrivere', testo: 'Scegli l’attività e racconta. Resta legato a quella giornata.' },
    ],
    parole: 'resoconto analisi dopo partita',
  },
  {
    percorso: '/ice',
    chiave: 'ice',
    area: 'Operativo',
    titolo: 'ICE · emergenze',
    cosa: 'I contatti di emergenza e i dati sanitari di chi è in campo, per chi deve intervenire.',
    perChi: 'Admin, amministrazione e Team Leader',
    passi: [
      { titolo: 'Cosa c’è', testo: 'Per ogni operatore: chi avvisare, il suo telefono, gruppo sanguigno, allergie e note mediche. Ognuno li scrive nel proprio profilo.' },
    ],
    parole: 'emergenza soccorso sanitari allergie gruppo sanguigno',
  },
  // ------------------------------------------------------------ squadra
  {
    percorso: '/profilo',
    chiave: 'profilo',
    area: 'Account',
    titolo: 'Il mio profilo',
    cosa: 'I tuoi dati: anagrafica, recapiti, foto, emergenze, consensi, password, notifiche e aspetto del gestionale.',
    passi: [
      { titolo: 'Dati e foto', testo: 'Ogni riquadro si apre e si salva a sé. Il callsign è il nome con cui ti vedono gli altri.' },
      { titolo: 'Emergenze', testo: 'Contatto, gruppo sanguigno, allergie: li legge solo chi deve soccorrerti.' },
      { titolo: 'Aspetto e accessibilità', testo: 'Il tema della squadra, oppure alto contrasto (scuro o chiaro) o i temi per daltonici, e il testo più grande. Chiaro/Scuro si cambia anche dal chip col tuo nome.' },
      { titolo: 'Notifiche', testo: 'Attiva le notifiche su questo dispositivo per sapere di nuove attività, sondaggi e pagamenti.' },
    ],
    parole: 'account dati personali password foto tema accessibilità daltonici ipovedenti notifiche',
  },
  {
    percorso: '/certificati',
    chiave: 'certificati',
    area: 'Squadra',
    titolo: 'Miei certificati',
    cosa: 'Il tuo certificato medico: caricalo, e il gestionale ti avvisa prima della scadenza.',
    passi: [
      { titolo: 'Caricare', testo: 'Foto o PDF, con la data di scadenza. La segreteria lo verifica.' },
      { titolo: 'Perché serve', testo: 'Alcune tipologie di attività non ti lasciano segnare senza un certificato valido (agonistico o non agonistico).' },
    ],
    parole: 'certificato medico agonistico scadenza visita',
  },
  {
    percorso: '/operatori/[id]',
    chiave: 'operatore',
    area: 'Squadra',
    titolo: 'Scheda operatore',
    cosa: 'La scheda di un compagno: callsign, incarichi, presenze e come contattarlo.',
    passi: [{ titolo: 'Contatti', testo: 'Telefono e WhatsApp, se li ha resi visibili.' }],
    parole: 'persona compagno atleta',
  },
  {
    percorso: '/admin/operatori',
    chiave: 'operatori',
    area: 'Squadra',
    titolo: 'Operatori',
    cosa: 'L’elenco di chi è in squadra, con stato, incarichi, certificati e tessere.',
    perChi: 'Chi gestisce la squadra',
    passi: [
      { titolo: 'Viste', testo: 'Elenco, e Compleanni: età di adesso e quanti giorni mancano, dal più vicino.' },
      { titolo: 'Scheda', testo: 'Aprendo un operatore: dati, ruoli, stato (squadra, sospeso…), pagamenti e presenze.' },
    ],
    parole: 'atleti squadra membri compleanni ruoli',
  },
  {
    percorso: '/admin/nuovi',
    chiave: 'nuovi',
    area: 'Squadra',
    titolo: 'Nuovi',
    cosa: 'Chi si è registrato e non è ancora in squadra: da approvare, seguire e far diventare operatore.',
    perChi: 'Chi gestisce la squadra',
    passi: [
      { titolo: 'Approvare', testo: 'Una registrazione in attesa si approva o si respinge (i dati vengono cancellati).' },
    ],
    parole: 'registrazioni prova reclute',
  },
  {
    percorso: '/admin/contatti',
    chiave: 'contatti',
    area: 'Squadra',
    titolo: 'Contatti',
    cosa: 'Persone interessate che non si sono ancora registrate: chi le ha sentite e cosa si sono detti.',
    perChi: 'Chi gestisce la squadra',
    passi: [{ titolo: 'Note', testo: 'Ogni contatto tiene la storia delle chiamate e dei messaggi.' }],
    parole: 'interessati lead rubrica',
  },
  {
    percorso: '/admin/squadra',
    chiave: 'mia-squadra',
    area: 'Squadra',
    titolo: 'La mia squadra',
    cosa: 'Il biglietto da visita della squadra: nome, nome del gestionale, motto, logo, recapiti, referenti — e il tema dei colori.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Profilo e logo', testo: 'Sono anche quelli che vedono le squadre collegate.' },
      { titolo: 'Tema', testo: 'Il colore d’accento (preso dal logo, fra quelli pronti o libero) e il fondo di partenza. Il contrasto lo sistema il gestionale. Chiaro o scuro poi lo sceglie ognuno.' },
      { titolo: 'Referenti', testo: 'Chi rappresenta la squadra verso fuori: si mostra col callsign e i recapiti scelti.' },
    ],
    parole: 'logo nome motto tema colori accento referenti profilo squadra',
  },
  // ------------------------------------------------------------ soldi
  {
    percorso: '/pagamenti',
    chiave: 'miei-pagamenti',
    area: 'Soldi',
    titolo: 'Miei pagamenti',
    cosa: 'Le tue quote: cosa devi, cosa hai pagato, e come pagare.',
    passi: [
      { titolo: 'Pagare', testo: 'Tocca un metodo (PayPal, bonifico…): il link apre il pagamento, l’IBAN si copia. Poi segnala «Ho pagato»: resta da confermare finché la cassa non lo vede arrivare.' },
      { titolo: 'Credito', testo: 'Se hai versato in anticipo, puoi pagare una quota col credito.' },
    ],
    parole: 'quote soldi pagare paypal bonifico iban credito',
  },
  {
    percorso: '/admin/pagamenti',
    chiave: 'pagamenti',
    area: 'Soldi',
    titolo: 'Pagamenti (segreteria)',
    cosa: 'Tutte le quote del club: da incassare, da confermare, incassate. Più le squadre ospiti e quello che dobbiamo alle altre squadre.',
    perChi: 'Segreteria',
    passi: [
      { titolo: 'Da confermare', testo: 'Chi ha detto di aver pagato: controlla e conferma. Il pallino nel menu conta questi.' },
      { titolo: 'Squadre ospiti', testo: 'Per ogni squadra collegata: dovuto, pagati, da confermare e scoperti. «Conferma incasso» mette il pagamento in cassa.' },
      { titolo: 'Da pagare ad altre squadre', testo: 'Solo admin: le attività di altre squadre a pagamento, con quanto resta da pagare.' },
    ],
    parole: 'incassi quote conferma segreteria ospiti',
  },
  {
    percorso: '/admin/cassa',
    chiave: 'cassa-club',
    area: 'Soldi',
    titolo: 'Cassa del club',
    cosa: 'Il registro dei movimenti: entrate e uscite scritte a mano e quelle che arrivano dalle quote.',
    perChi: 'Segreteria',
    passi: [
      { titolo: 'Movimento a mano', testo: 'Entrata o uscita, con categoria e metodo. Un acquisto può caricare il magazzino.' },
      { titolo: 'Filtri', testo: 'Tutti, dalle attività, a mano.' },
    ],
    parole: 'registro entrate uscite saldo contabilità',
  },
  {
    percorso: '/cassa',
    chiave: 'mia-cassa',
    area: 'Soldi',
    titolo: 'La tua cassa',
    cosa: 'Per chi gestisce una cassa diversa da quella del club (es. un corso): solo i pagamenti che finiscono lì.',
    perChi: 'Chi gestisce una cassa',
    passi: [
      { titolo: 'Confermare', testo: 'Chi ha segnalato di aver pagato aspetta la tua conferma.' },
      { titolo: 'Come si paga', testo: 'I metodi della tua cassa: IBAN, link, e se valgono anche per le squadre esterne.' },
    ],
    parole: 'cassa corso incassi gestore',
  },
  {
    percorso: '/admin/metodi',
    chiave: 'metodi',
    area: 'Soldi',
    titolo: 'Metodi di pagamento',
    cosa: 'Come si paga il club: nome, descrizione, istruzioni (IBAN, link PayPal…).',
    perChi: 'Admin',
    passi: [
      { titolo: 'Dichiarabile', testo: 'L’operatore può segnalare da sé di aver pagato con questo metodo.' },
      { titolo: 'Squadre esterne', testo: '«Lo usano anche le squadre esterne»: lo vedono le squadre collegate per pagare la loro parte.' },
      { titolo: 'Link', testo: 'Un link nelle istruzioni diventa il pulsante «Paga con …».' },
    ],
    parole: 'paypal iban satispay bonifico contanti',
  },
  {
    percorso: '/admin/tariffe',
    chiave: 'tariffe',
    area: 'Soldi',
    titolo: 'Tariffario',
    cosa: 'Le voci con cui si compongono le quote: costo partita, giocata nuovo, iscrizione…',
    perChi: 'Admin',
    passi: [
      { titolo: 'Usi', testo: 'Ogni voce dice dove si usa (attività, giocata nuovo, iscrizione…): nelle quote di un’attività compaiono solo quelle giuste.' },
      { titolo: 'Al giorno e polizza', testo: 'Una voce al giorno conta per ogni giorno dell’attività; una voce «polizza» paga la polizza giornaliera.' },
    ],
    parole: 'listino prezzi voci quote',
  },
  {
    percorso: '/admin/casse',
    chiave: 'casse',
    area: 'Soldi',
    titolo: 'Altre casse',
    cosa: 'Le casse oltre a quella del club (es. un istruttore): chi le gestisce e i loro metodi.',
    perChi: 'Segreteria',
    passi: [{ titolo: 'Gestori', testo: 'Chi gestisce una cassa conferma i suoi pagamenti dalla pagina «La tua cassa».' }],
    parole: 'casse istruttore corso',
  },
  // ------------------------------------------------------------ comunicazione
  {
    percorso: '/bacheca',
    chiave: 'bacheca',
    area: 'Comunicazione',
    titolo: 'Bacheche',
    cosa: 'Gli annunci della squadra, divisi per bacheca.',
    passi: [{ titolo: 'Leggere e commentare', testo: 'Apri un annuncio per leggerlo tutto e commentare.' }],
    parole: 'annunci news comunicazioni',
  },
  {
    percorso: '/sondaggi',
    chiave: 'sondaggi',
    area: 'Comunicazione',
    titolo: 'Sondaggi',
    cosa: 'Domande alla squadra: scelte libere, date per trovare il giorno di una giocata, presenze.',
    passi: [
      { titolo: 'Votare', testo: 'Apri il sondaggio e scegli. Puoi cambiare voto finché è aperto.' },
      { titolo: 'Dall’invito', testo: 'Un sondaggio «Partecipiamo?» aperto da un invito: accettando l’invito, chi ha detto «ci sono» o «forse» è già segnato.' },
    ],
    parole: 'votazione domanda date',
  },
  {
    percorso: '/segnalazioni',
    chiave: 'segnalazioni',
    area: 'Comunicazione',
    titolo: 'Segnalazioni',
    cosa: 'Per segnalare un problema o una proposta a chi gestisce, anche in forma riservata.',
    passi: [{ titolo: 'Seguire', testo: 'Ogni segnalazione ha il suo stato e le risposte.' }],
    parole: 'problema proposta reclamo',
  },
  {
    percorso: '/note',
    chiave: 'note',
    area: 'Comunicazione',
    titolo: 'Note',
    cosa: 'Note private su persone o attività: le legge solo chi le scrive.',
    passi: [{ titolo: 'Riservatezza', testo: 'Nessun altro le vede, nemmeno l’admin.' }],
    parole: 'appunti privati',
  },
  {
    percorso: '/admin/messaggi',
    chiave: 'messaggi',
    area: 'Comunicazione',
    titolo: 'Messaggi',
    cosa: 'Il collegamento WhatsApp del club e i messaggi automatici (inviti, solleciti).',
    perChi: 'Admin',
    passi: [{ titolo: 'Rubrica', testo: 'La diagnostica mostra se il collegamento funziona e sincronizza la rubrica.' }],
    parole: 'whatsapp messaggi automatici',
  },
  // ------------------------------------------------------------ mercatino
  {
    percorso: '/mercatino',
    chiave: 'mercatino',
    area: 'Squadra',
    titolo: 'Mercatino (usato)',
    cosa: 'Compra e vendi attrezzatura usata fra compagni.',
    passi: [{ titolo: 'Vendere', testo: 'Crea un annuncio con foto e prezzo. Leggi il regolamento del mercatino.' }],
    parole: 'usato vendita attrezzatura annunci',
  },
  {
    percorso: '/merchandising',
    chiave: 'merchandising',
    area: 'Squadra',
    titolo: 'Merchandising',
    cosa: 'Magliette, patch e articoli della squadra: si ordinano e si pagano come una quota.',
    passi: [{ titolo: 'Ordinare', testo: 'Scegli taglia e quantità, aggiungi al carrello e conferma.' }],
    parole: 'magliette patch ordini carrello',
  },
  // ------------------------------------------------------------ amministrazione
  {
    percorso: '/admin/tipologie',
    chiave: 'tipologie',
    area: 'Amministrazione',
    titolo: 'Tipologie di attività',
    cosa: 'Partita, allenamento, riunione…: colore nel calendario, certificato richiesto, se è solo per la squadra.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Solo squadra', testo: 'Una tipologia solo per la squadra non si rilascia ai nuovi: niente quota esterni.' },
    ],
    parole: 'tipi categorie colori calendario',
  },
  {
    percorso: '/admin/campi',
    chiave: 'campi',
    area: 'Amministrazione',
    titolo: 'Campi',
    cosa: 'I campi da gioco con indirizzo e posizione sulla mappa.',
    perChi: 'Admin',
    passi: [{ titolo: 'Posizione', testo: 'Le coordinate del campo diventano il punto «Parcheggio» sulla mappa dell’attività.' }],
    parole: 'luoghi campi mappa coordinate',
  },
  {
    percorso: '/admin/squadre',
    chiave: 'squadre',
    area: 'Altre squadre',
    titolo: 'Squadre (anagrafica)',
    cosa: 'Le squadre che conosciamo: recapiti, campi che gestiscono, inviti e collegamento.',
    perChi: 'Admin',
    passi: [{ titolo: 'Collegate', testo: 'L’icona della catena indica le squadre con il gestionale collegato.' }],
    parole: 'squadre esterne anagrafica',
  },
  {
    percorso: '/admin/collegamenti',
    chiave: 'collegamenti',
    area: 'Altre squadre',
    titolo: 'Squadre collegate',
    cosa: 'Collegare il nostro gestionale a quello di altre squadre, per condividere attività, numeri e pagamenti.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Collegarsi', testo: 'Crea un link (o QR) e mandalo all’altra squadra, oppure incolla il loro. La richiesta arriva fra le «Richieste di collegamento», dove si accetta scegliendo la squadra dell’anagrafica.' },
      { titolo: 'Proposte da altri', testo: 'Una richiesta può arrivare perché un’altra squadra ci ha proposto per una sua attività: lo dice la nota.' },
      { titolo: 'Scollega', testo: 'Le attività già condivise restano, congelate.' },
    ],
    parole: 'federazione collegamento link qr gestionale',
  },
  {
    percorso: '/admin/stagioni',
    chiave: 'stagioni',
    area: 'Amministrazione',
    titolo: 'Stagioni',
    cosa: 'Le stagioni sportive: ogni attività e ogni listino appartiene a una stagione.',
    perChi: 'Admin',
    passi: [{ titolo: 'Chiudere', testo: 'Una stagione chiusa non riceve più attività nuove.' }],
    parole: 'anno sportivo',
  },
  {
    percorso: '/admin/statistiche',
    chiave: 'statistiche',
    area: 'Amministrazione',
    titolo: 'Statistiche',
    cosa: 'Presenze, affidabilità e andamento della squadra.',
    perChi: 'Admin',
    passi: [{ titolo: 'Filtri', testo: 'Per stagione, tipologia e persona.' }],
    parole: 'numeri grafici presenze affidabilità',
  },
  {
    percorso: '/admin/polizze',
    chiave: 'polizze',
    area: 'Amministrazione',
    titolo: 'Polizze giornaliere',
    cosa: 'Le assicurazioni per chi viene da fuori, attività per attività.',
    perChi: 'Admin',
    passi: [{ titolo: 'Automatiche', testo: 'Si possono attivare da sole poco prima dell’attività; ogni attività può fare eccezione.' }],
    parole: 'assicurazione polizza',
  },
  {
    percorso: '/admin/tessere',
    chiave: 'tessere',
    area: 'Amministrazione',
    titolo: 'Tessere federali',
    cosa: 'Le tessere FIGT degli operatori.',
    perChi: 'Segreteria',
    passi: [{ titolo: 'Abbinare', testo: 'Il numero di tessera si abbina all’operatore.' }],
    parole: 'figt tessera federazione',
  },
  {
    percorso: '/admin/magazzino',
    chiave: 'magazzino',
    area: 'Amministrazione',
    titolo: 'Magazzino',
    cosa: 'Articoli, giacenze e riordini.',
    perChi: 'Segreteria',
    passi: [{ titolo: 'Carico', testo: 'Un acquisto registrato in cassa può caricare la merce qui.' }],
    parole: 'scorte giacenze riordino',
  },
  {
    percorso: '/assistente',
    chiave: 'assistente',
    area: 'Account',
    titolo: 'Assistente',
    cosa: 'Chiavi per collegare un assistente AI al gestionale, che lavora con i tuoi permessi.',
    passi: [{ titolo: 'Chiave', testo: 'Una chiave non dà poteri in più: eredita quelli di chi la crea. Si revoca quando si vuole.' }],
    parole: 'ai mcp chiave claude',
  },
  // ------------------------------------------------------------ argomenti
  {
    chiave: 'tema',
    area: 'Account',
    titolo: 'Chiaro, scuro e accessibilità',
    cosa: 'Come cambiare l’aspetto del gestionale per te.',
    passi: [
      { titolo: 'Chiaro / Scuro', testo: 'Clicca sul tuo nome in alto a destra: il selettore ☀ Chiaro / ☾ Scuro vale solo per te.' },
      { titolo: 'Temi di accessibilità', testo: 'Nel profilo, «Aspetto e accessibilità»: alto contrasto per chi vede poco, temi per daltonici rosso-verde e blu-giallo, testo più grande.' },
    ],
    parole: 'tema notte giorno chiaro scuro daltonici ipovedenti contrasto testo grande',
  },
  {
    chiave: 'attivita-condivise',
    area: 'Altre squadre',
    titolo: 'Attività con altre squadre',
    cosa: 'Come funzionano inviti, numeri e pagamenti con le squadre collegate.',
    passi: [
      { titolo: 'Invitare', testo: 'Nella scheda dell’attività, «Invita una squadra»: se è collegata l’attività arriva nel loro calendario. Scegli se possono modificarla e se possono invitare altre squadre.' },
      { titolo: 'Essere invitati', testo: 'L’invito arriva in Calendario → Inviti: accetta (con la nostra tipologia e le quote), rifiuta o apri un sondaggio.' },
      { titolo: 'Numeri', testo: 'I nostri presenti vanno all’organizzatore da soli; i «forse» solo se lo decidi.' },
      { titolo: 'Pagare l’organizzatore', testo: 'Solo l’admin vede quanto chiedono. «Paga» segnala il pagamento; quando lo confermano diventa un’uscita del registro. Se si aggiunge qualcuno, si paga il resto.' },
      { titolo: 'Re-inviti', testo: 'Se ti lasciano invitare altre squadre, proponi una tua collegata: la invita l’organizzatore, collegandosi se serve.' },
    ],
    parole: 'federazione inviti ospiti organizzatore pagamenti fra squadre',
  },
];

/** La voce di una pagina: vince il percorso più preciso. */
export function aiutoPer(pathname: string): VoceAiuto | null {
  let migliore: { v: VoceAiuto; peso: number } | null = null;
  for (const v of AIUTO) {
    if (!v.percorso) continue;
    const re = new RegExp(
      '^' + v.percorso.replace(/\[[^\]]+\]/g, '[^/]+').replace(/\//g, '\\/') + '(\\/.*)?$',
    );
    if (!re.test(pathname)) continue;
    // più pezzi fissi = più preciso
    const peso = v.percorso.split('/').filter((p) => p && !p.startsWith('[')).length * 10 +
      v.percorso.split('/').length;
    if (!migliore || peso > migliore.peso) migliore = { v, peso };
  }
  return migliore?.v ?? null;
}

const normale = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Cerca nell'aiuto: tutte le parole devono esserci, titolo e cosa pesano di più. */
export function cercaAiuto(testo: string): VoceAiuto[] {
  const parole = normale(testo).split(/\s+/).filter((p) => p.length > 1);
  if (parole.length === 0) return [];
  return AIUTO.map((v) => {
    const alto = normale(`${v.titolo} ${v.cosa} ${v.parole ?? ''}`);
    const basso = normale(v.passi.map((p) => `${p.titolo} ${p.testo}`).join(' '));
    let punti = 0;
    for (const p of parole) {
      if (alto.includes(p)) punti += 3;
      else if (basso.includes(p)) punti += 1;
      else return { v, punti: 0 };
    }
    return { v, punti };
  })
    .filter((x) => x.punti > 0)
    .sort((a, b) => b.punti - a.punti)
    .map((x) => x.v);
}
