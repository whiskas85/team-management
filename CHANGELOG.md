# Registro delle modifiche

Le versioni seguono `MAJOR.MINOR.PATCH`, come spiegato nel README: **major**
quando cambia il modo di lavorare, **minor** per funzioni nuove, **patch** per
correzioni. Il numero vive in `package.json` ed è quello che si legge nel badge
accanto a ZERO DARK.

## 2.77.2 — 21 settembre 2026

### Cambiato

- **Le bacheche hanno un gruppo loro nel menu: Annunci.** Stavano fra le cose
  operative, ma quelle si fanno e gli annunci si leggono. Ogni bacheca e' una
  riga con il suo pallino dei messaggi da leggere, e in fondo **Tutte le
  bacheche** porta all'elenco, da dove se ne creano di nuove.

## 2.77.1 — 21 settembre 2026

### Corretto

- **Caselle e scelte nel verde della squadra, ovunque.** Nei moduli nuovi —
  la bacheca, i sondaggi — uscivano col blu del browser: il verde si metteva a
  mano casella per casella, e quelle che lo dimenticavano restavano fuori
  tema. Adesso e' una regola sola per tutto il gestionale.

## 2.77.0 — 21 settembre 2026

### Aggiunto

- **La bacheca.** Nasce da quello che su WhatsApp si perde: l'avviso
  importante scivola sotto cinquanta battute, e chi entra nel gruppo dopo non
  lo vede mai. Qui una comunicazione ha un posto, una data, e **si sa chi l'ha
  letta**. Ha una voce sua nel menu, con il pallino dei messaggi da leggere.
  - **Piu' bacheche**, ognuna con il suo pubblico: la squadra, i nuovi, tutti e
    due, oppure **persone scelte a mano** — il direttivo, chi fa il marketing.
    Chi non la vede non sa nemmeno che esiste.
  - **Chi scrive lo decidi tu**, bacheca per bacheca; gli altri leggono,
    mettono le reazioni e rispondono. C'e' un **moderatore** — di partenza chi
    l'ha creata — che toglie messaggi e risposte di chiunque quando serve
    rimettere ordine.
  - Il messaggio e' **Markdown**, con in cima un'**immagine** come il banner di
    un messaggio WhatsApp. Nasce **bozza** e parte quando lo rilasci; dopo si
    puo' ancora correggere, e resta scritta la data della modifica accanto a
    quella di pubblicazione.
  - **Reazioni come su WhatsApp** (👍 ❤️ 😂 😮 😢 🙏, una a testa) e
    **risposte** sotto il messaggio. Con la **chiocciola** si richiama una
    persona — le arriva una notifica — o un **documento della bacheca**, che
    diventa un link che lo apre.
  - **Solo notifica push, niente WhatsApp**: chi non ha le notifiche trova il
    messaggio col pallino nel menu.
  - **Le spunte di WhatsApp**, per chi scrive nella bacheca: una grigia
    pubblicato, due grigie **arrivato sul telefono di tutti**, due verdi
    **letto da tutti**. Toccandole si vede persona per persona: letto e
    quando, ricevuto, notifica partita, senza notifiche. «Ricevuto» lo dice il
    telefono stesso quando mostra la notifica; «letto» vuol dire bacheca
    aperta con il messaggio davanti.
  - **Anche dall'assistente**: vede le bacheche, legge i messaggi in Markdown,
    scrive bozze e le rilascia (chiedendo conferma prima).

### Cambiato

- **Il Markdown mostra tutto quello che l'editore sa scrivere**: tabelle,
  immagini, blocchi di codice, barrato e caselle delle cose da fare. Da 2.69
  l'editore aveva i pulsanti, ma il testo si vedeva con i simboli al posto
  della tabella. Vale ovunque: regolamenti, debriefing, note, book.
  Le immagini si caricano solo da indirizzi `https` o dai nostri.

## 2.76.0 — 21 settembre 2026

### Cambiato

- **Il libro atleti si legge, non si amministra.** Le colonne sono quelle che
  servono a sapere se un atleta puo' scendere in campo e come raggiungerlo:
  operatore, contatti, **data di nascita**, **anni**, certificato medico,
  **tessera FIGT** della stagione, la **campanella** degli avvisi (accesa: gli
  arrivano le notifiche; spenta: lo si avvisa su WhatsApp), presenze, ultima
  attivita' e da saldare. Si ordina per anni e per tessera come per le altre.
- Via ruoli, stato, spunte, ruoli in blocco e **cestino**: sono cose da
  gestione, e restano tutte nella vista **Tutti**. Chi e' sospeso o da
  riconfermare ha un segno piccolo sotto il nome, perche' in campo scende
  solo quando torna a posto; i disabilitati escono dal libro e si ritrovano in
  «Tutti».
- Le presenze sono un numero solo: «2/4» andava spiegato ogni volta.

## 2.75.0 — 21 settembre 2026

### Aggiunto

- **Dalla tessera nasce la persona.** Dal portale federale torna a volte un
  nome che nel gestionale non c'e' ancora: prima bisognava crearlo negli
  operatori, tornare alle tessere e cercarlo nella colonna per abbinarlo —
  tre passaggi, e in mezzo la tessera che si attacca all'omonimo. Adesso si
  prende in mano la tessera e si preme **«Crea la persona da questa
  tessera»**: il modulo arriva gia' compilato con quello che il portale sa
  (nome, cognome, email, comune), la persona entra **in squadra** e nel libro
  atleti, e **la tessera le resta attaccata** nello stesso gesto. Telefono,
  data di nascita e password la tessera non li ha: quelli si mettono a mano.
  - Il portale scrive «COGNOME NOME» tutto maiuscolo: il gestionale lo divide
    riconoscendo le particelle — «DE LUCA MARIO» e' De Luca / Mario, «ROSSI
    MARIA LUISA» resta Maria Luisa — e lo riscrive a modo. E' un suggerimento
    nei due campi che si hanno davanti, e si corregge prima di salvare.

### Cambiato

- **«Operatori senza tessera» propone solo chi e' in squadra.** Un contatto
  che viene alle aperte gioca con la giornaliera e tesserato non sara' mai:
  averlo nella colonna voleva dire poter attaccare una tessera vera a chi non
  e' ancora del club, su un elenco lungo il doppio.

## 2.74.0 — 21 settembre 2026

### Aggiunto

- **Il libro atleti: chi scende in campo.** In squadra non ci sono solo
  giocatori — c'e' chi tiene i conti, le tessere, la segreteria — e contarli
  insieme agli altri faceva due danni silenziosi. **Adesso «in squadra» e «nel
  libro atleti» sono due cose diverse**, e chi non e' nel libro resta del club
  a tutti gli effetti: si iscrive, paga, viene alle cene. Si dice solo che in
  campo non ci va.
  - **Operatori si apre sul libro**, con accanto quanti **atleti in forza**
    ci sono: e' il numero che si cerca preparando una giocata. Gli altri
    stanno nella vista **Tutti**, che si gestisce come prima — e li' gli si
    da' il ruolo atleta il giorno che comincia a giocare.
  - **Le statistiche contano gli atleti.** L'affluenza media divisa per una
    rosa piu' grande di quella vera faceva sembrare che venisse meno gente di
    quanta ne venisse.
  - **Chi non e' nel libro non si schiera**: non compare fra i partecipanti da
    aggiungere, non puo' segnarsi da solo, e non finisce fra i «silenziosi»
    che non hanno risposto — non gli era stato chiesto niente. I nuovi restano
    dove sono: non sono del club, sono in prova, e il libro parla di chi il
    club ce l'ha gia'.
  - Il libro e' il ruolo **Atleta**, quello che gia' oggi decide a chi si
    chiede il certificato medico: niente da compilare, e' gia' a posto.

### Corretto

- **Il cerchio dei certificati poteva passare il cento per cento.** Contava i
  certificati validi e li divideva per le persone: chi ne ha due — il vecchio
  ancora valido e quello nuovo — ne portava due, e nel conto entravano anche
  quelli di chi in squadra non c'e' piu'. Adesso conta **quante persone** ne
  hanno almeno uno che vale, che e' la domanda a cui quel cerchio serve a
  rispondere.

## 2.73.0 — 21 settembre 2026

### Aggiunto

- **Si risponde dai pulsanti della notifica.** Alla domanda «chi viene?» la
  notifica arriva con sotto **Ci sono** e **Non ci sono**: si preme uno dei due
  e la risposta e' registrata, col gestionale chiuso. Serve a togliere di mezzo
  i trenta secondi fra la domanda e la risposta — aprire l'applicazione,
  aspettare il caricamento, cercare il pulsante — perche' in quei trenta
  secondi si decide di rispondere dopo, e dopo vuol dire mai.
  - **Solo su «chi viene?».** Su una data la risposta dipende da cosa hanno
    detto gli altri, e quella vuole la pagina: se si rispondesse alla cieca il
    sondaggio non sarebbe servito a niente.
  - **«Forse» non e' un pulsante**: Android ne mostra due, e «forse» e' la
    risposta di chi ci deve pensare — chi ci pensa apre.
  - **Chi vota lo dice la sessione, non il messaggio.** Il push viaggia verso
    un dispositivo: se bastasse il dispositivo a votare, basterebbe avere in
    mano il telefono di un altro.
  - Se qualcosa non va — rete assente, sessione scaduta, sondaggio chiuso nel
    frattempo — **non si finge che sia andata**: si apre la pagina, che sa dire
    cosa e' successo.
  - Su iPhone i pulsanti non ci sono, e la notifica resta quella di prima: si
    tocca e si apre il sondaggio.

### Corretto

- **Il testo per WhatsApp non viaggia piu' dentro la notifica push.** Ogni
  avviso porta due versioni di se' — quella corta per la notifica e quella
  lunga per la chat, col numero della polizza e le date — e finivano tutte e
  due nel messaggio push, che ha **quattromila byte e basta**. Bastava un testo
  lungo per sforare il limite, e allora non partiva niente: chi doveva essere
  avvisato non riceveva nulla proprio perche' gli si voleva dire di piu'.

## 2.72.0 — 21 settembre 2026

### Aggiunto

