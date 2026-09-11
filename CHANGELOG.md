# Registro delle modifiche

Le versioni seguono `MAJOR.MINOR.PATCH`, come spiegato nel README: **major**
quando cambia il modo di lavorare, **minor** per funzioni nuove, **patch** per
correzioni. Il numero vive in `package.json` ed è quello che si legge nel badge
accanto a ZERO DARK.

## 2.16.1 — 11 settembre 2026

### Corretto

- **Nel modulo di un'attività di squadra con dei nuovi c'è la quota esterni.**
  Da quando si possono forzare dei nuovi su un'attività di squadra, la card del
  loro prezzo restava nascosta: nel Corso CQB non c'era dove cambiarlo. Adesso
  compare appena fra i partecipanti c'è un nuovo.
- **Salvare un'attività non cancella più una quota che il modulo non
  mostrava.** Una card nascosta arrivava vuota, e il salvataggio azzerava il
  prezzo esterni che c'era: i nuovi finivano a pagare come la squadra senza che
  nessuno l'avesse deciso. Adesso quello che il modulo non mostra resta com'era.

### Cambiato

- **Sulla barra in basso del telefono le voci hanno il loro pallino**, come nel
  menu: «Miei» dice quante quote hai da pagare senza doverlo aprire. Il pallino
  del Menu conta solo quello che nella barra non si vede, per non dire due volte
  la stessa cosa.

## 2.16.0 — 11 settembre 2026

### Aggiunto

- **Le casse che non sono del club.** Un corso lo tiene Mario, e i soldi del
  corso sono suoi: farli incassare alla segreteria per poi girarglieli era
  lavoro doppio, e mescolava nella cassa del club conti che non sono della
  squadra. Adesso esistono altre casse, ognuna con le sue persone abilitate e i
  suoi metodi di pagamento. Si configurano in **Segreteria → Altre casse**, da
  admin e segreteria, che di ognuna vedono quanto lavora ma non chi ha pagato.
- **Chi gestisce una cassa la trova nel menu**, con il pallino quando qualcuno
  segnala di averlo pagato. Dentro vede **solo i pagamenti della sua cassa** —
  da confermare, da incassare, incassati — e li conferma lui. Della cassa del
  club non vede niente; e i pagamenti della sua cassa non li conferma nessun
  altro, nemmeno l'admin.
- In **Pagamenti → Registra pagamento** si può scegliere in quale cassa va la
  quota. Nelle altre casse nasce sempre da incassare: l'incasso lo conferma chi
  le gestisce, con uno dei suoi metodi.
- **Ogni quota si sollecita con il WhatsApp della sua cassa.** Nella sua cassa
  Mario ha «Sollecita» accanto a ogni quota aperta: apre WhatsApp sul suo
  telefono con il messaggio già scritto — importo, scadenza, come pagare — e
  parte solo verso chi ha dato il consenso alle comunicazioni. I solleciti del
  club, dal numero del club, riguardano solo le quote del club.

### Cambiato

- **Chi paga vede a chi deve pagare.** In «I miei pagamenti» una quota di
  un'altra cassa dice «da pagare a …», e segnalando il pagamento compaiono solo
  i metodi di quella cassa, con le sue istruzioni. L'IBAN del club sotto la
  quota del corso di Mario avrebbe mandato i soldi nel posto sbagliato.
- **La cassa del club resta del club.** Saldo e movimenti della Cassa,
  Pagamenti della segreteria, statistiche, dashboard, pallini del menu,
  solleciti WhatsApp e riepiloghi dell'assistente contano solo i soldi del
  club: quelli delle altre casse non ci passano, nemmeno come riga informativa.
- Per assicurare un nuovo conta la quota del club, perché la polizza la paga il
  club.
- Un rimborso resta nella cassa della quota da cui nasce: lo eroga chi l'aveva
  incassata.
- I metodi di pagamento possono avere lo stesso nome in casse diverse —
  «Contanti» del club e quelli del corso — ma non due volte nella stessa.

## 2.15.0 — 11 settembre 2026

### Aggiunto

- **Nel calendario, sopra le attività in programma, c'è una barra di
  ricerca.** Filtra mentre si scrive, senza ricaricare la pagina, e cerca nel
  titolo, nella tipologia, nel campo e nella data — «ottobre» trova quelle di
  ottobre, «k9» il corso. Maiuscole e accenti non contano. Se non trova niente
  lo dice, invece di lasciare la pagina vuota come se non ci fosse nulla in
  programma.

### Cambiato

- **Le attività in programma sono divise per anno**: prima quelle dell'anno in
  corso, poi quelle degli anni successivi, ognuno con la sua intestazione e il
  conto delle attività. Una gara di marzo del prossimo anno non si confonde più
  con quella di questo ottobre, e chi scorre sa quando ha finito l'anno.

## 2.14.3 — 10 settembre 2026

### Corretto

- **Nelle quote delle attività l'importo scritto a mano si somma alle voci.**
  40 € di corso più la voce «Costo Partita» da 10 facevano 40, con il
  dettaglio «importo fissato a 40 €»: l'importo a mano vinceva sulla somma.
  Adesso fanno 50, come si legge, e il dettaglio lo scrive per intero —
  «importo 40,00 € + Costo Partita 10,00 €». Sotto la card il totale si vede
  mentre si compone. Zero senza voci resta il modo di regalare la giocata.
- Vale per le due quote dell'attività e per il prezzo esterni chiesto quando
  si aggiunge un nuovo. Le quote di iscrizione non cambiano: lì l'importo
  scritto a mano sostituisce ancora lo spaccato.
