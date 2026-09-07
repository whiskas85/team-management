# Da fare

Le cose in sospeso, in ordine di quanto pesano. Non sono difetti: sono passi
che aspettano una decisione o qualcosa che ancora non c'è.

## Dominio e certificato valido

**Perché:** oggi il gestionale gira su `https://10.147.19.76` con un certificato
firmato da noi. Nessuna autorità al mondo può certificare un indirizzo privato,
quindi ogni dispositivo mostra l'avviso *"la connessione non è privata"* — e i
browser, non considerando sicura quella pagina, **non offrono di installare
l'applicazione**: niente icona sulla schermata iniziale, niente avvio a schermo
intero. Il PWA è pronto e funzionante, gli manca solo un indirizzo credibile.

**Cosa serve:** un dominio qualsiasi già posseduto. Poi:

1. si crea un record `A` — per esempio `gestionale.tuodominio.it` — che punta a
   `10.147.19.76`, l'indirizzo ZeroTier. Un indirizzo privato in un DNS pubblico
   non espone niente: chi non è nella rete non ci arriva;
2. si ottiene un certificato Let's Encrypt con la **validazione DNS**, che non
   richiede che il gestionale sia raggiungibile da internet;
3. si sostituisce il certificato in `certificati/` e si riavvia il proxy.

**Serve anche agli assistenti (MCP).** Un assistente che si collega da un altro
computer parla HTTPS e, a differenza di un browser, non ha un pulsante
"procedi lo stesso": un certificato firmato da noi lo rifiuta e basta. Dal PC
dove gira il gestionale si aggira usando `http://localhost:3000`, ma per gli
altri della squadra la strada è il certificato valido.

Da quel momento: nessun avviso sui dispositivi, applicazione installabile su
Android, iPhone e computer, e un indirizzo che si detta a voce senza numeri.

**Alternativa nell'attesa:** creare una piccola autorità di certificazione
nostra e installarla su ogni dispositivo. Funziona, ma è un giro da fare su
ogni telefono e va rifatto a ogni dispositivo nuovo.

## Numero dedicato per WhatsApp

**Perché:** il gestionale sa già scrivere nel gruppo — auguri, promemoria,
solleciti — ma il ponte non è collegato a nessun numero. Il canale non è quello
ufficiale di Meta, che nei gruppi non scrive: si collega come farebbe un
telefono, il che è fuori dai termini di servizio di WhatsApp. Se qualcosa va
storto si perde **quel** numero, e non deve essere quello personale di chi
gestisce la squadra.

**Cosa serve:** una SIM dedicata (anche una ricaricabile da pochi euro) con
WhatsApp attivo. Poi: `Comando → Messaggi WhatsApp`, si inquadra il codice da
*Impostazioni → Dispositivi collegati*, si preme **Rivendica il collegamento**,
si sceglie il gruppo e si scrivono i modelli. Il codice si inquadra una volta
sola: la sessione resta nel volume anche dopo un riavvio.

Finché il numero non c'è, i messaggi si possono comunque preparare e leggere:
solo l'invio non parte.

## Mercatino

Una bacheca interna dove chi ha roba da vendere la mette e chi la cerca la
trova, con i commenti sotto e la possibilità di scrivere al venditore in
privato. Sotto c'è il piano: cosa si costruisce, in che ordine, e le scelte
già prese con le loro ragioni.

### Chi vede e chi pubblica

**Vedono tutti**, contatti compresi: un mercatino che metà squadra non può
aprire non è un mercatino. **Pubblicare invece è dietro consenso** per chi non
è ancora in squadra — un interruttore nei dati di base, spento di partenza.
Non è diffidenza verso i nuovi: è che un annuncio ha un prezzo e un contatto
privato dietro, e chi lo mette dovrebbe essere qualcuno che la squadra ha già
visto in faccia. L'interruttore sta nelle impostazioni e non nel codice proprio
perché la risposta può cambiare senza rifare un rilascio.

### Un annuncio è un lotto di voci

Un annuncio non vende *una* cosa: ne vende un elenco. *«Vendo tutto: torcia 50,
tattico 100, mesh 150»* è un annuncio solo, con una foto sola, e tre voci. Ogni
voce ha **titolo, prezzo e descrizione** sue.

Da questo discendono tre cose, e conviene prenderle tutte insieme:

- **Il prezzo sta sulla voce, non sull'annuncio, ed è sempre obbligatorio.**
  Niente *offerta libera*: chi vende dice quanto vuole. In bacheca la card mostra
  un intervallo — *da 50 a 200 €* — oppure la cifra secca se la voce è una.
