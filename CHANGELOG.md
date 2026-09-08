# Registro delle modifiche

Le versioni seguono `MAJOR.MINOR.PATCH`, come spiegato nel README: **major**
quando cambia il modo di lavorare, **minor** per funzioni nuove, **patch** per
correzioni. Il numero vive in `package.json` ed è quello che si legge nel badge
accanto a ZERO DARK.

## 1.29.0 — 8 settembre 2026

### Aggiunto

- **La stagione si sceglie sull’attività.** Di solito è quella in corso, ma la
  gara di settembre si organizza a giugno e appartiene all’anno dopo: adesso
  lo si può dire. Le attività nate prima, che una stagione non ce l’avevano,
  se la sono presa da sola — quella in cui cade la loro data.

### Cambiato

- **La pagina del certificato medico risponde a una domanda sola: sono a
  posto, e fino a quando?** In cima c’è il certificato che vale adesso con il
  suo tipo — agonistico o no, che non è un dettaglio —, i giorni che mancano e
  una **linea che disegna la sua vita**: dalla visita alla scadenza, con
  l’ultimo mese in giallo e il segno di dov’è oggi. Sotto, i caricamenti
  vecchi.
- **Il caricamento è in una finestra** (*Aggiungi certificato*) invece di
  occupare mezza pagina: si carica una volta l’anno, e il resto del tempo la
  pagina serve a guardare.
- **Il proprio certificato si può eliminare**, anche approvato: il caso vero è
  il file sbagliato, e tenerselo perché qualcuno l’ha già guardato non protegge
  nessuno.
- **Il pallino sul menu avvisa quando il certificato manca, è scaduto o sta per
  scadere**: arriva un mese prima, che è il tempo che serve per prenotare la
  visita.

## 1.28.0 — 8 settembre 2026

### Cambiato

- **Sulle attività riservate alla squadra la quota esterni non compare**: non
  verrà mai a nessuno, e due caselle di prezzo affiancate sono il modo più
  facile per scrivere la cifra in quella sbagliata. Le due quote hanno anche
  la loro icona, che le distingue a colpo d’occhio.
- **Condividi copia il link**, invece di aprire WhatsApp: il link finisce dove
  serve — la chat della squadra, un messaggio, un promemoria — e a deciderlo
  è chi condivide. Sta in fondo alla card dei dati, dove uno arriva dopo aver
  letto quando e dove.
- **Nella riga di un partecipante lo schieramento sta su una riga sua**, sotto
  nota, quota e rimuovi: sopra le cose che si fanno una volta, sotto quelle
  che si toccano e ritoccano finché la formazione non torna.
- **Lo storico è un’altra cosa dal calendario**: niente pulsanti di
  partecipazione né azioni di gestione, e al loro posto quello che di
  un’attività finita si va a cercare — **chi c’era davvero**, quanto è costata,
  e se c’eri anche tu.
- **«Situazione» si chiama Home**, e i suoi riquadri portano dove promettono:
  il certificato ai propri certificati, il da saldare ai propri pagamenti.
  L’elenco dei certificati in fondo alla pagina se n’è andato: la stessa cosa
  c’era già nella sua voce di menu.
- **Operatori e Nuovi stanno in un gruppo loro**, *Atleti & nuovi*: sono la
  stessa cosa in due momenti diversi, e chi le segue apre l’una o l’altra di
  continuo. In mezzo ai dati di base ci finivano solo perché lì c’era posto.
- **L’elenco ICE di tutti è dell’admin.** Quello che serve in campo — gruppo
  sanguigno, allergie e chi chiamare **di chi c’è quel giorno** — ora sta
  dentro l’attività, dove lo vedono admin e team leader: se qualcuno è per
  terra non si cerca in un’altra pagina.

## 1.27.1 — 8 settembre 2026

### Cambiato

- **«In programma» è fatto di card**, e la colonna «Prossime attività» resta
  solo nella vista mese: nell’elenco era la copia di quello che si stava già
  guardando. Lo storico resta una tabella, perché lì si cercano i numeri.
- **La quota si vede dove si risponde.** Sulla card, accanto ai pulsanti
  «ci sono / forse / non ci sono», c’è *a pagamento · 10,00 €* in giallo: uno
  preme «ci sono» e in quel momento deve sapere che sta prendendo un impegno
  da dieci euro, non scoprirlo due righe più su in grigio.

### Corretto

- **L’avviso giallo delle attività in bozza si vedeva solo nella vista mese.**
  Adesso c’è in tutte, e conta le bozze in programma invece di quelle della
  lista di turno: un’attività in bozza è invisibile alla squadra, e chi la
  deve rilasciare deve saperlo ovunque si trovi.

## 1.27.0 — 8 settembre 2026

### Aggiunto

- **Un’uscita di cassa può essere un acquisto di magazzino.** Nel modulo
  dell’uscita si sceglie la merce e quanti pezzi: la giacenza sale da sola e
  il costo di un pezzo si ricava dividendo l’importo per i pezzi. Sono gli
  stessi soldi, e farli scrivere due volte — una in cassa, una in magazzino —
  è il modo più sicuro perché un giorno non tornino. Cancellata la spesa, se ne
  va anche l’entrata: se quei soldi non sono usciti, quella roba non è entrata.
- **Una voce di magazzino si elimina**, dalla riga dell’inventario. Se qualcuno
  l’ha ordinata o c’è un riordino che la nomina non si cancella — sarebbero
  righe che parlano di una cosa che non esiste più — e per quel caso c’è *non
  la tengo*, che la lascia nel catalogo e le toglie solo la giacenza.

## 1.26.5 — 8 settembre 2026

### Aggiunto

- **Merce che non si vende.** Nel magazzino ci va anche la roba che al team
  serve e basta — un generatore, una radio di servizio, il materiale comune:
  togliendo la spunta *La vendo alla squadra* il prezzo non serve più, la voce
  non finisce in nessun carrello e nella tabella al posto del prezzo c’è *non
  in vendita*. Giacenza, costi e riordini funzionano come per tutto il resto:
  quello che cambia è solo se qualcuno la può comprare.

## 1.26.4 — 8 settembre 2026

### Cambiato

- **È l’inventario a guidare, non il catalogo.** Per aggiungere merce si
  sceglieva l’articolo da un elenco, e quindi l’articolo doveva già esistere
  nel merchandising: la roba però prima si compra e si conta, e semmai poi si
  vende. Adesso l’articolo **si scrive** (con i nomi già usati come
  suggerimento) e, se non c’è, nasce insieme alla merce — **in bozza**, perché
  il magazzino esiste e metterlo in vendita resta una decisione a parte.

## 1.26.3 — 8 settembre 2026

### Corretto