- Le quote già salvate restano quelle che erano: per rifarle si riapre
  l'attività, si rispunta la voce e si salva.

## 2.14.2 — 10 settembre 2026

### Corretto

- **Sul telefono la schermata di accesso sta tutta in uno schermo.** Il
  pulsante per registrarsi e le righe del terminale finivano sotto il bordo, e
  per vederli bisognava scorrere: chi arrivava per la prima volta non vedeva
  proprio il pulsante che gli serviva. Adesso sugli schermi stretti margini,
  campi e pulsanti si stringono, il logo è più piccolo, «Nuovo operatore?» e
  «[ REGISTRATI ]» stanno sulla stessa riga, e gli spazi si misurano
  sull'altezza dello schermo — su un telefono più basso si stringono di più.
- Sui telefoni più bassi, dove stringere non basta, cede prima quello che si
  può perdere: sotto i 700px d'altezza il marchio con il logo, sotto i 600
  anche i sottotitoli e le righe del terminale. Resta sempre quella che dice
  in che ambiente si è, perché sulla porta del test è l'avviso che conta. Da
  tablet in su resta com'era.

## 2.14.1 — 10 settembre 2026

### Cambiato

- **«Nuovo operatore? Registrati» adesso si vede.** Stava in fondo alla card,
  scritto come le righe del terminale, e sembrava una scritta di contorno: chi
  arriva per la prima volta la porta non la trovava. Adesso ha una fascia sua
  subito sotto il modulo, con il pulsante «[ REGISTRATI ]» — secondo solo ad
  «Autenticazione», che resta il gesto principale. Il testo è rimasto quello.

## 2.14.0 — 10 settembre 2026

### Cambiato

- **La schermata di accesso ha la faccia da terminale.** Il titolo ZERO DARK in
  lettere a pixel attraversate dalle righe dei fosfori, con l'alone verde e il
  contorno doppio; sotto, la card «Accesso protetto» con i campi neri, il
  pulsante «[ AUTENTICAZIONE ]» e l'errore in una fascia rossa proprio sotto il
  pulsante, dove si guarda dopo averlo premuto.
- In fondo alla card le righe da terminale si accendono una alla volta, e
  **dicono cose vere**: che il gestionale risponde, che versione gira, se si è in
  produzione o nel test — in giallo, perché confondere i due ambienti vuol dire
  scrivere sui dati veri credendo di giocare — e se l'accesso rapido di prova è
  attivo. Una scritta tipo «crittografia AES-512 attiva» farebbe scena, ma
  AES-512 non esiste, e una bugia sulla sicurezza sulla porta d'ingresso è
  l'ultima cosa da mettere davanti a chi ci lascia i suoi dati.
- I caratteri da terminale valgono **solo qui**: il resto del gestionale resta
  senza monospazio, com'era stato deciso, perché si legge per ore. Arrivano con
  la build e li serve il nostro server: chi apre la pagina non manda niente a
  Google.
- Si entra come prima, con l'email o con il callsign, e «ricordami» c'è ancora.
  Chi ha chiesto al sistema meno animazioni trova le righe già accese.

## 2.13.1 — 10 settembre 2026

### Corretto

- **Il chip in alto a destra si apre senza passare per un cerchio.** Da chiuso
  aveva gli angoli tondi al massimo, da aperto normali: animando dall'uno
  all'altro, per quasi tutta l'apertura il riquadro che cresceva restava
  tagliato a cerchio, e diventava un rettangolo solo alla fine. Adesso il
  raggio è lo stesso nei due stati — sul chip, che è basso, fa già la pillola
  da solo — e a crescere sono soltanto larghezza e altezza.

## 2.13.0 — 10 settembre 2026

### Aggiunto

- **Visibilità «su invito»**, accanto a «solo squadra» e «tutti». L'attività
  non la vede nessuno a calendario, nemmeno la squadra: solo chi viene
  aggiunto fra i partecipanti. Serve per le cose che si organizzano con poche
  persone scelte, che finora andavano rilasciate alla squadra intera o tenute
  in bozza. I promemoria di un'attività su invito arrivano in privato a
  ciascuno e non nel gruppo, che è di tutti e la racconterebbe proprio a chi
  non è stato invitato.
- **Voci di listino «al giorno».** Nel tariffario una voce si può marcare così:
  su un'attività di più giorni conta una volta per ogni giorno, e nel
  dettaglio della quota la moltiplicazione si legge («× 2 giorni»). Serve per
  quello che vale un giorno solo, come la giornaliera. Le voci che c'erano
  restano come prima, una volta sola.
- **Forzando un nuovo su un'attività senza prezzo per gli esterni, il
  selettore lo chiede.** Di fianco all'elenco compare la card della quota
  esterni, con la giocata già spuntata e un avviso che spiega perché: senza
  prezzo il nuovo giocherebbe gratis senza che nessuno l'abbia deciso, e la
  giornaliera — che la paga il club — si potrebbe fare lo stesso. Si sceglie
  lì e parte insieme ai nomi. Il prezzo lo decide l'admin: a un team leader il
  selettore dice a chi chiederlo.

### Cambiato

- **Chi è fra i partecipanti vede l'attività, sempre.** Un nuovo aggiunto a
  mano su un'attività di squadra la trova nel suo calendario e può rispondere;
  gli altri nuovi continuano a non vederla. È la stessa regola che fa
  funzionare gli inviti.
