# Zero Dark Team — Gestionale

Gestionale del team softair: operatori, calendario, campi, certificati medici,
iscrizioni, tessere federali e pagamenti. Interfaccia in italiano, tema scuro
ripreso dal logo, **card su telefono e liste su desktop**.

## Versione

La versione è **una sola**, quella di `package.json`, e da lì la legge il badge
che sta accanto a ZERO DARK nel menu e sulla pagina di accesso: chi usa il
gestionale vede sempre che cosa ha davanti, e per una segnalazione basta leggere
il badge.

Si numera come `MAJOR.MINOR.PATCH`:

| | quando si alza |
|---|---|
| **MAJOR** | cambia il modo di lavorare: qualcosa che si faceva prima non si fa più così |
| **MINOR** | funzioni nuove che non tolgono niente a quelle di prima |
| **PATCH** | correzioni e ritocchi |

Si alza il numero in `package.json` **nello stesso giro di modifiche**, insieme
alla voce corrispondente nel [registro delle modifiche](CHANGELOG.md): il badge
è quello che la squadra legge e cita nelle segnalazioni, e se non si muove
mentre l'applicazione cambia smette di voler dire qualcosa. Le migrazioni del
database restano indipendenti: hanno la loro data e vanno avanti da sole.

## Avvio con Docker

```bash
cp .env.example .env
docker compose up -d --build
```

L'app risponde su <http://localhost:3000>. Al primo avvio allinea lo schema e,
**se non esiste ancora nessun amministratore**, crea quello di partenza definito
in `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`): senza, ci si troverebbe
davanti a un login e nessuna credenziale per entrare.

Quell'account serve solo a quello. Appena nomini un amministratore vero — dalla
sua scheda o dai ruoli in blocco — **sparisce da solo**, e non torna: non è
l'email a decidere, è un marchio sul record, così un account cancellato apposta
resta cancellato. Da lì in poi il gestionale non ti lascia rimanere senza:
l'ultimo amministratore non si può né cancellare né declassare, prima se ne
nomina un altro.

**Prima dell'uso reale**: cambia `SESSION_SECRET`, la password admin e metti
`DEBUG_LOGIN=0`.

```bash
docker compose logs -f app     # log applicazione
docker compose down            # ferma tutto: i dati restano nei volumi
docker compose up -d --build   # riavvia dopo una modifica: i dati restano
```

> **`docker compose down -v` cancella tutto**, database e allegati compresi.
> È l'unico comando che azzera i dati: usalo solo quando vuoi davvero ripartire
> da zero.

## Modifiche allo schema

Lo schema è gestito con **migrazioni versionate** in `prisma/migrations/`.
All'avvio il container applica solo le migrazioni mancanti (`prisma migrate
deploy`) e non tocca nulla se non ce ne sono: un riavvio non può cancellare
dati.

Dopo aver modificato `prisma/schema.prisma` genera la migrazione:

```bash
npx prisma migrate dev --name descrizione-della-modifica
```

Nasce un file in `prisma/migrations/`: va versionato insieme al codice, e al
riavvio verrà applicato da solo. Non usare `prisma db push` su un database con
dati veri — allinea lo schema in modo distruttivo, cancellando le colonne che
non tornano.

## Accesso rapido per lo sviluppo

Con `DEBUG_LOGIN=1` la pagina di login mostra, a fianco del riquadro
credenziali, un pulsante per ogni figura; il seed crea gli account
corrispondenti (stessa password dell'admin):

| Pulsante | Account | Ruoli |
|---|---|---|
| Admin | `admin@zerodark.team` | Admin + Atleta |
| Amministrazione | `amministrazione@zerodark.team` | Amministrazione + Atleta |
| Segreteria | `segreteria@zerodark.team` | Segreteria |
| Team Leader | `tl@zerodark.team` | TL + Atleta |
| Atleta | `atleta@zerodark.team` | Atleta |
| Nuovo | `nuovo@zerodark.team` | nessuno (stato Nuovo) |

Con `DEBUG_LOGIN=0` spariscono sia i pulsanti sia gli account di prova.

## Ruoli

I ruoli sono **cumulabili**: un operatore può essere Atleta e Team Leader
insieme, o Amministrazione e Atleta.

| Ruolo | Cosa può fare |
|---|---|
| **Admin** | tutto: operatori, calendario, campi, statistiche, oltre a ciò che fanno gli altri |
| **Amministrazione** | invio richieste di iscrizione, valutazione dei moduli, certificati medici, tessere FIGT |
| **Segreteria** | pagamenti e quote |
| **TL** (Team Leader) | schiera titolari e riserve negli eventi, fa l'appello |
| **Atleta** | membro della squadra: calendario, adesioni, propri certificati e pagamenti |

**Identità dei nuovi** — l'elenco Nuovi, il nome e cognome per intero e la
scheda di chi non è ancora in squadra sono riservati ad **admin,
amministrazione e segreteria**. A tutti gli altri, Team Leader compresi, un
contatto appare come *Mario R.* e non ha scheda apribile: per schierarlo o
fargli l'appello basta, e chi passa una volta sola non lascia il proprio
cognome in giro per l'app. Dentro l'elenco Nuovi le azioni restano di chi le
può eseguire: invita solo l'amministrazione, elimina solo l'admin.

## Percorso di un nuovo operatore

```
Nuovo ──► (rifiutato)      resta a storico, ha dato problemi
  │   └──► (cancellato)    rimosso definitivamente
  │
  └──► richiesta di iscrizione inviata dall'amministrazione
        │
        ▼
  Attesa compilazione ──► l'operatore compila il modulo
        │
        ▼
  Attesa accettazione ──► valutazione dell'amministrazione
        │
        ▼
     Squadra            quota da versare + tessera da recuperare