- **Ogni voce si vende per conto suo.** Si prenota la torcia e si vende il
  tattico mentre la mesh è ancora lì: lo stato sta sulla voce. L'annuncio è
  **chiuso quando non resta più niente**, e non c'è un secondo stato da tenere
  allineato a mano.
- **Anche un oggetto solo è un lotto di uno.** Nessun caso speciale da scrivere,
  nessun ramo del codice che vale solo per gli annunci semplici.

### Due nature di merce

Nel mercatino convivono due cose che si comportano in modo opposto, e tenerle
sotto la stessa parola sarebbe l'errore da cui discendono tutti gli altri.

**Il pezzo unico** — *vendo il mio tattico*. Ce n'è uno. Quando è venduto è
finita: sparisce dal giro, e chi arriva dopo deve vedere che è andato, non
chiedere se c'è ancora.

**La merce riordinabile** — le magliette del merchandising, quelle di squadra,
le mimetiche. Non finiscono: se ne ordina un'altra. Una voce così **non ha lo
stato di vendita**, perché non c'è niente da esaurire; ha semmai un
interruttore *a catalogo / fuori catalogo* per quando un modello non si fa più.

Le conseguenze:

- **Lo stato appartiene solo al pezzo unico.** Su una maglietta, *venduta* non
  vuol dire niente. Metterci lo stato lo stesso, e poi ricordarsi ogni volta di
  ignorarlo, è il modo sicuro per sbagliare da qualche parte.
- **Un annuncio di merce riordinabile non si chiude da solo.** Quello dell'usato
  sì, quando non resta più niente; il catalogo delle magliette resta lì finché
  qualcuno non lo ritira a mano.
- **Le taglie sono voci, non un concetto nuovo.** *Maglietta S, M, L, XL* sono
  quattro voci riordinabili dello stesso annuncio — la stessa forma con cui si
  vende *radio S, radio M, radio L*. Un secondo livello di varianti sarebbe una
  complicazione che non serve a nessuno.
- **Il catalogo lo apre solo l'admin.** Vendere la propria roba è di tutti; dire
  *"la squadra vende questa maglietta a 25"* no. E non è una questione di
  gerarchia: è che quel bollino decide dove finiscono i soldi, quindi non può
  metterselo chi vuole.
- **In bacheca sono due scaffali distinti.** *Usato della squadra* e
  *Merchandising* si sfogliano con la testa diversa: uno si guarda per curiosità
  quando passa, l'altro quando serve una maglia.

### La vita di un annuncio

L'annuncio nasce in **bozza** — si carica con calma, si mettono le foto e le
voci, non lo vede nessuno. Poi il proprietario lo **pubblica**, e da lì può
essere **ritirato** se cambia idea. Le singole voci intanto vanno da
*disponibile* a **prenotata** a **venduta**. Una prenotazione porta con sé **chi
l'ha fatta e da quando**: *prenotata* e basta, dopo due giorni, non dice più
niente a nessuno — e si deve poter liberare senza cancellare la voce.

Solo il proprietario tocca il suo annuncio; l'admin può ritirarne uno, perché
una bacheca senza nessuno che possa togliere una cosa fuori posto prima o poi
ne ospita una. Un annuncio chiuso **non sparisce**: resta leggibile con lo stato
addosso, così chi ci torna capisce che è andata e non che è stato cancellato per
dispetto.

### Cosa si vede

- **La bacheca**: card con foto di copertina, prezzo (o intervallo), titolo, chi
  lo vende, e sotto i due pulsanti — *mi piace* e *commenta* — come già sulle
  attività. Le card degli annunci chiusi restano, spente e con la fascetta.
- **La copertina la sceglie chi vende.** Fra le foto caricate se ne indica una,
  ed è quella che la bacheca mostra: è la sola cosa che un altro vede prima di
  decidere se aprire, e lasciarla al caso dell'ordine di caricamento sarebbe una
  scelta presa da nessuno. Nel database è **un riferimento alla foto sul singolo
  annuncio**, non una casella su ogni foto: così la copertina è una per
  costruzione, e non può succedere che due foto la rivendichino insieme.
- **La scheda dell'annuncio**: tutte le foto, l'elenco delle voci con prezzo e
  descrizione, i commenti, e il pulsante per **scrivere al venditore**.