- **Una rettifica sbagliata non si poteva disfare.** Il modulo accettava solo
  numeri positivi, e la riga sbagliata si toglieva soltanto dalla scheda
  dell’articolo: un 500 battuto al posto di 50 restava lì. Adesso **nel
  registro ogni entrata ha il suo *elimina***, e nella rettifica un numero
  negativo toglie i pezzi (−12).
- **Annullare l’entrata di un riordino lo rimette in attesa della merce**:
  dire che la roba non è entrata e lasciare l’ordine segnato come ricevuto
  vorrebbe dire tenersi due verità diverse sullo stesso fatto.
- Nella rettifica il costo del pezzo arriva già scritto con il costo medio di
  quella merce: una correzione di quantità non deve sballare la media per una
  cifra battuta a caso.

## 1.26.2 — 8 settembre 2026

### Cambiato

- **Nell’inventario prima l’articolo, poi la specifica**, e la colonna non si
  chiama più «cosa»: la roba si chiama *Maglietta del Club*, e S o XL dicono
  quale. Vale nelle giacenze e nel registro, che adesso si leggono nello
  stesso ordine in cui uno le nomina a voce.

## 1.26.1 — 8 settembre 2026

### Corretto

- **Dall’inventario non si poteva aggiungere niente.** La pagina elencava solo
  la merce già segnata come tenuta in casa, e quel segno si metteva soltanto
  dalla scheda dell’articolo: chi apriva l’inventario per metterci qualcosa si
  trovava una pagina che gli spiegava dove andare invece di un posto dove
  farlo. Adesso c’è **Aggiungi merce** — si sceglie l’articolo del catalogo, il
  nome e il prezzo di vendita — e sotto le giacenze c’è l’elenco della roba
  che nel catalogo esiste ma non è seguita a magazzino, con un clic per
  portarcela.

## 1.26.0 — 8 settembre 2026

### Aggiunto

- **Ruolo Moderatore.** Tiene pulite le conversazioni e non fa nient'altro:
  riceve le segnalazioni e toglie i messaggi fuori posto. È un ruolo suo e non
  un pezzo di admin, perché chi scrive una cosa che urta qualcuno non deve
  trovarsi giudicato da chi decide anche se gioca la domenica.
- **Pulsante *segnala* su ogni messaggio**, sotto le attività e sotto gli
  annunci. Chi legge una cosa fuori posto la passa a chi se ne occupa invece di
  rispondere a tono, e chi ha scritto non sa chi ha segnalato. Il motivo è
  facoltativo: obbligarlo vorrebbe dire che chi si è preso un insulto deve
  anche scrivere un tema per poterlo dire.
- **Pagina Segnalazioni**, con il pallino finché ce n'è una da guardare. Il
  moderatore decide leggendo: c'è il testo com'era, chi l'aveva scritto, chi ha
  segnalato e perché, e il link al posto dov'è nato. Due pulsanti — *va bene
  così* oppure *togli il messaggio* — e resta scritto chi ha chiuso la
  segnalazione e quando.
- **Inventario, in Segreteria.** In una pagina sola: cosa c'è in casa (con
  disponibili, impegnate, costo medio e margine), i **riordini al fornitore** e
  il **registro** di quello che è entrato e uscito, in ordine di data.
- **I riordini hanno due pulsanti separati**, perché la realtà ha due momenti:
  *Paga* scrive l'uscita in cassa con l'importo dell'ordine — categoria
  Merchandising — e *Ricevi* fa entrare i pezzi in magazzino, che nel registro
  diventano un *+50 per l'ordine 7*. Si può pagare prima o dopo che la merce
  arriva; finché non è arrivata l'ordine si annulla, e con lui se ne va l'uscita
  di cassa: quei soldi non sono usciti.
- **La rettifica**, per quello che entra senza un ordine dietro: un avanzo, un
  regalo, una giacenza contata male. La strada normale resta il riordino.
- **Nel regolamento del mercatino c'è come si scrive**: niente insulti, niente
  battute su come uno è fatto, niente molestie né minacce, niente panni sporchi
  in pubblico, e il promemoria che il sarcasmo scritto non si sente. Con quello
  che succede a chi segnala e a chi viene segnalato.

### Cambiato

- **Le righe di un ordine si leggono una per una**, con dentro il loro
  articolo: *2× Patch - PVC*. Prima le voci stavano da una parte («PVC × 2, S ×
  1») e gli articoli dall'altra («Patch, Maglietta del Club»), e toccava a chi
  legge indovinare quale stesse con quale.
- **Le giacenze si sono spostate da Ordini a Inventario**: in Ordini si guarda
  cosa ordina la squadra, in Inventario cosa c'è in casa e cosa si compra dal
  fornitore. Sono due mestieri diversi anche se parlano delle stesse patch.
- **Il testo di serie del regolamento continua ad arrivare con l'applicazione**
  finché nessuno l'ha corretto a mano; al primo salvataggio dall'interfaccia
  diventa del team e non viene più toccato. Quando cambia, chi l'aveva
  accettato lo rilegge — le regole non sono più quelle di prima.

## 1.25.1 — 8 settembre 2026

### Cambiato

- **Sulla voce di un annuncio, Modifica ed Elimina scendono su una riga loro**,
  staccata da quella del carrello. Comprare e amministrare sono due gesti
  diversi: con tutto in fila, un *Elimina* rosso stava a un centimetro dal
  pulsante *Aggiungi*.

## 1.25.0 — 8 settembre 2026

### Aggiunto

- **Il carrello è uno solo e attraversa il catalogo.** Su ogni voce si sceglie
  quanti pezzi e si preme *Aggiungi*; il carrello aspetta nella sua voce di
  menu, con il pallino che dice quanti pezzi ci sono dentro, e da lì si manda
  l'ordine. Prima il carrello viveva dentro la pagina di un articolo e si
  svuotava appena si cambiava articolo: si girava il catalogo e non restava
  niente.
- **Quello che si ordina insieme è un ordine solo e una quota sola**, anche se
  sono una maglietta e due patch di articoli diversi. Con un ordine per
  articolo la segreteria si ritroverebbe a incassare quattro righe alla stessa
  persona nello stesso giorno.
- **Regolamento del mercatino**, nella sua voce dentro il gruppo Mercatino: le
  regole di una bacheca si leggono mentre la si usa, non andandole a cercare in
  un'altra sezione. È un documento come lo statuto e gli altri regolamenti —
  chi ha i permessi lo corregge dall'interfaccia, senza un rilascio — e resta
  anche nell'elenco dei Regolamenti. Il testo di partenza arriva scritto con
  l'applicazione.
