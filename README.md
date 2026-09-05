# Zero Dark Team — Gestionale

Gestionale del team softair: operatori, calendario, campi, certificati medici,
iscrizioni, tessere federali e pagamenti. Interfaccia in italiano, tema scuro
ripreso dal logo, **card su telefono e liste su desktop**.

## Versione

La versione è **una sola**, quella di `package.json`, e da lì la legge il badge
`v1.0.0` che sta accanto a ZERO DARK nel menu e sulla pagina di accesso: chi usa
il gestionale vede sempre che cosa ha davanti, e per una segnalazione basta
leggere il badge.

Si numera come `MAJOR.MINOR.PATCH`:

| | quando si alza |
|---|---|
| **MAJOR** | cambia il modo di lavorare: qualcosa che si faceva prima non si fa più così |
| **MINOR** | funzioni nuove che non tolgono niente a quelle di prima |
| **PATCH** | correzioni e ritocchi |

Si alza il numero in `package.json` nello stesso commit che porta la modifica,
e le migrazioni del database restano indipendenti: hanno la loro data e vanno
avanti da sole.

## Avvio con Docker

```bash
cp .env.example .env
docker compose up -d --build
```

L'app risponde su <http://localhost:3000>. Al primo avvio allinea lo schema e
crea l'account admin definito in `.env` (`SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`).

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