- **Nella scheda dell'attività quota e polizze vanno sotto il nome**, non più
  in fila con «Nota» e «Presente»: sono cose da leggere e non da premere, e
  messe in riga con i pulsanti erano una fila di etichette da decifrare.

## 2.12.0 — 10 settembre 2026

### Cambiato

- **«Aggiungi partecipanti» divide la squadra dai nuovi, con una ricerca sola.**
  Mescolati, chi cercava un compagno scorreva i nomi di gente vista una volta a
  un'open; con due elenchi e due ricerche, chi non ricorda da che parte sta uno
  lo cercherebbe due volte. Si scrive una volta e lo si trova ovunque sia, e
  «seleziona tutti» vale dentro il gruppo: «tutta la squadra» è una scelta
  frequente, «tutta la squadra e tutti i nuovi» quasi mai.
- **Sull'attività di sola squadra i nuovi partono nascosti, ma se ne può
  forzare uno.** Sotto l'elenco c'è il pulsante per mostrarli, e se la ricerca
  trova un nuovo lo dice invece di rispondere «nessuno» mentre la persona c'è.
  Scegliendone uno compare un avviso giallo: forzare si può, ma dev'essere una
  scelta che si vede.
- **La giornaliera si fa per giorno.** La polizza prova vale fino alle 24:00
  del giorno della prova, quindi una 24 ore che parte sabato e finisce domenica
  ne vuole due. Prima c'era posto per una sola: si assicurava il sabato e la
  domenica si giocava scoperti, senza che niente lo dicesse. Adesso accanto al
  nuovo c'è un pulsante per ogni giorno — «Assicura sab 12 set», «Assicura dom
  13 set» — e **nessuno parte da solo**: chi viene solo il sabato, la domenica
  non va coperto.
- La quota resta **una sola** per tutti i giorni, ed è quella per gli esterni
  che si imposta sull'attività: la cifra la decide chi la crea, non la
  moltiplica il gestionale per il numero di giorni.
- In Polizze ogni ospite ha una riga per giorno, e i conteggi contano i giorni
  e non le persone: uno che viene sabato e domenica ha due polizze da fare.
- Le coperture che c'erano valgono per il primo giorno della loro attività,
  che è quello che il gestionale ha sempre mandato al portale.

### Corretto

- **Il pallino e «Pronti da assicurare» contavano solo le quote saldate**,
  mentre dalla 2.11.0 il pulsante lascia assicurare anche chi ha dichiarato il
  pagamento. Il numero diceva meno di quanto la pagina lasciasse fare; adesso
  contano la stessa cosa.
- Un'attività di più giorni cominciata ieri spariva da Polizze pur avendo
  ancora oggi da coprire.

## 2.11.0 — 9 settembre 2026

### Corretto

- **Nella scheda dell'attività non si assicura più chi non ha pagato.** Il
  divieto c'era già nell'azione — la polizza la paga il club e non torna
  indietro — ma il pulsante «Assicura» restava lì e rifiutava a modulo
  compilato. Un pulsante che dice sempre di no insegna solo a premerlo di
  nuovo. Adesso al suo posto c'è scritto **si assicura dopo l'incasso**,
  esattamente come nella pagina Polizze, che si comportava già così: erano due
  pagine sulla stessa regola con due risposte diverse.

### Cambiato

- **Chi dichiara di aver pagato si può assicurare subito**, senza aspettare la
  spunta della segreteria. Ha detto «te li do in contanti» mettendoci la faccia
  sui pagamenti, e tenerlo scoperto in campo per un passaggio di cassa non
  ancora verificato è severo col rischio sbagliato. Resta fuori solo chi non ha
  né pagato né detto niente.
- Accanto alla persona le situazioni diventano **tre invece di due**: «quota
  saldata», «pagamento dichiarato» e «quota da saldare». Quella in mezzo è
  quella che spiega perché uno si può assicurare pur non risultando ancora
  incassato — senza, il pulsante che compare sembrerebbe un difetto.
- La regola vive in una funzione sola, `quotaOnorata`, usata dalle due pagine e
  dalle due azioni: una condizione riscritta in quattro punti è una condizione
  che fra sei mesi ne dice due cose diverse.

## 2.10.0 — 9 settembre 2026

### Cambiato

- **Anche chi si registra da solo lascia telefono, data e luogo di nascita.**
  L'obbligo c'era sulla creazione a mano ma non sul modulo pubblico, ed era il
  buco più largo dei due: da lì passa la maggior parte di chi arriva a un'open,
  e ne usciva una scheda a metà da completare mesi dopo — cioè rincorrendo
  qualcuno che intanto ha smesso di rispondere.
- I due campi di nascita al modulo di registrazione mancavano del tutto; il
  telefono c'era ma facoltativo. Il controllo è nel modulo **e** nell'azione,
  perché il `required` del browser si aggira.
- La data si legge con l'aiuto di sempre e non con `new Date`: «2004-05-15»
  interpretata come mezzanotte UTC, a est di Greenwich, diventa il giorno
  prima — su una data di nascita è un errore che nessuno nota finché non serve
  per il tesseramento.

## 2.9.0 — 9 settembre 2026

### Cambiato

- **Il chip in alto a destra non apre una tendina: si apre lui.** Cliccandolo
  cresce verso sinistra e verso il basso restando agganciato al suo angolo, e
  il callsign con la faccia non si spostano di un pixel — sono la stessa cosa
  di un momento prima, più grande. Prima sbucava un riquadro staccato sotto,
  che era un secondo oggetto da riconoscere; adesso si vede da dove viene.