- **Il mercatino si apre dopo aver letto il regolamento.** Alla prima visita
  c'è il testo intero e il pulsante *Ho letto e accetto* in fondo; da lì in poi
  non si vede più. Altrove i regolamenti si leggono se si vuole, qui no: fra
  due persone che si scambiano soldi e roba le regole non sono un cartello ma
  il patto su cui si discuterà se qualcosa va storto. Se il testo cambia si
  ripassa di lì — aver accettato la versione di prima non è aver accettato
  questa.
- **Il magazzino.** Non tutta la merce si ordina al fornitore a ogni giro: le
  patch si comprano cento alla volta e si consegnano man mano. Una voce si può
  segnare come tenuta in casa, e allora ha una **giacenza** che scende: si vede
  *ne restano 34*, e quando finisce non si può più ordinare finché non ne
  arrivano altre. Ogni carico porta **quanto è costato un pezzo**, quindi la
  pagina degli ordini dice anche costo medio, margine e valore di quello che
  resta in scatola — una patch venduta a 5 che ne è costata 4,20 è un'altra
  cosa da una che ne è costata 1,50.

### Corretto

- **Aprendo un articolo del merchandising il menu si spostava su *Usato*.** Gli
  articoli del team adesso hanno un indirizzo loro (`/merchandising/…`) e i
  vecchi link portano lì da soli; e la voce accesa nel menu è quella che
  corrisponde più a lungo, così anche il carrello e il regolamento non
  accendono più il mercatino intero.

### Cambiato

- **Le voci si riordinano trascinandole**, non più con le frecce su e giù. Si
  prende dalla **maniglia** a sinistra e da nient'altro: una card che si
  trascina da qualunque punto si sposta per sbaglio ogni volta che si prova a
  leggerla o a premere un pulsante che ha dentro.
- Funziona **anche dal telefono**: il trascinamento passa dai *pointer event* e
  non da quello nativo del browser, che sul telefono non esiste. Da tastiera la
  maniglia resta un pulsante come gli altri, con freccia su e freccia giù.
- L'ordine si sistema subito sotto le dita e **si salva quando si molla**, in
  un colpo solo: al server arriva l'elenco intero e non «questa sale di uno»,
  che è l'unico modo perché quello che si vede e quello che finisce nel
  database siano la stessa cosa.
- **Il giro di raccolta si chiude una volta sola**, per tutto il merchandising
  insieme: dato che un ordine può contenere pezzi di articoli diversi,
  chiuderlo articolo per articolo vorrebbe dire spezzare anche la sua quota. Il
  riepilogo resta diviso per articolo, che è la forma in cui si compra.

## 1.24.0 — 7 settembre 2026

### Aggiunto

- **Le voci di un annuncio si riordinano**, su e giù. L'ordine in cui si
  leggono è una scelta di chi vende: la S prima della XL, il pezzo importante
  in cima. I numeri si rinumerano da zero a ogni spostamento, così i buchi
  lasciati dalle voci cancellate non si accumulano.
- **Il carrello del merchandising.** Si scelgono le quantità, si vede il
  totale, si manda l'ordine in un colpo solo: due magliette, una patch e un
  cappellino sono **un** ordine e **una** quota, non quattro righe da incassare
  una per una. Sotto ogni voce c'è scritto quante se ne sono già ordinate —
  senza, il secondo ordine per sbaglio è questione di giorni.
- **Ordinare genera la quota**, di un tipo suo (*Merchandising*) accanto a
  iscrizioni e quote delle attività: compare fra i pagamenti di chi ordina e in
  cassa, e la segreteria la incassa con il pulsante di sempre. Le vendite
  private restano fuori: il gestionale non tocca quei soldi.
- **Elenco degli ordini per segreteria e admin**, con il pallino sul menu
  finché c'è un giro da chiudere. In cima la sola cosa che serve davvero —
  *magliette M da ordinare: 7* — e sotto l'elenco per il singolo caso.
- **Il proprio ordine si vede sotto l'articolo**, con lo stato della merce e
  quello della quota, e si ritira finché non è stata incassata.

### Come è fatto

- **Il prezzo si congela quando si ordina.** Se la maglietta passa da 25 a 28
  dopo che in dieci hanno ordinato, le loro quote sono già emesse a 25 e devono
  restare leggibili per quello che erano. Titolo e prezzo sono copiati nella
  riga dell'ordine, non letti dalla voce.
- **Il riepilogo conta solo la raccolta aperta.** *Sette da quando?* — un
  numero che somma tutti gli ordini mai fatti serve una volta sola: al secondo
  giro mescola le magliette già comprate con quelle nuove, e diventa un numero
  di cui non ci si può fidare. Chiuso il giro, chi ordina dopo entra in quello
  successivo senza che nessuno debba ricordarsi niente.
- **Pagato e consegnato sono due cose diverse**: uno paga oggi e ritira fra tre
  settimane, quando la fornitura arriva. Lo stato dell'ordine guarda dove sta
  la merce, i soldi stanno sul pagamento.
- **Un articolo con ordini dentro non si cancella**, e la regola sta nel
  database e non in un controllo dell'interfaccia che si può aggirare. Per
  toglierlo di mezzo c'è *ritira*; per una voce sola, l'interruttore che la
  spegne.
- **Annunci e ordini entrano nell'esportazione dei propri dati**: sono dati
  personali come gli altri, e senza diventerebbe silenziosamente incompleta.

## 1.23.0 — 7 settembre 2026

### Aggiunto

- **Commenti e “mi piace” sugli annunci**, usato e merchandising. Li legge
  chiunque veda l'annuncio: se lo vedi, puoi dire la tua. Il commento lo toglie
  chi l'ha scritto, chi vende — è casa sua — e l'admin.
- **Si nomina la voce con la chiocciola.** Sotto un lotto di cinque cose
  *«quanto per quella grande?»* non vuol dire niente: con `@radio-m` si dice
  quale. Si può digitare `@` e scegliere dall'elenco, oppure premere il
  pulsante della voce sopra la casella — le persone scrivono in due modi, il
  testo che esce è lo stesso. Nel commento le chiocciole vere si colorano.
- **Le voci si spengono e si riaccendono** dal loro modulo. Serve al
  merchandising per un modello che non si fa più, e all'usato per mettere da
  parte una cosa senza cancellarla: **cancellarla porterebbe via anche i
  commenti che la nominano**, che sono di altre persone. Una voce spenta esce
  dal prezzo in bacheca e non si può più nominare.
## 1.22.0 — 7 settembre 2026

### Aggiunto

- **Condividi su WhatsApp** dalla pagina di un'attività rilasciata: si apre
  WhatsApp con il messaggio già scritto — titolo, quando, dove e il link — e si
  sceglie a chi mandarlo.

Due cose sul come è fatto:

- **Nel messaggio va il link della pagina, non un riassunto.** Chi lo riceve
  entra e trova adesioni, quote e mappa aggiornate; un riassunto incollato in
  chat invecchia il giorno dopo.
- **Non passa dal ponte WhatsApp** e non serve il numero dedicato: è un
  collegamento normale, quindi funziona da subito e anche per chi apre il
  gestionale dal telefono di casa. Il ponte serve per i messaggi che partono da
  soli, questo lo mandi tu.
## 1.21.3 — 7 settembre 2026

### Corretto

- **Nell'appello compariva anche chi aveva risposto “non ci sono”.** Non c'è
  niente da spuntare accanto al suo nome, e vederselo davanti fa dubitare di
  aver letto male la sua risposta. Resta comunque registrato come assente:
  l'appello segna assente chiunque non venga spuntato, e lui non lo è.
## 1.21.2 — 7 settembre 2026

### Corretto

- **In situazione l'iscrizione mostrava la stagione sbagliata.** Diceva *attiva
  nel 2024* a chi è iscritto per il 2026. La tile prendeva l'iscrizione
  **invitata più di recente**, e caricando oggi lo storico degli anni passati
  quella risultava l'ultima: la data di inserimento non dice niente su quale
  anno si stia guardando. Ora prende quella **della stagione in corso**, e se
  per quest'anno non ce n'è dice *Nessuna* — che è l'informazione che serve.
- **Stessa correzione sulla tessera FIGT**, che aveva lo stesso difetto e
  aspettava solo di essere scoperto al primo caricamento di uno storico.
## 1.21.1 — 7 settembre 2026

### Cambiato

- **Il calendario si apre su *In programma***, non più sulla griglia del mese,
  che passa in seconda posizione. Chi entra nel calendario vuole sapere cosa
  viene; il mese è la vista che si sceglie quando si cerca una data precisa.
## 1.21.0 — 7 settembre 2026

### Aggiunto

- **Le attività nuove si vedono.** Quando un'attività viene rilasciata compare
  il pallino sul **Calendario** con quante non hai ancora aperto, e un puntino
  accanto al titolo nell'elenco. Aprendola il puntino sparisce e il contatore
  scende. Prima un'attività appena pubblicata la scopriva solo chi passava di
  lì per caso.

Due scelte che vale la pena sapere:

- **La lettura è di ciascuno, non della squadra.** Se la apre il team leader,
  agli altri resta segnalata: è il senso stesso della segnalazione.
- **Un'attività passata smette di essere una novità** anche se non l'hai mai
  aperta. Un pallino che non si spegne mai è un pallino che si impara a
  ignorare, e allora tanto vale non averlo.
## 1.20.0 — 7 settembre 2026

### Aggiunto

- **Da un'attività si organizza una riunione.** È così che succede davvero: si
  guarda la gara di domenica e si decide di vedersi mercoledì per prepararla.
  Il titolo arriva già scritto — *«Riunione: Op. Silent Ridge»* — e l'unica cosa
  da digitare è quando. La può creare anche il team leader: mettersi d'accordo
  per parlare non è decidere il calendario, ed è il genere di cosa che se
  richiede un permesso non si fa.
- **La riunione nasce già con le persone dentro**: titolari, convocati, TOC e
  riserve dell'attività di partenza. Sono esattamente quelle che devono
  esserci, e riconvocarle una per una a mano è lavoro che poi non si fa.
- **Nuovo segno sulle tipologie: “è una riunione”.** Non si poteva scrivere nel
  codice quali tipologie lo siano — le tipologie le scrive chi usa il
  gestionale, e in due squadre si chiamano in modi diversi. Se ce n'è più di
  una, al momento di creare si sceglie quale.
- **Collegamento da remoto** sull'attività, con il pulsante per entrare. Ha
  senso solo su una riunione: a una partita non ci si connette.

### Cambiato

- **Su una riunione il modulo si accorcia**: spariscono punto di ritrovo, posti
  massimi e quote. A una riunione non servono, e mostrarle vuol dire far
  leggere quindici caselle per compilarne quattro.
## 1.19.0 — 7 settembre 2026

### Aggiunto

- **Il punto di ritrovo si cerca su una mappa.** Scrivi *«Autogrill A4 uscita
  Bergamo»* e premi Cerca — oppure incolli un link di Google Maps — e arrivano
  le coordinate con l'anteprima. Da lì la squadra ha il pulsante **Naviga**: un
  ritrovo scritto a mano si legge, ma non porta nessuno da nessuna parte.
- **Un'attività può stare dove non c'è un campo.** Accanto all'elenco dei campi
  c'è un indirizzo libero con la stessa ricerca: una fiera, un parcheggio, la
  sede di un'altra squadra. Inventare un campo in anagrafica per ognuno di
  questi sporcava l'elenco dei campi, che è la cosa da tenere pulita.
- **Il team leader può sistemare la logistica** di un'attività: titolo, campo,
  indirizzo, ritrovo e ora. È lui che il sabato sera scopre che il campo ha
  cambiato ingresso, e farglielo chiedere all'admin vuol dire che la squadra lo
  saprà il giorno dopo. Quote, posti e destinatari restano a chi gestisce il
  calendario: lì si decide, non si corregge.

### Cambiato

- **Il modulo di un'attività è diviso per argomento**: *cos'è*, *dove*, *chi ci
  sta*, *pagamenti*, *note interne*. Quindici caselle in fila erano un muro in
  cui non si trovava più niente. Quando c'è una quota, la sezione dei pagamenti
  porta una barra sul bordo: aprendo un'attività già scritta si vede subito se
  qualcuno dovrà pagare.
- **L'ora del ritrovo sta accanto al ritrovo**, non accanto al campo.
- **I toast vanno in basso a destra e si impilano**, con i quattro colori di
  sempre: verde fatto, giallo attenzione, rosso errore, azzurro informazione.
  Prima ogni pulsante disegnava il suo, e due avvisi di fila finivano uno sopra
  l'altro.
- **Il TOC è azzurro anche sul pulsante**, come la sua intestazione: la stessa
  cosa non può essere di due colori.
- **L'appello separa gli operatori dal TOC**, che c'era ma non in campo.
## 1.18.0 — 7 settembre 2026

### Aggiunto

- **TOC, la sala controllo.** Una terza posizione accanto a titolare e riserva,
  nell'ordine in cui la formazione si legge: **titolari, TOC, riserve**. Chi sta
  al TOC c'è ma non in campo, quindi **non occupa uno dei posti contati e non
  paga la quota** — la quota paga il campo. Nell'appello però compare, perché
  c'era.

### Corretto

- **L'appello di una gara comprendeva le riserve.** Ora riguarda solo chi era
  atteso: titolari, convocati e TOC.