- **Ricerca e filtri fin da subito**: testo, scaffale, solo disponibili. Con
  cinquanta annunci servono, e aggiungerli dopo vuol dire rifare la pagina —
  mentre nascere con la barra sopra non costa niente.
- **Chi vende si chiama come si chiama ovunque.** Il mercatino lo vedono anche i
  contatti: i nomi passano dalla regola che c'è già, altrimenti si sarebbe
  aperta una pagina dove un nuovo legge nome e cognome di tutta la squadra —
  esattamente ciò che nel resto dell'app si è evitato.

### Le foto senza farsi male

Le foto profilo il browser le rimpicciolisce a 512 pixel **prima** di mandarle.
Qui serve la stessa cosa, per la stessa ragione moltiplicata: un annuncio ha più
foto, e una bacheca ne mostra venti insieme.

- **Ridimensionamento nel browser** prima del caricamento (lato lungo intorno ai
  1600) e **una miniatura** per le card. Senza la miniatura, sfogliare la
  bacheca dal telefono dentro ZeroTier scarica venti foto intere: la pagina
  sembra rotta, e non lo è.
- **Un tetto al numero di foto** per annuncio, otto o giù di lì. Non è avarizia:
  il volume degli allegati è lo stesso dei certificati, e cresce e basta.
- **Quando un annuncio sparisce, spariscono i suoi file.** Il gestionale lo fa
  già per i certificati; qui va fatto lo stesso, **compreso il caso in cui a
  essere cancellata è la persona** e con lei i suoi annunci. Altrimenti restano
  file orfani che nessuno saprà mai ricollegare a niente.
- Card senza foto: un riquadro con il nome, non uno spazio vuoto.

### Parlare di una voce precisa

Sotto un annuncio con cinque voci, *«quanto per quella grande?»* non vuol dire
niente. Quindi commenti e messaggi sanno nominare la singola voce con la
**chiocciola**, esattamente come già succede nelle note: `@radio-m`. Si scrive a
mano, oppure si preme il pulsante accanto alla voce, che la infila nel commento
già scritta bene.

Il pezzo che serve c'è già: l'elenco a comparsa che si apre digitando `@` e il
riconoscimento delle chiocciole al salvataggio sono gli stessi delle note —
cambia solo da dove viene l'elenco (le voci di *questo* annuncio invece delle
persone). Riusarlo significa che si comporta allo stesso modo nei due posti, che
è il motivo per cui vale la pena riusarlo.

### I messaggi privati

Sono **messaggi fra iscritti**, non solo del mercatino: il mercatino è il primo
posto da cui si aprono, ma la stessa conversazione serve poi per accordarsi su
un passaggio in macchina o su un pezzo di equipaggiamento. Un messaggio che
nasce da un annuncio se lo porta dietro, così chi lo riceve sa di cosa si parla
senza chiederlo.

**La notifica oggi è dentro l'app**: pallino sulla voce di menu, elenco dei non
letti, e il messaggio si apre già con l'oggetto in cima. Il push del browser
arriva quando c'è il dominio con un certificato valido — è lo stesso blocco
della PWA, e non cambia niente di quello che si costruisce adesso.

**Una conversazione la leggono solo i due.** Nessuna pagina la mostra a nessun
altro, nemmeno all'admin: per leggerla bisognerebbe aprire il database a mano.
Non è un dettaglio tecnico ma il patto — la gente scrive diverso se sospetta che
qualcuno legga, e quella casella verrà usata anche per cose che col mercatino
non c'entrano.

**Si avvisa anche per i commenti**, non solo per i messaggi: se qualcuno scrive
sotto il tuo annuncio devi saperlo, o i commenti restano senza risposta e la
bacheca sembra morta dopo due settimane.

L'eccezione la apre **chi la subisce, non chi comanda**: un pulsante *segnala*
consegna la conversazione all'admin, e **solo da quel momento** diventa
leggibile. Così la moderazione c'è dove serve davvero — qualcuno preso di mira
in privato — senza una porta di servizio sempre aperta. Nell'informativa privacy
si scrive una frase corta e vera: *nessuno legge i tuoi messaggi, a meno che tu
non li segnali*. Va aggiunta lì contestualmente, non dopo.

**Si segnala anche un annuncio**, non solo una conversazione: se qualcuno
pubblica roba fuori posto serve il pulsante, ed è la stessa idea — chi vede il
problema lo passa a chi può risolverlo.

### GDPR: due cose che il mercatino tocca

