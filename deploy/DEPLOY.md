# Il gestionale su un server pubblico

Come si porta il gestionale da questo PC a una macchina in affitto, con un nome
a dominio e un certificato valido. Il compose è `docker-compose.prod.yml`, il
proxy è Caddy con il suo `deploy/Caddyfile`.

Da quel momento il gestionale non sta più solo dentro la rete ZeroTier: sta su
internet, con anagrafiche, recapiti e certificati medici dentro. Per questo il
database non pubblica porte, l'applicazione nemmeno, e alla macchina si entra
solo dalla rete privata.

## Cosa gira sulla macchina

| servizio | tetto di memoria | porte aperte a internet |
|---|---|---|
| database | 2 GB | nessuna |
| gestionale | 2 GB | nessuna, ci arriva il proxy |
| ponte WhatsApp | 1 GB | nessuna |
| proxy (Caddy) | — | 80, 443 (tcp e udp) |
| TAK server, a fianco | 8 GB | le sue, vedi sotto |

Sono 13 GB di tetti: **serve una macchina da 16 GB**. Con 8 GB il TAK e il
gestionale si contenderebbero la memoria e a cadere sarebbe il primo che ne
chiede di più.

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

## Il TAK a fianco

Il TAK ha la sua distribuzione ufficiale, col suo compose e il suo database, e
non sta in `docker-compose.prod.yml`: ogni suo aggiornamento lo romperebbe. Si
installa in una cartella sua, accanto a `gestionale/`.

Le sue porte non si pestano i piedi con quelle del gestionale — lui non usa né
la 80 né la 443 — ma vanno aperte nel firewall di Hetzner: quelle per i client
e quella per l'iscrizione dei certificati, secondo la sua configurazione.
L'interfaccia di amministrazione conviene lasciarla raggiungibile solo da
ZeroTier, come la SSH.

## I rilasci, da qui in avanti

Sulla macchina, dentro `gestionale/`:

```bash
zd exec db pg_dump -U zerodark -d zerodark -Fc -f /tmp/prima.dump
docker cp zd-db:/tmp/prima.dump ~/backup/prod-$(date +%F).dump
git pull
zd up -d --build
```