- **E le riserve risultavano assenti.** È il difetto peggiore dei due, e non si
  vedeva: l'appello segnava *non c'era* a chiunque non fosse spuntato, riserve
  comprese. Sulla loro scheda compariva una assenza, e la percentuale di
  presenze peggiorava, per un'attività a cui non erano nemmeno attese. Adesso
  l'appello tocca soltanto chi doveva esserci.

### Cambiato

- **La regola "questa attività ha una formazione" sta in un posto solo.** Era
  scritta in tre punti che dovevano restare d'accordo — chi paga, chi occupa un
  posto, chi finisce nell'appello — e tre copie della stessa frase prima o poi
  divergono.
## 1.17.0 — 7 settembre 2026

### Aggiunto

- **Il posto in formazione si tiene pagando.** Su un'attività a pagamento
  essere scelti dal TL non basta: finché la quota non è saldata si è
  **convocati**, non titolari. Il posto è già suo — occupa uno dei posti
  contati — ma la formazione non è chiusa finché i soldi non entrano. Quando la
  segreteria registra l'incasso, **il convocato diventa titolare da solo**:
  senza, avrebbe dovuto ricordarsene il TL, cioè prima o poi nessuno.
  Su un'attività gratuita, e per chi ha già pagato, si è titolari subito e
  questo passaggio non si vede nemmeno.
- **Scambio con una riserva.** Uno si fa male il giorno prima e la formazione
  non si smonta a mano: dal titolare si sceglie chi entra al suo posto. Il pezzo
  che conta sono i soldi — **se chi esce aveva già pagato, chi entra non paga**,
  perché la somma per quel posto il club l'ha incassata e chiederla di nuovo
  sarebbe incassarla due volte. Se invece non aveva pagato, la sua quota sparisce
  e chi entra viene convocato alle stesse condizioni di tutti.

Il pagamento di chi esce resta dov'è: se e come rimborsarlo è una decisione di
persone, non una regola da scrivere nel gestionale.
## 1.16.2 — 7 settembre 2026

### Cambiato

- **Il conteggio sulle card dice un'altra cosa.** *3/2* faceva sembrare che tre
  persone fossero entrate in due posti. Ora si legge **4 (1/2)**: quattro
  disponibili, uno schierato, due posti. Sono le due domande che ci si fa
  guardando una card — c'è gente, e la formazione è ancora da fare.
- **Dove i posti sono contati si schiera**, anche se la tipologia non prevede le
  riserve: un limite che nessuno può far rispettare non è un limite, e il numero
  degli schierati sarebbe rimasto fermo a zero per sempre.

### Aggiunto

- **Pallino su *Miei pagamenti*** con quante quote hai aperte. Una quota appena
  addebitata restava invisibile finché non si apriva la pagina per caso. I
  rimborsi non contano: sono soldi in arrivo, non una cosa da fare.
## 1.16.1 — 7 settembre 2026

### Corretto

- **Le riserve non pagano più niente.** Su un'attività con formazione la quota
  la deve **chi scende in campo**: chi resta riserva al club non deve nulla,
  perché non gioca. Prima la quota nasceva al momento della disponibilità, e
  chi non veniva schierato se la ritrovava addebitata lo stesso.
- **Il badge “quota da saldare” guardava il costo dell'attività**, non la quota
  di quella persona: compariva anche a chi non aveva nessun pagamento aperto.
  Ora segue il pagamento vero, quindi dice sempre la verità.
- **Essere schierato titolare adesso genera la quota**, e la si trova subito in
  *Miei pagamenti*. Toglierlo dalla formazione la fa sparire — finché non è
  stato incassato niente, come per ogni altro pagamento.
- **La quota nasce anche se il costo arriva dopo.** Prima si calcolava solo
  quando uno rispondeva: se l'attività veniva creata gratuita e il prezzo si
  metteva più tardi, non si generava più niente per nessuno. Ora salvare
  l'attività rimette in pari le quote di tutti.
- **Togliere un partecipante porta via la sua quota**, che prima restava
  addebitata a chi non era più nell'elenco.
## 1.16.0 — 7 settembre 2026

### Cambiato

- **I posti non chiudono più le adesioni.** Chiunque può dare la propria
  disponibilità: il tetto vale **al momento di schierare**, che è quando
  qualcuno decide davvero, non quando uno alza la mano. Se i posti sono due e i
  disponibili sono tre, il terzo resta **riserva** — e nemmeno un team leader
  può farne entrare uno in più di quelli previsti.
- **Mercatino e merchandising sono due voci separate**, in un raggruppamento
  loro. Non è un filtro dello stesso elenco: nell'usato la roba passa di mano
  fra soci e il gestionale non tocca i soldi, nel merchandising vende il team e
  l'incasso finirà in cassa.
- **Il merchandising lo vede solo chi è nel club.** Le magliette le fa fare e le
  paga la squadra: chi al team non appartiene ancora non ne sfoglia il catalogo.
  L'usato invece resta aperto a tutti, contatti compresi.
- **Gli esiti dei pulsanti compaiono in un avviso in basso**, non più dentro la
  riga. Il testo allargava la riga e per far posto si accorciava il nome della
  persona — *«Marc…»*: il messaggio ha bisogno di spazio che la riga non ha.

### Aggiunto

- **Conto alla rovescia per la chiusura delle adesioni**: un badge che dice
  quanto manca (*adesioni: 2g 4h*) e si scalda avvicinandosi, poi diventa
  **adesioni chiuse**. Una data costringe a fare il conto a mente ogni volta.
## 1.15.0 — 7 settembre 2026

### Aggiunto

- **Il mercatino, prima parte.** Una bacheca interna: chi ha roba da vendere la
  mette, chi la cerca la trova. **La vedono tutti**, contatti compresi;
  pubblicare invece è di chi è in squadra, e per i nuovi c'è un interruttore che
  l'admin accende quando vuole.
- **Un annuncio è un lotto, non un oggetto.** *«Vendo tutto: torcia 50, tattico
  100, mesh 150»* è un annuncio solo con tre voci, ognuna con prezzo e
  descrizione sue. In bacheca si legge l'intervallo, e quando resta solo la mesh
  si legge il suo prezzo — non continua a dire *da 50*.
- **Due nature di merce.** Il **pezzo unico** si prenota e si vende, e finisce
  lì; la **merce riordinabile** — magliette, mimetiche — non ha stato di
  vendita, perché non c'è niente da esaurire.
- **La copertina la scegli tu** fra le foto caricate: è la sola cosa che si vede
  prima di decidere se aprire.
- **Le foto si rimpiccioliscono nel browser** prima di partire, e ne parte anche
  una miniatura per le card. Venti foto intere in una pagina, da telefono dentro
  ZeroTier, davano un sito che sembrava rotto senza esserlo.
