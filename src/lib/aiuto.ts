/**
 * L'aiuto in linea: una voce per pagina, più qualche argomento che attraversa
 * più pagine. Lo legge il «?» accanto al titolo di ogni pagina, che apre la
 * voce di quella pagina, e la pagina Aiuto, che le mostra tutte e le cerca.
 *
 * Scritto per chi usa il gestionale, non per chi lo programma: cosa si fa qui,
 * e i gesti che servono. Quando una pagina cambia, si cambia anche qui.
 *
 * Nei testi i pulsanti si disegnano, non si descrivono: un segnaposto fra
 * doppie quadre diventa la copia del pulsante vero (TestoAiuto). Così chi
 * legge «premi Paga» ha già visto com'è fatto, e sulla pagina lo riconosce.
 *
 *   [[p:icona|Testo]]   pulsante pieno, l'azione principale
 *   [[g:icona|Testo]]   pulsante bordato; senza testo resta solo l'icona
 *   [[d:icona|Testo]]   pulsante rosso
 *   [[x]]               il cestino rosso
 *   [[si]] [[forse]] [[no]]   le icone di risposta delle card, accese
 *   [[adesione]]        i tre pulsanti grandi della scheda attività
 *   [[b:tono|Testo]]    un badge (ok, warn, danger, info, neutro); b:tono:icona con l'icona
 *   [[v|Testo]]         una vista scelta nel selettore in cima alla pagina
 *   [[i:icona]]         un'icona da sola; [[i:titolare|piena]] la disegna piena
 *   [[naviga]]          il pulsantino «Naviga» delle card
 *   **testo**           in grassetto: il nome di un riquadro da cercare sulla pagina
 *
 * L'icona è facoltativa ([[p|Salva]]) e deve essere un nome di Icona.
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
  area:
    | 'Primi passi'
    | 'Operativo'
    | 'Squadra'
    | 'Soldi'
    | 'Comunicazione'
    | 'Amministrazione'
    | 'Altre squadre'
    | 'Account';
};

/** Un segnaposto nei testi: [[tipo:argomento|testo]], con argomento e testo facoltativi. */
export const SEGNAPOSTO = /\[\[(\w+)(?::([^|\]]+))?(?:\|([^\]]*))?\]\]/g;