L'informativa e l'esportazione dei dati sono già in ordine, e vanno tenute tali.

- **L'esportazione elenca i modelli a mano** (certificati, iscrizioni, tessere,
  pagamenti, adesioni). Annunci, ordini e **messaggi privati** sono dati
  personali: vanno aggiunti lì dentro nello stesso momento in cui si scrivono,
  o l'esportazione diventa silenziosamente incompleta.
- **Quando una persona chiede la cancellazione**, i suoi messaggi non possono
  sparire e basta: la conversazione dell'altro diventerebbe un monologo
  incomprensibile. Vanno **resi anonimi** — *utente cancellato* — tenendo il
  testo dell'altro intatto. È il compromesso onesto fra il diritto di chi se ne
  va e quello di chi resta.

### Come è fatto sotto

```
Annuncio       titolo, descrizione, stato, venditoreId, copertinaId -> FotoAnnuncio,
               aNomeDelTeam (il merchandising non è di una persona)
VoceAnnuncio   annuncioId, titolo, maniglia, prezzo, descrizione, ordine,
               natura (PEZZO_UNICO | RIORDINABILE), trattabile,
               stato + prenotataDa + prenotataIl (solo per i pezzi unici)
FotoAnnuncio   annuncioId, file, miniatura, ordine
Segnalazione   cosa (annuncio o conversazione), chi segnala, motivo, gestita
CommentoAnnuncio / MiPiaceAnnuncio    come per le attività
CitazioneVoce  quale voce nomina un commento (ricavata dal testo, come nelle note)
OrdineVoce     voceId, chi, quantita, prezzoAllOrdine, giroId, stato, paymentId
GiroOrdine      il lotto di riordino: aperto, chiuso il, note al fornitore
Conversazione  fra due persone, con un annuncio facoltativo
Messaggio      conversazioneId, autoreId, testo, lettoIl
Impostazioni   una riga sola: i nuovi possono pubblicare, sì o no
```

La maniglia di una voce (`radio-m`) è unica **dentro il suo annuncio** e non in
tutto il mercatino: due persone che vendono una radio M devono poterla chiamare
tutte e due così.

Le foto seguono la strada già battuta dalle foto profilo: nel volume degli
allegati, servite da una rotta che chiede l'accesso, mai in `public/`.

Commenti e "mi piace" sono **tabelle a parte**, non un commento generico che
punta a "qualcosa": una colonna che a volte è l'id di un'attività e a volte
quello di un annuncio è un vincolo che il database non può più controllare, e
il primo dato orfano si scopre sempre troppo tardi.

### In che ordine

1. ~~**Annunci, voci e bacheca**~~ — fatto (1.15.0).
2. ~~**Commenti, mi piace e chiocciole sulle voci**~~ — fatto (1.23.0), insieme
   all'interruttore che accende e spegne una voce.
3. **Messaggi privati e notifiche in app** — il pezzo grosso e il più delicato:
   è l'unico posto del gestionale dove due persone si parlano senza che nessun
   altro legga.
4. **Merchandising**: catalogo a nome del team (solo admin), ordini, la quota
   che ne nasce e finisce in cassa, i giri di raccolta e il riepilogo di quanti
   pezzi ordinare.
5. **Interruttore per i nuovi** e regolamento del mercatino nella sezione
   Regolamenti.
6. **Push del browser**, quando c'è il dominio.

Fuori strada per ora, scritto qui per non ridiscuterlo ogni volta: recensioni
del venditore, spedizioni, carrello che mette insieme annunci diversi, pagamenti
online. Sono tutte cose da negozio vero, e questa è la bacheca di una squadra di
venti persone che si vedono la domenica.

