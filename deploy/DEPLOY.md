# Il gestionale su un server pubblico

Come si porta il gestionale da questo PC a una macchina in affitto, con un nome
a dominio e un certificato valido. Il compose è `docker-compose.prod.yml`, il
proxy è Caddy con il suo `deploy/Caddyfile`.

Da quel momento il gestionale non sta più dentro la rete di casa: sta su
internet, con anagrafiche, recapiti e certificati medici dentro. Per questo il
database non pubblica porte e l'applicazione nemmeno: ci arriva il proxy, e
basta.

## La macchina vera, quella di adesso

> **Leggi questo prima dei capitoli numerati.** Da «1. La macchina» a «6.
> Controllo» c'è il trasloco **come era stato progettato**: Hetzner, ZeroTier,
> il TAK a fianco. Il trasloco poi si è fatto diversamente, e restano lì perché
> raccontano il ragionamento — non perché descrivano il server su cui gira il
> gestionale oggi. Quello è questo:

| | |
|---|---|
| indirizzo | `https://ops.zerodarkteam.it` |
| macchina | VPS Aruba Cloud, 2 vCPU, 4 GB, 80 GB, Ubuntu 24.04, datacenter in Italia |
| ssh | solo a chiave, **niente password**. Indirizzo, utente e chiave non stanno qui: vedi il riquadro sotto |
| codice | `/opt/gestionale`, **non** nella home |
| configurazione | `/opt/gestionale/.env.prod`, permessi 600, fuori dal repository |
| container | `zd-app`, `zd-db`, `zd-whatsapp`, `zd-proxy` (Caddy) |
| TAK | **non installato**: vuole 8 GB tutti suoi e questa macchina ne ha 4 |

> **Questo repository è pubblico.** Indirizzo IP, nome utente e chiave del
> server non si scrivono qui dentro, nemmeno «tanto per comodità»: messi in un
> file versionato diventano leggibili da chiunque e restano nello storico anche
> dopo averli tolti. Stanno dove stanno le altre credenziali della squadra, e
> chi fa i rilasci li ha già. Lo stesso vale per `.env.prod`, che infatti sul
> server ha i permessi 600 e nel repository non c'è.

Il `ufw` è acceso, ma **Docker lo scavalca**: le porte pubblicate dai container
sono raggiungibili comunque. Se un domani si vuole chiudere qualcosa, va chiuso
nel compose o nel firewall del fornitore, non in `ufw`.

## Cosa gira sulla macchina

| servizio | tetto di memoria | porte aperte a internet |
|---|---|---|
| database | 2 GB | nessuna |
| gestionale | 2 GB | nessuna, ci arriva il proxy |
| ponte WhatsApp | 1 GB | nessuna |
| proxy (Caddy) | — | 80, 443 (tcp e udp) |
| TAK server, a fianco | 8 GB | le sue, vedi sotto |

Sono 13 GB di tetti: **servirebbe una macchina da 16 GB**. Con 8 GB il TAK e il
gestionale si contenderebbero la memoria e a cadere sarebbe il primo che ne
chiede di più.

Ed è qui che il piano ha girato: il TAK è rimasto fuori, e con lui la macchina
da 16 GB. Quella in affitto ne ha 4 e le bastano — il gestionale da solo non
arriva al suo tetto di 2 GB. Il giorno in cui il TAK si vuole davvero, non si
aggiunge qui: si prende una macchina sua.

## 1. La macchina