- Il menu parte **all'altezza della barra**, non due centimetri sotto: è il
  chip stesso ad allungarsi, quindi non c'è uno stacco da attraversare con
  l'occhio.
- Dentro compare il **nome per esteso**, che è quello che il chip non ha spazio
  di dire. Il **callsign non si ripete**: sta già in cima, e leggerlo due volte
  a due centimetri di distanza faceva sembrare la scheda scritta da due persone
  che non si erano parlate.
- L'apertura misura la larghezza di partenza invece di indovinarla — il chip è
  largo quanto il callsign di chi guarda — e l'altezza scende con le righe che
  ci sono davvero: gli incarichi vanno da zero a sei, e un'altezza fissa
  sarebbe stata giusta per una persona sola. Chi ha chiesto al sistema meno
  animazioni non ne vede nessuna.
- Nella barra non si sposta niente: sotto al chip che si allarga resta un
  segnaposto della sua misura, o aprendo il menu il logo scivolerebbe di lato.

## 2.8.0 — 9 settembre 2026

### Aggiunto

- **«Crea operatore» c'è anche nei Nuovi.** È da lì che si guarda quando ci si
  accorge che qualcuno manca — è arrivato a un'open, va segnato — e mandare a
  cercare la pagina degli operatori è il modo migliore per rimandare
  l'inserimento a dopo, cioè a mai.
- Aperto dai contatti, il modulo parte già su **Nuovo** e senza ruoli: chi si è
  affacciato a un'open non è un atleta, e l'incarico arriva quando entra in
  squadra. Aperto dagli operatori si comporta come prima.
- Il pulsante resta un **gesto da admin** anche qui: amministrazione e
  segreteria vedono i contatti ma non lo trovano, invece di trovarlo e sentirsi
  dire di no dopo aver compilato.

### Cambiato

- Il modulo di creazione è **un componente solo**, usato dalle due pagine invece
  di essere copiato: due form gemelli prima o poi divergono su un campo
  obbligatorio.
- **Telefono, data e luogo di nascita sono obbligatori** quando si crea una
  persona a mano, e i due campi di nascita al modulo mancavano del tutto. Sono i
  dati che servono per tesseramento e polizza: chi si registra da solo li
  compila nel modulo d'iscrizione, chi viene inserito a mano non passa di lì e
  restava una scheda a metà — da rincorrere mesi dopo, quando chiedere è molto
  più caro. Il controllo è nel modulo **e** nell'azione, non solo nel browser.

## 2.7.0 — 9 settembre 2026

### Cambiato

- **Il modello di messaggio si divide in due: quando e dove da una parte, i
  testi dall'altra.** Prima ogni frase portava con sé il proprio gruppo
  WhatsApp: finché i modelli erano due si notava appena, ma con trenta modi di
  fare gli auguri diventava trenta volte la stessa scelta — e il giorno che la
  squadra apre una chat nuova, trenta modifiche a mano per spostarli tutti.
- Adesso un modello ha un **titolo** («Auguri di compleanno»), dice quando
  parlare e su quale gruppo scrivere, e dentro tiene quanti testi si vuole.
  Cambiare gruppo è una riga sola, e vale per tutti i suoi testi.
- La **rotazione scende di un piano**: gira sui testi, non sui modelli. Il
  comportamento visto da fuori è lo stesso di prima — a turno quello fermo da
  più tempo — ma adesso il barattolo da cui pesca si riempie senza riscrivere
  ogni volta la configurazione.

### Aggiunto

- **I testi si incollano in blocco.** Una riga, un testo; se servono testi che
  vanno a capo si separano con una riga di trattini. Trenta auguri passano in
  un gesto invece che in trenta finestre — che è il motivo per cui prima ne
  restavano due.
- Ogni testo si **accende e si spegne** dal suo posto, senza aprire niente:
  spento resta scritto ma non esce, così una frase si mette da parte senza
  perderla. Accanto si legge quante volte è stata usata e quando.
- Due strumenti per gli assistenti collegati: **`modelli_messaggi`** dice quali
  modelli ci sono, che segnaposto accettano e cosa contengono già — serve a non
  riproporre frasi che ci sono — e **`aggiungi_testi`** ne infila di nuovi in un
  modello chiamandolo per titolo. Entrano **spenti**: cinquanta frasi generate
  contengono sempre le tre che non diresti mai, e nessuna parte finché una
  persona non l'ha letta.

### Corretto

- **Due compleanni lo stesso giorno non escono più identici.** Il testo veniva
  scelto una volta sola per tutto il giro e poi riusato per ogni festeggiato:
  nel gruppo si leggevano due messaggi uguali uno sotto l'altro, che è
  esattamente il caso in cui la ripetizione si nota. Adesso ognuno pesca il
  suo, e vale anche per i promemoria e i solleciti mandati in blocco.
- Il registro degli invii resta agganciato alla frase con cui il messaggio è
  partito, anche per i modelli che la migrazione ha fuso insieme.

## 2.6.0 — 9 settembre 2026

### Cambiato

- **Negli operatori si legge l'ultima attività, non l'ultimo accesso.** Sono
  due cose diverse e la seconda diceva poco: chi ha spuntato «ricordami» non
  fa un accesso per due mesi pur aprendo il gestionale tutti i giorni, e dalla
  sua riga sembrava sparito. Chi guardava quella data per decidere se mandare
  un messaggio la leggeva sbagliata.