Due innesti che costano poco e si faranno quando il resto è in piedi:
**annunciare un annuncio nuovo nel gruppo WhatsApp** (basta uno scatenante in
più nel motore dei messaggi che c'è già) e **uno strumento MCP** per leggere la
bacheca, come per il resto del gestionale.

### I soldi: dove finiscono, e chi decide

**È il bollino di merchandising ufficiale a decidere, e nient'altro.**

- **Merchandising ufficiale del team** — lo crea solo l'admin. Ordinarne uno
  **genera una quota a carico di chi ordina**, che compare fra i suoi pagamenti
  e in cassa insieme a iscrizioni, giornaliere e quote delle attività. Da lì in
  poi non c'è niente di nuovo da imparare: la segreteria conferma l'incasso con
  lo stesso pulsante di sempre, e il saldo torna da solo.
- **Vendita privata fra due persone** — il gestionale **non tocca i soldi**. Si
  scrivono, si accordano, si vedono al campo. Un passaggio di denaro fra due
  soci non è cassa della squadra, e farlo passare di lì sporcherebbe il saldo
  con roba che al team non appartiene.

Ne discende qualche dettaglio pratico:

- Serve una voce nuova fra i tipi di pagamento (`MERCHANDISING`), accanto a
  iscrizione, tessera e attività: senza, quegli incassi finirebbero in *Altro*,
  e in cassa non si capirebbe più cos'è cosa.
- L'importo è **prezzo per quantità**, e la descrizione dice cosa: *Maglietta
  squadra M × 2*.
- **Pagato e consegnato sono due cose diverse.** Uno paga oggi e ritira fra tre
  settimane, quando arriva la fornitura: l'ordine ha il suo stato di consegna,
  separato dallo stato del pagamento.
- Un ordine si può ritirare **finché non è stato incassato**; dopo no, ed è la
  stessa regola che vale già per gli altri pagamenti.
- **Il riepilogo per voce è il pezzo che serve davvero all'admin**: *magliette M
  da ordinare: 7*. È il motivo per cui uno usa il gestionale invece di contare i
  messaggi in chat.

**E qui c'è la cosa che il piano non aveva e che lo faceva zoppicare: sette da
quando?** Un riepilogo che somma tutti gli ordini mai fatti serve una volta
sola. Al secondo giro mescola le magliette già ordinate al fornitore con quelle
nuove, e diventa un numero di cui non ci si può fidare — cioè peggio di niente.

Serve quindi il **giro di raccolta**. Un ordine sta in *raccolta*, poi l'admin
chiude il giro e diventa *ordinato al fornitore*, poi *arrivato*, poi
*consegnato*. **Il riepilogo conta solo la raccolta aperta**, e chi ordina dopo
la chiusura entra nel giro successivo senza che nessuno debba ricordarsi niente.

Due conseguenze che vengono dalla stessa parte:

- **Il prezzo si congela quando si ordina.** Se la maglietta passa da 25 a 28
  dopo che dieci hanno ordinato, i loro pagamenti sono già emessi a 25: l'ordine
  tiene il prezzo di quel momento, come fa già la quota di un'attività. Senza,
  la cassa non torna e non si capisce perché.
- **Un annuncio con ordini già incassati non si cancella.** È la stessa regola
  che vale già per i pagamenti — incassato vuol dire non più modificabile — e va
  messa nel database, non in un controllo dell'interfaccia che si può aggirare.
- **Chi ha già ordinato lo vede scritto** sulla voce (*ne hai già ordinate 2*):
  senza, il secondo ordine per sbaglio è questione di giorni.

### Deciso, per memoria

- Prezzo sempre obbligatorio, niente offerta libera.
- Il merchandising ufficiale lo crea solo l'admin e genera una quota in cassa;
  la vendita privata non passa dai soldi del gestionale.
- Le conversazioni le leggono solo i due, salvo segnalazione.
- Il riepilogo del merchandising conta per giri di raccolta, non in assoluto.
- Il prezzo si congela al momento dell'ordine.

## Codice su GitHub

Il repository <https://github.com/whiskas85/team-management> è fermo al primo
commit. Tutto il lavoro successivo — quote doppie, polizze, ruoli, statuto,
HTTPS, PWA — è solo sui container. Restano fuori dal repository, come devono:
`.env`, il certificato e la sua chiave privata.

## Regola del firewall

Se dai dispositivi della squadra il gestionale non si apre, mancano i permessi
in ingresso sulle porte 80 e 443. Da PowerShell come amministratore:

```powershell
New-NetFirewallRule -DisplayName "Zero Dark - HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443,80 -Action Allow
```

## Distribuzione alle persone

Per i 18 già in anagrafica: scheda della persona → *Genera una nuova password* →
si copia il messaggio pronto e glielo si manda. Una password diversa per
ciascuno, mai una condivisa. Al primo accesso il gestionale la fa cambiare.
Chi arriva nuovo si registra da solo dalla pagina di accesso.

## Password del database

`POSTGRES_PASSWORD` è ancora quella d'esempio. Non è urgente: la porta del
database non è pubblicata da nessuna parte e ci si arriva solo da dentro la rete
di Docker. Cambiarla significa rifare l'utente del database, quindi vale la pena
farlo solo insieme a un altro intervento sui dati.