- **I sondaggi.** Nasce da una cosa che si faceva su WhatsApp e si perdeva:
  «quando giochiamo a ottobre?», «chi viene domenica?». In chat risponde chi
  legge per primo, gli altri si accodano, e il giorno dopo nessuno sa piu' cosa
  era stato deciso. Qui la domanda ha un posto, una scadenza e **un risultato
  che resta**.
  - Si sceglie **cosa si sta chiedendo**, e da li' cambia tutto il resto:
    *trovare una data* (le risposte sono giorni e ore), *sapere chi viene* (le
    risposte sono gia' scritte: ci sono, forse, non ci sono), *scegliere fra
    cose* (le risposte le scrivi tu — la maglia, il posto dove si mangia).
  - **Dal risultato nasce l'attivita'**, in bozza: con dentro la data che ha
    vinto, o con gia' segnato chi ha detto di esserci. Le manca il campo, la
    quota, chi ne risponde — la rilasci tu quando e' completa. Se due risposte
    sono a pari merito non nasce da sola: scegli tu quale vale.
  - **Il risultato si vede sempre**, anche prima di aver votato. Nascondere i
    numeri finche' non ti esponi e' un trucco da sondaggio d'opinione, dove
    conta che la gente non si influenzi; qui conta l'opposto — se tre hanno
    gia' detto sabato, il quarto deve saperlo prima di dire domenica,
    altrimenti una data non si trova mai. Chi ha fatto la domanda vede anche
    **chi** ha risposto cosa: e' lui che deve richiamare quelli che mancano.
  - **Si vede solo quello che ti riguarda**: si decide se la domanda e' per la
    squadra, per i nuovi o per tutti, e a chi non spetta non compare. Finche'
    e' aperto si puo' cambiare idea; passata la scadenza scende nello storico
    da solo, senza che nessuno debba chiuderlo.
  - Nel menu c'e' **il pallino** dei sondaggi aperti a cui non hai ancora
    risposto: una domanda senza un numero addosso la vede chi passa di li', e
    chi non passa non risponde — che e' esattamente il problema che i sondaggi
    dovevano risolvere.
  - Chi e' nei destinatari **viene avvisato** all'apertura, con dentro quanto
    tempo resta per votare — push a chi le ha attivate, WhatsApp agli altri,
    come per ogni altro avviso.

## 2.71.0 — 21 settembre 2026

### Cambiato

- **I numeri stanno nella home, non nel profilo.** «Com'e' andata» e' una cosa
  che si guarda di passaggio, entrando: nel profilo — che e' la pagina dei
  moduli da compilare, il certificato, i recapiti — bisognava andarli a
  cercare, e nessuno ci va per sapere quante volte e' sceso in campo. Il
  riquadro e' lo stesso che si apre dal calendario sulla scheda di una persona:
  un conto solo, due posti dove si legge.

### Corretto

- **«10 volte su 7» non si legge piu'.** Nel riquadro dei numeri le presenze si
  contavano a giornate — due attivita' sovrapposte sono un impegno solo — ma la
  tipologia piu' frequentata si contava a righe, e dieci allenamenti dentro
  sette giornate finivano confrontati con un totale che le giornate le contava
  una volta. Due unita' diverse nello stesso paragone, e un numero impossibile
  davanti agli occhi di chi lo legge. **Adesso si conta a giornate dappertutto.**
- **Il denominatore e' la stagione, non quello a cui hai risposto.** «7 su 8»
  dove l'8 erano le attivita' a cui la persona si era segnata raccontava una
  squadra che gioca otto volte l'anno. Chi guarda legge «su quante se ne sono
  fatte», ed e' quello che deve trovare: adesso sotto il numero c'e' scritto
  anche **quale stagione**. Restano fuori le annullate — non ci e' stato
  nessuno — e quelle che la persona non poteva fare, perche' un'attivita' su
  invito a cui non era invitata non e' una giornata che si e' persa.
- I due conti vivevano in due pagine diverse e divergevano. Adesso stanno in un
  posto solo (`lib/statistiche`), e chi li mostra non puo' piu' sbagliarli.

## 2.70.0 — 21 settembre 2026

### Aggiunto

- **Due attivita' che si sovrappongono sono un impegno solo.** La domenica con
  la PLR e la giocata, la notturna che finisce alle tredici e la diurna che
  comincia alle otto: restano due righe nel calendario — hanno due formazioni e
  due quote — ma per le statistiche contano una volta. **Un operatore ci puo'
  stare una volta sola**, e contarle come due gli abbassava la percentuale per
  una giornata in cui c'era davvero.
  - La regola e' il tempo, non il luogo: basta un istante in cui sono tutte e
    due in corso. Torino e Milano la stessa domenica mattina sono posti
    diversi, e proprio per questo un operatore ne fa una sola. **Toccarsi non
    e' sovrapporsi**: la notturna fino alle otto e la diurna dalle otto restano
    due impegni, e chi le fa tutte e due ha fatto due cose.
  - Vale per le presenze personali, per la *parola mantenuta* — mancare vuol
    dire non esserci stato in nessuna delle attivita' di quella giornata — per
    la classifica e per l'**affluenza media**, che adesso conta le persone in
    campo quel giorno e non la somma delle righe: chi c'era a tutte e due era
    una persona sola, e sommarla diceva che eravamo il doppio.
- **E il campo «Fa parte di»**, per quello che l'orologio non vede: la gara con
  il suo allenamento del venerdi', due giornate della stessa trasferta. Elenca
  le attivita' a cinque giorni di distanza, e quando c'e' un collegamento la
  pagina lo dice — «Stessa giornata di Open day» — invece di lasciarlo una
  spunta invisibile dentro un modulo.

## 2.69.0 — 20 settembre 2026

### Aggiunto

- **Negli allegati si puo' scrivere un documento, non solo caricarlo.** «Scrivi
  un documento» apre un editore Markdown con l'anteprima: il book di missione
  lo scrive chi tiene in mano l'attivita' e spesso lo finisce la sera prima, e
  farlo scrivere altrove vuol dire che la versione buona sta da un'altra parte.
  E' un allegato come gli altri — stesso elenco, stesso ordine, stesso link,
  stessa spunta «anche fuori» — ma **si riapre e si corregge**: scrivere
  qualcosa e non poterlo piu' toccare sarebbe un blocco per appunti.
- **L'editore Markdown e' diventato completo**: da cinque pulsanti a sedici, in
  tre gruppi — il testo (grassetto, corsivo, barrato, codice), la struttura
  (tre livelli di titolo, citazione, elenchi puntato, numerato e di cose da
  fare), e quello che si attacca (link, immagine, tabella, blocco di codice,
  riga di separazione). I simboli di riga vanno davanti a **ogni riga scelta** e
  non solo alla prima, e premendo due volte si tolgono: e' il modo in cui si
  corregge un errore.
- **Quattro numeri nuovi**, gli stessi nella propria pagina e nella scheda che
  si apre dal calendario: presenze, **parola mantenuta** (quante volte ha detto
  si' e c'era davvero), da quanto non si vede in campo, e la tipologia piu'
  frequentata. Due numeri da soli non dicevano niente: chi ha detto si' venti
  volte ed e' venuto dieci e chi ha detto si' dieci ed e' venuto dieci hanno lo
  stesso «10», e non sono la stessa persona.

### Cambiato

- **La tabella dei nuovi risponde alla domanda per cui esiste**: chi ha senso
  portare in squadra galleggia, chi non si vede piu' scende. Ordinata per
  presenze; «2/4» spezzato in due colonne, **Venuto** e **Segnato**, perche'
  una frazione va spiegata ogni volta e domani va spiegata di nuovo; una
  colonna **Da quanto** dice i giorni dall'ultima volta («1m 3g»), ambra dopo
  un mese e rossa dopo tre. Via la colonna dello stato, che su ogni riga
  diceva «Nuovo»: restano solo gli stati che dicono qualcosa — deve compilare
  l'invito, aspetta la valutazione, rifiutato — come segno accanto al nome.
- **Le attivita' annullate non sono piu' storia di nessuno.** Sparivano solo
  dal calendario, ma restavano nello storico personale e nella scheda con
  accanto «Presente» — quel si' era stato detto davvero — raccontando una
  partecipazione mai avvenuta e rovinando il conto delle presenze.
- **In bozza spariscono partecipanti, commenti e mi piace.** Non e' un caso da
  gestire, e' la definizione di bozza: finche' non la rilasci non la vede
  nessuno, quindi nessuno puo' rispondere. Un riquadro «0 presenti, 0 forse, 0
  assenti» non raccontava uno zero, raccontava che eri arrivato prima tu.

## 2.68.0 — 20 settembre 2026

### Cambiato

- **Un avviso sceglie da solo la strada, e la regola e' una per tutti.** Chi ha
  acceso le notifiche riceve quelle; chi non le ha accese riceve un WhatsApp.
  Mai tutti e due — lo stesso avviso da due strade insegna a ignorarli entrambi
  — e mai nessuno dei due per una scelta fatta mesi prima davanti a una
  finestra del browser. Prima ogni avviso decideva per conto suo, e le due
  regole erano incoerenti: la polizza attivata andava **sempre** su WhatsApp,
  anche a chi aveva le notifiche; il certificato in scadenza andava **solo** in
  push, e chi le notifiche non le aveva non sapeva niente.
  - Il messaggio WhatsApp non e' la notifica travestita: la notifica si legge
    in due righe sulla schermata bloccata e il resto lo apre un tocco, il
    messaggio resta nella chat e deve bastare a se' stesso — il numero della
    polizza, il giorno, la validita' — perche' e' quello che si mostra in campo
    se la polizza viene chiesta.
  - Il messaggio di conferma dice dove e' arrivato: «Gli e' arrivata la
    notifica» oppure «Gli ho mandato i dati su WhatsApp».
- **L'appello non chiude piu' l'attivita'. Mai.** Registra le presenze e basta,
  si rifa' per chi arriva tardi, e l'attivita' la chiude una persona quando la
  giornata e' finita davvero — col pulsante in fondo alla pagina, accanto al
  condividi. L'ora sul calendario e' una previsione; che sia andata lo dice chi
  c'era.

### Aggiunto

- **Nei nuovi c'e' la campanella**, in tabella e nelle card: accesa se gli
  avvisi arrivano sul telefono, spenta se partira' un WhatsApp. Non e' un
  difetto da correggere, e' come lo si raggiunge — e saperlo prima evita di
  scrivere a mano a uno che sarebbe stato avvisato da solo.

## 2.67.0 — 20 settembre 2026

### Aggiunto

- **La ricerca in cima entra dentro le pagine.** Prima trovava le voci del
  menu; adesso trova anche **le cose**: le attivita' (per titolo, per campo e
  per luogo -- i tre modi in cui una giocata si chiama a voce), **le persone**
  per nome, cognome o callsign, e **i documenti** cercando anche dentro il
  testo, cosi' «quella cosa sul mercatino» si trova senza sapere in quale
  regolamento stia. Sotto a ogni riga il dettaglio che la distingue: la data e
  il campo di una gara, il sottotitolo di un regolamento.
- **E trova le viste dentro le pagine**: «storico» porta a *Calendario ·
  Storico*, «mese» a *Calendario · Mese*, «notifiche» a *Operatori · Avvisi*.
  Nel menu non compaiono — sarebbe una colonna lunga il doppio — ma chi le
  cerca sta pensando a loro, non alla pagina che le contiene.

### Come e' fatta

- **Due tempi.** Le pagine e le viste sono gia' in mano al browser e compaiono
  mentre si scrive; le cose partono dopo un quarto di secondo di silenzio, cosi'
  scrivendo «torneo» non si fanno sei domande al server per arrivare alla
  settima -- con le prime che tornano fuori tempo massimo e riempiono l'elenco
  di risultati di due lettere fa.
- **I permessi non sono riscritti.** Le attivita' passano dal filtro di
  visibilita' del calendario, le persone dalla stessa regola con cui una scheda
  si apre: un atleta trova i compagni, chi segue i nuovi trova anche i
  contatti, un contatto non trova nessuno. Una ricerca che trovasse un pezzo in
  piu' di quello che le pagine mostrano sarebbe il modo piu' silenzioso di far
  uscire i dati.

## 2.66.0 — 20 settembre 2026

### Aggiunto