```

Il **tipo di richiesta** (Iscrizione o Reiscrizione) determina la quota.
All'accettazione l'operatore entra in squadra, viene creata la voce di
pagamento e predisposta la riga della tessera federale.

Un operatore **Nuovo** non ha certificati, iscrizione né tessera: quelle
sezioni non compaiono proprio. Vede solo il calendario degli eventi *aperti*, vi
partecipa, e ha la voce "Miei pagamenti".

**Nuovi** (in Amministrazione) e **Operatori** sono due elenchi distinti: nei Nuovi stanno
i contatti che si stanno approcciando, con il monitoraggio di chi non torna più
(mai venuti, spariti da oltre 90 giorni) e la possibilità di eliminarli; in
Operatori stanno gli atleti registrati.

## Come funzionano le cose

**Calendario** — vista mensile con le attività colorate secondo la tipologia:
si clicca un giorno per vederle e, se sei admin, per aggiungerne una lì, con
inizio e fine già impostati su quel giorno. Un'attività può durare più giorni e
in quel caso compare su tutte le date che occupa. Sul desktop una colonna
laterale tiene sempre in vista le prossime attività. Restano disponibili le
viste elenco "In programma" e "Storico".

**Ciclo di vita di un'attività**

```
Bozza ──► Rilasciata ──► Conclusa
  ▲            │
  └────────────┴──► Annullata