- **Ricerca e filtri** dal primo giorno, e due scaffali distinti: *usato della
  squadra* e *merchandising*.

### Corretto

- **I certificati medici si possono eliminare.** Un doppione andava *rifiutato*
  per toglierlo di mezzo, e restava in elenco una riga rossa che raccontava una
  bocciatura mai avvenuta. Ora chi amministra i certificati può eliminarne uno
  qualsiasi — anche già approvato, con l'avviso che se è l'unico la persona
  risulterà scoperta. Insieme alla riga sparisce il file allegato.
## 1.14.1 — 7 settembre 2026

### Cambiato

- **Regolamenti e statuto hanno un raggruppamento loro nel menu**, fra
  *Operativo* e *Amministrazione*: sono testi che si consultano, non cose da
  fare, e in mezzo alle voci operative si perdevano.
## 1.14.0 — 7 settembre 2026

### Cambiato

- **Statuto e regolamenti si sono divisi in due sezioni.** Stavano nella stessa
  pagina e avevano la stessa porta, ma non sono la stessa cosa: **i regolamenti
  li legge chiunque abbia un account**, contatti compresi — sono quello che si
  mostra a chi si sta affacciando — mentre **lo statuto resta di chi è dentro**,
  perché dice come funziona il team.
- **I regolamenti sono un elenco, non un testo solo.** Se ne creano quanti
  servono, ognuno con titolo, sottotitolo e ordine: quello di condotta, quello
  del mercatino, quelli che verranno. Li scrivono comando, amministrazione e
  segreteria, e ogni salvataggio lascia il nome di chi l'ha fatto.
- **I testi sono passati dai file al database.** Due file andavano bene finché
  erano due; per un elenco servivano titolo e ordine, e un indice a fianco dei
  file sarebbe stata una tabella scritta peggio. Quello che c'era nei file
  viene importato al primo avvio, e i file restano dove sono.

### Aggiunto

- **Piano del mercatino** in `DA-FARE.md`: cosa si costruisce, in che ordine, e
  le scelte già prese con le loro ragioni.
## 1.13.0 — 6 settembre 2026

### Cambiato

- **Lo storico di una persona non contiene più il futuro.** Un'uscita fra tre
  settimane compariva in mezzo alle partecipazioni passate, e di storico non
  aveva niente. Ora sono due elenchi: **in programma** e **già fatte**. Un'
  attività di cui è stato fatto l'appello passa fra quelle fatte anche se è di
  oggi — altrimenti si leggerebbe *c'era* sotto il titolo *in programma*.
- **Dalle righe dello storico si va sull'attività**: prima erano solo testo.
- **Un badge solo anche qui**, come sulla pagina dell'attività: la risposta
  finché l'appello non è fatto, poi **c'era** o **non c'era**.

### Rimosso

- **Il pulsante che toglieva la copertura assicurativa.** Un'attivazione sul
  portale federale consuma una polizza vera e non si annulla: cancellare la
  nostra riga faceva risultare la persona scoperta mentre la polizza restava
  spesa. Tolto il pulsante e tolta l'azione dietro — una regola che vale solo
  finché nessuno trova il pulsante non è una regola.
## 1.12.2 — 6 settembre 2026

### Corretto

- **Il pulsante *Togli* accanto a un assicurato non diceva cosa toglieva.** Sta
  a fianco del cestino che rimuove la persona, e si prestava a essere letto
  come “togli il partecipante”. Ora è **Togli copertura**, e la conferma dice
  la cosa che conta davvero: qui la persona torna non assicurata, ma **la
  polizza sul portale federale resta consumata** — un'attivazione non si
  annulla, quindi non è un ripensamento gratis.
## 1.12.1 — 6 settembre 2026

### Cambiato

- **Un badge solo per partecipante.** Dopo l'appello ce n'erano due quasi
  uguali — *presente* e *Presente* — e toccava indovinare quale parlasse della
  risposta e quale della presenza vera. Ora prima dell'appello si legge cosa ha
  risposto (*Presente*, *Forse*, *Assente*) e dopo l'appello **c'era** o **non
  c'era**, che è l'unica cosa che conta ancora.
## 1.12.0 — 6 settembre 2026

### Aggiunto

- **Il pulsante *Nota* dice quante ne hai già su quella persona** (*Nota · 2*):
  si vede se c'è qualcosa da rileggere senza doverlo aprire per scoprirlo.
  Contano sia le note appuntate a lei sia quelle che la nominano, esattamente
  come sulla sua scheda — se contassero in modo diverso il numero non tornerebbe
  con quello che poi si apre.
- **Le note precedenti si sfogliano mentre ne scrivi una nuova**: sotto al
  modulo, in riquadri che si aprono uno alla volta, con accanto la data e
  l'attività a cui erano legate. Serve a non ripetersi e a ricordare com'era
  finita l'altra volta.

### Cambiato

- **Ogni nota porta scritto “privato”**, non solo l'intestazione dell'elenco.
  Una nota la si rilegge da sola, magari mesi dopo: scrivere di qualcuno
  credendo che sia privato quando non lo è sarebbe il modo peggiore di
  scoprirlo, quindi la regola sta attaccata alla nota e non altrove.
## 1.11.1 — 6 settembre 2026

### Aggiunto

- **Nota rapida su una persona dall'attività**: accanto a ogni partecipante c'è
  il pulsante *Nota*, e quello che scrivi nasce già legato **a lei e a quella
  giocata**. È il momento in cui ci si ricorda cos'è successo — chiederlo dopo
  dalla scheda vorrebbe dire riscrivere anche dov'era. La nota si ritrova da
  tutte e due le parti, con scritto sopra su chi e su cosa.

### Corretto

- **Dall'attività non si apriva la scheda di un contatto**, nemmeno per chi i
  contatti li segue: il nome era cliccabile solo fra membri della squadra. Ora
  la regola è la stessa di ogni altro elenco — comando, amministrazione e
  segreteria aprono anche i nuovi, il team leader legge il nome e basta.
- Il segnaposto della casella delle note non racconta più un litigio.
## 1.11.0 — 6 settembre 2026

### Aggiunto

- **Note private** per chi ha un incarico — comando, amministrazione,
  segreteria, team leader. Hanno un titolo e un testo, si appuntano a una
  persona o a un'attività, e **le legge solo chi le ha scritte**: nessun altro,
  admin compreso. È il patto che le rende utili — una nota su una lite la si
  scrive com'è andata solo se non finisce sotto gli occhi di altri.