- La data si aggiorna **mentre si naviga**, al massimo una volta ogni cinque
  minuti: per sapere se qualcuno è passato oggi o tre settimane fa
  quell'approssimazione non cambia niente, mentre una scrittura per ogni
  schermata aperta sì. La colonna si ordina come prima.
- Sulla scheda della persona restano **tutt'e due**: «visto l'ultima volta» e
  «ultimo accesso». Non è ridondanza — «non è mai entrato» e «è entrato una
  volta e poi non l'ha più aperto» sono due situazioni diverse, e chi segue le
  persone le tratta in modo diverso.
- Chi non è mai entrato resta segnato **mai entrato**, in arancione.

## 2.5.0 — 9 settembre 2026

### Cambiato

- **Chi sei sta in alto a destra, su tutt'e due i formati**: il nick — senza
  virgolette, perché qui non si sta citando un soprannome dentro un nome per
  esteso, si sta dicendo come ti chiami qui dentro — e la tua faccia a destra.
- **Cliccando sull'avatar si apre una tendina** con nome per esteso, i tuoi
  **incarichi** come etichette colorate (Atleta, Team Leader, Segreteria…),
  **Il mio profilo** ed **Esci**. Si chiude cliccando fuori o con Esc.
- Gli incarichi stanno nella tendina e non sempre in vista, ed è voluto: uno sa
  già cosa fa nella squadra. Servono nel momento in cui ci si chiede *perché
  non vedo quella pagina?*, e allora si apre e si legge.
- **Il piede della colonna è sparito**: nome, incarichi ed *Esci* stavano lì,
  che è l'ultimo posto dove si guarda. Tenerli anche in fondo avrebbe voluto
  dire due pulsanti «Esci» sulla stessa schermata.

## 2.4.1 — 9 settembre 2026

### Corretto

- **Nei certificati medici mancava chi un certificato non ce l'ha proprio.**
  La pagina elencava i certificati, e chi non ne ha mai caricato uno non ha una
  riga da nessuna parte: era invisibile. Ma «non ce l'ha ancora» e «ce l'ha
  scaduto» sono lo stesso problema per chi deve schierare — anzi il primo è
  peggio, perché non se ne accorge nessuno finché quella persona non prova a
  segnarsi.
- C'è un filtro **Senza certificato** con accanto quanti sono, così il numero
  si legge senza doverci entrare. Da ogni riga si carica il certificato con la
  persona già scelta, o si apre la sua scheda.

## 2.4.0 — 9 settembre 2026

### Cambiato

- **A giornata conclusa la scheda serve a rileggere, non più a organizzare.**
  Spariscono le tre cose che si fanno prima o durante: **l'appello**, i **dati
  sanitari (ICE)** di chi c'era, e **la propria adesione**. Restano le presenze
  sulle righe dei partecipanti — quelle sono il risultato, non uno strumento
  ancora da usare.
- I dati sanitari in particolare servono **mentre** si gioca: tenerli
  affacciati su ogni attività passata vorrebbe dire lasciare in giro il gruppo
  sanguigno di venti persone su schede che nessuno chiude più.
- Alla propria adesione non si risponde per una domenica passata: c'eri o non
  c'eri è già scritto, ed è un fatto, non una scelta ancora da fare.

### Corretto

- **L'appello non compare più sulle attività annullate.** È lui a concludere
  l'attività: spuntarlo su una giornata annullata la faceva risorgere come
  conclusa, cioè come se si fosse giocata.

### Da sapere

- Per correggere un appello sbagliato si **riapre l'attività** (Stato
  dell'attività → Riapri), si sistema e si conclude di nuovo. È un passaggio in
  più ed è voluto: rimettere le mani sulle presenze di una giornata chiusa
  dev'essere una decisione, non un clic di passaggio.

## 2.3.3 — 9 settembre 2026

### Cambiato

- **Sul telefono callsign e faccia sono invertiti**: prima il nome, poi
  l'avatar all'estremità. La faccia sta così nell'angolo, dove il pollice
  arriva senza attraversare la scritta.

## 2.3.2 — 9 settembre 2026

### Cambiato

- **L'applicazione si chiama Zero Dark Ops.** Il nome cambia dove si legge il
  gestionale: linguetta del browser, nome sotto l'icona quando lo si installa
  sul telefono, marchio in cima alla colonna, sulla striscia del telefono e
  sulla pagina di accesso. **Zero Dark Team** resta dov'è il nome della
  squadra e non dell'applicazione — titolare del trattamento dei dati,
  intestazione dei documenti: lì non si parla del programma ma di chi risponde
  di quello che c'è dentro.

## 2.3.1 — 9 settembre 2026

### Cambiato

- **La stellina sta attaccata al titolo**, non più in fondo alla riga. In fondo
  si perdeva in mezzo ai pulsanti della pagina e bisognava cercarla ogni volta;
  accanto al titolo la si trova senza guardare, perché il titolo è la prima
  cosa che si legge aprendo una pagina. Una sola, uguale su telefono e
  computer.

## 2.3.0 — 9 settembre 2026

### Aggiunto

- **I guasti si raccontano da soli.** Quando una pagina si rompe, prima ancora
  che qualcuno prema *Ricarica*, la scheda spedisce quello che sa: l'errore con
  la pila di chiamate, la pagina, il browser, la versione del gestionale e —
  soprattutto — il **diario di bordo**, cioè le ultime quaranta cose successe
  con l'orario accanto. È quello a rispondere all'unica domanda che contava e a
  cui non si sapeva rispondere: *cosa stavi facendo?*. Prima l'informazione se
  ne andava con il ricaricamento, e un difetto che si presenta una volta al
  mese non si correggeva mai.