Su Hetzner Cloud, un server con **16 GB di RAM** nella linea a vCPU condivise
(i nomi dei piani cambiano da un listino all'altro: conta la RAM), sistema
**Ubuntu 24.04**, datacenter in Germania o in Finlandia — i dati restano
nell'Unione Europea.

Nella creazione:

- **Backup** attivati: costano il 20% del server e tengono sette copie
  dell'intera macchina. Non sostituiscono il `pg_dump`, lo affiancano.
- **Firewall** di Hetzner con in ingresso solo 80/tcp, 443/tcp, 443/udp e le
  porte del TAK. La 22 **non** va aperta a internet: si entra da ZeroTier.
  *(Sul server vero la 22 è rimasta aperta sul nome pubblico, con accesso a
  sola chiave: si entra senza VPN.)*
- Una chiave SSH, non una password.

Appena accesa, dalla console di Hetzner:

```bash
curl -s https://install.zerotier.com | sudo bash
sudo zerotier-cli join <id-della-rete>
```

Si autorizza la macchina nel pannello di ZeroTier e da lì in poi ci si collega
col suo indirizzo 10.147.x.x.

## 2. Il dominio

Si crea un record `A` — per esempio `gestionale.tuodominio.it` — con l'indirizzo
**pubblico** della macchina (non quello ZeroTier), più un `AAAA` se c'è l'IPv6.

Va fatto **prima** di accendere Caddy: al primo avvio chiede subito il
certificato, e Let's Encrypt limita i tentativi falliti per ora. Si controlla
che il nome risponda con `nslookup gestionale.tuodominio.it`.

## 3. Docker e il codice

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # poi si esce e si rientra
git clone https://github.com/whiskas85/team-management.git gestionale
cd gestionale
```

Se il repository è privato serve una *deploy key* in sola lettura, creata
sulla macchina e aggiunta nelle impostazioni del repository su GitHub.

Tutti i comandi che seguono passano dallo stesso compose e dallo stesso nome di
progetto, così i volumi si chiamano `gestionale_*` come a casa:

```bash
alias zd='docker compose -p gestionale -f docker-compose.prod.yml --env-file .env.prod'
```

## 4. `.env.prod`

Sta solo sulla macchina, non nel repository.

```ini
POSTGRES_USER=zerodark
POSTGRES_PASSWORD=          # nuova: openssl rand -hex 24
POSTGRES_DB=zerodark
TZ=Europe/Rome

SESSION_SECRET=             # IDENTICA a quella del .env di casa
SEED_ADMIN_EMAIL=           # gli stessi del .env di casa
SEED_ADMIN_PASSWORD=
SEGRETO_WHATSAPP=           # nuovo: openssl rand -hex 16

DOMINIO=gestionale.tuodominio.it
EMAIL_CERTIFICATI=          # dove Let's Encrypt manda gli avvisi di scadenza
```

**`SESSION_SECRET` non si cambia.** Oltre a firmare le sessioni, è la chiave con
cui sono cifrate le credenziali del portale federale (`src/lib/segreti.ts`):
con una chiave nuova il trasloco riuscirebbe, ma l'attivazione delle polizze
smetterebbe di funzionare finché qualcuno non reinserisce l'utenza.

La password del database invece si cambia gratis: sulla macchina nuova il
database nasce vuoto, con la password che si sceglie qui.

## 5. Il trasloco dei dati

**A casa**, si ferma il gestionale — da qui in avanti nessuno scrive, e quello
che si copia è l'ultima versione dei dati:

```powershell
docker stop zd-app
docker exec zd-db pg_dump -U zerodark -d zerodark -Fc -f /tmp/prod.dump
docker cp zd-db:/tmp/prod.dump backup/prod.dump
docker run --rm -v gestionale_uploads:/dati -v ${PWD}/backup:/b alpine tar czf /b/uploads.tgz -C /dati .
scp backup/prod.dump backup/uploads.tgz <utente>@10.147.x.x:gestionale/
```

Il dump esce dal container con `docker cp` e non con `>`: in PowerShell 5.1 la
redirezione riscrive il file in UTF-16 e `pg_restore` non lo riconosce più.

**Sulla macchina**, prima il solo database, poi dentro i dati, poi il resto:

```bash
zd up -d db
docker cp prod.dump zd-db:/tmp/prod.dump
zd exec db pg_restore -U zerodark -d zerodark --no-owner /tmp/prod.dump
docker volume create gestionale_uploads
docker run --rm -v gestionale_uploads:/dati -v $PWD:/b alpine tar xzf /b/uploads.tgz -C /dati
zd up -d --build
```

L'ordine conta: se il gestionale partisse su un database vuoto, il seed ci
creerebbe l'admin di partenza e il ripristino andrebbe a sbattere sui suoi
dati. Col database già pieno, all'avvio le migrazioni trovano tutto applicato e
il seed non ha niente da fare.

La sessione WhatsApp non si trasloca: sulla macchina nuova il numero dedicato
si collega inquadrando il codice, come la prima volta.

## 6. Controllo

- `zd logs -f app` — le migrazioni risultano già applicate, l'app parte;
- `zd logs proxy` — il certificato è stato ottenuto;
- `https://gestionale.tuodominio.it` si apre **senza avvisi**, il badge accanto
  a ZERO DARK dice la stessa versione di casa, si entra, un certificato medico
  caricato prima del trasloco si apre.

Poi, a casa, `.\zd.ps1 down prod`: i volumi restano lì come copia di
riserva, ma il gestionale vero è uno solo. Il test resta a casa com'è.

## I lavori automatici

Il gestionale, per tutto il resto, fa qualcosa perche' qualcuno ha premuto un
pulsante. Le polizze giornaliere che si attivano da sole no: serve qualcosa che
si svegli quando non c'e' nessuno — la domenica mattina alle otto, quando si e'
gia' in viaggio.

Lo fa il `cron` della macchina, con una riga sola:

```bash
# la chiave, una volta sola: finisce in .env.prod, che ha i permessi 600
printf '
SEGRETO_LAVORI=%s
' "$(openssl rand -hex 24)" >> /opt/gestionale/.env.prod
zd up -d   # perche' il container la legga

chmod +x /opt/gestionale/deploy/lavori.sh
( crontab -l 2>/dev/null; echo '*/5 * * * * /opt/gestionale/deploy/lavori.sh' ) | crontab -
```

Lo script sta nel repository (`deploy/lavori.sh`): legge la chiave da
`.env.prod`, bussa a `/api/lavori` e scrive in `/var/log/zd-lavori.log` **solo
quando succede qualcosa**. Un giro a vuoto non lascia righe, altrimenti il
registro sarebbe illeggibile proprio il giorno che serve.

La porta risponde **404** a chi non ha la chiave — non «non autorizzato»: a chi
bussa a caso non si dice nemmeno che c'e' una porta. Ed e' un POST, cosi' non
parte per un link aperto per sbaglio.

Senza `SEGRETO_LAVORI` non esiste niente di tutto questo: e' la condizione
normale del test, dove attivare una polizza ne consumerebbe una vera.

## Il TAK a fianco

> **Non è stato fatto.** Sulla macchina in affitto ci sono 4 GB e il TAK ne
> vuole 8 suoi: si è deciso di lasciarlo fuori. Quello che segue vale se un
> giorno si prende una macchina apposta.

Il TAK ha la sua distribuzione ufficiale, col suo compose e il suo database, e
non sta in `docker-compose.prod.yml`: ogni suo aggiornamento lo romperebbe. Si
installa in una cartella sua, accanto a `gestionale/`.

Le sue porte non si pestano i piedi con quelle del gestionale — lui non usa né
la 80 né la 443 — ma vanno aperte nel firewall di Hetzner: quelle per i client
e quella per l'iscrizione dei certificati, secondo la sua configurazione.
L'interfaccia di amministrazione conviene lasciarla raggiungibile solo da
ZeroTier, come la SSH.

## I rilasci, da qui in avanti

Sulla macchina, dentro **`/opt/gestionale`**. L'alias `zd` non esiste in una
sessione ssh non interattiva: o lo si rimette a mano, o si scrive il compose per
esteso.

```bash
alias zd='docker compose -p gestionale -f docker-compose.prod.yml --env-file .env.prod'

cd /opt/gestionale

# 1. la rete di sicurezza, prima di toccare qualsiasi cosa
mkdir -p /root/backup
docker exec zd-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/prima.dump'
docker cp zd-db:/tmp/prima.dump /root/backup/prod-$(date +%F-%H%M).dump

# 2. il codice nuovo e la ricostruzione
git pull --ff-only
zd up -d --build

# 3. il proxy, che da solo non se ne accorge
zd restart proxy

# 4. la scia del rilascio, prima di andarsene
docker image prune -f --filter until=24h
docker builder prune -f --filter until=168h
```

Le quattro righe, una per una:

- **Il `pg_dump` legge l'utente e il database dalle variabili del container**
  invece di scriverli a mano: se un giorno cambiano in `.env.prod`, il comando
  continua a funzionare e non fa un backup vuoto credendo di averlo fatto.
  L'ora nel nome serve a distinguere due rilasci nello stesso giorno.
- **`git pull --ff-only`** si rifiuta di fare merge: se sul server qualcuno ha
  modificato un file, è meglio saperlo adesso che scoprirlo in un conflitto a
  metà build.
- **`zd restart proxy` non è facoltativo.** Il `Caddyfile` è montato dentro il
  container come file, e `up -d` non ricrea il proxy se il suo compose non è
  cambiato: senza questo passo le modifiche al Caddyfile — per esempio il tetto
  del corpo delle richieste — restano lettera morta, e i sintomi che ne vengono
  sembrano difetti dell'applicazione.
- **La pulizia.** Ogni ricostruzione lascia dietro l'immagine vecchia senza tag
  e la sua cache di build. Il 20 settembre 2026 erano diventate 41 immagini e
  57 GB di cache: **l'80% del disco**, accumulato in quattro giorni di rilasci.
  `image prune` toglie le immagini senza tag, `builder prune` la cache più
  vecchia di una settimana — quella dell'ultima si tiene, perché è lei che fa
  durare una ricostruzione due minuti invece di sette.
  **I due `until` non sono decorazioni.** Senza quello sulle immagini, la
  pulizia si porta via anche la build appena sostituita, che è il paracadute
  del punto qui sotto: con `until=24h` il ritorno indietro resta possibile per
  tutta la giornata, che è il tempo in cui un guaio salta fuori.

Per il controllo finale non basta che il sito risponda:

```bash
curl -s https://ops.zerodarkteam.it/login | grep -o 'v[0-9.]*' | head -1   # la versione nuova
docker logs zd-app --tail 20                                              # migrazioni e avvio
docker exec zd-proxy caddy validate --config /etc/caddy/Caddyfile         # "Valid configuration"
df -h /                                                                   # quanto è rimasto
```

**Se qualcosa è andato storto**, l'immagine di prima è ancora lì senza tag
(`docker images -f dangling=true`): si riparte da quella con
`docker run` o rimettendola nel compose, senza aspettare una ricompilazione. E
il database si rimette com'era con il dump del passo 1.

## Il sito pubblico su www

Il sito della squadra (`www.zerodarkteam.it`) è **la stessa applicazione** del
gestionale, sulla stessa macchina. Quale dei due si vede lo decide l'indirizzo:
lo smistamento sta in `src/middleware.ts`, le pagine in `src/app/sito/`. Da
`ops` il sito si vede sotto `/sito`, che serve a provarlo prima del DNS e nel
test.

Per accenderlo servono due cose, una sola da fare a mano:

1. **Nel pannello DNS di Aruba**, il record A di `www` deve puntare
   all'indirizzo di questa macchina (lo stesso di `ops`). **Non toccare** i
   record della posta (`mx`, `mail`, `webmail`, `smtp`, `pop3`, `imap`) né il
   record MX: la posta resta su Aruba.
2. Quando il DNS risponde con l'indirizzo nuovo, riavviare il proxy perché
   chieda subito il certificato invece di aspettare la sua prossima prova:

```bash
zd restart proxy
```

Il blocco è già nel `Caddyfile`. `zerodarkteam.it` senza www resta ad Aruba:
se un giorno lo si punta qui, va aggiunto al blocco del sito.

I testi del sito stanno in `src/app/sito/contenuti.ts`; le foto delle missioni
si mettono in `public/sito/` con il nome scritto lì (`pcr.jpg`, `plr.jpg`,
`milsim.jpg`, `corsi.jpg`). Finché la foto non c'è, al suo posto si vede una
carta topografica disegnata.