export const AIUTO: VoceAiuto[] = [
  // ------------------------------------------------------------ primi passi
  {
    chiave: 'muoversi',
    area: 'Primi passi',
    titolo: 'Muoversi nel gestionale',
    cosa: 'Gli strumenti che trovi su ogni pagina: il menu, i preferiti, la ricerca, l’aiuto e il riquadro col tuo nome.',
    passi: [
      { titolo: 'Il menu', testo: 'Sul computer è la colonna a sinistra, divisa in gruppi. Sul telefono è la barra in basso: quattro scorciatoie e [[g:menu|Menu]] per aprire tutto il resto. Vedi solo le pagine che i tuoi incarichi permettono; un numero accanto a una voce vuol dire che lì c’è qualcosa che ti aspetta.' },
      { titolo: 'I preferiti', testo: 'La stellina [[i:titolare]] accanto al titolo mette la pagina fra i **Preferiti**; quando è piena [[i:titolare|piena]] c’è già, e toccandola la togli. I preferiti stanno in cima al menu e sul telefono diventano le scorciatoie della barra in basso. Per riordinarli tieni premuta una voce finché si stacca, poi trascinala.' },
      { titolo: 'Cercare', testo: 'Sul computer, la casella **Cerca…** in alto trova pagine, attività, persone e documenti: scrivi, scegli con le frecce e premi Invio. Si apre anche da tastiera con Ctrl+K oppure /.' },
      { titolo: 'L’aiuto', testo: 'Il [[i:aiuto]] accanto al titolo spiega la pagina in cui sei; in cima alla finestra puoi cercare in tutto l’aiuto. Questa pagina, con tutte le spiegazioni, si apre dal riquadro del tuo nome.' },
      { titolo: 'Il tuo nome', testo: 'In alto a destra, callsign e foto: toccali per vedere i tuoi incarichi (i badge colorati, come [[b:warn|Team Leader]]: spiegano perché vedi certe pagine), aprire **Il mio profilo** e l’**Aiuto**, scegliere ☀ Chiaro o ☾ Scuro, ed **Esci**.' },
      { titolo: 'Le notifiche', testo: 'Se su questo dispositivo sono spente, in Home trovi il riquadro con [[p:avvisi|Attiva le notifiche]]. Valgono dispositivo per dispositivo: telefono e computer si accendono separatamente. Su iPhone prima installa il gestionale (Condividi → Aggiungi a Home) e aprilo da lì.' },
    ],
    parole: 'menu preferiti stellina ricerca cerca scorciatoie tastiera notifiche barra telefono iphone installare',
  },
  {
    chiave: 'colori',
    area: 'Primi passi',
    titolo: 'Colori, badge e pulsanti',
    cosa: 'Un colore vuol dire la stessa cosa in tutto il gestionale: a colpo d’occhio capisci se c’è da fare qualcosa.',
    passi: [
      { titolo: 'Verde: a posto', testo: '[[b:ok|Pagato]] [[b:ok|Valido]] [[b:ok|Nuova]] — confermato, in regola, oppure una novità che non hai ancora aperto.' },
      { titolo: 'Giallo: da fare o in attesa', testo: '[[b:warn|Non hai risposto]] [[b:warn|Parziale]] [[b:warn|In attesa]] — qualcosa aspetta te, o tu aspetti qualcun altro.' },
      { titolo: 'Rosso: c’è un problema', testo: '[[b:danger|Da pagare]] [[b:danger|Scaduto]] [[b:danger:chiave|Iscrizioni chiuse]] — qualcosa blocca, manca o è scaduto.' },
      { titolo: 'Blu e grigio', testo: '[[b:info|Su invito]] è un’informazione; [[b:neutro|Conclusa]] è neutro, non c’è niente da fare.' },
      { titolo: 'Le tre risposte', testo: '[[si]] ci sono, [[forse]] forse, [[no]] non ci sono: gli stessi colori tornano nei conteggi delle card, negli elenchi dei partecipanti e nei sondaggi.' },
      { titolo: 'I pulsanti', testo: 'Quello pieno, come [[p:salva|Salva]], è l’azione principale; quelli bordati, come [[g:modifica|Modifica]], sono le azioni di contorno; il cestino [[x]] elimina e chiede sempre conferma. Alcuni mostrano solo l’icona (sul telefono succede più spesso): passaci sopra col mouse, o tienili premuti, per leggerne il nome.' },
    ],
    parole: 'legenda significato colori verde giallo rosso badge etichette pulsanti icone',
  },
  // ------------------------------------------------------------ operativo
  {
    percorso: '/dashboard',
    chiave: 'home',
    area: 'Operativo',
    titolo: 'Home',
    cosa: 'La pagina che si apre entrando: cosa devi sistemare, i tuoi numeri della stagione e le prossime attività, a cui rispondi senza aprirle.',
    passi: [
      { titolo: 'Gli avvisi in cima', testo: 'Sotto il saluto compare solo quello che ti riguarda, con il pulsante per sistemarlo: il certificato che manca, è scaduto o sta per scadere, una quota da saldare, il modulo d’iscrizione da compilare.' },
      { titolo: 'I tuoi numeri', testo: 'Presenze della stagione, **Parola mantenuta** (quante volte sei venuto quando avevi detto «ci sono»), l’ultima volta in campo e dove si va più spesso. Sotto, i riquadri Certificato, Iscrizione, Tessera FIGT e Da saldare: verde a posto, giallo o rosso da guardare. Certificato e Da saldare si toccano per aprire la pagina.' },
      { titolo: 'Da gestire', testo: 'Solo per chi ha un incarico: i contatori del lavoro in sospeso — richieste d’iscrizione, certificati da vagliare, pagamenti da confermare, rimborsi da erogare, nuovi contatti. Ogni riquadro porta dove sbrigarlo.' },
      { titolo: 'Oggi e prossime attività', testo: 'Rispondi dalla card con [[si]] [[forse]] [[no]]: la risposta scelta resta accesa, e toccandola di nuovo la togli. [[naviga]] apre il percorso in Google Maps; [[b:ok|Nuova]] vuol dire che non l’hai ancora aperta. Tocca la card per la scheda completa, o **Calendario completo →** per tutte.' },
    ],
    parole: 'cruscotto riepilogo inizio home avvisi numeri statistiche',
  },
  {
    percorso: '/calendario',
    chiave: 'calendario',
    area: 'Operativo',
    titolo: 'Calendario',
    cosa: 'Tutte le attività della squadra: da qui rispondi se ci sei e apri la scheda di ognuna. Chi gestisce le crea e risponde agli inviti delle altre squadre.',
    passi: [
      { titolo: 'Le viste', testo: 'In cima scegli come guardarle: [[v|In programma]] le prossime, in card; [[v|Mese]] la griglia del mese — scorri di lato per cambiare mese, [[g|Oggi]] per tornare a questo, tocca un giorno per vederne le attività; [[v|Storico]] quelle passate, con chi c’era davvero e il tuo [[b:ok|c’eri]] o [[b:danger|non c’eri]].' },
      { titolo: 'Leggere una card', testo: 'In alto la tipologia e a chi è aperta (· tutti, · squadra, · su invito), poi titolo, data e campo. Sotto i conteggi: [[i:presente]] quanti ci sono — con (schierati/posti) se i posti sono contati — [[i:forse]] i forse e [[i:assente]] chi non c’è. A destra lo stato: [[b:ok|Nuova]], [[b:ok|In corso]], [[b:warn|Terminata]]. La quota, se c’è, è in giallo: [[b:warn|a pagamento · 10,00 €]].' },
      { titolo: 'Rispondere', testo: 'Nel piede della card: [[si]] ci sono, [[forse]] forse, [[no]] non ci sono. La scelta resta accesa; toccala di nuovo per togliere la risposta. Con [[b:danger:chiave|Iscrizioni chiuse]] non ci si segna più. Per lasciare una nota (es. «arrivo tardi») apri la scheda.' },
      { titolo: 'Nuova attività (admin)', testo: 'Apri il riquadro **Nuova attività** e premi [[p:aggiungi|Crea attività]], oppure nella vista Mese tocca un giorno e compila **Aggiungi attività**. Nasce [[b:warn|Bozza]]: la vede solo chi gestisce finché non la rilasci dalla sua scheda.' },
      { titolo: 'Inviti delle altre squadre (admin)', testo: 'La vista [[v|Inviti]] raccoglie le attività a cui ci invitano le squadre collegate. [[p:approva|Accetta]] la porta da noi come bozza (scegli la nostra tipologia e le quote per i nostri); [[g:rifiuta|Rifiuta]] chiede un motivo, che leggono loro; [[g:grafici|Sondaggio]] chiede alla squadra «Partecipiamo?»; [[g:elimina|Cancella]] lo toglie senza avvisarli.' },
    ],
    parole: 'eventi giocate partite allenamenti adesioni presenze inviti mese storico rispondere segnarsi',
  },
  {
    percorso: '/calendario/[id]',
    chiave: 'attivita',
    area: 'Operativo',
    titolo: 'Scheda dell’attività',
    cosa: 'Tutto su un’attività: quando e dove, la tua risposta, chi viene, quote, allegati e commenti. Chi gestisce da qui la modifica, la rilascia e fa l’appello.',
    passi: [
      { titolo: 'In cima', testo: 'Accanto al titolo leggi la tua risposta — [[b:ok|Ci sono]] [[b:warn|Forse]] [[b:danger|Non ci sono]] o [[b:warn|Non hai risposto]] — e, se c’è una scadenza, il conto alla rovescia alla chiusura delle adesioni. Una fascia colorata avvisa se l’attività è in bozza, annullata, in corso o terminata.' },
      { titolo: 'La tua adesione', testo: 'Nel riquadro **La tua adesione** scegli [[adesione]] e, se vuoi, scrivi una nota (es. «arrivo tardi»). Tocca di nuovo la risposta scelta per toglierla. Senza certificato valido non ti puoi segnare: c’è [[p|Carica il certificato]]. Se è valido oggi ma scade prima dell’attività ti segni lo stesso, con un avviso: rinnovalo in tempo, perché quel giorno senza certificato non partecipi — l’appello non ti lascia spuntare. Se i posti sono già coperti puoi segnarti lo stesso, ma rischi di finire in riserva.' },
      { titolo: 'Gare con formazione', testo: 'Dove ci sono titolari e riserve il riquadro diventa **La tua disponibilità**: tu dici se ci sei, poi il Team Leader ti schiera e sotto leggi come (titolare, TOC o riserva). In gara va chi è schierato titolare.' },
      { titolo: 'La quota', testo: 'Se l’attività si paga, sotto la risposta vedi quanto: il posto è confermato quando la quota è saldata, dalla pagina **Miei pagamenti**. Se avevi già pagato e poi non vieni, c’è [[g:incassa|Chiedi il rimborso]].' },
      { titolo: 'Il kit a noleggio', testo: 'Per i nuovi, dove l’attività lo offre: spunta **Mi serve il kit a noleggio** insieme a «Ci sono» o «Forse». Chi organizza lo conferma — allora il prezzo si aggiunge alla quota — oppure lo rifiuta con un motivo: senza kit non si gioca, e l’adesione viene tolta. Chi organizza vede il riquadro **Kit a noleggio**, con quanti ne restano, [[g:approva|Conferma]] e [[g:annulla|Rifiuta]].' },
      { titolo: 'Dove e come arrivare', testo: 'Campo, ritrovo con la sua ora e una mappa sola con i due punti, P · Parcheggio e R · Ritrovo. Accanto a ogni posto [[p:naviga|Naviga]] apre il navigatore; se i posti sono due c’è anche il percorso intero, prima il ritrovo e poi il campo.' },
      { titolo: 'Chi viene', testo: 'Il riquadro **Risposte, quote e assicurazioni** elenca chi ha risposto, diviso in Ci sono, Forse e Non ci sono, e quanti della squadra non hanno ancora risposto. Il pulsante [[g:condividi]] in fondo alla scheda copia il link dell’attività, da mandare a chi vuoi.' },
      { titolo: 'Allegati, commenti, debriefing', testo: 'In **Allegati** trovi il book di missione e gli altri documenti: si leggono aprendoli, senza scaricarli. In fondo [[g:miPiace|Mi piace]] e [[g:commento|Commenta]]; a giornata finita, il **Debriefing** scritto dal Team Leader.' },
      { titolo: 'Per il Team Leader', testo: 'Nell’elenco schieri ognuno con [[g|Titolare]] [[g|TOC]] [[g|Riserva]] (— lo toglie) e con [[g:squadra|Sostituisci]] fai entrare una riserva al posto di un titolare. [[g:invita|Aggiungi partecipanti]] segna qualcuno a mano. Dall’inizio compare l’**Appello**: spunta chi c’è e premi [[g|Salva presenze]]; chi non è assicurato sta in rosso, in cima. [[g:modifica|Luoghi e titolo]] sistema campo e ritrovo, [[g:calendario|Organizza una riunione]] ne crea una già collegata.' },
      { titolo: 'Per l’admin: modifica', testo: '[[g:modifica|Modifica]] apre le schede Cosa e quando, Dove, Responsabili, Partecipanti, Pagamenti e Note. Nelle quote si spuntano le voci del listino, o se ne aggiunge una con **+ aggiungi una quota**; separate per chi è in squadra e per gli esterni. In fondo alla finestra c’è **Elimina attività**.' },
      { titolo: 'Per l’admin: stato', testo: 'In fondo al riquadro principale: [[g:squadra|Rilascia alla squadra]], [[g:invita|Rilascia su invito]] o [[p:rilascia|Rilascia a tutti]] la rendono visibile e aprono le adesioni. Poi [[g:chiave|Blocca iscrizioni]], [[g:concludi|Concludi]] (le presenze restano quelle dell’appello), [[d:annulla|Annulla]] col motivo, o [[g:bozza|Riporta in bozza]].' },
      { titolo: 'Squadre ospiti', testo: 'Da rilasciata, **Squadre ospiti** → [[g:aggiungi|Invita una squadra]]: nasce un link da mandare al loro referente, oppure — se hanno il gestionale collegato — l’attività arriva direttamente nel loro calendario. Per ognuna vedi quanti vengono, cosa devono e cosa hanno pagato; [[g:chiave|Permessi]] decide se possono modificarla e invitare altre squadre, [[p:incassa|Conferma incasso]] registra un loro pagamento.' },
      { titolo: 'Organizzata da un’altra squadra', testo: 'In cima c’è il riquadro di chi organizza, con chi viene squadra per squadra. Solo l’admin vede quanto chiedono: [[g:pagamenti|Info pagamenti]] mostra come pagarli, [[p:incassa|Paga 20,00 €]] segnala il versamento. Se ce lo permettono, [[g:invita|Invita un’altra squadra]] propone una nostra collegata.' },
    ],
    parole: 'evento giocata mappa parcheggio ritrovo quota formazione titolare riserva appello ospiti allegati book rilasciare annullare concludere',
  },
  {
    percorso: '/debriefing',
    chiave: 'debriefing',
    area: 'Operativo',
    titolo: 'Debriefing',
    cosa: 'Il racconto delle giocate fatte, scritto da chi c’era: cosa ha funzionato, cosa rifare, cosa no.',
    passi: [
      { titolo: 'Leggere', testo: 'Ogni debriefing porta alla sua attività. Quelli che non hai ancora letto sono segnati **nuovo**.' },
      { titolo: 'Scrivere (Team Leader)', testo: 'Si scrive dalla scheda dell’attività, quando è cominciata: [[p:bozza|Scrivi il debriefing]]. Finché è in bozza lo vedi solo tu; spunta **Pubblicato** e [[p:salva|Salva]] per farlo leggere a tutti. Per correggerlo, [[g:modifica|Modifica]].' },
    ],
    parole: 'resoconto analisi dopo partita racconto',
  },
  {
    percorso: '/ice',
    chiave: 'ice',
    area: 'Operativo',
    titolo: 'ICE · emergenze',
    cosa: 'I dati per soccorrere qualcuno: chi avvisare, il suo telefono, gruppo sanguigno, allergie e note mediche.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Da dove vengono', testo: 'Ognuno li scrive nel proprio profilo, in **Emergenze e dati sanitari**.' },
      { titolo: 'In campo', testo: 'Mentre un’attività è in corso, admin e Team Leader trovano nella scheda il riquadro **ICE · chi c’è**, chiuso: si apre con la freccia e mostra solo i dati di chi è presente.' },
    ],
    parole: 'emergenza soccorso sanitari allergie gruppo sanguigno ice',
  },
  // ------------------------------------------------------------ account
  {
    percorso: '/profilo',
    chiave: 'profilo',
    area: 'Account',
    titolo: 'Il mio profilo',
    cosa: 'La tua pagina: i tuoi dati, la situazione (presenze, certificato, tessera, quote, credito) e le impostazioni personali.',
    passi: [
      { titolo: 'Come essere pagato', testo: 'Nella sezione **Come essere pagato** scrivi i tuoi metodi — IBAN, PayPal, Satispay — con [[g:aggiungi|Aggiungi metodo]]. Quando la squadra ti deve dei soldi, chi registra l’uscita in cassa li trova già pronti: un link diventa «Paga», un IBAN si copia. Da Android, con l’app installata, puoi anche **condividere** il tuo link PayPal/Satispay o l’IBAN dall’app che lo mostra: scegli questa app e arrivi al modulo già compilato.' },
      { titolo: 'In cima', testo: 'Foto, nome e i riquadri della tua situazione: presenze dell’anno, certificato, tessera FIGT, da saldare, credito, da quando sei nel club. Tocca la foto per cambiarla o ritagliarla.' },
      { titolo: 'I dati', testo: 'Ogni sezione si apre toccandone il titolo e ha il suo pulsante: [[p:salva|Salva anagrafica]], [[p:salva|Salva recapiti]], [[p:salva|Salva dati di emergenza]]. Quelle ancora incomplete si aprono da sole.' },
      { titolo: 'Emergenze e dati sanitari', testo: 'Chi avvisare, il suo telefono, gruppo sanguigno, allergie e terapie: li legge solo chi deve soccorrerti.' },
      { titolo: 'Notifiche', testo: '**Notifiche sul dispositivo**: [[p|Attiva le notifiche qui]] le accende su questo telefono o computer, [[g:whatsapp|Mandami una prova]] verifica che arrivino, [[g|Disattiva]] le spegne.' },
      { titolo: 'Aspetto, privacy, password', testo: '**Aspetto e accessibilità** sceglie il tema (vedi «Chiaro, scuro e accessibilità»). **Privacy e consensi** per rileggere l’informativa e cambiare i consensi; **Cambia password** chiede quella attuale.' },
      { titolo: 'Partecipazioni', testo: 'In fondo, le attività dell’anno a cui hai partecipato.' },
    ],
    parole: 'account dati personali password foto tema accessibilità notifiche consensi privacy anagrafica recapiti',
  },
  {
    chiave: 'tema',
    area: 'Account',
    titolo: 'Chiaro, scuro e accessibilità',
    cosa: 'Come cambiare l’aspetto del gestionale solo per te.',
    passi: [
      { titolo: 'Chiaro / Scuro', testo: 'Tocca il tuo nome in alto a destra e scegli ☀ Chiaro o ☾ Scuro: vale solo per te, su tutti i tuoi dispositivi.' },
      { titolo: 'Temi di accessibilità', testo: 'Nel profilo, **Aspetto e accessibilità**: il tema della squadra, l’alto contrasto (scuro o chiaro) per chi vede poco, i temi per daltonici rosso-verde e blu-giallo. **Testo più grande** ingrandisce tutto, pulsanti compresi, e si somma a qualunque tema: si sceglie a parte **sul computer** e **sul telefono**. Guarda l’anteprima e premi [[p:salva|Salva l’aspetto]].' },
    ],
    parole: 'tema notte giorno chiaro scuro daltonici ipovedenti contrasto testo grande aspetto',
  },
  {
    percorso: '/assistente',
    chiave: 'assistente',
    area: 'Account',
    titolo: 'Assistente',
    cosa: 'Chiavi per collegare un assistente AI al gestionale: fa quello che potresti fare tu, e nient’altro.',
    passi: [
      { titolo: 'Creare una chiave', testo: '[[p:chiave|Nuova chiave]]: dalle un nome (es. «Claude sul portatile») e i giorni di validità, poi [[p:chiave|Crea la chiave]]. Copiala subito con **Copia la chiave**, o **Copia il comando pronto** per Claude Code: chiusa la finestra non si rilegge più.' },
      { titolo: 'Sicurezza', testo: 'Una chiave è come la tua password: chi ce l’ha lavora a nome tuo, con i tuoi stessi permessi e niente di più. In **Le tue chiavi** vedi quando è stata usata; se un computer non è più tuo, revocala col cestino [[x]].' },
    ],
    parole: 'ai mcp chiave claude assistente',
  },
  // ------------------------------------------------------------ squadra
  {
    percorso: '/certificati',
    chiave: 'certificati',
    area: 'Squadra',
    titolo: 'Miei certificati',
    cosa: 'Il tuo certificato medico e la tua tessera FIGT. Senza un certificato valido non ti puoi segnare alle attività che lo richiedono.',
    passi: [
      { titolo: 'Caricare', testo: '[[p:carica|Aggiungi certificato]]: scegli il tipo (agonistico o non agonistico), la data di rilascio e il file (PDF o foto), poi [[p:carica|Carica certificato]]. Resta [[b:warn|In attesa]] finché l’amministrazione non lo approva, di solito in un paio di giorni.' },
      { titolo: 'Quale serve', testo: 'Il non agonistico basta per allenamenti e partite ordinarie; per gare e tornei serve l’agonistico, che copre anche tutto il resto. Entrambi valgono 364 giorni dal rilascio.' },
      { titolo: 'Scadenza', testo: 'Il certificato in corso mostra i giorni che mancano. Prima della scadenza ti avvisa la Home, e l’avviso ti dice anche a quali attività sei segnato dopo quella data: carica il rinnovo per tempo, perché senza non partecipi.' },
      { titolo: 'Storico e tessera', testo: 'In **Gli altri caricamenti** finiscono quelli scaduti, in attesa o rifiutati. Sotto c’è la **Tessera FIGT**: la registra l’amministrazione quando sei tesserato.' },
    ],
    parole: 'certificato medico agonistico scadenza visita tessera figt',
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
    cosa: 'Chi è nel club, con stato, incarichi, certificato e tessera.',
    perChi: 'Chi gestisce la squadra',
    passi: [
      { titolo: 'Le viste (admin)', testo: '[[v|Libro atleti]] chi scende in campo; [[v|Tutti]] anche gli altri; [[v|Avvisi]] chi riceve le notifiche sul telefono e chi va cercato in un altro modo; [[v|Compleanni]] l’età e i giorni che mancano, dal più vicino.' },
      { titolo: 'Amministrazione e segreteria', testo: 'Vedono chi è in regola con iscrizione e certificato nella stagione in corso.' },
      { titolo: 'La scheda', testo: 'Aprendo un operatore: anagrafica ([[p:salva|Salva anagrafica]]), certificati, iscrizioni e tessere, pagamenti, presenze e affidabilità. In **Ruoli, stato e accesso** cambi incarichi e stato e premi [[g:salva|Aggiorna]].' },
      { titolo: 'Password e cancellazione', testo: '**Genera una nuova password** ne crea una provvisoria e la mostra una volta sola: non parte nessuna email, gliela consegni tu. In fondo, la cancellazione definitiva di tutti i suoi dati.' },
    ],
    parole: 'atleti squadra membri compleanni ruoli libro password',
  },
  {
    percorso: '/admin/nuovi',
    chiave: 'nuovi',
    area: 'Squadra',
    titolo: 'Nuovi',
    cosa: 'Chi si sta avvicinando al team: chi torna e chi no, e quando è il momento di invitarlo.',
    perChi: 'Chi gestisce la squadra',
    passi: [
      { titolo: 'Da approvare', testo: 'Chi si è appena registrato aspetta in cima: [[p|Approva]] lo fa entrare, [[d|Rifiuta e cancella]] cancella i suoi dati.' },
      { titolo: 'Seguirli', testo: 'Per ognuno: quante volte è venuto, l’ultima volta, l’ultimo accesso e se riceve le notifiche (se no, lo si avvisa su WhatsApp).' },
      { titolo: 'Invitarlo in squadra', testo: '[[g:invita|Invita]] manda la richiesta d’iscrizione: passa in «attesa compilazione» e trova il modulo nella sua pagina. Il cestino [[x]] lo elimina.' },
    ],
    parole: 'registrazioni prova reclute approvare',
  },
  {
    percorso: '/admin/contatti',
    chiave: 'contatti',
    area: 'Squadra',
    titolo: 'Contatti',
    cosa: 'Chi chiamare prima che diventi un nuovo: persone interessate che non si sono ancora registrate.',
    perChi: 'Chi gestisce la squadra',
    passi: [
      { titolo: 'Aggiungere', testo: '[[p:aggiungi|Aggiungi contatto]] a mano, oppure [[g:chiave|Collega un sito]] perché arrivino dal modulo del vostro sito.' },
      { titolo: 'Sentirli', testo: 'Da ogni contatto [[g:telefono]] chiama, [[g:whatsapp|WhatsApp]] scrive, [[g:email]] manda una mail. Annota com’è andata e premi [[g:salva|Salva la nota]].' },
    ],
    parole: 'interessati lead rubrica sito',
  },
  {
    percorso: '/admin/squadra',
    chiave: 'mia-squadra',
    area: 'Squadra',
    titolo: 'La mia squadra',
    cosa: 'Il biglietto da visita della squadra: nome, nome del gestionale, motto, logo, recapiti, referenti — e il tema dei colori.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Collegamenti esterni', testo: 'In un posto solo: il portale federale FIGT (utenza, password, id anagrafica e id affiliazione, per tessere e polizze prova), i gestionali delle altre squadre e WhatsApp.' },
      { titolo: 'Profilo e logo', testo: 'Compila e premi [[p:salva|Salva il profilo]]. Sono anche i dati che vedono le squadre collegate; [[p:collegamento|Condividi il profilo]] li manda a chi vuoi.' },
      { titolo: 'Tema', testo: 'Il colore d’accento (preso dal logo, fra quelli pronti o libero) e il fondo di partenza, poi [[p:salva|Salva il tema]]. Il contrasto lo sistema il gestionale; chiaro o scuro lo sceglie poi ognuno per sé.' },
      { titolo: 'Referenti', testo: 'Chi rappresenta la squadra verso fuori, col callsign e i recapiti scelti: [[p:salva|Salva i referenti]].' },
    ],
    parole: 'logo nome motto tema colori accento referenti profilo squadra',
  },
  {
    percorso: '/mercatino',
    chiave: 'mercatino',
    area: 'Squadra',
    titolo: 'Usato',
    cosa: 'Il mercatino fra soci: attrezzatura usata che passa di mano.',
    passi: [
      { titolo: 'Cercare', testo: 'Scrivi cosa cerchi e premi [[g:cerca|Filtra]]; la spunta **Solo quelli ancora in vendita** nasconde il venduto.' },
      { titolo: 'Vendere', testo: '[[p:aggiungi|Metti in vendita]] crea l’annuncio in bozza. Aggiungi le foto (con **usa come copertina** scegli quella che si vede in bacheca) e le voci con [[p:aggiungi|Aggiungi voce]], ognuna col suo prezzo, poi [[p|Pubblica]]. [[g|Ritira]] lo toglie dalla vendita: resta leggibile, segnato come ritirato.' },
      { titolo: 'Comprare', testo: 'Per ora ci si accorda fuori dal gestionale, col venditore. Sotto l’annuncio [[g:miPiace|Mi piace]] e [[g:commento|Commenta]]. Leggi il **Regolamento** del mercatino.' },
    ],
    parole: 'usato vendita attrezzatura annunci mercatino',
  },
  {
    percorso: '/merchandising',
    chiave: 'merchandising',
    area: 'Squadra',
    titolo: 'Merchandising',
    cosa: 'Quello che il team fa fare — magliette, mimetiche, patch — da ordinare e pagare come una quota.',
    passi: [
      { titolo: 'Ordinare', testo: 'Apri un articolo: ogni voce (una taglia, un colore) ha il suo prezzo. Regola la quantità con − e + e premi [[p:carrello|Aggiungi]]. Quando hai finito, vai al **Carrello** dal menu.' },
      { titolo: 'Per l’admin', testo: '[[p:aggiungi|Nuovo articolo]] crea una scheda in bozza: foto, voci con i prezzi, e [[p|Pubblica]].' },
    ],
    parole: 'magliette patch ordini carrello mimetiche',
  },
  {
    percorso: '/mercatino/carrello',
    chiave: 'carrello',
    area: 'Squadra',
    titolo: 'Carrello',
    cosa: 'Quello che hai messo da parte nel merchandising, da mandare in un ordine solo.',
    passi: [
      { titolo: 'Inviare l’ordine', testo: 'Controlla i pezzi, aggiungi una nota se serve e premi [[p:carrello|Invia l’ordine]]. Nasce una quota fra i tuoi pagamenti, al prezzo di oggi.' },
      { titolo: 'I tuoi ordini', testo: 'Sotto, gli ordini inviati con lo stato della quota. Finché non è incassata puoi ancora ritirarlo.' },
    ],
    parole: 'carrello ordine merchandising',
  },
  // ------------------------------------------------------------ soldi
  {
    percorso: '/pagamenti',
    chiave: 'miei-pagamenti',
    area: 'Soldi',
    titolo: 'Miei pagamenti',
    cosa: 'Le tue quote — associative, tessere, attività — con quanto devi, quanto hai versato e come pagare.',
    passi: [
      { titolo: 'Leggere lo stato', testo: 'Ogni voce ha il suo badge: [[b:danger|Da pagare]], [[b:warn|Parziale]], [[b:ok|Pagato]]. Quella che hai segnalato e aspetta la conferma è **In verifica**. Se chi tiene la cassa non trova i soldi, annulla la segnalazione: ti arriva un avviso con il motivo e la quota torna [[b:danger|Da pagare]].' },
      { titolo: 'Pagare', testo: 'Premi [[p:incassa|Paga]] sulla quota. Nella finestra tocca un metodo: il link (PayPal, Satispay…) apre il pagamento, l’IBAN si copia. Poi scegli il metodo usato e premi [[p:incassa|Segnala il pagamento]]: la segreteria lo conferma quando vede arrivare i soldi.' },
      { titolo: 'Correggere', testo: 'Sbagliato qualcosa? Sulla quota segnalata c’è [[g:incassa|Correggi la segnalazione]]: cambi metodo o importo finché la segreteria non conferma.' },
      { titolo: 'Credito', testo: 'Se hai soldi versati e non usati, **Il tuo credito** li mostra; pagando una quota della stessa cassa ti viene proposto [[p:incassa|Paga col credito]].' },
      { titolo: 'Quota che non serve più', testo: 'Se hai pagato un’attività annullata o a cui non vai più: [[g:freccia|Credito]] tiene i soldi per la prossima quota, [[g|Chiedi rimborso]] li chiede indietro.' },
    ],
    parole: 'quote soldi pagare paypal bonifico iban credito rimborso segnalare',
  },
  {
    percorso: '/admin/pagamenti',
    chiave: 'pagamenti',
    area: 'Soldi',
    titolo: 'Pagamenti (segreteria)',
    cosa: 'Tutte le quote del club: da incassare, da confermare, incassate, più le squadre ospiti e quello che dobbiamo alle altre squadre.',
    perChi: 'Segreteria',
    passi: [
      { titolo: 'I filtri', testo: 'Da gestire (con il numero di cose in sospeso), Da incassare, Scaduti, Rimborsi, Incassati, Gestiti fuori, Tutti.' },
      { titolo: 'Confermare un pagamento', testo: 'Chi ha segnalato di aver pagato sta in **Da gestire**: controlla e premi [[g:incassa|Incassa]], poi [[p:incassa|Registra l’incasso]]. Un importo più basso del dovuto resta come acconto. Se i soldi non sono arrivati, [[g:annulla|Annulla]] toglie la segnalazione, con il motivo scritto: la quota torna da pagare e la persona viene avvisata con quel motivo.' },
      { titolo: 'Rimborsi e credito', testo: 'Per un rimborso richiesto: [[g:incassa|Eroga]] e [[p:incassa|Registra l’erogazione]]. Oppure [[g|Credito]] lascia i soldi alla persona per un’altra quota. [[g|Non gestito]] segna una quota pagata fuori dal gestionale.' },
      { titolo: 'A mano', testo: 'Il riquadro **Registra pagamento** crea una quota (iscrizione, tessera, torneo…), anche già incassata.' },
      { titolo: 'Squadre ospiti e altre squadre', testo: 'Per ogni squadra ospite: dovuto, pagati, da confermare e scoperti; [[p:incassa|Conferma incasso]] mette in cassa quello che hanno segnalato. Solo per l’admin, **Da pagare ad altre squadre**: le attività di altri a pagamento, col resto da versare.' },
    ],
    parole: 'incassi quote conferma segreteria ospiti rimborsi acconto',
  },
  {
    percorso: '/admin/cassa',
    chiave: 'cassa-club',
    area: 'Soldi',
    titolo: 'Cassa del club',
    cosa: 'Il registro unico dei movimenti: le quote incassate dalle attività e le entrate e uscite scritte a mano.',
    perChi: 'Segreteria',
    passi: [
      { titolo: 'Movimento a mano', testo: '[[p:incassa|Registra entrata]] o [[g:pagamenti|Registra uscita]], con categoria e metodo, e se vuoi lo scontrino, la fattura o la ricevuta (foto o PDF): nel registro compare con 📎 e si apre con un tocco. Un’uscita può andare **a un operatore** (un rimborso, una spesa anticipata): scelta la persona compare la fascia **Metodi di pagamento** con i suoi metodi — «Paga» per i link, «Copia IBAN» — e la ritrovi in fondo all’uscita nel registro, da aprire e chiudere. Un acquisto può caricare direttamente il magazzino.' },
      { titolo: 'Correggere', testo: '[[g:modifica|Modifica]] su un movimento scritto a mano; il cestino [[x]] lo elimina. Quelli nati da una quota si correggono dalla quota.' },
    ],
    parole: 'registro entrate uscite saldo contabilità cassa',
  },
  {
    percorso: '/cassa',
    chiave: 'mia-cassa',
    area: 'Soldi',
    titolo: 'La tua cassa',
    cosa: 'Per chi gestisce una cassa diversa da quella del club (es. un corso): solo i pagamenti che finiscono lì.',
    perChi: 'Chi gestisce una cassa',
    passi: [
      { titolo: 'Confermare', testo: 'Chi ha segnalato di aver pagato aspetta te: [[g:incassa|Incassa]] e poi [[p:incassa|Registra l’incasso]]. A chi è in ritardo [[g:whatsapp|Sollecita]] manda un promemoria su WhatsApp. Se i soldi non sono arrivati, [[g:annulla|Annulla]] toglie la segnalazione, con il motivo scritto: la quota torna da pagare e la persona viene avvisata con quel motivo.' },
      { titolo: 'Credito', testo: '[[p:incassa|Registra versamento]] tiene dei soldi come credito della persona; [[g:pagamenti|Restituisci]] glieli rende.' },
      { titolo: 'Come si paga', testo: 'I metodi della tua cassa: [[g:aggiungi|Aggiungi metodo]] o [[g:modifica|Modifica]], con IBAN, link, e se li usano anche le squadre esterne.' },
    ],
    parole: 'cassa corso incassi gestore credito',
  },
  {
    percorso: '/admin/metodi',
    chiave: 'metodi',
    area: 'Soldi',
    titolo: 'Metodi di pagamento',
    cosa: 'Con cosa si pagano le quote del club: nome, descrizione e istruzioni (IBAN, link PayPal o Satispay…).',
    perChi: 'Admin',
    passi: [
      { titolo: 'Allegato obbligatorio', testo: 'Chi segnala di aver pagato con questo metodo deve allegare un file, col titolo che scegli (es. «Ricevuta» per il bonifico). Chi conferma lo apre accanto al pagamento.' },
      { titolo: 'Aggiungere', testo: '[[p:aggiungi|Aggiungi metodo]]; per cambiarne uno [[g:modifica|Modifica]].' },
      { titolo: 'Le spunte', testo: '**L’operatore può dichiararlo da sé**: chi paga lo segnala da solo (la segreteria conferma comunque). **Lo usano anche le squadre esterne**: lo vedono le collegate per versare la loro parte. Un link nelle istruzioni diventa il pulsante «Paga con …».' },
    ],
    parole: 'paypal iban satispay bonifico contanti metodi',
  },
  {
    percorso: '/admin/tariffe',
    chiave: 'tariffe',
    area: 'Soldi',
    titolo: 'Tariffario',
    cosa: 'Le voci con cui si compongono le quote: quota associativa, tessera, partita, giocata dei nuovi, noleggi…',
    perChi: 'Admin',
    passi: [
      { titolo: 'Aggiungere e cambiare', testo: '[[p:aggiungi|Aggiungi tariffa]] e [[g:modifica|Modifica]]. Il tariffario vale per una stagione.' },
      { titolo: 'Usi', testo: 'Ogni voce dice dove si usa: nelle quote di un’attività compaiono solo quelle giuste. Una voce **al giorno** conta per ogni giorno dell’attività; una voce **polizza** paga la polizza giornaliera. Il prezzo del kit a noleggio dei nuovi è la voce con l’uso **Noleggio attrezzatura**; quanti kit ci sono si scrive nell’attività.' },
    ],
    parole: 'listino prezzi voci quote tariffe',
  },
  {
    percorso: '/admin/casse',
    chiave: 'casse',
    area: 'Soldi',
    titolo: 'Altre casse',
    cosa: 'Le casse che non sono del club (es. un istruttore): chi le gestisce e come si paga.',
    perChi: 'Segreteria',
    passi: [
      { titolo: 'Creare', testo: '[[p:aggiungi|Nuova cassa]]; poi, sulla cassa, scegli la persona e [[g:aggiungi|Abilita]] per farne un gestore. Il gestore trova la cassa nel suo menu e conferma i pagamenti da lì. [[g:modifica|Modifica]] per nome e metodi.' },
    ],
    parole: 'casse istruttore corso',
  },
  {
    percorso: '/admin/ordini',
    chiave: 'ordini',
    area: 'Soldi',
    titolo: 'Ordini',
    cosa: 'Il merchandising ordinato dalla squadra e quanti pezzi chiedere al fornitore.',
    perChi: 'Segreteria',
    passi: [
      { titolo: 'Il giro', testo: 'In alto i pezzi da ordinare al fornitore, sommati per voce, e il valore delle quote. Mandato l’ordine, premi [[p|Chiudi il giro]]: gli ordini passano a «ordinato al fornitore» e il riepilogo riparte da zero.' },
    ],
    parole: 'ordini fornitore merchandising giro',
  },
  // ------------------------------------------------------------ comunicazione
  {
    percorso: '/bacheca',
    chiave: 'bacheca',
    area: 'Comunicazione',
    titolo: 'Bacheche',
    cosa: 'Le comunicazioni che restano: si sa quando sono uscite e chi le ha lette. Ogni bacheca ha i suoi lettori e chi ci scrive.',
    passi: [
      { titolo: 'Leggere', testo: 'Apri una bacheca dal menu o da qui. Sotto ogni messaggio metti una reazione o [[g:commento|Rispondi]]; con @ nomini qualcuno e gli arriva una notifica.' },
      { titolo: 'Scrivere', testo: 'Chi scrive in una bacheca ha [[p:aggiungi|Scrivi]]: il messaggio nasce in bozza e parte, con la notifica, quando premi [[p|Rilascia]]. Il pulsante [[g|3/12 letto]] mostra chi l’ha ricevuto e chi l’ha letto.' },
      { titolo: 'Documenti', testo: 'In **Documenti** chi scrive [[g:carica|Carica]] PDF, immagini o file Office, e li richiama nei messaggi con la @.' },
      { titolo: 'Per l’admin', testo: '[[p:aggiungi|Nuova bacheca]] e [[g:impostazioni|Configura]]: nome, chi la legge, chi ci scrive e chi modera.' },
    ],
    parole: 'annunci news comunicazioni bacheca messaggi letto',
  },
  {
    percorso: '/sondaggi',
    chiave: 'sondaggi',
    area: 'Comunicazione',
    titolo: 'Sondaggi',
    cosa: 'Domande alla squadra: trovare una data, sapere chi viene, prendere una decisione, scegliere fra più cose.',
    passi: [
      { titolo: 'Votare', testo: 'In [[v|Aperti]] trovi quelli [[b:warn|da rispondere]]. Apri il sondaggio e tocca la tua risposta: si salva subito, e finché è aperto puoi cambiarla. Se manca la tua scelta, scrivila e premi [[g:aggiungi|Proponi]]. Con **voto segreto** si vedono i conti, non chi ha votato cosa.' },
      { titolo: 'Risultati', testo: '[[v|Storico]] tiene quelli chiusi, con la risposta che ha vinto.' },
      { titolo: 'Crearne uno (admin e Team Leader)', testo: '[[p:aggiungi|Nuovo sondaggio]]: scegli il tipo — Trovare una data, Sapere chi viene, Prendere una decisione, Scegliere fra cose — e premi [[p:aggiungi|Apri il sondaggio e avvisa]].' },
      { titolo: 'Dal risultato all’attività', testo: 'Su «Trovare una data» o «Sapere chi viene», chi gestisce il sondaggio trova [[p|Crea l’attività]]: nasce in bozza con la data che ha vinto e dentro chi ha detto di esserci. [[g|Chiudi]] ferma il voto e lo manda nello storico, [[g|Riapri]] lo riprende, [[g:modifica|Modifica]] cambia domanda e risposte.' },
      { titolo: 'Dall’invito di un’altra squadra', testo: 'Un sondaggio «Partecipiamo?» aperto da un invito: accettando l’invito, chi ha detto «ci sono» è già segnato presente e chi ha detto «forse» fra i forse.' },
    ],
    parole: 'votazione domanda date voto decisione',
  },
  {
    percorso: '/segnalazioni',
    chiave: 'segnalazioni',
    area: 'Comunicazione',
    titolo: 'Segnalazioni',
    cosa: 'Per raccontare un problema o una proposta a chi gestisce il club: la leggono solo l’admin e i moderatori, e puoi restare anonimo.',
    passi: [
      { titolo: 'Scrivere', testo: 'Scegli un **canale** (es. Tornei, Comportamenti, Idee), scrivi di cosa si tratta, aggiungi foto o documenti se servono. In **Come la firmi** scegli col tuo nome o anonima: anonima, il nome non lo vede nessuno, nemmeno l’admin. Poi [[p:rilascia|Invia la segnalazione]].' },
      { titolo: 'Seguirla', testo: 'In **Le tue segnalazioni aperte** vedi lo stato e le risposte: ti arrivano anche se era anonima, e puoi rispondere con [[p:commento|Invia]]. Chiusa, scende nello storico.' },
      { titolo: 'Per chi gestisce', testo: 'Rispondi a chi ha segnalato, chiudi o riapri la segnalazione, oppure [[g:avvisi|Crea sondaggio]] per chiedere il parere della squadra. L’admin crea i canali con [[p:aggiungi|Nuovo canale]].' },
    ],
    parole: 'problema proposta reclamo anonimo segnalare',
  },
  {
    percorso: '/note',
    chiave: 'note',
    area: 'Comunicazione',
    titolo: 'Note',
    cosa: 'I tuoi appunti su persone e attività: li leggi solo tu, nemmeno l’admin li vede.',
    perChi: 'Chi ha un incarico',
    passi: [
      { titolo: 'Scrivere', testo: '[[p:aggiungi|Nuova nota]] qui, oppure dalla scheda di una persona o di un’attività, dove nasce già collegata. Nell’elenco dei partecipanti c’è [[g:bozza|Nota]] accanto a ognuno: il numero dice quante ne hai già.' },
      { titolo: 'Ritrovarle', testo: 'Cerca nel titolo o nel testo; [[g:modifica|Modifica]] per correggerne una.' },
    ],
    parole: 'appunti privati note',
  },
  {
    percorso: '/admin/messaggi',
    chiave: 'messaggi',
    area: 'Comunicazione',
    titolo: 'Messaggi WhatsApp',
    cosa: 'Compleanni, promemoria e solleciti su WhatsApp, mandati dal tuo numero.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Collegamento', testo: 'Collega il tuo WhatsApp; [[g:riapri|Aggiorna rubrica]] rilegge i contatti, [[d:esci|Scollega]] lo stacca.' },
      { titolo: 'Preparare i messaggi', testo: '[[g:calendario|Prepara quelli di oggi]], [[g:pagamenti|Solleciti quote]], [[g:certificato|Certificati in scadenza]] mettono in coda i messaggi; [[p:rilascia|Manda tutti (5)]] li invia uno alla volta.' },
      { titolo: 'Modelli', testo: '[[p:aggiungi|Nuovo modello]] per scrivere i testi che usa.' },
    ],
    parole: 'whatsapp messaggi automatici solleciti compleanni',
  },
  // ------------------------------------------------------------ amministrazione
  {
    percorso: '/admin/inviti',
    chiave: 'invio-richieste',
    area: 'Amministrazione',
    titolo: 'Invio richieste di iscrizione',
    cosa: 'Per mandare il modulo d’iscrizione della stagione: a chi rinnova e ai nuovi.',
    perChi: 'Amministrazione',
    passi: [
      { titolo: 'Inviare', testo: 'Scrivi il testo che leggeranno, spunta i destinatari (già tesserati, tesserati in passato, nuovi contatti) e premi [[p|Invia a 3 operatori]]. Passano in «attesa compilazione» e trovano il modulo nella loro pagina.' },
    ],
    parole: 'iscrizione rinnovo modulo stagione',
  },
  {
    percorso: '/admin/richieste',
    chiave: 'richieste',
    area: 'Amministrazione',
    titolo: 'Richieste di iscrizione',
    cosa: 'I moduli compilati, da accettare o rifiutare.',
    perChi: 'Amministrazione',
    passi: [
      { titolo: 'Decidere', testo: 'Controlla i dati, la quota e la validità, poi [[p:approva|Accetta in squadra]]: genera la quota da incassare e prepara la riga della tessera. Oppure [[d:rifiuta|Rifiuta]] con un motivo, che resta a storico.' },
      { titolo: 'Storico', testo: 'Sotto, **Tutte le iscrizioni** della stagione con il loro stato.' },
    ],
    parole: 'iscrizione moduli accettare squadra',
  },
  {
    percorso: '/admin/certificati',
    chiave: 'certificati-admin',
    area: 'Amministrazione',
    titolo: 'Certificati medici',
    cosa: 'I certificati di tutti: da vagliare, in scadenza, scaduti, e chi non l’ha mai caricato.',
    perChi: 'Amministrazione',
    passi: [
      { titolo: 'I filtri', testo: 'Da vagliare, In scadenza, Scaduti, Senza certificato, Validi, Tutti.' },
      { titolo: 'Vagliare', testo: '[[g:apri|Apri allegato]] per guardarlo, poi [[p:approva|Approva]] o [[d:rifiuta|Rifiuta]] col motivo.' },
      { titolo: 'Caricare per qualcuno', testo: '[[p:carica|Carica per un operatore]] se il certificato te l’hanno dato a mano. [[g:scarica|Scarica tutti]] prende i file in un archivio solo.' },
    ],
    parole: 'certificati approvare scadenza vagliare',
  },
  {
    percorso: '/admin/tessere',
    chiave: 'tessere',
    area: 'Amministrazione',
    titolo: 'Tessere FIGT',
    cosa: 'Le tessere le emette la federazione: qui si importano dal portale e si abbinano alle persone.',
    perChi: 'Amministrazione',
    passi: [
      { titolo: 'Collegare il portale', testo: 'Le credenziali del portale federale e l’id affiliazione si impostano in La mia squadra → Collegamenti esterni: da qui [[g:collegamento|Collega il portale]] porta lì.' },
      { titolo: 'Importare', testo: '[[p:tessera|Importa dal portale]] legge le tessere dell’anno; [[p:operatori|Importa anagrafiche]] prende i dati completi dei tesserati. Sono solo letture: sul portale non cambia niente.' },
      { titolo: 'Abbinare', testo: 'Le tessere che non si attribuiscono con certezza restano da abbinare: [[g:operatori|Proponi abbinamenti]] suggerisce a chi.' },
    ],
    parole: 'figt tessera federazione portale asnwg',
  },
  {
    percorso: '/admin/polizze',
    chiave: 'polizze',
    area: 'Amministrazione',
    titolo: 'Polizze giornaliere',
    cosa: 'Chi viene da fuori nelle attività in programma, e chi va ancora assicurato.',
    perChi: 'Amministrazione',
    passi: [
      { titolo: 'Assicurare', testo: 'Per ogni ospite vedi se la quota è saldata e se i dati sono completi. Quando è pronto, [[g:tessera|Assicura]] attiva la polizza sul portale. I soci non compaiono: hanno la tessera annuale.' },
      { titolo: 'Automatiche', testo: 'Si possono attivare da sole poco prima dell’attività. Ogni card dice se per quella attività partono **automatiche** o vanno fatte **a mano** («· generale» se lo decide l’impostazione generale); il pulsante [[g:impostazioni|Automatiche]] sulla card la cambia solo per quella attività.' },
    ],
    parole: 'assicurazione polizza giornaliera ospiti',
  },
  {
    percorso: '/admin/assicurazioni',
    chiave: 'assicurazioni-emesse',
    area: 'Amministrazione',
    titolo: 'Assicurazioni emesse',
    cosa: 'Tutte le polizze giornaliere fatte: chi è coperto, per quale attività e giorno, i numeri di polizza, chi le ha stipulate e quando.',
    perChi: 'Amministrazione',
    passi: [
      { titolo: 'Valida o scaduta', testo: 'Una polizza vale fino all’ora scritta dal portale; se non c’è, fino a mezzanotte del giorno coperto.' },
      { titolo: 'Stipulata da', testo: 'Chi ha premuto Assicura, oppure «in automatico» se è partita da sola poco prima dell’attività.' },
    ],
    parole: 'assicurazioni polizze elenco storico stipulate',
  },
  {
    percorso: '/assicurazioni',
    chiave: 'mie-assicurazioni',
    area: 'Operativo',
    titolo: 'Mie assicurazioni',
    cosa: 'La polizza giornaliera che ti copre quando giochi senza tessera annuale: i numeri da dare se succede qualcosa in campo.',
    passi: [
      { titolo: 'Valide', testo: 'In cima quella di oggi (o di un giorno che deve venire). Il pallino nel menu la conta finché vale, poi si spegne da solo.' },
      { titolo: 'Quanto vale', testo: 'Fino all’ora scritta sulla polizza; se non c’è, fino a mezzanotte del giorno coperto. Poi passa nello storico.' },
      { titolo: 'Cosa c’è', testo: 'Il numero della polizza prova, quello della polizza infortuni AIG, il giorno coperto e i tuoi dati di assicurato.' },
    ],
    parole: 'assicurazione polizza giornaliera prova infortuni aig copertura nuovi',
  },
  {
    percorso: '/admin/segnalazioni',
    chiave: 'messaggi-segnalati',
    area: 'Amministrazione',
    titolo: 'Messaggi segnalati',
    cosa: 'I commenti che qualcuno ha trovato fuori posto, col motivo.',
    perChi: 'Moderatori e admin',
    passi: [
      { titolo: 'Decidere', testo: '[[g|Va bene così]] lo lascia dov’è, [[d|Togli il messaggio]] lo rimuove.' },
    ],
    parole: 'moderazione commenti segnalati',
  },
  {
    percorso: '/admin/tipologie',
    chiave: 'tipologie',
    area: 'Amministrazione',
    titolo: 'Tipologie di attività',
    cosa: 'Partita, allenamento, riunione…: le voci della tendina quando crei un’attività, con il loro colore e le loro regole.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Aggiungere', testo: '[[p:aggiungi|Aggiungi tipologia]] e [[g:modifica|Modifica]]: nome e colore nel calendario.' },
      { titolo: 'Le regole', testo: '**Richiede il certificato** (e **agonistico**, se il non agonistico non basta); **Riservata alla squadra**: non si rilascia a tutti; **Prevede titolari e riserve**: il Team Leader compone la formazione; **È una riunione**: si crea al volo da un’attività.' },
    ],
    parole: 'tipi categorie colori calendario tipologie',
  },
  {
    percorso: '/admin/campi',
    chiave: 'campi',
    area: 'Amministrazione',
    titolo: 'Campi da gioco',
    cosa: 'I luoghi dove si gioca, divisi per la squadra che li gestisce.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Aggiungere', testo: '[[p:aggiungi|Aggiungi campo]] con indirizzo e posizione; [[g:campi|Mappa]] per vederlo, [[g:modifica|Modifica]] per correggerlo.' },
      { titolo: 'Posizione', testo: 'Le coordinate del campo diventano il punto P · Parcheggio sulla mappa dell’attività.' },
    ],
    parole: 'luoghi campi mappa coordinate',
  },
  {
    percorso: '/admin/stagioni',
    chiave: 'stagioni',
    area: 'Amministrazione',
    titolo: 'Stagioni',
    cosa: 'L’anno sportivo: dentro ci stanno iscrizioni, tessere, tariffario e attività.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Nuova stagione', testo: '[[p:aggiungi|Nuova stagione]] con le date, poi [[p:rilascia|Apri]]: diventa la stagione in corso. Con **Azzera la rosa** spuntata (è il modo normale) chi era in squadra passa in «da riconfermare» e rientra con una nuova richiesta di iscrizione.' },
      { titolo: 'Rosa', testo: '[[g:operatori|Ricostruisci la rosa]] per una stagione passata: segni chi c’era.' },
    ],
    parole: 'anno sportivo stagione rosa',
  },
  {
    percorso: '/admin/statistiche',
    chiave: 'statistiche',
    area: 'Amministrazione',
    titolo: 'Statistiche',
    cosa: 'L’andamento della stagione: atleti, eventi, affluenza, cassa, presenze per persona, campi, tipologie e incassi.',
    perChi: 'Admin',
    passi: [{ titolo: 'Grafici', testo: 'Si leggono dall’alto: i numeri di sintesi, poi gli eventi per mese, la copertura media e i certificati in regola, e i dettagli.' }],
    parole: 'numeri grafici presenze affidabilità statistiche',
  },
  {
    percorso: '/admin/magazzino',
    chiave: 'magazzino',
    area: 'Amministrazione',
    titolo: 'Magazzino',
    cosa: 'Quello che il team ha in casa e quello che ha ordinato al fornitore.',
    perChi: 'Segreteria',
    passi: [
      { titolo: 'Articoli', testo: '[[p:aggiungi|Aggiungi articolo]]; [[g|Rettifica]] corregge la giacenza, [[g|Modifica]] i dati.' },
      { titolo: 'Riordini', testo: '[[p:carrello|Nuovo riordino]], [[g:aggiungi|Aggiungi riga]], [[g:incassa|Paga]] e, quando arriva, [[g|Ricevi la merce]]. Un acquisto registrato in cassa può caricare la merce qui.' },
    ],
    parole: 'scorte giacenze riordino magazzino',
  },
  {
    percorso: '/admin/ruoli',
    chiave: 'ruoli',
    area: 'Amministrazione',
    titolo: 'Ruoli',
    cosa: 'Chi può fare cosa. I ruoli si sommano: una persona può averne più d’uno.',
    perChi: 'Admin',
    passi: [
      { titolo: 'I ruoli', testo: '[[b:danger|Admin]] [[b:info|Amministrazione]] [[b:info|Segreteria]] [[b:warn|Team Leader]] [[b:info|Moderatore]] [[b:ok|Atleta]]: la tabella dice a cosa serve ognuno e quanti ce l’hanno. Non si creano né si rinominano.' },
      { titolo: 'Assegnarli', testo: 'Dalla scheda della persona, in **Ruoli, stato e accesso**.' },
    ],
    parole: 'permessi incarichi ruoli admin',
  },
  {
    percorso: '/admin/errori',
    chiave: 'guasti',
    area: 'Amministrazione',
    titolo: 'Guasti',
    cosa: 'Gli errori capitati nei browser della squadra, con cosa si stava facendo: servono a chi aggiusta il gestionale.',
    perChi: 'Admin',
    passi: [{ titolo: 'Pulire', testo: '[[g|Pulisci i guardati]] toglie quelli già visti.' }],
    parole: 'errori bug guasti',
  },
  // ------------------------------------------------------------ altre squadre
  {
    percorso: '/admin/squadre',
    chiave: 'squadre',
    area: 'Altre squadre',
    titolo: 'Squadre esterne',
    cosa: 'Le squadre che conosciamo: recapiti, campi che gestiscono, inviti e collegamento.',
    perChi: 'Admin',
    passi: [
      { titolo: 'Aggiungere', testo: '[[p:aggiungi|Aggiungi squadra]] a mano, oppure [[g:scarica|Importa da FIGT]].' },
      { titolo: 'La scheda', testo: '[[g:modifica|Modifica]] i dati, [[p:aggiungi|Aggiungi campo]] per i campi che gestisce, [[g:collegamento|Collegamenti]] per collegare il suo gestionale. L’icona della catena [[i:collegamento]] indica le squadre collegate.' },
    ],
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
      { titolo: 'Collegarsi', testo: '[[p:aggiungi|Nuovo link]] crea un link (o QR) da mandare all’altra squadra; se il link ce l’hanno mandato loro, incollalo nella casella e premi [[p:collegamento|Continua]]. Un link non ancora usato si [[g:annulla|Revoca]].' },
      { titolo: 'Richieste arrivate', testo: 'Fra le richieste di collegamento: [[p:approva|Accetta il collegamento]] scegliendo la squadra dell’anagrafica, oppure [[g:rifiuta|Rifiuta]]. La nota dice se ci hanno proposto per una loro attività.' },
      { titolo: 'Collegamenti attivi', testo: '[[g:riapri|Riprova adesso]] se la sincronizzazione si è fermata; [[g:annulla|Scollega]] chiude il collegamento: le attività già condivise restano, congelate.' },
    ],
    parole: 'federazione collegamento link qr gestionale',
  },
  {
    chiave: 'attivita-condivise',
    area: 'Altre squadre',
    titolo: 'Attività con altre squadre',
    cosa: 'Come funzionano inviti, numeri e pagamenti con le squadre collegate.',
    passi: [
      { titolo: 'Invitare', testo: 'Nella scheda dell’attività, [[g:aggiungi|Invita una squadra]]: se è collegata l’attività arriva nel loro calendario, altrimenti nasce un link da mandare. Con [[g:chiave|Permessi]] decidi se possono modificarla e invitare altre squadre.' },
      { titolo: 'Essere invitati', testo: 'L’invito arriva in Calendario → [[v|Inviti]]: [[p:approva|Accetta]] (con la nostra tipologia e le quote), [[g:rifiuta|Rifiuta]], o [[g:grafici|Sondaggio]] per chiedere alla squadra.' },
      { titolo: 'I numeri', testo: 'I nostri presenti arrivano da soli all’organizzatore; i «forse» solo se premi [[g:forse|Manda anche i «forse»]].' },
      { titolo: 'Pagare l’organizzatore', testo: 'Solo l’admin vede quanto chiedono. [[p:incassa|Paga 20,00 €]] segnala il versamento; quando lo confermano diventa un’uscita del registro. Se poi si aggiunge qualcuno, si paga il resto.' },
      { titolo: 'Re-inviti', testo: 'Se ti lasciano invitare altre squadre, [[g:invita|Invita un’altra squadra]] propone una tua collegata: la invita l’organizzatore, collegandosi se serve.' },
    ],
    parole: 'federazione inviti ospiti organizzatore pagamenti fra squadre',
  },
];

/** Il testo senza segnaposto, con le parole che i pulsanti disegnati dicono: per cercare. */
export function testoPiano(testo: string): string {
  return testo
    .replace(SEGNAPOSTO, (_, tipo: string, arg?: string, t?: string) => {
      if (tipo === 'si') return 'ci sono';
      if (tipo === 'forse') return 'forse';
      if (tipo === 'no') return 'non ci sono';
      if (tipo === 'adesione') return 'ci sono forse non ci sono';
      if (tipo === 'x') return 'cestino elimina';
      if (tipo === 'naviga') return 'naviga';
      if (tipo === 'i') return arg === 'titolare' ? 'stellina' : '';
      return t ?? '';
    })
    .replace(/\*\*/g, '');
}

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
    const alto = normale(`${v.titolo} ${testoPiano(v.cosa)} ${v.parole ?? ''}`);
    const basso = normale(v.passi.map((p) => `${p.titolo} ${testoPiano(p.testo)}`).join(' '));
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