- **Chi trova la pagina rotta vede un riferimento di sei cifre**, lo stesso che
  compare nel registro: «mi dava errore stamattina» diventa una riga sola da
  cercare invece di una caccia per orario.
- **Si raccolgono anche i guasti che non rompono niente**: una promessa
  rifiutata, un errore dentro un gestore di eventi. Non fanno comparire nessun
  messaggio, lasciano la pagina **storta** — un pulsante che non risponde, un
  elenco che resta vuoto — e sono i più difficili da farsi raccontare, perché
  chi li subisce non ha niente da riferire se non «non andava».
- **Una pagina per leggerli**, in Comando → *Guasti*, con il pallino di quanti
  restano da guardare. Le righe si segnano come guardate invece di cancellarle:
  un difetto che ritorna si riconosce solo se le vecchie sono ancora lì.

### Cambiato

- **La stellina si è spostata nella riga del titolo**, tutta a destra: sul
  telefono in fondo alla riga dove c'è scritto «Calendario», sul computer in
  fondo alla stessa riga, dopo i pulsanti. Stava in una striscia sua sopra la
  pagina, che era un posto in più dove guardare.

### Deciso

- **Nel diario non finisce niente di quello che si scrive**: solo dove si è
  andati, cosa si è premuto e cosa ha risposto il server. Un diario che
  raccogliesse anche i contenuti sarebbe la registrazione di quello che la
  gente fa, che è un'altra cosa da un registro dei guasti.
- **Gli aggiornamenti non sono guasti.** Quando il messaggio compare solo
  perché il gestionale è cambiato sotto una scheda rimasta aperta, non si
  spedisce niente: riempirne il registro coprirebbe i difetti veri.
- **La segnalazione non chiede permessi.** L'errore arriva proprio quando
  qualcosa non funziona, e pretendere una sessione in ordine per poterlo
  raccontare vorrebbe dire perdere esattamente i casi peggiori. Leggerli invece
  è dell'admin: dentro ci sono indirizzi visitati e pile di chiamate.

## 2.2.0 — 9 settembre 2026

### Aggiunto

- **I preferiti: il proprio menu, non un menu diverso per ruolo.** In alto a
  destra, su ogni pagina, c'è una **stellina**: accesa, quella pagina finisce
  fra i preferiti. Il gestionale ha una quarantina di schermate e nessuno le
  usa tutte — chi tiene la cassa ne apre tre, un atleta due, e sono schermate
  diverse. Invece di indovinare per ruolo, ognuno si compone le sue.
- **Sul computer** i preferiti stanno in cima alla colonna, sopra tutti i
  gruppi. **Sul telefono** sono le voci della barra in basso, dove arriva il
  pollice: ci stanno i primi quattro, gli altri restano nel menu.
- **Si riordinano tenendo premuto**: si preme finché la riga si stacca, si
  trascina dove va, si lascia. Un gesto solo, dall'inizio alla fine, e funziona
  anche sul telefono — dove il trascinamento HTML non esiste, ed è proprio lì
  che l'ordine conta, perché decide cosa si ha sotto il pollice.
- **Sul telefono, in alto a destra, la propria faccia e il proprio callsign**,
  e si toccano per aprire il profilo. Sul computer quelle due cose stanno in
  fondo alla colonna; sul telefono la colonna non c'è, e al profilo si
  arrivava solo aprendo il menu.

### Deciso

- **La stellina compare solo dove la pagina è una voce di menu.** Sulla scheda
  di una singola attività non c'è: un preferito è una porta, non un foglio, e
  riempire il menu di indirizzi che fra un mese non vogliono più dire niente lo
  renderebbe inutile.
- **Si conserva solo l'indirizzo**, non l'etichetta né l'icona: quelle si
  ripescano ogni volta dal menu vero. Così una voce rinominata si rinomina
  anche qui, e una voce che una persona non può più vedere sparisce dai suoi
  preferiti da sola, invece di restare a puntare su una porta chiusa.
- **Dodici al massimo.** Oltre, non sono più una scorciatoia: sono un secondo
  menu da cercare come il primo.

## 2.1.0 — 9 settembre 2026

### Aggiunto

- **Il tipo di gara**, da un'anagrafica sua: 24 ore, scenario, speedsoft,
  torneo a squadre. Si gestisce in *Tipi di gara* fra i dati di base, si
  trascina per riordinarlo, e un formato che non si usa più si disattiva senza
  cancellarlo — le gare dell'anno scorso non devono perdere il loro nome. È
  una tabella a parte dalle tipologie di attività e non un doppione: la
  tipologia dice **come il gestionale tratta** quella giornata (chi schiera,
  che certificato serve, dove finisce la quota), il tipo di gara dice **che
  gara è**, che riguarda chi gioca. I formati li inventano gli organizzatori,
  quindi aggiungerne uno non deve voler dire fare un rilascio.
- **La durata dichiarata**, in ore: la «24h» del volantino. Si scrive
  sull'attività e compare accanto alle date, dove serve.
- La tendina nasce già piena con **PCR, PLR, MILSIM, SMR**. Si aggiungono solo
  se la tabella è vuota: chi li rinomina o ne toglie uno non se li ritrova
  ricomparire al riavvio.

### Deciso