- **Chiocciole nelle note.** Scrivendo `@` compare l'elenco delle persone; chi
  nomini se la ritrova sulla propria scheda, sempre e solo sotto i tuoi occhi.
  Così una nota scritta su una giocata — *«@vipera ha coperto bene il fianco destro»* —
  la ritrovi anche aprendo l'uno o l'altro, senza riscriverla due volte.
- **Pagina Note**, dove ci sono tutte le tue con la ricerca nel titolo e nel
  testo: prima o poi si cerca qualcosa senza ricordarsi dove lo si era scritto.
- **Editor Markdown** con i pulsanti per grassetto, corsivo, titoli, elenchi e
  collegamenti, e l'anteprima che usa lo stesso motore che poi mostra il testo
  per davvero. Vale per le note e anche per **statuto e regolamento**.
- **Commenti e “mi piace” sulle attività, per tutti.** Se l'attività la vedi,
  puoi dire la tua: è la regola più semplice da spiegare. Il proprio commento si
  cancella sempre, quello altrui solo l'admin.

### Cambiato

- **Le vecchie note interne sull'operatore non ci sono più.** Erano senza
  titolo, stavano solo sulle persone ed erano leggibili da chiunque potesse
  aprire la scheda. Le nuove fanno tutto quello che facevano loro, e in più
  sono private davvero.

### Corretto

- **Niente più riquadro di conferma dopo un “mi piace” o un commento**: la cosa
  si vede fatta, dirlo anche a parole era rumore.
## 1.10.0 — 6 settembre 2026

### Aggiunto

- **Assistenti collegati al gestionale (MCP).** Ognuno, dalla voce *Assistente*,
  può creare una chiave personale e collegarci un assistente: quello che
  l'assistente sa fare è **esattamente quello che saprebbe fare quella persona**
  con il suo account, né più né meno.
- **I permessi sono quelli veri, non una copia.** Un assistente che lavora per
  un atleta vede il calendario, le sue quote, i suoi certificati e risponde alle
  attività; per la segreteria vede anche quote aperte e cassa; per l'admin crea
  attività e registra incassi. Gli strumenti che non competono alla persona non
  compaiono nemmeno nell'elenco, e se domani cambia un ruolo le chiavi già fatte
  cambiano con lui: non c'è un secondo elenco di permessi da tenere allineato.
- **Le regole restano le regole.** Chi si segna a un'attività da un assistente
  passa dagli stessi controlli del gestionale — adesioni aperte, posti, quota
  addebitata, certificato medico dove serve — perché è lo stesso codice, non una
  seconda versione scritta apposta.
- **La pagina dice cosa stai dando.** Sotto le chiavi c'è l'elenco degli
  strumenti calcolato sui tuoi ruoli, con evidenziati quelli che modificano i
  dati. Della chiave si conserva solo l'impronta: si vede una volta sola, e chi
  la perde ne fa un'altra invece di farsela ridire.

### Note

- Una chiave vale quanto una password: chi ce l'ha lavora a nome di chi l'ha
  creata. Si revoca dalla stessa pagina, e da quel momento non apre più niente.
- L'indirizzo è `/api/mcp` sullo stesso gestionale: ci arriva chi è dentro
  ZeroTier, come per tutto il resto.
## 1.9.0 — 6 settembre 2026

### Aggiunto

- **Messaggi WhatsApp nei gruppi**, in `Comando → Messaggi WhatsApp`: auguri di
  compleanno, promemoria dell'attività del giorno dopo con indirizzo e link alla
  mappa, solleciti delle quote aperte e dei certificati in scadenza.
- **Modelli a rotazione.** Dello stesso tipo se ne scrivono quanti si vuole: il
  gestionale usa a turno quello fermo da più tempo, così dieci auguri di fila non
  sono dieci volte la stessa frase. Nel testo si mettono segnaposto come
  `{nome}`, `{callsign}`, `{attivita}`, `{indirizzo}`, `{mappa}`.
- **Si prepara, si guarda, poi si manda.** I messaggi non partono da soli: prima
  compaiono in elenco con il testo definitivo. Un messaggio automatico sbagliato
  non si corregge dopo — è già sul telefono di qualcuno.
- **Ogni invio lascia traccia** con l'esito riga per riga, e un doppione è
  impossibile: compleanno una volta l'anno, promemoria una volta per attività,
  garantito dal database e non dalla buona memoria.

### Corretto

- **Dopo un aggiornamento il sito poteva rispondere "502"** finché non si
  riavviava a mano il proxy: nginx risolveva l'indirizzo dell'applicazione una
  volta sola all'avvio e si teneva quello vecchio. Ora lo richiede al momento.

### Note

- Il collegamento a WhatsApp **è di una persona, non di un ruolo**: la sessione
  la rivendica chi ha inquadrato il codice, e nessun altro amministratore può
  mandare messaggi da quel numero. Deve scollegare e collegare il proprio.
- Il canale non è l'interfaccia ufficiale di Meta, che nei gruppi non scrive: il
  gestionale si collega come farebbe un telefono, il che è fuori dai termini di
  servizio di WhatsApp. Va usato un **numero dedicato**, mai quello personale.
- La sessione vive in un servizio a parte che non pubblica porte: nessun token
  finisce nel database né sotto gli occhi di altri utenti.

## 1.8.0 — 6 settembre 2026

### Aggiunto

- **L'attività di oggi ha il suo posto in dashboard**, staccata da quelle che
  verranno. La finestra parte da mezzanotte e non da adesso: un'attività
  cominciata stamattina è ancora quella di oggi, e toglierla dalla pagina
  proprio mentre si sta giocando sarebbe il momento peggiore per farlo.
- **Appello diviso fra squadra e nuovi**, come già l'elenco dei partecipanti:
  hanno adempimenti diversi — i nuovi vanno assicurati con la giornaliera — e
  in una lista sola non si vede più chi è chi.
- **Foto e frase sulla scheda di un compagno**, che prima mostrava solo le
  iniziali; la foto compare anche nella scheda vista dallo staff.

### Corretto

- **Su telefono il nome dei partecipanti spariva.** Nome, badge e pulsanti
  stavano su una riga sola: il nome poteva stringersi fino a zero, badge e
  pulsanti no. Ora il nome ha la sua riga e i comandi vanno a capo sotto; su
  schermo largo resta tutto in linea come prima.

## 1.7.0 — 5 settembre 2026

### Cambiato

- **Statuto e regolamento li aggiornano anche amministrazione e segreteria**,
  non più il solo admin: sono i testi che si ritrovano fra le mani quando cambia
  una quota o una regola di condotta, e farli passare ogni volta da chi ha le
  chiavi di tutto vuol dire che restano vecchi. Leggerli resta di tutta la
  squadra.

### Corretto