```

Un'attività nasce sempre in **bozza**: in questa fase non serve dire a chi è
destinata e nessuno la vede tranne chi gestisce il calendario. La destinazione
diventa obbligatoria al **rilascio**, che è il gesto con cui l'attività comincia
a essere visibile e ad accettare adesioni: *solo squadra* oppure *tutti* (nuovi
compresi). Da lì si può concludere, annullare o riportare in bozza.

Lo stato non si cambia da una tendina: ogni transizione ha il suo pulsante sulla
card dell'attività, sia nell'elenco sia nella scheda. Accanto ai pulsanti di
stato c'è sempre l'eliminazione definitiva. La modifica si apre dal pulsante
**Modifica** in testata alla scheda.

**Tipologie di attività (dati di base)** — non sono cablate nel codice: stanno in
`Comando → Tipologie attività` e ognuna definisce

- il **colore** con cui compare nel calendario;
- la **categoria di quota** generata (torneo, gara, allenamento…);
- il flag **titolari e riserve**: attivo su gare e tornei, dove il Team Leader
  compone la formazione; spento su allenamenti e simili, dove lo schieramento
  non compare proprio;
- il flag **riservata alla squadra**: toglie il pulsante "rilascia a tutti",
  l'attività resta interna;
- il flag **richiede il certificato agonistico**: chi ha solo il non agonistico
  non può segnarsi.

Una tipologia già usata non viene cancellata ma disattivata, per non perdere lo
storico.

**Adesioni** — ognuno risponde *Ci sono / Forse / Non ci sono*, dalla scheda
oppure direttamente dalla card in elenco e nel calendario. La scheda mostra un
unico elenco raggruppato (titolari, riserve, da assegnare, forse, assenti): il
TL cambia lo schieramento sulla riga della persona, e a evento concluso fa
l'appello. Le presenze effettive alimentano statistiche e affidabilità.

**Due condizioni per scendere in campo**

1. **Certificato medico valido**, del tipo richiesto dalla tipologia. Senza,
   l'operatore non riesce a segnarsi e non può nemmeno essere aggiunto dallo
   staff: compare il motivo e il collegamento per caricarlo. I *nuovi*, che non
   hanno l'obbligo, non sono soggetti al blocco.
2. **Quota saldata, dove prevista.** Se l'attività ha un costo, segnarsi genera
   la quota legata a quell'attività: l'adesione c'è, ma il posto è confermato
   solo a saldo avvenuto. Ritirandosi la quota viene tolta, salvo che sia già
   stato incassato qualcosa.

**Le due quote di un'attività** — creando l'attività si compongono dal
**tariffario**, con lo stesso meccanismo delle richieste di iscrizione: si
spuntano le voci di listino e la quota è la loro somma, oppure si scrive
l'importo a mano, che vince sempre. Le quote sono due, perché chi è in squadra e
chi viene da fuori non pagano la stessa cosa:

| | chi paga | vuoto | zero |
|---|---|---|---|
| **Quota squadra** | chi è in rosa, sospeso o da riconfermare | gratis per loro | gratis per loro |
| **Quota esterni** | i nuovi, e chiunque non sia in squadra | pagano come la squadra | giocata offerta |

Nel filtro compaiono solo le voci di tariffario marcate **Giocata esterni** o
**per le attività**: iscrizioni, rinnovi e tessere federali stanno nello stesso
listino ma lì non c'entrano, e in mezzo alle altre si spunterebbero per sbaglio.
La voce *Giocata esterni* arriva già spuntata sulla quota esterni: il caso
normale — la giocata costa dieci euro — non va configurato ogni volta, e resta
possibile regalarla (zero), chiedere una cifra diversa, o aggiungere un
contributo campo anche alla quota della squadra.

Più voci fanno **una quota sola**: chi si segna riceve un pagamento unico con
lo spaccato scritto sotto — *Giocata 10,00 € + Campo Blaster Park 15,00 €*,
importo 25,00 € — visibile sulla scheda dell'attività, in "Miei pagamenti" e
alla segreteria. Se l'importo viene forzato a mano, il dettaglio lo dichiara
invece di far tornare male i conti.

Ognuno vede la quota che riguarda lui, sulla scheda e nelle card del calendario;
chi gestisce il calendario le vede entrambe con il dettaglio delle voci.

Sulle attività **a formazione** (gare e tornei) quello che si dichiara è la
*disponibilità*: alla gara partecipa chi il TL schiera come titolare, e con
l'attività a pagamento la disponibilità vale a quota saldata.

**Certificati medici** — caricati dall'operatore (PDF o foto, max 10 MB), stato
*In attesa* finché l'amministrazione non approva o rifiuta con motivazione. La
**scadenza non si digita**: vale sempre 364 giorni dal rilascio, quindi si
indica solo la data di rilascio e la scadenza compare calcolata. Un certificato
approvato diventa *Scaduto* da solo al superamento della data. **Una volta
validato non si modifica né si elimina**: se è sbagliato se ne carica uno nuovo,
vale il più recente.

*Non agonistico* copre allenamenti e partite ordinarie; *agonistico* (medico
dello sport, con elettrocardiogramma sotto sforzo) serve dove la tipologia lo
richiede — e lì il non agonistico **non basta**, vale come non averlo. La
differenza è spiegata nella pagina dei certificati. Gli allegati non
stanno in `public/`: passano da `/api/certificati/[id]`, che verifica sia il
proprietario o l'amministrazione.

**Squadre esterne** — anagrafica in `Comando → Squadre esterne`: gli altri team,
chi gestisce i campi, con i contatti diretti (chiama, WhatsApp, mail). Un campo
può essere **associato a una squadra**, oppure restare nostro: il collegamento è
facoltativo. La squadra compare nell'elenco campi, nella scheda del campo e
nella scheda dell'attività, così si sa a chi rivolgersi.

Una voce dei dati di base già collegata a qualcosa non viene cancellata ma
disattivata, e **resta visibile nella tendina dove è già in uso** (segnata come
disattivata): senza questo, modificare il record collegato ne farebbe perdere il
riferimento. Vale per squadre, tipologie e campi.

**Campi** — le coordinate non si scrivono a mano: si incolla il link di Google
Maps e vengono ricavate da lì, con l'anteprima sulla mappa. Il posto viene
cercato in tre modi, in cascata:

1. **coordinate scritte nel link** (`@45.46,9.19`, `!3d…!4d…`, `?q=lat,lng`);
2. **plus code**, il caso più frequente dei link condivisi dal telefono: la
   località citata nel link viene cercata su OpenStreetMap e serve da
   riferimento per ricostruire il codice, che è preciso a una decina di metri;
3. **ricerca dell'indirizzo** su OpenStreetMap.

Se non basta nessuno dei tre, il nome del posto viene comunque compilato e
viene detto chiaramente che le coordinate mancano. Nome, città e provincia si
compilano da soli quando il link li contiene.

Le mappe sono di OpenStreetMap: nessuna chiave da gestire, nessun tracciamento.
Compaiono nella scheda del campo, in quella dell'attività e come anteprima nel
form. Verso l'esterno il server contatta solo Google (per i link brevi) e
Nominatim (per la ricerca): nessun altro indirizzo.

**Tessere FIGT** — sono un codice da recuperare dal portale federale: la pagina
ha il collegamento al portale, il campo codice e la data di verifica. Non c'è
integrazione automatica: servirebbe un'API del portale, che non è pubblica.

**Pagamenti** — lo stato (Da pagare / Parziale / Pagato) è derivato dagli
importi, quindi non può diventare incoerente. Le quote **nascono dall'adesione**:
segnandosi a un'attività a pagamento compare la voce da saldare, ritirandosi
sparisce — a meno che non sia già stato versato qualcosa, e allora si abilita
**Chiedi il rimborso**. I rimborsi restano una voce separata, con il loro filtro
in elenco.

**Un incasso registrato non è più modificabile** né eliminabile: la contabilità
deve restare ferma. Per gli errori c'è una via d'uscita riservata all'admin, che
corregge l'importo lasciando scritto in nota chi, quando e perché.

**Polizze prova** — in Cassa c'è quante ne restano da usare: sono le
giornaliere che si fanno ai nuovi giorno per giorno, comprate a credito sul
portale federale, quindi soldi già spesi. Il numero si rilegge con **Aggiorna
dal portale** e resta scritto con la data della lettura, così la pagina non
interroga il portale a ogni apertura e continua a dire qualcosa anche quando
intranetasnwg.it non risponde. Sotto le cinque residue l'avviso diventa rosso.

**Cassa** (`Segreteria → Cassa`) — il saldo del team: quote incassate, meno i
rimborsi erogati, più le entrate e meno le uscite registrate a mano
(materiale, affitto campo, contributi). I **metodi di pagamento** sono
dati di base (`Comando → Metodi di pagamento`): per ognuno si dice se
l'operatore può dichiararlo da sé e con quali istruzioni (IBAN, numero
Satispay…). Chi paga con un metodo dichiarabile segnala il versamento dalla
propria pagina; la quota risulta saldata solo quando la segreteria conferma
l'incasso.

**ICE — In caso di emergenza** — la lista della squadra con gruppo sanguigno,
allergie e note mediche, e il contatto da chiamare, ordinata mettendo per primi
quelli con una segnalazione. Sono dati sanitari: li vedono solo admin,
amministrazione e Team Leader (che in gara deve saperlo).

**Foto del profilo** — si carica dalla propria pagina e si ritaglia nel browser
dentro una maschera tonda, trascinando e ingrandendo; al server arriva già il
quadrato finito. Le foto stanno nel volume degli allegati, non in `public/`, e
passano da `/api/foto/[id]` che richiede l'accesso.

**Scheda di un compagno** — cliccando un partecipante si apre la sua scheda
operatore: nome, callsign, ruoli, presenze e i pulsanti per **chiamarlo**,
**scrivergli su WhatsApp** o **mandargli una mail** (link nativi, sul telefono
aprono direttamente l'app). Non compare nulla di personale — anagrafica,
residenza, dati sanitari, certificati, pagamenti restano all'interessato e a chi
ha un incarico che li richiede.

**Ricerca** — le liste filtrano mentre digiti, senza premere invio: valgono
anche per le tendine dei filtri.

## Messaggi WhatsApp

In `Comando → Messaggi WhatsApp` (solo admin) il gestionale scrive nel gruppo
della squadra: auguri di compleanno, promemoria dell'attività del giorno dopo
con indirizzo e link alla mappa, solleciti delle quote aperte e dei certificati
in scadenza.

**Come è fatto.** La connessione vive in un servizio a parte (`whatsapp/`), che
tiene la sessione aperta come farebbe un telefono collegato. Non pubblica porte:
ci arriva solo il gestionale, dalla rete interna di Docker, presentando
`SEGRETO_WHATSAPP`. La sessione sta nel volume `whatsapp`, quindi il codice si
inquadra una volta sola e non a ogni riavvio.

**Perché non l'API ufficiale di Meta.** Quella nei gruppi non scrive, e i gruppi
sono il posto dove questa squadra si parla. Il prezzo della scelta è che si esce
dai termini di servizio di WhatsApp: **va usato un numero dedicato**, mai quello
personale di chi gestisce il team, perché il rischio, se qualcosa va storto, è
che quel numero venga bloccato.

**Il collegamento è di una persona, non di un ruolo.** Lo rivendica chi ha
inquadrato il codice, e nessun altro amministratore può mandare messaggi da quel
numero: deve scollegare e collegare il proprio. Nel database non finisce nessun
token — solo di chi è il collegamento e su quale gruppo scrive.

**Il modello dice quando e dove, i testi dicono come.** Un modello — «Auguri di
compleanno» — sceglie una volta sola il momento e il gruppo su cui scrivere, e
dentro tiene quanti testi si vuole. Il gestionale usa a turno quello fermo da più
tempo, così dieci auguri di fila non sono dieci volte la stessa frase, e due
compleanni lo stesso giorno non escono identici uno sotto l'altro. Il giorno che
la squadra apre un gruppo nuovo si cambia una riga, non trenta.

Nel testo si mettono segnaposto come `{nome}`, `{callsign}`, `{anni}`,
`{attivita}`, `{indirizzo}`, `{mappa}`: quelli senza valore spariscono invece di
restare a vista.

**I testi si incollano in blocco.** Trenta modi di fare gli auguri, uno per riga
(o separati da una riga di `---` se vanno a capo), entrano in un colpo solo:
passarli uno per uno da una finestra che si apre e si chiude è il motivo per cui
poi restano due. Un assistente collegato può proporne di suoi con
`aggiungi_testi` — entrano **spenti**, perché cinquanta frasi generate
contengono sempre le tre che non diresti mai, e qualcuno deve leggerle prima.

**Si prepara, si guarda, poi si manda.** I messaggi non partono da soli: prima
compaiono in elenco col testo definitivo, e si scartano quelli che stonano. Un
messaggio automatico sbagliato non si corregge dopo — è già sul telefono di
qualcuno. I doppioni sono impossibili: un vincolo del database tiene il
compleanno a una volta l'anno e il promemoria a una volta per attività.

I messaggi in privato partono solo a chi ha dato il **consenso alle
comunicazioni** e ha un numero in scheda; nel gruppo il consenso non serve,
perché è la chat in cui la squadra si parla già.

## Assistenti collegati (MCP)

Dalla voce **Assistente** ognuno crea una chiave personale e ci collega un
assistente che parla MCP. L'indirizzo è `/api/mcp` sullo stesso gestionale, la
chiave viaggia come `Authorization: Bearer`; quando la crei trovi già il comando
pronto da copiare.

**Il punto è che una chiave non dà poteri, li eredita.** Chi entra da qui lavora
*per conto* di una persona: si risale a lei dalla chiave, e da quel momento il
resto dell'applicazione non sa nemmeno che la richiesta non arriva da un browser.
I permessi sono i suoi, controllati dallo stesso codice che li controlla nelle
pagine (`src/lib/identita.ts`). Non esiste un secondo elenco di permessi per gli
assistenti: sarebbe una seconda verità da tenere allineata, e prima o poi
divergono.

Ne discendono tre cose:

1. **un assistente vede solo gli strumenti che competono alla persona** — a un
   atleta non compare `cassa_riepilogo`, e non gli viene nemmeno proposto;
2. **chi cambia ruolo cambia poteri lo stesso giorno**, chiavi già create
   comprese, senza che nessuno debba ricordarsene;
3. **le regole di merito restano quelle**: rispondere a un'attività da un
   assistente passa dagli stessi controlli — adesioni aperte, posti, quota
   addebitata, certificato medico dove serve — perché gli strumenti che scrivono
   chiamano le stesse azioni dei moduli, non una copia.

**Della chiave si conserva solo l'impronta** (SHA-256): si legge una volta sola,
e chi la perde ne fa un'altra. Vale quanto una password — quello che l'assistente
fa risulta fatto da quella persona — e si revoca dalla stessa pagina.

Gli strumenti stanno in `src/lib/mcp/strumenti.ts`, uno per voce, ognuno con
accanto il permesso che richiede.

## Note private, commenti e “mi piace”

Nella stessa pagina di un'attività convivono due cose opposte, e vale la pena
tenerle distinte.

**I commenti e i “mi piace” sono di tutti.** Il permesso non è un ruolo ma la
visibilità dell'attività stessa: se la vedi, puoi dire la tua. Il proprio
commento si cancella sempre, quello altrui solo l'admin — serve a togliere una
frase fuori posto, non a rileggere quello che scrive la squadra.

**Le note le legge solo chi le ha scritte.** Le scrive chi ha un incarico —
comando, amministrazione, segreteria, team leader — e non le vede nessun altro,
admin compreso. Non è una svista: è il patto che le rende utili, perché una nota
su una lite o su un comportamento la si scrive com'è andata solo se non finisce
sotto gli occhi di altri. Due persone che aprono la stessa scheda vedono cose
diverse, ed è esattamente il punto.

Una nota ha un titolo e un testo in Markdown, e si appunta a una persona, a
un'attività, o a nessuna delle due. Scrivendo `@` compare l'elenco delle persone:
chi viene nominato se la ritrova sulla propria scheda — sempre e solo sotto gli
occhi di chi l'ha scritta. Così *«@vipera ha coperto bene il fianco destro»*, annotata su
una giocata, la si ritrova anche aprendo l'uno o l'altro senza riscriverla due
volte. Le citazioni si **ricavano dal testo a ogni salvataggio**: non sono un
elenco tenuto a parte che prima o poi non corrisponde più a quello che c'è
scritto. Una chiocciola che non corrisponde a nessuno resta scritta e non viene
evidenziata, senza diventare un errore.

La pagina **Note** raccoglie le proprie, con la ricerca nel titolo e nel testo.

**L'editor Markdown** (`src/components/EditoreMarkdown.tsx`) serve alle note e a
statuto e regolamento. Non è un editor visuale e non vuole esserlo: quello che si
scrive resta il testo che finisce nel database. L'anteprima usa lo stesso
componente che poi mostra il testo per davvero, così se qualcosa si vede storto
lo si scopre subito.

## Mercatino

Una bacheca interna: chi ha roba da vendere la mette, chi la cerca la trova.
**La vedono tutti**, contatti compresi — una bacheca che metà squadra non può
aprire non è una bacheca. **Pubblicare** è di chi è in squadra; per i nuovi c'è
un interruttore che l'admin accende quando vuole, e sta nelle impostazioni e non
nel codice proprio perché la risposta può cambiare senza un rilascio.

**Un annuncio è un lotto, non un oggetto.** *«Vendo tutto: torcia 50, tattico
100, mesh 150»* è un annuncio solo, con una foto e tre voci: ognuna ha titolo,
prezzo e descrizione sue, e si vende per conto suo. Anche un oggetto singolo è
un lotto di uno — così non esiste un ramo del codice che vale solo per gli
annunci semplici. In bacheca la card mostra l'intervallo dei prezzi, calcolato
**su ciò che resta**: quando è venduto tutto tranne la mesh, si legge il prezzo
della mesh.

**Due nature di merce**, che si comportano in modo opposto. Il **pezzo unico**
si prenota e si vende, e finisce lì. La **merce riordinabile** — le magliette,
le mimetiche — non ha stato di vendita, perché non c'è niente da esaurire:
metterlo lo stesso e poi ricordarsi ogni volta di ignorarlo sarebbe il modo
sicuro di sbagliare da qualche parte.

**La copertina la sceglie chi vende.** Nel database è un riferimento dalla
scheda alla foto, non una casella su ogni foto: così la copertina è una per
costruzione, e non può succedere che due se la contendano.

**Le foto si rimpiccioliscono nel browser** prima di partire (lato lungo 1600),
e insieme parte una **miniatura** che è quella usata dalle card. Il motivo è
pratico: una foto da telefono pesa otto mega, e venti card con la foto intera
dentro ZeroTier danno una pagina che sembra rotta senza esserlo. Le immagini
stanno nel volume degli allegati e passano da `/api/mercatino/foto/[id]`, che
richiede l'accesso; eliminando un annuncio **spariscono anche i file**.

Il piano delle parti che mancano — commenti, chiocciole sulle voci, messaggi
privati, merchandising con le quote in cassa — è in `DA-FARE.md`.

## GDPR

- Consenso raccolto alla registrazione con **data e versione** dell'informativa;
  i consensi facoltativi (immagini, comunicazioni) sono revocabili dal profilo.
- Informativa consultabile in `/privacy`, con finalità, basi giuridiche, tempi
  di conservazione e diritti.
- **Diritto di accesso e portabilità**: esportazione JSON completa da
  `/api/gdpr/esporta`.
- **Diritto alla cancellazione**: l'interessato la richiede dalla pagina
  privacy, l'admin esegue la cancellazione definitiva (che rimuove anche gli
  allegati dal disco) dalla scheda operatore.
- I certificati medici, categoria particolare di dati, sono accessibili solo al
  proprietario e a chi ha il ruolo Amministrazione.

## Usare il logo originale

Il marchio è un SVG che riprende il logo (visore a quattro tubi, teschio,
tricolore). Per usare il file originale: salvalo in `public/logo.png` e
sostituisci il corpo di `src/components/Logo.tsx` con

```tsx
export function Logo({ size = 40 }: { size?: number }) {
  return <img src="/logo.png" width={size} height={size} alt="Zero Dark Team" />;
}
```

## Struttura

```
prisma/schema.prisma        modello dati
src/lib/                    auth, permessi, GDPR, formattazione, storage, query
src/actions/                server action (una per area funzionale)
src/components/             UI condivisa: liste responsive, filtri live, modali, grafici
src/app/(app)/              pagine autenticate
src/app/api/                allegati protetti ed esportazione GDPR
```

Le liste usano il componente `Elenco`: card sotto i 768 px, tabella sopra.

## Sviluppo senza Docker

```bash
npm install
npx prisma db push
node prisma/seed.mjs
npm run dev
```

## Backup

I dati stanno in due volumi Docker: `db-data` (database) e `uploads`
(certificati).

```bash
docker compose exec db pg_dump -U zerodark zerodark > backup.sql
```

## Due ambienti

Il gestionale gira su due stack Docker separati e indipendenti.

| | produzione | test |
|---|---|---|
| indirizzo | http://localhost:3000 | http://localhost:3100 |
| progetto Docker | `gestionale` | `zerodark-test` |
| volumi | `gestionale_db-data`, `gestionale_uploads` | `zerodark-test_db-data`, `zerodark-test_uploads` |
| file di configurazione | `.env` | `.env.test` |
| polizze sul portale FIGT | attive | **bloccate** |

Database, caricamenti e chiavi di firma non si toccano fra i due.

Si comandano con `zd.ps1`:

```powershell
.\zd.ps1 up test          # avvia o ricostruisce il test
.\zd.ps1 up prod          # avvia o ricostruisce la produzione
.\zd.ps1 stato            # cosa sta girando, e i volumi
.\zd.ps1 logs test        # cosa dice l'app
.\zd.ps1 copia-da-prod    # porta i dati veri dentro al test
.\zd.ps1 down test        # spegne, senza cancellare niente
.\zd.ps1 azzera-test      # cancella i dati del solo test
```

`down` non cancella mai i dati. L'unico comando che li butta via è
`azzera-test`, che chiede conferma e tocca soltanto il test.

### Perché in test le polizze sono bloccate

Attivare una polizza prova sul portale federale consuma una polizza vera e non
si annulla. In test l'attivazione automatica rifiuta e lo dice; per provare il
flusso c'è "L'ho già attivata a mano", che registra un numero senza chiamare
nessuno.

Anche le credenziali del portale sono al sicuro: sono cifrate con
`SESSION_SECRET`, che in test è diverso. Copiando i dati da produzione restano
illeggibili, quindi nemmeno per sbaglio il test può parlare col portale con
l'utenza vera.