- **La durata dichiarata non si confronta con inizio e fine, ed è voluto.**
  Una 24 ore si gioca dentro un fine settimana che parte il venerdì e finisce
  la domenica, perché quello spazio va tenuto occupato tutto: si viaggia, si
  monta, si dorme, si smonta. La gara dura quello che dice il volantino,
  l'attività dura quello che occupa — sono due fatti diversi e nessuno dei due
  è sbagliato. Un controllo che pretendesse di farli coincidere costringerebbe
  a scrivere una data falsa per far tacere un avviso, ed è il modo più rapido
  per rendere inaffidabile il calendario. Sotto il campo c'è scritto, così chi
  compila non si mette a dubitare di aver sbagliato.

## 2.0.0 — 9 settembre 2026

**Il magazzino si stacca dalla vetrina.** Erano la stessa cosa, e non lo sono:
per questo cambia il numero grosso.

### Cambiato

- **Il magazzino è un elenco di oggetti che il team ha in casa**, e basta.
  Prima era una spunta sulla riga del merchandising — *questa la tengo* — e da
  quella spunta veniva tutto quello che non tornava: si aggiungeva un
  generatore alle scorte e ci si ritrovava in vetrina un generatore, e
  toglierlo dalla vendita faceva scrivere «non si vende» su una cosa che si
  teneva eccome. Adesso l’articolo di magazzino esiste per conto suo: ha un
  nome, una categoria, una giacenza, e non sa niente di prezzi.
- **Il merchandising è la vetrina**, e ci si mette quello che si decide di
  mettere. Aggiungere merce al magazzino non la pubblica più: sono due
  decisioni, e adesso sono due gesti. Tutt’e quattro i casi veri si possono
  scrivere — lo tengo e non lo vendo (il generatore), lo vendo e non lo tengo
  (le magliette, che si ordinano al fornitore a ogni giro), lo tengo e lo vendo
  (le patch), lo metto in vetrina prima di averlo.
- **Nel modulo di una voce c’è «da dove esce»** al posto della vecchia spunta:
  o si ordina al fornitore a ogni giro, o si pesca da uno scaffale del
  magazzino. Collegata a uno scaffale, la voce ha una giacenza che scende;
  scollegata, non finisce mai. E se la stessa merce sta in vendita in due punti
  del catalogo, la scatola da cui esce resta una sola.
- **«Inventario» si chiama Magazzino**, che è la parola giusta: l’inventario è
  il gesto di contare, il magazzino è il posto dove sta la roba.
- Nel magazzino ogni articolo dice **se è in vetrina e dove**, e da lì lo si può
  staccare senza toglierlo dalla vendita: resta in catalogo, si ordina al
  fornitore.

### Come passa la roba che c’è già

Niente si perde. Ogni voce che era segnata a magazzino diventa un articolo con
il suo nome, e **resta collegata** alla riga di vetrina da cui veniva: carichi,
riordini e giacenze la seguono. Quello che in vetrina non doveva starci — il
generatore, le bandiere — lo si stacca dalla pagina del magazzino, e
l’annuncio in bozza che gli era nato intorno si cancella dal merchandising.

### Tolto

- **«Prendi dall’inventario»**, arrivato con la 1.32.0, non c’è più. Spostava
  una voce da un articolo all’altro perché magazzino e catalogo erano la stessa
  tabella: con due tabelle separate non c’è più niente da spostare, si collega e
  basta — ed è il campo «da dove esce» del modulo.

## 1.33.0 — 8 settembre 2026

### Aggiunto

- **Operatori ha una seconda faccia, per chi le persone le controlla invece di
  gestirle.** Amministrazione, segreteria e team leader ci trovano un elenco
  con una domanda sola: chi è a posto e chi no. Iscrizione della stagione in
  corso, certificato medico — agonistico o no, con la scadenza e l’avviso un
  mese prima — e tessera federale a fianco. Si cerca per nome, si filtra per
  «da sistemare», e da ogni riga si apre la scheda. Niente ruoli da assegnare,
  niente password da azzerare, niente euro: quella è la pagina dell’admin, e
  resta sua.
- **Le polizze giornaliere hanno una pagina loro.** Le attività in programma,
  una card ciascuna, e dentro solo chi viene da fuori: se ha pagato, se è
  coperto, e il pulsante per assicurarlo. Prima bisognava aprire il calendario,
  entrare in ogni attività e ricostruire a mente chi fosse ospite, chi già
  tesserato e chi in regola con la quota. Le attività di soli soci non
  compaiono: non c’è niente da fare.
- **Sul menu il pallino dice quante polizze aspettano**, e conta esattamente
  quello che la pagina elenca — pagati, scoperti, con data e luogo di nascita
  a posto.

### Cambiato

- **La polizza si attiva a quota saldata, dappertutto.** Una polizza consumata
  la paga il club e non torna indietro: farla prima dell’incasso vuol dire
  spendere per chi magari non viene. Vale anche dalla scheda dell’attività —
  una regola scavalcabile dalla pagina accanto non è una regola. Chi non deve
  niente (attività gratuita, giocata offerta) passa senza che nessuno chieda
  nulla: non avere debiti non è come non averli saldati.
- **Il debriefing lo vede chi gioca e chi porta in campo**: atleti, team
  leader, admin. Un incarico da scrivania — amministrazione, segreteria,
  moderazione — non lo apre più, perché non gli serve a niente e una voce che
  non si usa mai allunga l’elenco a tutti. Chi amministra **e** gioca continua
  a vederlo: basta avere uno dei ruoli giusti.

### Corretto

- **«Operatori» rimbalzava sulla home.** La voce c’era per amministrazione,
  segreteria e team leader, ma la pagina la apriva solo l’admin: chi ci
  cliccava si ritrovava sulla home senza sapere perché, che è il modo peggiore
  di dire di no — sembra un guasto. Adesso l’indirizzo è uno e la pagina è
  quella giusta per chi la apre.