- **Nome della stagione calcolato invece che letto.** In dashboard, statistiche
  e richieste di iscrizione compariva "2026/2027" — dedotto dal calendario —
  mentre la stagione aperta si chiama "2026". Ora si legge il nome che le ha
  dato chi l'ha aperta, che è l'unico che la squadra riconosce.

## 1.6.0 — 5 settembre 2026

### Aggiunto

- **Installabile come applicazione** su Android, iPhone e computer: icona sulla
  schermata iniziale, avvio a schermo intero senza barra degli indirizzi,
  scorciatoie a calendario e pagamenti. Le pagine non vengono tenute in memoria
  di proposito — qui dentro ci sono elenchi di persone, quote e dati sanitari, e
  una pagina salvata sul telefono resterebbe leggibile dopo la disconnessione
  mostrando numeri vecchi come se fossero quelli di adesso. Senza rete si vede
  una schermata che lo dice, invece dell'errore del browser.

## 1.5.0 — 5 settembre 2026

### Aggiunto

- **Statuto e regolamento**, in una pagina riservata a chi è dentro il gruppo:
  chi non è ancora in squadra non ha motivo di leggere come si viene
  sanzionati. I due testi sono file Markdown nel volume degli allegati — si
  aprono e si leggono anche senza il gestionale acceso, e finiscono nel backup
  insieme a certificati e foto. Li scrive solo l'admin, in una casella di
  testo; il Markdown viene reso senza librerie e senza HTML da iniettare, così
  quello che si scrive resta testo.

## 1.4.0 — 5 settembre 2026

### Aggiunto

- **Credenziali da copiare** dopo il reset della password: utente e password in
  un riquadro, con il pulsante per copiare il singolo campo o un messaggio già
  scritto — indirizzo del gestionale compreso — da incollare in chat.
  Ricopiare a mano una password di dodici caratteri davanti a chi aspetta è il
  modo più sicuro per sbagliarla. La finestra non si chiude più da sola finché
  quelle credenziali sono a video: sono mostrate una volta e basta.

## 1.3.0 — 5 settembre 2026

### Aggiunto

- **Ordinamento cliccando l'intestazione** nell'elenco operatori: nome, stato,
  certificato, presenze, ultimo accesso e quote da saldare. Chi non ha il dato
  — mai entrato, nessun certificato — finisce sempre in fondo in entrambi i
  versi: sono le righe di cui non si sa niente, e portarle in cima solo perché
  "vuoto viene prima" sposterebbe l'attenzione sulle persone sbagliate.
- **Ultimo accesso con l'ora**, non più solo la data: sapere se qualcuno è
  entrato stamattina o tre settimane fa cambia quello che ci si fa.

## 1.2.0 — 5 settembre 2026

### Aggiunto

- **Ultimo accesso nell'elenco operatori**, in tabella e su card: chi non è mai
  entrato è segnalato in ambra, perché è quello il dato che serve quando si
  distribuiscono le credenziali.

### Corretto

- **Pagina che si rompeva "a casaccio" durante la navigazione.** Succedeva a
  chi aveva schede aperte mentre il gestionale veniva aggiornato: la pagina
  continuava a chiedere i pezzi della versione precedente, che nella nuova non
  esistono più, e Next mostrava un errore in inglese senza via d'uscita. Ora
  quel caso viene riconosciuto e la pagina si ricarica da sola una volta; per
  gli errori veri resta un messaggio comprensibile con il riferimento da citare.

## 1.1.0 — 5 settembre 2026

### Aggiunto

- **Identità protetta dei contatti.** Nome e cognome per intero di chi non è
  ancora in squadra, e la sua scheda, restano ad admin, amministrazione e
  segreteria. Per tutti gli altri — team leader compresi — un contatto è il suo
  callsign, oppure "Mario R.".
- **Quote doppie sulle attività**, squadra ed esterni, composte dal tariffario
  come le iscrizioni: si spuntano le voci o si scrive l'importo, che vince. Più
  voci fanno un pagamento solo, con lo spaccato scritto sotto.
- **Uso "per le attività"** nel tariffario: nel comporre le quote compaiono solo
  le voci che c'entrano, non iscrizioni e tessere federali.
- **Giacenza delle polizze prova** in Cassa e in Tessere FIGT, letta dal portale
  federale e aggiornata da sola a ogni attivazione.
- **Pagina Ruoli**: cosa può fare ciascuno e quante persone ce l'hanno.
- **Assegnazione dei ruoli in blocco** dall'elenco operatori, con la selezione
  che resta fra un'assegnazione e l'altra.
- **Riordino delle tipologie** trascinando la maniglia.
- **Certificato medico per tipologia**: si spegne dove non si gioca — riunioni,
  cene — e chi non ce l'ha può segnarsi lo stesso.
- **Badge della propria risposta** in testa alla scheda dell'attività, foto e
  frase del profilo accanto ai partecipanti.
- **Callsign unico**, controllato in tutti i punti in cui se ne scrive uno e
  garantito da un indice nel database: con il callsign si accede, due uguali
  rendevano l'accesso ambiguo.
- **HTTPS** con certificato proprio davanti all'applicazione, per non far
  viaggiare le password in chiaro sulla rete ZeroTier.
- **Badge di versione** accanto a ZERO DARK, nel menu e nella pagina di accesso.

### Cambiato

- **Le quote non si configurano più sulla tipologia.** Il flag "tariffa nuovi"
  è sparito: quanto costa un'attività si decide creando l'attività, in un posto
  solo invece di due.
- **L'admin di partenza si congeda.** Nasce solo se non esiste alcun
  amministratore e se ne va appena ne compare uno vero; non lo si riconosce
  dall'email ma da un marchio sul record, così un account cancellato resta
  cancellato. L'ultimo amministratore non si può più cancellare né declassare.
- **Elenco operatori**: compaiono anche quelli da riconfermare, che prima
  esistevano senza essere in nessuna lista, e si elimina dalla riga.
- Stato e destinatari di un'attività si mostrano solo a chi gestisce il
  calendario: a un operatore non dicevano niente.
- La sezione Nuovi è aperta anche ad amministrazione e segreteria.

### Corretto

- **Pagina di accesso**: era statica, quindi `DEBUG_LOGIN` restava quello di
  chi costruiva l'immagine invece dell'ambiente. In test i pulsanti di accesso
  rapido erano spariti per questo.
- **Tessere FIGT**: l'avviso "non risultano tesserati" contava anche i contatti
  e chi è da riconfermare, gente che una tessera non l'avrà mai.
- Link al portale federale corretto in `intranetasnwg.it`.
- La chiave di firma delle sessioni non è più quella d'esempio.

## 1.0.0 — 4 settembre 2026

Prima versione in uso: operatori, calendario con adesioni e formazione, campi,
certificati medici, iscrizioni stagionali, tessere federali, pagamenti e cassa.