- **Le polizze automatiche si decidono anche su una singola giocata.**
  L'interruttore generale vale per tutte; nel modulo dell'attivita', sotto «Chi
  ci sta», c'e' *Polizze dei nuovi* con tre stati: come dice l'impostazione
  generale (il caso di tutte, e resta cosi' da solo), assicura da sola, oppure
  solo a mano. **L'attivita' vince in tutti e due i versi**: si puo' accendere
  per una sola giocata con l'interruttore grande spento, e spegnerla per una
  sola con l'interruttore grande acceso. Nella pagina delle polizze ogni card
  dice cosa fara', ma solo quando c'e' una decisione da sapere.
- **Il certificato medico in scadenza avvisa sul telefono.** A tappe — trenta
  giorni, quattordici, sette, tre, il giorno prima, il giorno stesso, e una
  volta quando e' scaduto — e una per tappa: quello che il gestionale si
  ricorda non e' *se* ha avvisato, e' **a che punto era**, altrimenti il
  passaggio da «manca una settimana» a «e' domani» si perderebbe fra i
  doppioni. Mai di notte: solo fra le nove e le ventuno, perche' il conto dei
  giorni cambia a mezzanotte e far vibrare il telefono allora insegna solo a
  spegnere le notifiche. Va ai soli atleti, come tutto il resto del
  certificato.
- **Negli operatori c'e' la vista «Avvisi»**: chi riceve le notifiche sul
  telefono e chi no, con i dispositivi di ognuno e tre numeri in cima. La
  domanda nasce il giorno che si manda qualcosa di importante — *a quante
  persone e' arrivato davvero?* — e la risposta non stava da nessuna parte: il
  permesso lo concede il telefono, una volta sola, e chi ha detto no quel
  giorno non lo sapeva piu' nessuno.

## 2.65.1 — 20 settembre 2026

### Aggiunto

- **La sveglia dei lavori automatici e' uno script versionato**
  (`deploy/lavori.sh`), non una riga scritta a mano nel crontab: legge la
  chiave da `.env.prod`, bussa alla porta dei lavori e scrive nel registro
  **solo quando succede qualcosa** — un giro a vuoto non lascia righe,
  altrimenti il registro sarebbe illeggibile proprio il giorno che serve. Il
  registro si tiene da solo entro mille righe. In `deploy/DEPLOY.md` c'e' come
  si accende, chiave compresa.

## 2.65.0 — 20 settembre 2026

### Aggiunto

- **Le polizze giornaliere si possono attivare da sole, poco prima
  dell'attivita'.** Il caso e' la domenica mattina: alle otto si e' in viaggio,
  il gestionale non lo apre nessuno, e chi non e' stato coperto il giovedi'
  arriva in campo scoperto. Un lavoro sulla macchina si sveglia ogni pochi
  minuti e copre chi e' pronto — **spento di suo**, con l'anticipo a un'ora,
  modificabile fra dieci minuti e un giorno, dal riquadro «Polizze
  automatiche» nella pagina delle polizze.
  - **Non salta nessun controllo**: passa dallo stesso pulsante «Assicura»,
    quindi copre solo chi ha detto «ci sono», ha la quota saldata o dichiarata
    e i dati anagrafici a posto. Quello che aggiunge e' non dimenticarsene.
  - **Ha una firma**: le polizze automatiche partono a nome di chi ha acceso
    l'interruttore, perche' una spesa ha sempre qualcuno dietro anche quando
    parte da sola. Se quella persona esce dalla squadra, firma il primo che
    amministra invece di smettere di assicurare in silenzio.
  - **Due freni**: non piu' di venti polizze per giro, e la porta da cui si
    sveglia (`/api/lavori`) risponde 404 a chi non ha la chiave — che in test
    non c'e', quindi li' non parte niente.

### Cambiato

- **Fatto l'appello, la riga del partecipante si congela.** Via il cestino e
  via «ha risposto il…»: resta il verdetto, «c'era» o «non c'era». La sua
  presenza e' un fatto registrato — e' finita nella sua percentuale e nello
  storico della giornata — e cancellarla vorrebbe dire riscrivere cos'e'
  successo, per giunta per sbaglio, visto che il cestino stava accanto al nome.
  Il divieto non e' solo nascosto: chi arriva con una pagina aperta da prima si
  sente rispondere che la presenza e' registrata.

## 2.64.0 — 20 settembre 2026

### Aggiunto

- **Le polizze prova hanno una previsione: «Quando finiscono».** Accanto alle
  attivita' da coprire, una timeline parte dalla giacenza e la scala attivita'
  per attivita', in ordine di data: quante ne brucia ognuna, una barra che si
  accorcia, quante ne restano dopo. La riga dove il numero passa sotto zero e'
  il giorno in cui qualcuno resta a casa, e si vede settimane prima — che e'
  esattamente il tempo che serve per ricomprarle. In cima la risposta secca:
  «Bastano per tutto quello che e' in programma» oppure «Non bastano: a
  "Open day" ne manca 1. Vanno comprate prima».
- **Sotto le cinque polizze arriva una notifica** a chi segue i nuovi. Parte
  dall'unico punto in cui la giacenza cambia — dopo ogni polizza attivata e
  dopo ogni lettura del portale — e solo **quando il numero scende**: riaprire
  la cassa non e' una notizia. A zero cambia parole. La soglia adesso vive in
  un posto solo e la usano tutti e tre i punti: il riquadro rosso in cassa,
  l'avviso e la previsione.

### Cambiato

- **L'appello non chiude piu' la giocata mentre si sta giocando.** Si fa
  l'appello al ritrovo, con la giornata davanti: chiuderla in quel momento la
  faceva sparire da «in programma» e la marcava come finita alle otto e cinque
  del mattino. Adesso, finche' l'ora della fine non e' passata, salvare
  registra le presenze e basta — e l'appello si puo' rifare per chi arriva
  tardi. Il pulsante lo dice: «Salva presenze» durante, «Salva presenze e
  chiudi» dopo.

## 2.63.1 — 20 settembre 2026

### Corretto

- **La quota diceva «—» proprio a chi doveva decidere il prezzo.** Il numero
  grande era la quota *personale* di chi guarda: per un admin interno spesso
  zero, e allora usciva un trattino, mentre il prezzo vero della giocata stava
  in una riga grigia in fondo. Adesso chi governa il calendario legge in
  grande i due numeri che gli servono — **interni** e, sotto in ambra,
  **esterni** — e sono totali: la quota dell'attività più tutte le casse
  attaccate, cioè quello che esce davvero dal portafoglio di chi viene. Il
  dettaglio cassa per cassa resta sotto in grigio, dove va.
- **A chi non amministra, quando non deve niente, adesso c'è scritto
  «Gratis».** Prima, se l'attività aveva un costo per i soli esterni, a un
  interno compariva un trattino: sembrava un dato mancante e invece era la
  risposta.

## 2.63.0 — 20 settembre 2026

### Cambiato

- **Dentro l'attivita' i numeri si leggono tutti allo stesso modo.** Il
  riquadro del «Quando» e' diventato la forma di tutti: etichetta piccola
  sopra, il valore in grande, e sotto in verde la riga che si legge insieme al
  valore. Adesso hanno quella forma anche **In giocata** e **Quota**, e si
  trovano a colpo d'occhio senza rileggere le etichette.
- **«In giocata» non e' piu' un riquadro dentro al riquadro**: e' un gruppo
  come gli altri, con il totale in grande e sotto quanti del club, quanti
  nuovi e quanti dalle squadre esterne, ognuno col suo colore. Si tocca e si
  scende ai partecipanti.
- **La quota dice quanto tocca a te, e basta.** Le due tariffe — squadra ed
  esterni — le vede solo chi le decide, in grigio sotto: a chi deve pagare non
  serve sapere quanto paga un altro, e messe in fila facevano sembrare che ci
  fosse da scegliere. Com'e' fatta la somma si dice solo quando aggiunge
  qualcosa: due voci, o una cassa diversa a cui va pagata.
- **«Dove si gioca» sta in un posto solo.** Campo, indirizzo, ritrovo con la
  sua ora, mappa e pulsanti per farsi portare erano sparsi in quattro punti
  della pagina: adesso sono un blocco unico, nell'ordine in cui servono. Una
  riunione online lo dice — «Online» — invece di lasciare un trattino, e il
  collegamento sta li'.
- **Le righe orizzontali separano solo i tre discorsi grossi**: quando, dove,
  a chi si chiede. Tutto il resto — in giocata, quota, chiusura adesioni,
  briefing, note interne — sta in un gruppo solo, senza linee dentro: erano
  diventate dieci strisce in cui non si capiva piu' cosa contasse.

## 2.62.3 — 20 settembre 2026

### Corretto

- **Nella guida al rilascio, la pulizia cancellava il paracadute.** Il
  `docker image prune` scritto ieri toglie *tutte* le immagini senza tag, e fra
  quelle c'è la build appena sostituita — cioè proprio quella a cui si torna se
  il rilascio va storto, come la riga sotto prometteva. Ora la pulizia salta le
  ultime 24 ore: il ritorno indietro resta possibile per tutta la giornata, che
  è il tempo in cui un guaio salta fuori.

## 2.62.2 — 20 settembre 2026

### Corretto

- **Nelle card del calendario spariva un «secondo piede» vuoto.** Le card
  stanno in una griglia, e in una griglia le celle di una riga sono alte tutte
  quanto la più alta: da quando i pulsanti di gestione non stanno più nelle
  card, quelle senza campo e senza quota sono diventate più corte e si
  allungavano per pareggiare la vicina. Lo spazio in più cadeva **sotto** al
  piede — una fascia più scura, larga quanto la riga dei pulsanti, che sembrava
  un piede vuoto. Adesso a crescere è il corpo della card: il piede torna
  appoggiato al fondo e l'aria in più finisce sotto al testo, dove per giunta
  resta cliccabile, perché il corpo è tutto un link all'attività.

## 2.62.1 — 20 settembre 2026

### Corretto

- **`deploy/DEPLOY.md` raccontava un server che non esiste.** Era la guida del
  trasloco scritta *prima* di farlo: parlava di Hetzner, di ZeroTier e di una
  cartella `gestionale/` nella home. Il server vero è un VPS Aruba, il codice
  sta in `/opt/gestionale` e la porta 22 risponde sul nome pubblico, senza VPN.
  Chi ci andava a cercare l'indirizzo lo trovava scritto con le x. Adesso in
  cima c'è la macchina com'è davvero, e i capitoli numerati restano sotto per
  quello che sono: il ragionamento di allora, non le istruzioni di oggi.
- **Nella procedura di rilascio mancava `zd restart proxy`.** Il `Caddyfile` è
  montato come file dentro il container e `up -d` non ricrea il proxy se il suo
  compose non è cambiato: senza quel passo le modifiche al proxy non entrano in
  vigore, e i sintomi che ne vengono sembrano difetti dell'applicazione — è
  successo davvero, con il tetto dei caricamenti.
- **E mancava la pulizia.** Ogni ricostruzione lascia l'immagine vecchia senza
  tag e la sua cache: in quattro giorni di rilasci erano 41 immagini e 57 GB di
  cache, l'80% del disco del server. In coda al rilascio ora ci sono
  `docker image prune` e un `builder prune` che tiene l'ultima settimana e butta
  il resto.
- Il backup pre-rilascio legge utente e database **dalle variabili del
  container** invece che scritti a mano: se cambiano in `.env.prod`, il comando
  non fa più un backup vuoto credendo di averlo fatto. E il nome del file porta
  l'ora, per distinguere due rilasci nello stesso giorno.
- Detto che il TAK non è stato installato e perché: la macchina ha 4 GB, lui ne
  vuole 8 suoi.

## 2.62.0 — 20 settembre 2026

### Cambiato

- **Nella card del partecipante, il piede racconta da dove viene la risposta.**
  «Ha risposto il 18 set 2026, 14:32»: è la domanda che si fa chi organizza il
  sabato sera, perché uno che ha detto «ci sono» a luglio e non si è più fatto
  vivo non è come uno che ha confermato stamattina. La data è sempre quella
  dell'ultima volta che ha toccato la risposta: se l'ha cambiata, è quando l'ha
  cambiata.
- **«Aggiunto dallo staff» è sceso lì accanto**, al posto di stare sotto al nome
  travestito da nota. Non è una nota di nessuno — è il modo in cui quella riga è
  nata — e stando in mezzo alle note vere si leggeva come una frase scritta
  dalla persona. Adesso la riga sotto il nome resta libera per la nota vera, o
  per il motto.

## 2.61.0 — 20 settembre 2026

### Cambiato

- **Quando, in grande, anche per quelli di casa.** Dentro l'attività il giorno
  e l'ora erano due caselle grigie della griglia — «Inizio», «Fine», nel
  formato del computer — e si leggevano come un dettaglio anagrafico. Adesso
  c'è lo stesso riquadro che vedono le squadre ospiti nell'invito: il giorno
  per esteso in grande, l'ora in verde, e la seconda data per intero solo
  quando l'attività scavalca la mezzanotte. È un pezzo solo, usato nelle due
  pagine: non c'era ragione perché a noi fosse detto peggio che a loro.
- **«In giocata» si prende una riga sua, e si tocca.** Al posto della casella
  «Disponibili» c'è il numero delle persone attese in campo — per intero, nuovi
  e squadre esterne compresi — e sotto da dove vengono: quanti del club, quanti
  nuovi, quanti da fuori. Toccandolo si scende ai partecipanti, dove ci sono i
  nomi.
- **Il navigatore sta in un posto solo: «Come ci si arriva».** Via i pulsantini
  sparsi dentro «Dove» e «Ritrovo». Al loro posto, sotto la mappa, una riga per
  tappa — prima *Luogo di ritrovo*, poi *Campo* — con a sinistra dove si va e a
  destra il pulsante **Naviga**. Quando ci sono tutte e due, sotto compare
  **Itinerario**: largo quanto la riga e di un altro colore, perché non è un
  terzo «Naviga» — è il viaggio come si fa davvero, prima al ritrovo e poi al
  campo, in un percorso solo. Un ritrovo scritto a mano, senza punto sulla
  mappa, non diventa una tappa: un navigatore che apre il nulla è peggio di un
  pulsante che non c'è.
- **I cambi di stato sono scesi in fondo all'attività, accanto al condividi.**
  Rilascia, concludi, annulla, riporta in bozza, e la scelta dei destinatari:
  erano sulle card dell'elenco, dove si premevano di sfuggita scorrendo, e in
  cima alla pagina dietro l'etichetta dello stato — che così era insieme la
  cosa da leggere e il pulsante per cambiarla. Adesso lo stato in cima si legge
  e basta; per cambiarlo si arriva in fondo, dopo aver letto l'attività.
- **Nelle card dell'elenco resta un passo solo: rilasciare una bozza.** Quello
  sì che si fa di corsa — finché non lo fai non la vede nessuno — e una volta
  scelti i destinatari i tre pulsanti spariscono: si cambiano dentro
  l'attività.
- **I pulsanti per rispondere sono scesi nel piede della card**, con le altre
  azioni, e la scritta «Hai risposto: presente» non c'è più: i tre pulsanti la
  domanda la fanno da soli e quello scelto resta acceso, dirlo anche a parole
  era ripetersi.

## 2.60.0 — 20 settembre 2026

### Corretto

- **Il certificato medico in PDF non si riusciva più a caricare: lo schermo
  andava in errore.** Con un file oltre i dodici mega — la scansione a colori
  dello studio, il PDF con dentro l'elettrocardiogramma — la richiesta veniva
  fermata *prima* di arrivare al gestionale, dal proxy o dal tetto interno di
  Next. Quello che tornava al browser non era una risposta leggibile, e la
  pagina finiva su «Qualcosa si è rotto» dopo aver aspettato tutto il
  caricamento. Le foto scattate col telefono, che pesano due o tre mega,
  passavano: per questo sembrava un problema dei PDF.
- **Adesso il file si controlla nel browser, prima di partire.** Se è troppo
  grande resta sul telefono e il messaggio arriva subito, con dentro cosa fare:
  «*certificato.pdf* pesa 22,9 MB, il massimo è 20 MB. Se è una scansione,
  rifalla in bianco e nero o a qualità più bassa; una foto del foglio col
  telefono va benissimo».
- **Un PDF non viene più rifiutato per come l'ha chiamato il computer di
  qualcun altro.** Il formato si riconosce dall'estensione del nome, non dal
  tipo dichiarato dal browser: un file passato da WhatsApp o da una chiavetta
  arriva col tipo vuoto o `application/octet-stream`, e prima si beccava
  «Formato non ammesso» pur essendo un PDF buono. Quando è il nome a non dire
  niente, si guarda il tipo: uno dei due parla sempre.

### Cambiato

- **Il certificato può pesare fino a 20 MB**, dieci prima. Il certificato lo
  consegna il medico e arriva com'è: chi lo riceve non sa alleggerirlo, e non è
  il suo mestiere. È lo stesso tetto del book di missione.
- I muri davanti al gestionale — Caddy sul server, nginx in casa, il tetto
  delle server action — stanno tutti **più in là** del tetto vero: a dire «è
  troppo grande» dev'essere sempre il gestionale, con parole sue, e mai una
  pagina rotta.
- Stesso controllo anche sugli allegati dell'attività: il book di missione da
  venti mega si fermava allo stesso muro.

## 2.59.0 — 18 settembre 2026

### Aggiunto

- **Nell'appello, i nuovi non assicurati stanno a parte, in rosso e in cima:
  «Non assicurati · non possono giocare».** Accanto a ciascuno la frase *Non
  può giocare: manca l'assicurazione giornaliera*. Prima erano una spunta come
  le altre nel gruppo dei nuovi, e se avevano detto «ci sono» passavano
  l'appello senza che nessuno se ne accorgesse — che è esattamente il momento
  in cui qualcuno li deve fermare.
- Il riquadro sta fuori dalla lista che scorre, così si vede anche quando
  l'appello è lungo. La spunta resta: chi fa l'appello registra chi c'era, e
  decide lui; la frase dice chiaro che in campo non ci va.
- Conta ogni giorno dell'attività: su una due giorni basta che manchi la
  giornaliera di uno per finire nel riquadro.

## 2.58.0 — 18 settembre 2026

### Cambiato

- **Il certificato medico si chiede solo agli atleti.** Serve a scendere in
  campo, e chi tiene i conti, le tessere o la segreteria in campo non ci va:
  metterlo fra i «senza certificato» gonfiava un elenco che si guarda per
  sapere chi non può giocare, con nomi di gente che non ha mai chiesto di
  farlo. Chi gioca **e** amministra resta dentro: basta avere anche il ruolo di
  atleta.
  - In **Certificati**, il filtro «Senza certificato» elenca solo gli atleti.
  - In **Operatori** — sia nella vista dell'admin sia in quella di
    amministrazione, segreteria e team leader — il riquadro diventa «Atleti
    senza certificato valido» e conta solo loro.
  - Negli elenchi, accanto a un non atleta senza certificato non c'è più il
    badge rosso «Nessun cert.» o «mancante»: dove serve una risposta c'è un
    grigio «non serve», e il filtro dei certificati ha la sua voce per
    trovarli. Un non atleta con l'iscrizione attiva risulta **a posto**.
  - Nel **cruscotto** di un non atleta non compare più «Non hai ancora
    caricato un certificato medico», né il riquadro rosso «Assente».
- Non vieta niente: un non atleta che il certificato lo carica lo stesso lo
  vede gestito come tutti, scadenze comprese.

## 2.57.0 — 18 settembre 2026

### Cambiato

- **I pulsanti in fondo alle card stanno in un piede.** Una fascia di un grigio
  appena più chiaro, a filo con i bordi della card e con la riga sopra: si
  legge come una parte a sé — sopra quello che si legge, sotto quello che si fa
  — invece di una fila di pulsanti appoggiata in fondo al testo.
- È una classe sola, `.piede`, e la usano tutte le card: quelle fatte con
  `CardRiga` la prendono da sé, le altre — casse, guasti, riordini, tipologie,
  note, debriefing, nuovi, voci degli annunci, partecipanti, il proprio
  certificato, la card di un’attività nel calendario, la scheda con i suoi
  riquadri «Squadre ospiti» e «Allegati» — l’hanno
  avuta una per una. Si allarga fino ai bordi qualunque sia il margine interno
  della card, anche nelle righe annidate.

## 2.56.0 — 18 settembre 2026

### Cambiato

- **Nella card di un partecipante non si ripete più la sua risposta.** Stava
  nel gruppo «Presenti» e sotto il nome c'era scritto «Presente»; stava fra i
  «Non ci sono» e c'era scritto «Assente». Il gruppo lo dice già, e la
  parola in più era solo una cosa da leggere per non imparare niente. Resta il
  verdetto dell'appello — *c'era*, *non c'era* — che invece è un'informazione
  nuova.
- **Via «si assicura dopo l'incasso».** Il pulsante *Assicura* compare da solo
  quando la quota è saldata o dichiarata; una riga che spiegava perché ancora
  non c'era era una scritta in più su ogni card, e diceva quello che si
  capisce già dalla quota da saldare accanto.

## 2.55.0 — 18 settembre 2026

### Aggiunto

- **Quanti siamo in giocata, da dove.** Sotto il conto delle risposte, nella
  scheda dell'attività, una riga dice quanti **interni**, quanti **nuovi** e
  quanti operatori arrivano dalle **squadre esterne**, con il totale. Le
  risposte dicono chi ha alzato la mano; questa riga dice com'è fatta la
  giornata — quanti nuovi da seguire, quanta gente sul campo — e prima andava
  ricostruita contando i gruppi e sommando gli ospiti a mente.
- Si contano quelli che hanno detto «ci sono», come nel numero che leggono le
  squadre ospiti dal loro invito. Le squadre esterne che non hanno ancora
  risposto non possono stare nel conto, e la riga dice quante sono invece di
  far sembrare il campo più vuoto di come sarà.

## 2.54.0 — 18 settembre 2026

### Cambiato

- **Tutte le card del gestionale seguono lo stesso schema**, quello nato con le
  squadre ospiti: in alto il titolo, col sottotitolo sotto, e **alla sua
  altezza, a destra, il cestino** — solo l'icona, rossa, senza scritta. Il
  contenuto in mezzo va a capo; i pulsanti stanno sotto, allineati a destra.
  Convertite le card di cassa, casse e loro metodi e gestori, certificati
  (quelli da vagliare e i propri), messaggi (coda, modelli, testi), metodi di
  pagamento, squadre esterne, stagioni, tariffario, tipologie, tessere,
  pagamenti, richieste d'iscrizione, magazzino e riordini, guasti, chiavi
  dell'assistente, carrello, note, debriefing, commenti, foto e voci degli
  annunci, operatori e nuovi, e il calendario.
- **Il cestino non si confonde più con i pulsanti accanto.** Prima era una
  parola fra le altre — «elimina», «togli», «cancella per errore», a volte in
  grigio piccolo, a volte in rosso pieno — e stava in fila con «Modifica» o
  «Incassa», a un centimetro dal gesto che si voleva fare davvero. Ora è
  sempre lo stesso simbolo, nello stesso angolo, lontano dagli altri.
- **Nel calendario** «Elimina» non sta più fra i cambi di stato della card:
  quelli sono passi avanti e indietro, questa è una cancellazione con tutte le
  adesioni raccolte, e in fila con «Riapri» la si premeva cercando altro.
- **I partecipanti di un'attività** hanno il cestino in alto accanto al nome,
  rosso, e nota, stato e schieramento sotto a destra: prima il cestino era
  grigio, in fondo alla fila, proprio sotto il pollice che schierava.
- **Nomi, titoli ed email non si troncano più con i «…»** nelle card e negli
  elenchi: vanno a capo. Restano tagliati solo dove è giusto che lo siano — il
  menu, la griglia del mese, i grafici, i suggerimenti mentre si scrive.

### Non cambiato, di proposito

- I pulsanti rossi che **non tolgono la card** tengono la loro scritta:
  «Pulisci i guardati» nei guasti e «Svuota» nel carrello agiscono su tutto
  l'elenco, «Scollega» dimentica le credenziali del portale, «Togli il
  messaggio» nelle segnalazioni è un esito della moderazione — la segnalazione
  resta. Un cestino lì farebbe pensare di cancellare la card, ed è un'altra
  cosa.

### Corretto

- Nella card di una tipologia il badge «Riunione» compariva due volte.

## 2.53.0 — 18 settembre 2026

### Cambiato

- **Le righe delle squadre ospiti e degli allegati sono card fatte per il
  telefono.** Tutto stava su una linea sola, e sul telefono il primo a farne le
  spese era il nome: «Decima Gladio» diventava «Decima …», cioè l'unica cosa da
  leggere spariva per far posto ai pulsanti. Ora ogni riga ha lo stesso schema:
  - **in alto il titolo**, con sotto il sottotitolo, e **alla sua altezza, a
    destra, il cestino**: solo l'icona, rossa. È il gesto più pericoloso della
    riga e sta sempre nello stesso posto, lontano dagli altri pulsanti, così non
    lo si preme cercandone un altro;
  - **il contenuto va a capo** invece di essere tagliato: una riga più alta si
    legge, una parola mozzata no;
  - **i pulsanti sotto, allineati a destra**, liberi di andare a capo anche
    loro.
- Lo schema vive in un componente solo, `CardRiga`, e da qui in avanti è la
  regola per le card del gestionale.

## 2.52.0 — 18 settembre 2026

### Cambiato

- **L'avviso sul link, nell'invito, adesso è una barra in basso che non si può
  non vedere.** Era un riquadro in mezzo alla pagina, e un riquadro in mezzo
  alla pagina lo si scorre via senza leggerlo — che è esattamente quello che
  non deve succedere: il link è una chiave, chi ce l'ha cambia il numero di
  operatori di quella squadra, e loro se ne accorgerebbero solo in campo.
- **Si toglie con «Ho capito», non con una crocetta.** Una crocetta la si preme
  per far sparire un fastidio; un pulsante con scritto cosa si sta dicendo lo si
  preme dopo aver letto. Confermato, l'avviso non sparisce: scende in fondo alle
  card, dove resta da rileggere senza ingombrare lo schermo.
- **Non ci si ricorda di chi l'ha già letto**, ed è voluto: chi apre quella
  pagina non è sempre la stessa persona — il link gira dentro la squadra
  ospite, ed è giusto che giri lì — quindi l'avviso torna a ogni apertura. Chi
  l'ha capito lo toglie in un tocco; chi lo vede per la prima volta lo vede.

## 2.51.0 — 18 settembre 2026

### Cambiato

- **Il pulsante del link è diventato il simbolo della condivisione, e condivide
  davvero.** Sul telefono apre **il foglio di sistema** — quello da cui si
  sceglie WhatsApp, Telegram, un messaggio — che è il gesto che uno ha in mente
  quando vuole mandare un link a qualcuno. Dove quel foglio non c'è, sul
  computer, copia negli appunti come prima. Non apre WhatsApp da solo: il link
  a volte va nel gruppo, a volte a una persona, a volte in un promemoria, e
  sceglierlo noi vorrebbe dire decidere per chi condivide.
- Niente più scritta «Copia il link»: resta la sola icona, che accanto a un
  nome di squadra si legge più in fretta di tre parole.

### Aggiunto

- **Un referente può rimandare il link di una squadra già invitata.** È il nome
  scritto nella scheda come persona a cui chiedere, ed è lui che il giorno
  prima si sente dire «a noi non è arrivato niente»: doverlo far passare da un
  team leader per rimandare un link che esiste già era un giro buono solo a far
  tardi. **Invitare una squadra o toglierla resta di chi schiera**: quella
  decide chi si gioca con chi, ed è un'altra cosa.

## 2.50.2 — 18 settembre 2026

### Corretto

- **Nell'invito, la squadra che lo riceve adesso si vede nell'elenco di chi
  viene.** Ne era esclusa, e l'elenco sembrava sbagliato: uno legge le altre
  squadre, non trova la propria, conta le righe e si chiede se il numero che ha
  scritto sia arrivato davvero. La riga loro ce l'hanno — è il senso di questa
  pagina — e sta dov'è, in mezzo alle altre, marcata **voi** e in evidenza.

### Aggiunto

- **Il totale degli operatori attesi**, in fondo a «chi viene». È il numero per
  cui si organizza una giocata, e finora bisognava sommare le righe a mente.
  Chi non ha ancora risposto non ci può essere dentro, e il conto lo dice
  invece di far sembrare piccolo un campo che sarà pieno.

### Cambiato

- **Via il nome del campo dall'invito: resta il ritrovo, la mappa e il pulsante
  per farsi portare.** «Area Boschiva Nord · Bergamo» è come lo chiamiamo noi
  in anagrafica: non dice a nessuno dove mettere le ruote, e scritto in cima si
  leggeva come se fosse l'informazione, mentre l'informazione è il segnaposto e
  il pulsante. La mappa ora si centra sul **ritrovo** quando ha coordinate sue —
  l'autogrill, il parcheggio prima del bosco — e non più sul campo.

## 2.50.1 — 17 settembre 2026

### Cambiato

- **«Non si sono espressi» adesso dice di chi parla: «in squadra, senza
  risposta».** Il conto era già solo di chi è in rosa — i nuovi non ci sono mai
  entrati — ma l'etichetta da sola faceva pensare a tutti quelli che potevano
  venire, e un numero che si può leggere in due modi è un numero su cui non ci
  si fida. Dai nuovi non si aspetta una risposta: uno che si affaccia a
  un'aperta viene se gli va, e contarlo fra i silenziosi gonfierebbe il numero
  con gente a cui nessuno ha intenzione di scrivere.

## 2.50.0 — 17 settembre 2026

### Cambiato

- **La pagina d'invito rifatta attorno a quello che serve a chi arriva da
  fuori.** Era un elenco di righe tutte della stessa misura, e la cosa più
  importante era scritta in grigio piccolo come una didascalia.
  - **Quando, in grande e per primo**: giorno per esteso e orario in evidenza.
    È il dato che fa perdere le squadre — si sbaglia il giorno, si arriva
    all'ora sbagliata — e stava in coda al tipo di attività.
  - **Via il tipo di attività.** Che da noi sia un allenamento o un torneo, a
    chi viene a giocarci non cambia niente.
  - **Dove si gioca: il nome del posto, la mappa col segnaposto, e sotto il
    ritrovo con il pulsante che apre la navigazione.** L'indirizzo ricopiato
    sotto al nome non portava nessuno da nessuna parte. Il ritrovo ha spesso
    coordinate sue — un autogrill, un parcheggio prima del bosco — e sono
    quelle che ora apre il navigatore.
  - **Chi viene: verde per tutti quelli che hanno risposto**, che l'abbiano
    scritto loro o che l'abbiamo segnato noi per loro. Il grigio resta solo per
    il silenzio, che è un'altra cosa.
- **I referenti compaiono anche nell'invito, con il numero.** Da fuori una
  domanda — a che ora si parte davvero, dove si parcheggia — non aveva altro
  modo di arrivare che passare da chi aveva mandato il link. Si legge il
  callsign e il recapito, niente di più: nessun cognome, come in tutto il resto
  della pagina.
- **Un avviso attaccato alla casella del numero: il link è di quella squadra e
  non si gira fuori.** Chi ce l'ha può cambiare il numero di operatori che
  portano, e se ne accorgerebbero solo in campo. Stava scritto in fondo alla
  pagina, in grigio, dove lo si legge dopo averlo già inoltrato.
- **Nella scheda dell'attività il conto delle risposte si legge da lontano**:
  presenti in verde, forse in giallo, assenti in rosso, ognuno col suo numero
  grande. Era una riga grigia piccola, e quattro numeri della stessa misura si
  leggono uno per uno.

### Aggiunto

- **Quanti non si sono espressi**, accanto agli altri tre. Non è un assente: è
  la riga da cui nasce il messaggio nel gruppo il sabato sera, e finora non si
  vedeva da nessuna parte — mancavano all'appello senza che nessuno potesse
  contarli. Sulle attività su invito non compare: lì non è invitata la squadra,
  sono invitate delle persone, e il numero direbbe una cosa falsa.

## 2.49.0 — 17 settembre 2026

### Cambiato

- **I referenti dell'attività sono un elenco, uno per riga, con il numero
  accanto.** Erano una riga di callsign separati da un puntino, in mezzo agli
  altri dati: si leggeva a chi chiedere, ma non come raggiungerlo. Una domanda
  arriva nel momento in cui serve una risposta — come ci si veste, a che ora si
  parte davvero, dove si parcheggia — e se il numero bisogna andarselo a cercare
  in un'altra pagina finisce che si scrive nel gruppo e si aspetta.
- Il numero è un collegamento che apre il telefono, e accanto c'è **WhatsApp**,
  che è dove questa squadra si parla davvero. Chi non ha un numero registrato lo
  dice: una riga muta farebbe pensare a un guasto.
- Si continua a leggere il **solo callsign** — o il nome con l'iniziale, per chi
  non ce l'ha: il cognome non serve a chiamare nessuno.

## 2.48.0 — 17 settembre 2026

### Aggiunto

- **Il book di missione sta nell'attività.** Nella scheda, sotto le squadre
  ospiti, c'è il riquadro **Allegati**: si caricano PDF, Markdown e HTML fino a
  20 MB l'uno — i tre modi in cui un book arriva davvero — e **si leggono da
  qui**, senza scaricarli. Finora il book girava per WhatsApp: il giorno della
  giocata nessuno ritrovava il file, e chi lo ritrovava aveva quello di due
  versioni prima.
- **Si vede anche fuori, se si spunta.** Un allegato marcato *anche fuori*
  compare nella pagina d'invito delle squadre ospiti, che lo aprono con il link
  che hanno già. Se lo aggiorniamo il venerdì, chi torna su quella pagina trova
  la versione nuova senza che nessuno rimandi niente in chat. La spunta è spenta
  di suo: fra gli allegati finiscono anche i turni e i conti, e mandarne uno
  fuori deve essere un gesto.
- **Lo caricano l'admin, i team leader e i referenti di quella attività**: il
  book lo scrive chi la tiene in mano, e spesso lo finisce la sera prima. Per un
  referente è un permesso che vale su quell'attività e basta.
- **Sostituire non è caricarne un altro accanto**: il file nuovo prende il posto
  del vecchio sulla stessa riga, con lo stesso titolo e lo stesso indirizzo.
  Nessuno la domenica mattina deve trovarsi davanti a un «book v2» chiedendosi
  quale sia quello di oggi.
- L'ordine si dà **trascinando dalla maniglia** — il book in cima, gli allegati
  dopo — e ogni allegato si può scaricare: in campo la rete non c'è.

### Sicurezza

- **L'HTML caricato non gira dentro la nostra pagina.** È codice scritto da
  qualcun altro servito dal nostro indirizzo: senza precauzioni potrebbe
  leggersi la sessione di chi lo apre. Esce sotto `Content-Security-Policy:
  sandbox`, che gli dà un'origine sua e gli spegne gli script, e la pagina che
  lo mostra lo rinchiude una seconda volta nel proprio riquadro. Il Markdown non
  ha bisogno di niente di tutto questo: lo disegniamo noi, e resta testo.
- Il file non sta sotto `public/`: passa da una rotta che prima controlla chi
  sta chiedendo. Da dentro valgono le stesse regole con cui si apre la scheda —
  un indirizzo indovinato non apre quello che la pagina non mostra — da fuori
  vale il token dell'invito, e solo sugli allegati pubblici.

## 2.47.0 — 17 settembre 2026

### Cambiato

- **Referente di un'attività lo può essere solo chi ha il ruolo atleta.** Il
  referente è il nome a cui si chiede come ci si veste, a che ora si parte
  davvero, dove si parcheggia: sono risposte che sa chi in campo ci va. Chi
  tiene i conti o le tessere è prezioso altrove, e trovarsi messo come
  riferimento di una giocata vuol dire ricevere telefonate a cui non si sa
  rispondere. Chi gioca **e** amministra resta candidabile: i ruoli sono un
  insieme, e basta avere anche quello.
- Il controllo non sta solo nel modulo ma anche in chi salva: la spunta che
  arriva è una stringa mandata da un browser, e il posto dove si decide chi è
  candidabile non può essere la pagina che glielo chiede.

### Aggiunto

- **Una casella di ricerca sopra l'elenco dei referenti.** Una rosa cresce, e a
  trenta nomi scorrere dentro un riquadro alto quattro righe è già un mestiere:
  si scrivono tre lettere — callsign, nome o cognome, accenti compresi o no — e
  si spunta. **Chi è già scelto resta in cima e non sparisce mai**, qualunque
  cosa si stia cercando: un elenco in cui la ricerca nasconde una scelta già
  fatta è un elenco che fa togliere i referenti per sbaglio.
- Sotto l'elenco si legge quanti ne sono stati scelti, e se non ce n'è nessuno
  lo dice: *chi ha una domanda non sa a chi farla*.

### Corretto

- **Togliere l'ultimo referente adesso funziona.** Le caselle non spuntate non
  mandano niente, quindi «li ho tolti tutti» e «di referenti non si parlava»
  arrivavano identici a chi salva, che nel dubbio non toccava niente: il nome
  tolto tornava al suo posto da solo. Ora il modulo dice esplicitamente che di
  referenti si stava parlando.

## 2.46.0 — 17 settembre 2026

### Cambiato

- **Nel registro dei guasti non finisce più la rete che non c'è.**
  «NetworkError», «Failed to fetch», «Load failed»: sono il telefono passato
  sotto un ponte, il wifi caduto, o il gestionale che si stava riavviando per
  un rilascio. Non c'è niente da correggere nel codice, e quelle righe
  seppellivano quelle vere — otto guasti su nove erano di questa famiglia.
- **Fuori anche «Script error.»**, che è quello che il browser dice quando
  l'errore arriva da uno script di un'altra origine: quasi sempre
  un'estensione di chi naviga. Non ha stack, non ha riga, non ha niente: non è
  raccontabile nemmeno volendo.
- **Restano nel diario di bordo**, che è il posto giusto: se poi qualcosa si
  rompe davvero, lì si legge che in quel momento la rete non c'era.

## 2.45.0 — 17 settembre 2026

### Aggiunto

- **Chi non ha le notifiche se lo sente chiedere.** Dopo qualche secondo,
  in un angolo e senza coprire niente, compare l'invito ad accenderle: un
  pulsante *Attivale* e un *Non ora* che le rimanda di due settimane.
  Attivarle d'ufficio non si può — il browser vuole che sia la persona a
  premere, e un permesso chiesto appena si apre la pagina viene negato per
  riflesso, per sempre — quindi si fa la cosa più vicina possibile.
- **Chi il permesso l'ha già dato viene riscritto in silenzio.** Succede
  svuotando la cache o quando l'iscrizione scade da sé: prima restava spento
  senza che nessuno lo sapesse, ora si riscrive da solo senza chiedere niente.
- A chi ha detto di no al browser l'invito non compare: non c'è più niente da
  proporre, e insistere sarebbe solo fastidio.
- La procedura di iscrizione adesso vive in un posto solo, usata dal riquadro
  del profilo e dall'invito: due copie sarebbero due modi diversi di sbagliarla.

## 2.44.0 — 17 settembre 2026

### Aggiunto

- **«Mandami una prova» fra le notifiche del profilo.** Finora «le notifiche
  non mi arrivano» era una frase senza risposta: si poteva solo aspettare che
  succedesse qualcosa di vero per scoprire che non funzionavano. Ora si prova
  subito, e se non arriva si legge **il motivo** — nessun dispositivo iscritto,
  iscrizione fatta con chiavi vecchie, dispositivo che non esiste più — invece
  del silenzio.
- Un dispositivo che il servizio di push dichiara sparito viene tolto
  dall'elenco durante la prova, così non resta a sporcare i conti.

## 2.43.0 — 17 settembre 2026

### Aggiunto

- **Le pagine si aggiornano da sole.** Il gestionale disegna le pagine sul
  server: quello che si vedeva era la fotografia del momento in cui era stata
  aperta, e bastava che qualcuno si segnasse a un'attività — o che la segreteria
  spuntasse un incasso — perché diventasse vecchia senza dirlo. Ora ogni pagina
  si richiede al server ogni venticinque secondi e si aggiorna da sé.
- **Non si aggiorna quando darebbe fastidio**: a scheda nascosta (aggiornare
  una pagina che nessuno guarda è solo traffico), mentre si sta scrivendo in un
  campo, e con una finestra aperta sopra — lì si sta decidendo qualcosa.
- **Tornando sulla scheda si aggiorna subito**: è il momento in cui uno
  riguarda, ed è lì che i numeri vecchi danno più fastidio.

## 2.42.0 — 17 settembre 2026

### Aggiunto

- **Chi viene assicurato riceve i dati su WhatsApp.** Appena la giornaliera è
  attiva — sia quella presa dal portale sia quella registrata a mano — al suo
  numero arriva un messaggio con l'attività, il giorno, il numero di polizza e
  fino a quando vale. Prima quei dati restavano qui dentro e l'interessato lo
  sapeva solo se qualcuno glielo diceva a voce.
- **Parte dal numero della squadra e non blocca niente**: se il ponte WhatsApp
  non è collegato, o di quella persona non abbiamo un numero, la polizza si
  attiva lo stesso. Quando il messaggio parte, il gestionale lo scrive nella
  conferma: «Gli ho mandato i dati su WhatsApp».

## 2.41.0 — 17 settembre 2026

### Aggiunto

- **Un'attività può avere uno o più referenti.** Si spuntano nel modulo, fra
  chi è in rosa, sia quando l'attività nasce sia modificandola dopo: è il nome
  a cui chiedere, e cambia da un'uscita all'altra. Per questo sta attaccato
  all'attività e non agli incarichi di chi la organizza — e per questo lo può
  sistemare anche il team leader, insieme al punto di ritrovo, che è la roba
  che cambia il sabato sera.
- **Nella scheda si leggono in alto, fra i dati**, e li vedono tutti — **nuovi
  compresi**: uno arrivato da poco che non conosce nessuno deve sapere a chi
  scrivere per chiedere come ci si veste o a che ora si parte.
- **Si legge il solo callsign.** Basta a cercarlo in chat e non mette in giro
  il cognome di nessuno. Chi un callsign non ce l'ha compare come nome e
  iniziale, che è come i nuovi lo vedono già in tutto il resto del gestionale.

## 2.40.2 — 17 settembre 2026

### Corretto

- **Chi apre il link di accesso di un altro non glielo brucia più.** Capita di
  aprirlo per controllare che funzioni, subito dopo averlo creato: premendo si
  entrava *al posto di quella persona*, il gettone si consumava e le si
  impostava una password che conosceva solo chi aveva provato. Da fuori sembrava
  un link rotto — in realtà aveva fatto il suo lavoro, alla persona sbagliata.
  Ora, se chi apre è già collegato con un altro account, la pagina dice di chi è
  il link e **non lo tocca**: resta buono da mandare.
- Chi apre il proprio link mentre è già dentro si sente dire che non serve, e
  viene mandato al cambio password.
- Il rifiuto vale anche per il pulsante, non solo per la pagina: una scheda
  aperta prima di collegarsi non può entrare al posto di qualcun altro.

## 2.40.1 — 17 settembre 2026

### Corretto

- **Sul telefono il logo era tornato a farsi schiacciare.** Il contenitore
  della barra di ricerca è invisibile sul telefono ma restava in fila, largo
  quanto lo schermo: il marchio e il nome finivano compressi in «ZE…». Ora su
  quel formato non c'è proprio.
- **Il numero degli ospiti lo puoi scrivere anche tu.** Il referente spesso lo
  dice in chat o al telefono, e pretendere che apra il link per forza lasciava
  il conteggio a metà per un formalismo: accanto a ogni squadra c'è la
  casella, e vale quanto il numero scritto da loro.
- **Nel conteggio che vedono gli ospiti ci sono anche i nuovi.** Contava i soli
  tesserati, ma da fuori quella differenza non esiste: chi organizza deve
  sapere quante persone si presentano in campo, e quel giorno sono lì tutte
  allo stesso modo.

## 2.40.0 — 17 settembre 2026

### Aggiunto

- **Le squadre di fuori si invitano a un'attività, e ognuna ha il suo link.**
  Nella scheda c'è il riquadro *Squadre ospiti*: si sceglie una squadra fra
  quelle in anagrafica o si scrive il nome di chi non c'è ancora, e nasce un
  link da mandare al loro referente. Un link per squadra, non uno per tutti:
  così si sa sempre chi ha risposto cosa, e il primo che scrive un numero non
  lo scrive per gli altri.
- **Chi riceve il link non ha bisogno di un account.** Apre una pagina che
  mostra titolo e descrizione, quando, dove — con il pulsante per farsi portare
  da Google Maps — e chi viene: noi contati come una squadra, e le altre
  squadre con il loro numero. In fondo c'è l'unica cosa che può toccare:
  **quanti operatori porta**. Si cambia quante volte serve, tornando sullo
  stesso link.
- **Di noi si vede un numero, non un elenco.** Niente nomi, niente recapiti,
  niente quote, niente adesioni una per una: un link girato nella chat
  sbagliata non deve consegnare a nessuno l'anagrafica della squadra.
- **«Non ancora» è diverso da zero.** Una squadra che non ha risposto e una che
  ha detto «non veniamo» richiedono due telefonate diverse, e nell'elenco si
  leggono diverse.
- **A cose fatte il link lo dice.** Se l'attività è conclusa — o è passata la
  sua ora — la pagina ringrazia e basta; se è stata annullata lo scrive in
  rosso, senza raccontare il perché, che è cosa nostra. Il rifiuto vale anche
  lato server: una scheda rimasta aperta dal venerdì non scrive il lunedì.
- Togliendo una squadra dagli ospiti, il suo link smette di aprire qualsiasi
  cosa.

## 2.39.4 — 17 settembre 2026

### Corretto

- **Anche dentro la scheda dell'attività si potevano assicurare i «forse».** Il
  riquadro della copertura compariva per chiunque non avesse detto di no, con il
  suo «non assicurato» e il pulsante *Assicura* accanto: lo stesso difetto già
  corretto nell'elenco delle polizze, ma dall'altra porta. Ora si vede solo per
  chi ha confermato di venire, e ricompare appena un «forse» passa a «ci sono».
- **L'appello resta com'era**, ed è voluto: chi aveva risposto «forse» e poi si
  presenta va spuntato come tutti gli altri.

## 2.39.3 — 17 settembre 2026

### Corretto

- **La barra di ricerca cade esattamente sui bordi del contenuto.** Cominciava
  un po' più a sinistra e finiva un po' prima delle card sotto: la faccia stava
  dentro la stessa fila e le rubava larghezza, spostandole il centro. Ora la
  faccia è agganciata al bordo destro e fuori dal flusso, e la barra usa la
  stessa misura e la stessa centratura del contenitore delle pagine — i due
  bordi coincidono al pixel.

## 2.39.2 — 17 settembre 2026

### Cambiato

- **La faccia torna all'estrema destra, staccata dalla barra.** Appiccicata al
  bordo della ricerca sembrava parte della ricerca; ora c'è lo spazio che serve
  a capire che sono due cose diverse, e la riga di ricerca si prende tutta la
  colonna del contenuto.
- **Il callsign non si tronca più.** Era tagliato a centodieci pixel e certi
  nomi finivano a metà; essendo allineato a destra, adesso cresce verso
  sinistra — dove lo spazio c'è — e si legge intero.

## 2.39.1 — 17 settembre 2026

### Cambiato

- **La riga di ricerca è larga quanto la colonna sotto.** Comincia e finisce
  dove comincia e finisce il contenuto, invece di galleggiare in mezzo con una
  misura sua. Ed è un po' più alta, per non sembrare un ripensamento.
- **Scorrendo non si vede più la riga fra la parte sfocata e il resto.** La
  striscia in cima aveva un fondo pieno e un bordo sotto: il taglio fra sfocato
  e nitido attraversava lo schermo a ogni scorrimento. Ora la sfocatura vive in
  uno strato a sé che scende qualche pixel più in basso e si spegne sfumando —
  il contenuto passa sotto e riemerge a fuoco senza che si capisca dove finisce
  una cosa e comincia l'altra.

## 2.39.0 — 17 settembre 2026

### Aggiunto

- **Una riga per saltare dove si vuole, in cima allo schermo.** Si scrive
  «tar», compare *Tariffario*, si preme invio e ci si è. Cerca fra le voci del
  menu, senza accenti e senza maiuscole — «attivita» trova *Tipologie
  attività* — e quello che comincia con quelle lettere viene prima di quello
  che le contiene in mezzo: chi scrive «tar» cerca il tariffario, non le
  tessere. Si può cercare anche per reparto: «comando» tira su le sue voci.
- **Si apre con ctrl+K** (cmd+K sul Mac) o con la sola `/`, e la scorciatoia è
  scritta dentro la riga: si impara vedendola, non leggendo un manuale. Frecce
  per scegliere, invio per andare, esc per chiudere.
- **Solo sul computer**, ed è voluto: sul telefono la tastiera si mangia metà
  schermo per arrivare dove il pollice arriva già da solo, con la barra in
  basso. La colonna di sinistra invece è lunga, e chi ci lavora tutto il giorno
  sa già dove vuole andare.
- **Cerca solo fra le voci che quella persona può vedere**: il menu è già
  filtrato dai permessi, e da qui non si scopre una pagina che non spetta.

## 2.38.0 — 17 settembre 2026

### Aggiunto

- **I certificati medici si scaricano.** Accanto ad «Apri allegato» c'è
  «Scarica»: aprire serve a guardare se è quello giusto — anche subito dopo
  averlo approvato — scaricare serve a tenerselo.
- **E si scaricano tutti insieme**, in uno zip, dal pulsante in cima
  all'elenco. **Segue il filtro che stai guardando**: da «Da vagliare» escono
  quelli, da «Validi» quelli. Chi ha in mente una selezione la fa con i filtri,
  e il pulsante porta via esattamente quello che vede.
- **Il file esce con un nome che si legge**:
  `rossi-mario-certificato-scade-2027-03-14.pdf`. Quello che arriva è spesso
  `IMG_4471.jpg`, e dentro una cartella di scaricati — o in uno zip di venti —
  non dice niente a nessuno. Se due certificati della stessa persona scadessero
  lo stesso giorno, il secondo prende un numero invece di sovrascrivere il primo.
- Se un file risultasse in elenco ma non fosse più sul disco, lo zip si scarica
  lo stesso e dentro trovi un `MANCANTI.txt` che dice quanti sono.

## 2.37.0 — 17 settembre 2026

### Corretto

- **Nelle polizze comparivano anche i «forse», col pulsante per assicurarli.**
  L'elenco prendeva tutti quelli che non avevano detto di no, e un forse non è
  un sì: una polizza giornaliera consuma una polizza vera, non si annulla e la
  paga il club. Farla a chi ancora non sa se viene vuol dire buttarla via ogni
  volta che poi non si presenta. Ora si vede solo chi ha detto sì, e chi passa
  da «forse» a «sì» compare in quel momento — che è esattamente quando la
  polizza va fatta.
- **E il rifiuto adesso è anche dalla parte del server.** L'elenco mostra le
  persone giuste, ma la richiesta può arrivare da una pagina rimasta aperta da
  ieri o da chi nel frattempo ha cambiato risposta: chi non ha confermato si
  sente dire di no, con il motivo, invece di veder bruciare una polizza.

## 2.36.1 — 17 settembre 2026

### Corretto

- **Su iPhone il marchio finiva dietro alla tacca.** L'applicazione installata
  disegna sotto la barra di sistema — è così che si prende tutto lo schermo —
  ma l'intestazione non lasciava spazio al notch: «ZERO DARK OPS» e il numero
  di versione restavano nascosti là sotto. Ora quello spazio se lo prende, e
  solo dove serve: su un telefono senza tacca e sul computer non cambia nulla.
- **La barra in basso non arrivava a toccare il fondo.** L'altezza della pagina
  era misurata in `vh`, che su iPhone conta anche la striscia coperta dalle
  barre del browser: la pagina risultava più alta dello schermo. Ora si misura
  in `dvh`, quella vera.
- **E non balla più quando il dito lascia lo schermo**: nel rimbalzo elastico
  di iOS lo scorrimento va in negativo, e le due barre lo leggevano come «sta
  risalendo, rimettiti in vista».
- **Lo spazio in fondo alle pagine tiene conto della barra gesti**: l'ultima
  riga non finisce più sotto al menu.

## 2.36.0 — 16 settembre 2026

### Aggiunto

- **Quando esce un'attività nuova, il telefono suona.** La notifica dice il
  titolo, quando e dove — «sabato 20 settembre, 09:00 · Campo Dragon, Chivasso»
  — e toccandola si apre la scheda dell'attività, non una pagina qualunque.
- **La riceve chi quell'attività la può vedere**: aperta a tutti vuol dire
  anche i nuovi, di squadra vuol dire chi è in rosa, e su invito non si avvisa
  nessuno — al rilascio i partecipanti non ci sono ancora, e suonare per una
  cosa che non si può nemmeno aprire è il modo migliore per far spegnere le
  notifiche a tutti. Chi la rilascia non viene avvisato: lo sa già.
- **Suona una volta sola**, alla prima uscita dalla bozza. Cambiare i
  destinatari o riaprire un'attività conclusa non è una novità per nessuno.
- Nella riga non ci sono nomi né conti: una notifica si legge sullo schermo
  bloccato, spesso in mezzo ad altri.

## 2.35.1 — 16 settembre 2026

### Aggiunto

- **Chi aspetta l'approvazione trova l'invito al gruppo dei nuovi.** In cima
  alla pagina d'attesa, con il suo pulsante: è il posto dove fare domande — come
  funziona, cosa serve, come ci si veste — e dove si raccontano le uscite in
  programma. Si entra subito, senza aspettare la risposta: restare due giorni
  davanti a una pagina d'attesa senza nessuno con cui parlare è il modo più
  rapido per far perdere interesse a qualcuno che si era fatto avanti.

## 2.35.0 — 16 settembre 2026

### Cambiato

- **«Invia su WhatsApp» adesso manda davvero, dal numero della squadra.** Prima
  apriva la chat sul tuo telefono e l'ultimo tocco restava tuo; ora il
  messaggio parte dal ponte, come i promemoria e gli auguri. Chi lo riceve lo
  vede arrivare dal numero del team e non da quello personale di chi ha premuto.
- **La via di prima resta**, come riga sotto al pulsante: *«oppure apri la chat
  dal tuo telefono»*. Serve quando il ponte non è collegato — e serve a chi il
  collegamento non ce l'ha, perché il numero della squadra è di una persona
  sola, quella che l'ha rivendicato.
- **Il testo del messaggio adesso vive in un posto solo**, usato sia dal
  pulsante che copia sia da quello che spedisce: scritto due volte, prima o poi
  le due versioni si sarebbero allontanate. E quando parte dal ponte **non è il
  browser a dettarlo**: lo ricompone il server, che accetta solo un link di
  accesso di questa installazione. Chi sta davanti allo schermo sceglie a chi
  mandare le credenziali, non cosa far scrivere al numero della squadra.

## 2.34.2 — 16 settembre 2026

### Corretto

- **«Link già usato» senza averlo mai usato: era WhatsApp.** Quando si incolla
  un link in chat, WhatsApp lo apre dal proprio server per costruire
  l'anteprima — e lo stesso fanno antivirus e filtri aziendali. Quella visita
  bruciava il gettone prima che la persona lo toccasse. Ora il link porta a una
  pagina con un pulsante: aprirla non consuma niente, si entra premendo, e i
  robot i pulsanti non li premono.
- **Chi entra dal link non deve più digitare la vecchia password.** Non l'ha
  mai vista — la genera il gestionale e non esce di lì — e il cambio
  obbligatorio gliela chiedeva lo stesso: si restava chiusi fuori proprio
  mentre si faceva l'unica cosa richiesta. Ora, nel cambio obbligatorio, basta
  scegliere quella nuova. Dal proprio profilo la vecchia resta obbligatoria:
  lì serve a proteggere da chi trova un telefono sbloccato.

## 2.34.1 — 16 settembre 2026

### Corretto

- **Dal «serve ricollegare il numero» non si usciva.** Quando WhatsApp chiude
  la sessione dall'altra parte, le credenziali morte restavano nel volume: il
  ponte continuava a rimuginare su una connessione che non esisteva più e un
  codice nuovo non lo mostrava mai. E il pulsante *Scollega* compare solo a chi
  quel collegamento l'aveva fatto, quindi spesso non compariva a nessuno.
  Adesso il ponte, quando lo scollegano, **butta via la sessione e riparte da
  solo**: il codice ricompare senza che nessuno debba toccare niente.
- **C'è anche il pulsante «Ricomincia il collegamento»**, per l'admin, ogni
  volta che il ponte non è collegato. Non pretende che quel collegamento sia
  tuo: un ponte incastrato non è di nessuno.
- *Scollega* ora fa il lavoro fino in fondo — saluta WhatsApp, azzera la
  sessione e riparte — invece di lasciare le credenziali vecchie sul disco.

## 2.34.0 — 16 settembre 2026

### Corretto

- **Il codice QR di WhatsApp adesso si collega davvero.** Era disegnato una
  volta sola, quando si apriva la pagina — ma WhatsApp lo cambia ogni venti
  secondi: quello che si inquadrava era quasi sempre già scaduto, e il telefono
  non faceva niente. Ora il riquadro se lo riprende da solo ogni pochi secondi.
- **E resta a guardare anche dopo la scansione.** Appena il telefono accetta,
  WhatsApp chiude la connessione con un errore (515) e il ponte deve ripartire
  da capo per completare l'abbinamento: per qualche secondo non c'è né codice
  né collegamento. Prima sembrava un fallimento, adesso si legge «telefono
  agganciato: sto completando il collegamento», il ponte riparte in mezzo
  secondo invece che in due, e quando entra la pagina si aggiorna da sola.
- Se il riavvio del ponte fallisce, ora lo si legge nei log e nella pagina:
  prima falliva in silenzio e restava tutto fermo senza spiegazioni.

### Aggiunto

- **«Invia su WhatsApp» dopo il reset di una password.** Apre la chat di quella
  persona con il messaggio già scritto — utente e link di accesso — e resta a
  te l'ultimo tocco, quello che manda. Compare solo se di quella persona
  abbiamo un numero; il pulsante per copiare il messaggio resta lì accanto per
  tutti gli altri casi.

## 2.33.2 — 16 settembre 2026

### Corretto

- **Il link di accesso rimandava a un indirizzo che dal mondo non esiste.**
  Dentro al container la richiesta arriva come `http://0.0.0.0:3000`, e il
  rimando dopo l'ingresso portava lì: sessione aperta correttamente, e poi il
  telefono a sbattere contro il nulla. Ora l'indirizzo lo dice il proxy nelle
  sue intestazioni, come già fa per gli altri link del gestionale.

## 2.33.1 — 16 settembre 2026

### Corretto

- **Il link di accesso non faceva entrare.** Era scritto come pagina, e in
  Next.js una pagina non può scrivere il cookie di sessione: quel cookie lo
  mettono solo un'azione o una rotta. Risultato: il gettone veniva consumato,
  la sessione non nasceva, e chi apriva il link restava fuori — con un link
  ormai bruciato che al secondo tentativo rispondeva «già usato» senza che
  nessuno l'avesse usato. Ora è una rotta.
- **Verificare e bruciare sono due gesti separati.** Prima si guarda se il
  gettone vale, poi si apre la sessione, e solo alla fine lo si spegne: se
  qualcosa va storto nel mezzo il link resta buono e si può riprovare.
- **Chi arriva con un link scaduto o già usato ora lo legge**: sulla pagina di
  accesso compare una riga che dice cosa è successo, invece di lasciarlo
  davanti a un modulo che non spiega niente.

> I link mandati con la 2.33.0 sono da rifare: quelli si sono bruciati senza
> far entrare nessuno. Basta rigenerare la password e mandare il messaggio nuovo.

## 2.33.0 — 16 settembre 2026

### Aggiunto

- **Si entra anche col proprio numero di telefono**, oltre che con callsign ed
  email. Il confronto guarda le sole cifre, le ultime nove: in rubrica lo
  stesso numero è scritto in cinque modi — col prefisso, con gli spazi, col
  trattino — e chi entra digita quello che ha in testa. Se quel numero risulta
  a due persone il gestionale lo dice e chiede l'email, come già faceva per i
  callsign doppi.
- **Il reset della password consegna un link, non una password.** Il messaggio
  da incollare in chat adesso contiene come ci si chiama — il callsign, o
  l'email, o il telefono — e un link che fa entrare con un tocco e porta
  dritto alla scelta della password.

### Cambiato

- **Nel messaggio la password non c'è più.** Scritta in chat resta lì per
  sempre e la legge chiunque si trovi quel telefono in mano. Il link invece
  **vale sette giorni, si brucia al primo uso**, e nel database non è
  conservato: ce n'è solo l'impronta, come per le password. Un messaggio
  inoltrato per sbaglio, o ripescato in una chat mesi dopo, non apre più
  niente. La password generata resta visibile nel riquadro, fuori dal
  messaggio: serve a dettarla a voce a chi ce l'hai davanti.
- **Nel messaggio si legge il callsign** invece dell'email, quando c'è: è
  quello che uno si ricorda, ed è quello che deve scrivere nel primo campo al
  secondo accesso, quando il link non vale più.

## 2.32.0 — 16 settembre 2026

### Aggiunto

- **Chi si registra dal sito aspetta il via libera.** Prima entrava dritto come
  contatto e si trovava dentro: calendario, dove ci si vede sabato, chi c'è.
  Ora resta in un gradino a parte — *Registrato* — e vede **una pagina sola**,
  con i dati che ha mandato e nient'altro. Chi ha sbagliato a scrivere la
  propria email se ne accorge lì, non dopo tre giorni di attesa.
- **In cima ai Nuovi ci sono le richieste da approvare**, una card per uno, con
  tutto quello che hanno scritto: nome, callsign, recapiti, data di nascita,
  consenso alle foto. Due pulsanti, e non sono simmetrici: *Approva* è un gesto
  normale, *Rifiuta e cancella* chiede conferma perché cancella una persona.
- **Il badge accanto a «Nuovi» conta anche chi aspetta una risposta**, non solo
  chi non hai ancora guardato in faccia. Sono entrambe cose da fare.
- **Notifiche sul telefono, anche col gestionale chiuso.** Si accendono dal
  proprio profilo, un dispositivo alla volta. Oggi ne parte una: una
  registrazione da approvare, a chi la può decidere. Il messaggio non contiene
  dati di nessuno — titolo, una riga, e dove andare — perché una notifica si
  legge sullo schermo bloccato, e lì la legge chiunque abbia in mano il
  telefono. Era l'ultimo pezzo che aspettava il dominio: senza un certificato
  vero i browser non le permettono.

### Cambiato

- **Rifiutare una registrazione cancella i dati per davvero.** Al loro posto
  restano due impronte, una dell'email e una di nome, cognome e data di
  nascita, calcolate con la chiave dell'installazione: non dicono chi era, ma
  se quella persona ci riprova — anche cambiando indirizzo — sulla nuova
  richiesta compare l'avviso che una uguale era già stata respinta. Ricordarsi
  di un no senza tenersi l'anagrafica di chi non è entrato.

## 2.31.1 — 16 settembre 2026

### Corretto

- **Le attività annullate spariscono da «In programma».** Restavano in mezzo a
  quelle che verranno, col loro bollino rosso: chi scorreva l'elenco di corsa
  se le contava fra i programmi. La colonna laterale del mese le teneva già
  fuori, la lista no. Ora non c'è più questa differenza.
- **Non si perdono:** restano nella griglia del **mese**, dove serve vedere che
  quel sabato era occupato e non lo è più, e passata la data scendono nello
  **storico** con il motivo per cui sono saltate.

## 2.31.0 — 16 settembre 2026

### Aggiunto

- **Annullare un'attività adesso chiede perché.** Gli altri cambi di stato
  restano un clic e una conferma; annullare apre una finestra e vuole una
  riga: pioggia, campo occupato, eravamo in quattro. È l'unico stato che
  lascia dietro di sé una riga che da sola non si spiega — e a distanza di
  mesi «annullata» non distingue una giornata saltata per il tempo da una
  saltata perché non c'era nessuno.
- **Il motivo si legge dove serve**: nella fascia in cima alla scheda, così lo
  trova subito chi si era segnato e viene a vedere cos'è successo; al posto di
  «le adesioni sono chiuse» nel riquadro delle adesioni; e nello storico,
  sotto il titolo, sia nella tabella che nelle card del telefono.
- **Riaprendo l'attività il motivo se ne va con lei.** Raccontava
  l'annullamento di allora: lasciarlo lì farebbe sembrare annullata
  un'attività tornata viva.

## 2.30.1 — 16 settembre 2026

### Corretto

- **Le ore scritte dal server erano indietro di due.** Il fuso `Europe/Rome`
  era impostato da sempre nel compose, ma non ha mai fatto niente: l'immagine
  è basata su Alpine, che i dati dei fusi orari non li ha, e senza quelli la
  variabile `TZ` viene ignorata e il container resta a Greenwich. Così
  un'attività delle 20:00 si leggeva **18:00** in tutte le pagine composte dal
  server — calendario, dashboard, pagamenti — mentre quelle disegnate dal
  browser mostravano l'ora giusta. Ora `tzdata` è dentro l'immagine, e le due
  ore combaciano.
- **Stessa cura per il ponte WhatsApp**: gli auguri e il promemoria del giorno
  prima partivano sull'orario di Greenwich.
- Il database dell'ambiente locale riceve `TZ` come già faceva quello di
  produzione: nei log le ore sono quelle di qui.

## 2.30.0 — 16 settembre 2026

### Cambiato

- **Il gestionale è in rete: `https://ops.zerodarkteam.it`.** Gira su un server
  Aruba Cloud, con certificato vero di Let's Encrypt preso e rinnovato da Caddy.
  Niente più avviso «la connessione non è privata», e finalmente **il telefono
  propone di installare l'applicazione**: era il primo punto di `DA-FARE.md`,
  fermo da mesi in attesa di un indirizzo credibile.
- **Il test resta qui, la produzione no.** `zd.ps1` comanda solo l'ambiente di
  test; `up prod` e `copia-da-prod` ora spiegano che la produzione sta altrove
  invece di riaccendere una copia ferma al giorno del trasloco. I volumi
  `gestionale_*` rimasti su questo computer sono la copia di riserva.
- **La schermata senza connessione non parla più di ZeroTier.** Diceva che il
  gestionale gira sul computer del team e che serve essere in quella rete: da
  oggi è falso, e a leggerla uno si sarebbe messo a cercare un problema che non
  c'è.

## 2.29.1 — 15 settembre 2026

### Corretto

- **Il compose per il server pubblico adesso parte.** `docker-compose.prod.yml`
  montava `deploy/Caddyfile`, che non era mai stato salvato: il proxy non
  avrebbe avuto la sua configurazione. Ora c'è, e fa le stesse cose del nginx
  di casa — tetto di 12 MB ai caricamenti, attese lunghe per le server action,
  rimando da http a https — con un certificato Let's Encrypt vero.

### Aggiunto

- **`deploy/DEPLOY.md`: come si porta il gestionale su un server in affitto.**
  La macchina (16 GB, perché accanto gira il TAK), il dominio, `.env.prod`, il
  trasloco dei dati nell'ordine giusto e il controllo finale. Con un avviso in
  grassetto: `SESSION_SECRET` va copiata identica, perché è la chiave delle
  credenziali del portale federale.
- `DOMINIO` ed `EMAIL_CERTIFICATI` nel modello `.env.example`.

## 2.29.0 — 12 settembre 2026

### Cambiato

- **Inizio e fine di un'attività si scrivono in metà tempo.** Toccando
  l'inizio vuoto si riempie con oggi: si scrivono sopra giorno e mese e l'anno
  è già quello in corso, invece di ripartire da gg/mm/aaaa. Appena l'inizio è
  scritto la fine va sullo stesso giorno (alle 18, o a fine giornata se si
  comincia dopo), e si corregge solo l'ora. Se la fine era già su un altro
  giorno — la 24 ore dal venerdì alla domenica — spostando l'inizio si sposta
  anche lei degli stessi giorni, e l'attività non si accorcia di nascosto.
  Vale anche per le riunioni.

## 2.28.0 — 12 settembre 2026

### Tolto

- **Il tipo di gara non c'è più**: né la tendina nel modulo dell'attività, né
  la voce *Tipi di gara* fra i dati di base. Non governava niente, raccontava
  soltanto che gara fosse — e quello lo dicono già titolo e descrizione.
- **La durata dichiarata in ore resta**, nel modulo come prima. Nella scheda
  dell'attività si legge come «Durata gara», accanto alle date: è lì che uno
  si chiede perché una 24 ore tenga occupato un fine settimana intero.

## 2.27.0 — 12 settembre 2026

### Cambiato

- **Quale quota paga la polizza giornaliera lo dice la voce del tariffario**,
  non la cassa. Nella voce c'è «Paga la polizza giornaliera»: chi viene da
  fuori si assicura quando ha pagato (o segnalato) la quota che la contiene.
  Sul Corso CQB la giornata sì, l'istruttore no — anche se vanno a casse
  diverse, e anche se una stessa cassa ne chiede tutte e due. Nel tariffario si
  legge «paga la polizza», e nel modulo dell'attività le voci che la pagano
  hanno «· polizza». Le quote aggiunte con il + hanno la stessa spunta.
- **La spunta «Va pagata per la polizza» sulle casse non c'è più**: la
  sostituisce questa. Si parte da quello che c'era: le voci «giocata esterni»
  del tariffario pagano la polizza, e così gli importi scritti a mano sul club
  — che la polizza aspettava da sempre — e le quote aggiunte nate da una
  giocata esterni. Chi aggiunge un nuovo decidendo al volo il suo prezzo,
  decide anche la quota che paga la sua polizza.

## 2.26.1 — 11 settembre 2026

### Corretto

- **Nelle Polizze giornaliere il nome si legge intero, anche sul telefono.**
  Nome, quota e copertura stavano sulla stessa riga, e il nome era l'unica
  cosa che si poteva stringere: diventava «Jacopo "jak" Pomar…» o spariva del
  tutto. Adesso sta in alto accanto all'avatar, va a capo se serve, con sotto
  lo stato della quota; i giorni da coprire seguono, uno per riga.

## 2.26.0 — 11 settembre 2026

### Corretto

- **«Assicura» aspetta di nuovo che la quota sia versata.** La polizza
  giornaliera guardava solo la quota del club: sul Corso CQB, che al club non
  chiede niente, il pulsante si accendeva senza che il nuovo avesse pagato la
  giornata a nessuno. Adesso aspetta tutte le quote che contano — pagate, o
  almeno segnalate da chi le deve — sia nella scheda dell'attività sia nelle
  Polizze giornaliere, e anche lato server.

### Aggiunto

- **Ogni cassa dice se la sua quota serve per la polizza.** In «Altre casse»,
  nella scheda di una cassa, c'è «Va pagata per la polizza giornaliera»: accesa
  di serie per tutte, così la polizza aspetta tutto quello che l'attività
  chiede. Si spegne per una cassa che con la giornata non c'entra — l'istruttore
  di un corso — e allora la polizza non la aspetta. La quota del club conta
  sempre. Nell'elenco delle casse si legge «serve per la polizza» o «non conta
  per la polizza».

## 2.25.1 — 11 settembre 2026

### Corretto

- **Aggiungere un nuovo non chiede più un prezzo che c'è già.** Il selettore
  dei partecipanti guardava solo la quota del club: su un'attività che non
  chiede niente al club ma ha le quote di altre casse — il Corso CQB, 40 € a
  SAT & Gaming e 10 € a chi tiene i nuovi — diceva «questa attività non ha un
  prezzo per chi viene da fuori» e non lasciava aggiungere senza sceglierne
  uno. Adesso conta anche le quote delle altre casse: il prezzo si chiede solo
  quando davvero non ce n'è nessuno.

## 2.25.0 — 11 settembre 2026

### Cambiato

- **Nelle casse i pagamenti sono divisi per attività.** Nella cassa di chi
  incassa per conto suo e nei Pagamenti della segreteria ogni attività ha il
  suo gruppo, con il nome (si apre con un tocco), la data, quanti pagamenti ci
  sono e quanto resta da incassare: «del Corso CQB chi manca?» si legge a colpo
  d'occhio. Quello che un'attività non ce l'ha — iscrizioni, tessere,
  merchandising — sta in fondo, in «Altri pagamenti». I filtri restano quelli.
- **Nel modulo dell'attività le quote sono divise per cassa.** In ognuna delle
  due card le voci e le quote aggiunte stanno sotto il nome della loro cassa,
  il club per primo: la freccina accanto a ogni voce non serve più.

## 2.24.0 — 11 settembre 2026

### Cambiato

- **Tornano le due card di prima, con il + al posto dell'importo.** Nel modulo
  dell'attività ci sono di nuovo solo «Quota squadra» e «Quota esterni», con le
  voci del tariffario da spuntare: quelle di un'altra cassa hanno la freccina
  «→ Marco». I blocchi per cassa della 2.23.0 non ci sono più.
- **Quello che il tariffario non ha si aggiunge con «+ aggiungi una quota»**:
  a cosa serve, l'importo e la cassa (niente, il club). La quota aggiunta
  compare accanto alle voci del tariffario, già spuntata, e si toglie con la
  ×. Se ne aggiungono quante servono, anche più d'una per la stessa cassa, e
  valgono solo per quell'attività: alla prossima non ci sono.
- **Per ogni cassa le quote spuntate si sommano in un pagamento solo**, con
  il nome di tutte: «Istruttore + Campo» da pagare a SAT & Gaming. Sotto la
  card si legge quanto va a ciascuna cassa.
- **Le voci spuntate e le quote aggiunte si ritrovano riaprendo il modulo.**
  Gli importi che c'erano già — la quota del club scritta a mano, le quote
  delle altre casse — sono diventati quote aggiunte, già spuntate: nel Corso
  CQB si ritrovano «Quota istruttore + Campo» per SAT & Gaming e «Costo
  giornata softair» per Marco.

## 2.23.0 — 11 settembre 2026

### Cambiato

- **Le quote di tutte le casse si decidono in «Modifica», in una schermata
  sola.** Nella sezione Pagamenti c'è un blocco per ogni cassa: il club, e
  sotto quelle che l'attività usa — il Corso CQB chiede la giornata a Marco e
  l'istruttore a SAT & Gaming. Ogni blocco ha la quota squadra e la quota
  esterni, con l'importo a mano e le voci del **suo** tariffario, e «A cosa
  serve». Una cassa si aggiunge dalla tendina in fondo e si toglie dal suo
  blocco; più voci della stessa cassa si sommano in un pagamento solo verso di
  lei. La card laterale «Quote di altre casse», che costringeva a entrare e
  uscire dal modulo, non c'è più.
- **Le voci spuntate si ricordano.** Riaprendo «Modifica» si ritrovano spuntate
  com'erano, con l'importo scritto a mano a parte: prima si salvava solo il
  totale, e il «Costo giornata softair» spariva a ogni modifica. Le quote
  salvate prima di questa versione si riaprono con il totale nella casella a
  mano: basta rispuntare le voci una volta.
- **Su un'attività nuova la giocata degli esterni arriva già nel blocco della
  sua cassa**: se la voce è di Marco, il blocco di Marco compare da solo.

## 2.22.0 — 11 settembre 2026

### Cambiato

- **Il pallino della cassa nel menu conta le righe aperte**: le quote ancora
  da incassare, dichiarate o no, e i rimborsi da dare. Prima contava solo chi
  aveva detto di aver pagato, e una cassa piena di quote da riscuotere restava
  senza numero. Pagate, annullate e gestite fuori non contano: incassate
  tutte, il pallino si spegne.

## 2.21.1 — 11 settembre 2026

### Corretto

- **Nelle polizze giornaliere chi non ha una foto ha le sue iniziali**, non
  un'immagine rotta. L'avatar chiedeva la foto di tutti, anche di chi non l'ha
  mai caricata — i nuovi, quasi sempre — e al posto di «JP» compariva il
  riquadro dell'immagine che non si carica. Lo stesso errore c'era nell'elenco
  della regolarità degli operatori, nel menu in alto per chi non ha la foto e
  nella scheda di un annuncio del mercatino: sistemato ovunque.

## 2.21.0 — 11 settembre 2026

### Aggiunto

- **Nel tariffario una voce può avere la sua cassa.** Nel modulo della tariffa
  c'è la tendina «Cassa»: senza scegliere niente i soldi vanno al club, come
  sempre; scegliendo un'altra cassa — il corso di Mario — la voce va a lei.
  Nell'elenco del tariffario si legge «va a …».
- **Spuntata su un'attività, una voce di un'altra cassa diventa la quota di
  quella cassa**, invece di sommarsi alla quota del club: nel modulo si vede
  «→ Corso K9» accanto alla voce e il totale del club non la conta. Salvando,
  l'attività ha la sua «quota di altra cassa», per la squadra con le voci della
  card squadra e per gli esterni con quelle della card esterni (se non ce ne
  sono, pagano come la squadra). Se l'attività ce l'aveva già, si aggiorna.

### Cambiato

- **Iscrizioni, rinnovi e tessere restano del club**: le voci di un'altra cassa
  non compaiono nei loro moduli e non entrano negli automatismi. Anche il prezzo
  per gli esterni deciso aggiungendo un nuovo usa solo le voci del club.
- **Una cassa con delle voci nel tariffario non si elimina**: si spegne, come
  quando ha dei pagamenti.

## 2.20.0 — 11 settembre 2026

### Aggiunto

- **Un'attività finita e non chiusa è «Terminata».** Passata la finestra in
  cui è in corso, se nessuno ha fatto l'appello o l'ha conclusa, l'etichetta
  dice «Terminata» e la scheda ha la fascia «TERMINATA»: è pronta per essere
  chiusa.

### Cambiato

- **In programma, sopra a tutto, ci sono le correnti**: le attività in corso
  e quelle terminate ma non ancora chiuse, in un gruppo a parte prima degli
  anni. Non spariscono più dal programma appena cominciano, e una giornata
  finita resta lì a ricordare che va chiusa. Le terminate le vede chi le può
  chiudere, admin e team leader; per gli altri sono già storico. Nello
  storico le correnti non compaiono, per non vederle due volte. Le card
  dicono «In corso» o «Terminata».

## 2.19.0 — 11 settembre 2026

### Aggiunto

- **Un'attività può avere più quote, una per cassa.** Oltre a quella del club
  — il campo — si può chiedere una quota per un'altra cassa: l'istruttore del
  corso a Mario. Si aggiunge dalla card «Quote di altre casse» nella scheda
  dell'attività, con la cassa, a cosa serve e l'importo per la squadra e per
  gli esterni; si toglie da lì. Le deve chi deve la quota del club, e ognuna
  diventa un pagamento a sé nella sua cassa: la conferma chi la gestisce, con i
  suoi metodi, e la sollecita dal suo telefono. Togliendola, chi non l'aveva
  ancora pagata non la deve più.

### Cambiato

- **Il posto in formazione si conferma quando sono saldate tutte le quote.**
  Pagare il campo al club e non l'istruttore non basta a passare da convocato
  a titolare; vale per gli incassi, per le quote gestite fuori e per lo scambio
  con una riserva. Chi era già titolare quando la quota nuova è stata aggiunta
  resta titolare.
- **Nella scheda dell'attività ognuno vede tutto quello che deve**, cassa per
  cassa: «+ 20 € a Corso K9 · Istruttore». Il badge dei partecipanti conta
  tutte le quote, e nelle card del calendario la quota è la somma.

## 2.18.1 — 11 settembre 2026

### Cambiato

- **«Elimina attività» sta in fondo a «Modifica»**, non più fra i cambi di
  stato: eliminare non è un passo indietro ma una cancellazione, e accanto a
  Concludi e Riporta in bozza era troppo a portata di mano. Resta solo
  all'admin e con conferma; nell'elenco del calendario non cambia niente.

## 2.18.0 — 11 settembre 2026

### Aggiunto

- **Un'attività è «in corso» da sola**, dal ritrovo (o dall'inizio, se un
  ritrovo non c'è) fino alla fine; senza una fine scritta, fino a fine
  giornata. In cima alla scheda compare la fascia «IN CORSO», e l'etichetta di
  stato dice «In corso».

### Cambiato

- **Gli ICE compaiono solo mentre l'attività è in corso**, e restano chiusi:
  si aprono con la freccia quando servono. Prima si vedevano su ogni attività
  non ancora conclusa, anche settimane prima.
- **L'appello si apre dal ritrovo e resta finché non lo si chiude** con «Salva
  presenze e chiudi», anche a giornata finita. Prima dell'attività non c'è.
- **Lo stato dell'attività si cambia dall'etichetta in cima**: per l'admin
  apre una finestra con rilascio, destinatari, Concludi, Annulla e Riporta in
  bozza. La card «Stato dell'attività» nella colonna laterale non c'è più.
  «Concludi» e «Riporta in bozza» adesso chiedono conferma, come già Annulla.

## 2.17.0 — 11 settembre 2026

### Aggiunto

- **Una quota si può segnare «gestita fuori».** Quando un pagamento si
  regola fuori dal gestionale, chi tiene la cassa lo segna con «non gestito»:
  per l'app è chiusa come se fosse saldata, ma nell'incassato non entra niente.
  Si fa su una quota ancora tutta da pagare, non sui rimborsi, e resta scritto
  chi l'ha segnata e quando. Chi ci ripensa la riporta nel gestionale con
  «torna da gestire».
- **Nei pagamenti c'è il filtro «Gestiti fuori»**, in segreteria e nelle casse
  di chi incassa per conto suo.

### Cambiato

- **Una quota gestita fuori conta come pagata**: chi era convocato diventa
  titolare, il posto in formazione è suo, la polizza giornaliera si può fare, e
  nella scheda dell'attività si legge «gestita fuori». Chi la deve la vede
  scritta «si paga fuori dal gestionale», senza metodi né «Ho pagato».
- **Nei totali «da incassare» le quote gestite fuori non ci sono**: cassa,
  stagione, ordini e assistente contano solo quello che deve ancora passare
  dal gestionale. Una quota gestita fuori non si conferma né si dichiara
  pagata, e correggerne descrizione o importo non la riporta da pagare.

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