## 1.32.0 — 8 settembre 2026

### Aggiunto

- **Dal merchandising si prende la merce che c’è già in inventario.** Accanto
  ad «Aggiungi voce» c’è *Prendi dall’inventario*: un elenco con la ricerca,
  dove si legge da che articolo arriva ogni cosa e quanti pezzi ce ne sono in
  casa. Un clic e la merce è qui, con la sua giacenza, i suoi carichi e i suoi
  riordini attaccati. Serviva perché la roba nasce quasi sempre dall’altra
  parte — prima si compra e si conta, poi si decide di venderla — e finisce in
  un articolo creato lì per lì, in bozza: senza questa strada, chi mette in
  piedi l’articolo vero la ribatte a mano, e da quel momento la stessa patch
  è due righe, una in vetrina con giacenza zero e una che conta pezzi che
  nessuno vede.
- **Si sposta, non si copia**: in magazzino una cosa sta in un posto solo, o le
  giacenze diventano due elenchi da tenere allineati a mano. La merce sparisce
  dall’articolo dov’era e la chiocciola con cui la si nomina si rifà, perché
  dev’essere libera dove arriva. L’inventario del team resta roba del team: nel
  mercatino dell’usato non ci si porta niente.

## 1.31.2 — 8 settembre 2026

### Cambiato

- **Sul telefono le barre si tolgono di mezzo mentre si scende** e tornano
  appena si risale: si sta leggendo, e due strisce fisse su uno schermo alto
  quattordici centimetri sono due centimetri in meno di testo. In cima restano
  sempre, e con il menu aperto non si muovono — lì si sta scegliendo, non
  leggendo.
- **Una bozza non si condivide.** Chi riceve il link non vedrebbe niente:
  mandare un indirizzo che si apre solo per chi gestisce il calendario è un
  modo per farsi richiamare. Da rilasciata in poi sì, anche a cose fatte — di
  una giocata finita si manda volentieri il racconto.

## 1.31.1 — 8 settembre 2026

### Aggiunto

- **I debriefing sanno di essere stati letti**: pallino sulla voce di menu con
  quanti ne restano, e il pallino accanto al titolo di quelli nuovi. La
  lettura è di chi legge, non della squadra — se lo apre un altro, a te resta
  segnalato.
- **Si commenta dove si legge.** Like e commenti stanno dentro la pagina dei
  debriefing, sotto il racconto: mandare altrove chi vuole dire la sua vuol
  dire che non la dice. Restano quelli dell’attività — la giornata è quella —
  quindi quello che si scrive qui si vede anche lì, e viceversa.
- **Il debriefing si corregge anche da lì**, da chi l’ha scritto e da chi
  porta la squadra in campo: uno rilegge il proprio racconto nella pagina che
  li raccoglie, ed è lì che gli viene voglia di sistemare la frase storta. Se
  domani non fa più il team leader, quel racconto resta comunque suo.

### Corretto

- **Il pulsante per copiare il link non si trovava**: compariva solo sulle
  attività rilasciate. Adesso c’è sempre, in fondo alla card dei dati, e la
  riga accanto dice cosa vedrà chi apre il link — su una bozza, che la vede
  solo chi gestisce il calendario.

## 1.31.0 — 8 settembre 2026

### Aggiunto

- **Il debriefing di un’attività.** Una gara finisce e resta nella testa di chi
  c’era — cosa ha funzionato, chi stava dove, l’errore che non si ripete:
  scritto, diventa la memoria della squadra. Lo scrivono team leader e admin
  dalla scheda dell’attività, in **markdown** con lo stesso editore di statuto
  e regolamenti, e nasce **in bozza**: si scrive a pezzi, la sera, e a metà non
  si legge.
- **Una pagina che li raccoglie tutti**, in ordine di giornata: chi c’era
  rilegge, chi non c’era capisce, e chi arriva l’anno dopo trova scritto
  perché si fa in un certo modo. Si vedono solo quelli pubblicati, e solo
  delle attività che si potrebbero comunque vedere.
- **I «mi piace» e i commenti sono quelli dell’attività**, non una seconda
  discussione: si parla della stessa giornata, e due conversazioni separate
  sullo stesso pomeriggio non aiutano nessuno. Dalla pagina dei debriefing si
  apre l’attività e si commenta lì.

## 1.30.0 — 8 settembre 2026

### Aggiunto

- **Tre cose si accettano prima di entrare**, in una pagina che compare una
  volta sola: **l’informativa privacy** e **statuto e regolamenti** — senza la
  prima non si possono trattare i dati di nessuno, senza le seconde non si
  prende parte a un club che di regole è fatto — e la **scelta sulle foto**,
  che ha due risposte buone. Si entra dicendo sì e si entra dicendo no: quello
  che non si può fare è non chiederlo.
- **Il no alle foto si vede a chi pubblica.** In Operatori c’è l’elenco di chi
  ha risposto di no, perché va saputo prima di caricare l’album della domenica,
  non dopo. La scelta si cambia quando si vuole dal proprio profilo.
- **Se uno dei testi cambia si ripassa di lì**, e solo da quello che è
  cambiato: aver accettato altro non è aver accettato questo. Di ogni consenso
  restano data e versione — un consenso senza data non è un consenso, è
  un’opinione.

A chi si è appena affacciato si chiede solo la privacy: statuto e regolamenti
riguardano chi al club prende parte.

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
