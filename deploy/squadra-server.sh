#!/usr/bin/env bash
#
# I gestionali delle altre squadre, ospitati sulla nostra macchina e raggiunti
# col loro nome (es. https://gestionale.pippo.it).
#
# Lo chiama l'automazione Rilascio (.github/workflows/rilascio.yml) via ssh,
# come root. Si può lanciare anche a mano dal server:
#
#   SQUADRA=pippo DOMINIO=gestionale.pippo.it NOME='Pippo Softair' \
#     EMAIL=presidente@pippo.it bash /opt/gestionale/deploy/squadra-server.sh nuova
#     (e, se si sanno, i dati del primo amministratore: ADMIN_NOME, ADMIN_COGNOME,
#      ADMIN_NASCITA=AAAA-MM-GG, ADMIN_TELEFONO)
#   bash /opt/gestionale/deploy/squadra-server.sh rilascia pippo
#   bash /opt/gestionale/deploy/squadra-server.sh rilascia-tutte
#   bash /opt/gestionale/deploy/squadra-server.sh stato [pippo]
#   bash /opt/gestionale/deploy/squadra-server.sh rimuovi pippo
#   bash /opt/gestionale/deploy/squadra-server.sh aggancia   (lo fa da sé lavori.sh)
#   bash /opt/gestionale/deploy/squadra-server.sh elimina pippo [/opt/archivio/squadra-pippo-…]
#   ADMIN_PASSWORD=… bash /opt/gestionale/deploy/squadra-server.sh password pippo [email]
#   bash /opt/gestionale/deploy/squadra-server.sh aggiorna pippo 3.25.0
#   bash /opt/gestionale/deploy/squadra-server.sh versioni [pippo]
#   bash /opt/gestionale/deploy/squadra-server.sh migra-produzione   (una volta)
#
# **Anche il nostro gestionale (ops.zerodarkteam.it) è una squadra ospitata**,
# «zerodark»: stessa cartella, stesso compose, stesso Postgres comune, stesso
# «aggiorna» con ritorno indietro. Il rilascio lo aggiorna per primo alla
# versione appena costruita; le altre restano alla loro. «migra-produzione»
# l'ha portato qui dal vecchio compose della produzione (zd-app, zd-db).
#
# **Ogni squadra ha la sua versione** (VERSIONE in .env.squadra) e la tiene
# finché qualcuno non la aggiorna con «aggiorna» — di solito il portale ZeroDark
# (hook update_app), che decide quando. Il rilascio della produzione prepara
# le immagini della versione nuova (gestionale-app:<versione>) ma non sposta
# nessuna squadra.
#
# Ogni squadra ha la sua cartella, /opt/squadra-<nome>, con il suo .env.squadra
# (chiavi e password sue, permessi 600) e ACCESSO.txt con l'admin di partenza.
# Il codice invece è quello della produzione: docker-compose.squadra.yml sta in
# /opt/gestionale e usa le immagini già costruite dal rilascio (gestionale e
# ponte WhatsApp). Per questo
# «rilascia-tutte» lo chiama il rilascio della produzione, subito dopo la
# ricostruzione: le squadre ospitate girano sempre la stessa versione nostra.
#
# **Prima** di «nuova», la squadra mette nel suo DNS un record che porta qui:
# un CNAME del suo nome verso ops.zerodarkteam.it (o un A con lo stesso
# indirizzo). Senza, il gestionale nasce lo stesso ma da fuori non si
# raggiunge; appena il record c'è, «rilascia» aggancia il proxy da solo.
#
# **Il database** di ogni squadra sta nel Postgres comune delle squadre ospitate
# (zd-sq-pg, docker-compose.pg.yml): un database e un utente suoi, sq_<nome>,
# che agli altri database non si collegano. Le squadre nate col Postgres loro
# ci traslocano da sole al primo «rilascia» (trasloca_db), con un backup prima.
#
# Le password non passano mai dal log dell'automazione, che su un repository
# pubblico è pubblico.

set -euo pipefail

PROD=/opt/gestionale
DOMINIO_PROD=ops.zerodarkteam.it
# Il Postgres comune delle squadre ospitate (docker-compose.pg.yml): un database
# e un utente per squadra. La password dell'amministratore sta solo qui.
PG=zd-sq-pg
PG_CARTELLA=/opt/squadre-pg
PG_ENV=$PG_CARTELLA/.env.pg
PG_RETE=zd-pg
# Il nostro gestionale: dal 3.29.0 è una squadra ospitata come le altre, con
# questo nome (prima era il compose della produzione, zd-app e zd-db).
NOSTRA=zerodark
IMMAGINE=gestionale-app:latest
IMMAGINE_WHATSAPP=gestionale-whatsapp:latest

casuale() { openssl rand -hex "$1"; }

# La versione del codice in /opt/gestionale: quella che la produzione ha appena
# costruito.
versione_corrente() {
  grep -m1 '"version"' "$PROD/package.json" | sed -E 's/.*"([0-9]+\.[0-9]+\.[0-9]+)".*/\1/'
}

valida_versione() {
  printf '%s' "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' \
    || { echo "Versione non valida: «$1» (es. 3.25.0)"; exit 1; }
}

# Le immagini di una versione, qui sul server. Se non ci sono si prendono dal
# registro (REGISTRO, es. ghcr.io/whiskas85): così una macchina che non le ha
# costruite può averle lo stesso.
immagini_versione() {
  local v=$1 img
  for img in gestionale-app gestionale-whatsapp; do
    docker image inspect "$img:$v" > /dev/null 2>&1 && continue
    if [ -n "${REGISTRO:-}" ] && docker pull -q "$REGISTRO/$img:$v" > /dev/null 2>&1; then
      docker tag "$REGISTRO/$img:$v" "$img:$v"
      continue
    fi
    echo "La versione $v non c'e' su questo server ($img:$v)${REGISTRO:+, nemmeno in $REGISTRO}."
    return 1
  done
}

valida_squadra() {
  # finisce in nomi di cartelle, container e volumi: solo minuscole e trattini
  if ! printf '%s' "$1" | grep -Eq '^[a-z][a-z0-9-]{1,29}$' || printf '%s' "$1" | grep -Eq '^test[0-9]*$'; then
    echo "Nome breve non valido: «$1» (minuscole, cifre e trattini; non test…)"
    exit 1
  fi
}

# I nomi che non sono gestionali ospitati: la produzione e i suoi dintorni.
# (I test, test…, li rifiuta già valida_squadra.)
riservato() {
  case "$1" in
    ops | www | zd | gestionale) echo "«$1» e' un nome riservato, non un gestionale ospitato."; exit 1 ;;
  esac
}

# Il nostro gestionale non si toglie per sbaglio, nemmeno dalla console: solo
# chiedendolo apposta (FORZA=1).
protetta() {
  if [ "$1" = "$NOSTRA" ] && [ "${FORZA:-0}" != 1 ]; then
    echo "«$NOSTRA» e' il nostro gestionale (https://$DOMINIO_PROD): non lo tolgo. Se e' proprio quello che vuoi, FORZA=1."
    exit 1
  fi
}

# Un nome buono per una squadra: scritto bene, non già nostro, non già usato.
valida_dominio() {
  local dominio=$1
  if ! printf '%s' "$dominio" | grep -Eq '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$'; then
    echo "Dominio non valido: «$dominio» (es. gestionale.pippo.it)"
    exit 1
  fi
  # Un nostro sottodominio va bene (una demo: demo.zerodarkteam.it), ma non
  # quelli già presi: la produzione, gli ambienti di test, il sito.
  case "$dominio" in
    ops.zerodarkteam.it | zerodarkteam.it | www.zerodarkteam.it | test*.zerodarkteam.it)
      echo "$dominio e' gia' in uso (produzione, test o sito): scegline un altro."
      exit 1
      ;;
  esac
  # né come nome attuale né come vecchio nome ancora rediretto di un'altra squadra
  if grep -qsE "^(DOMINIO|DOMINIO_PRECEDENTE)=$dominio\$" /opt/squadra-*/.env.squadra; then
    echo "$dominio e' gia' usato da una squadra ospitata."
    exit 1
  fi
}

prepara() {
  SQUADRA=$1
  valida_squadra "$SQUADRA"
  CARTELLA=/opt/squadra-$SQUADRA
  ENV=$CARTELLA/.env.squadra
  SITO_CADDY=$PROD/siti/sq-$SQUADRA.caddy
  # la rete fra il proxy e questa sola squadra: le altre non ci sono
  RETE=zd-bordo-sq-$SQUADRA
}

leggi() { grep "^$1=" "$ENV" | cut -d= -f2-; }

zds() {
  docker compose -p "gestionale-sq-$SQUADRA" -f "$PROD/docker-compose.squadra.yml" \
    --env-file "$ENV" --project-directory "$CARTELLA" "$@"
}

rete() {
  docker network inspect "$RETE" > /dev/null 2>&1 || docker network create "$RETE" > /dev/null
  # il proxy entra in ogni rete di bordo; le app stanno ciascuna nella sua
  docker network inspect "$RETE" --format '{{range .Containers}}{{.Name}} {{end}}' \
    | grep -qw zd-proxy || docker network connect "$RETE" zd-proxy
}

# Le chiavi delle notifiche push, generate con la libreria che il gestionale
# usa già: stanno nell'immagine della produzione.
chiavi_push() {
  docker run --rm --entrypoint node -w /app "$IMMAGINE" -e \
    "const k=require('web-push').generateVAPIDKeys();console.log(k.publicKey+' '+k.privateKey)"
}

# L'indirizzo di un nome come lo vede internet (vedi deploy/test-server.sh):
# chiesto a Cloudflare dal container di Caddy, altrimenti al DNS della macchina.
indirizzo() {
  local ip
  ip=$({ docker exec zd-proxy nslookup "$1" 1.1.1.1 2>/dev/null || true; } \
    | awk '/^Address/ && $2 !~ /:/ {print $2; exit}')
  if [ -z "$ip" ]; then
    ip=$({ getent ahostsv4 "$1" 2>/dev/null || true; } | awk 'NR==1 {print $1}')
  fi
  printf '%s' "$ip"
}

ricarica_proxy() {
  docker exec zd-proxy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
}

# ------------------------------------------------------- il Postgres comune

# Lo accende se non c'è: la rete senza uscita, la password dell'amministratore
# (solo sul server), il container. Aspetta che risponda.
pg_condiviso() {
  docker network inspect "$PG_RETE" > /dev/null 2>&1 || docker network create --internal "$PG_RETE" > /dev/null
  if [ ! -f "$PG_ENV" ]; then
    mkdir -p "$PG_CARTELLA"
    chmod 700 "$PG_CARTELLA"
    (umask 077; printf 'POSTGRES_PASSWORD=%s\nTZ=Europe/Rome\n' "$(casuale 24)" > "$PG_ENV")
    echo "== Postgres comune delle squadre: nuovo"
  fi
  docker compose -p gestionale-pg -f "$PROD/docker-compose.pg.yml" --env-file "$PG_ENV" up -d --pull missing > /dev/null
  local _
  for _ in $(seq 1 30); do
    docker exec "$PG" pg_isready -U postgres -q 2>/dev/null && return 0
    sleep 2
  done
  echo "!! Il Postgres comune ($PG) non risponde."
  return 1
}

# Il nome dell'utente e del database di una squadra: sq_ e il nome breve, coi
# trattini fatti trattini bassi (pippo-2 → sq_pippo_2).
ruolo_db() { printf 'sq_%s' "$1" | tr '-' '_'; }

# Il database è già nel Postgres comune?
condiviso() { [ "$(leggi DB_HOST || true)" = "$PG" ]; }

# Utente e database della squadra nel Postgres comune, se non ci sono. Nessun
# altro utente può collegarsi al suo database. La password arriva per stdin,
# mai sulla riga di comando.
crea_db() {
  local ruolo pw
  ruolo=$(leggi POSTGRES_USER)
  pw=$(leggi POSTGRES_PASSWORD)
  printf '%s' "$ruolo" | grep -Eq '^sq_[a-z0-9_]+$' || { echo "Utente del database non valido: $ruolo"; return 1; }
  printf '%s' "$pw" | grep -Eq '^[A-Za-z0-9]+$' || { echo "La password del database deve essere alfanumerica."; return 1; }
  {
    printf "SELECT 'CREATE ROLE %s LOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '%s')\\gexec\n" "$ruolo" "$ruolo"
    printf "ALTER ROLE %s PASSWORD '%s';\n" "$ruolo" "$pw"
    printf "SELECT 'CREATE DATABASE %s OWNER %s' WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '%s')\\gexec\n" "$ruolo" "$ruolo" "$ruolo"
    printf "REVOKE CONNECT, TEMPORARY ON DATABASE %s FROM PUBLIC;\n" "$ruolo"
    printf "GRANT CONNECT, TEMPORARY ON DATABASE %s TO %s;\n" "$ruolo" "$ruolo"
    # nemmeno nel database di servizio: le squadre entrano solo nel loro
    printf "REVOKE CONNECT, TEMPORARY ON DATABASE postgres FROM PUBLIC;\n"
  } | docker exec -i "$PG" psql -q -v ON_ERROR_STOP=1 -U postgres -d postgres > /dev/null
}

# Il backup del database della squadra, in un file: dal Postgres comune, o dal
# suo se non ha ancora traslocato.
backup_db() {
  local file=$1
  if condiviso; then
    docker exec "$PG" pg_dump -U "$(leggi POSTGRES_USER)" -d "$(leggi POSTGRES_DB)" -Fc > "$file"
  else
    docker exec "zd-sq-$SQUADRA-db" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$file"
  fi
}

# Il database com'era nel backup: lo schema da capo (le tabelle nate dopo non
# devono restare) e il ripristino fatto come l'utente della squadra, così
# tutto resta suo.
ripristina_db() {
  local file=$1 ruolo db
  ruolo=$(leggi POSTGRES_USER)
  db=$(leggi POSTGRES_DB)
  docker exec "$PG" psql -q -U "$ruolo" -d "$db" \
    -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1 || true
  docker exec -i "$PG" pg_restore -U "$ruolo" -d "$db" --no-owner --no-privileges < "$file" > /dev/null 2>&1
}

# Il trasloco di una squadra nata col Postgres suo nel Postgres comune.
#   1. l'app si ferma (niente scritture a metà) e si fa il backup;
#   2. utente e database nuovi, e il backup dentro;
#   3. l'app riparte sul database nuovo; il Postgres vecchio resta acceso
#      finché la nuova non risponde, poi si ferma e si toglie. Il suo volume
#      (gestionale-sq-<nome>_db-data) resta: lo cancella «elimina».
# Se qualcosa va storto la squadra torna com'era, sul Postgres suo.
trasloca_db() {
  local vecchio_user vecchio_db dump ruolo
  vecchio_user=$(leggi POSTGRES_USER)
  vecchio_db=$(leggi POSTGRES_DB)
  ruolo=$(ruolo_db "$SQUADRA")
  echo "== $SQUADRA: trasloco del database nel Postgres comune"
  if ! docker ps -q --filter "name=^zd-sq-$SQUADRA-db\$" | grep -q .; then
    echo "!! il Postgres di $SQUADRA (zd-sq-$SQUADRA-db) non e' acceso: non trasloco niente"
    return 1
  fi
  mkdir -p /root/backup
  dump=/root/backup/sq-$SQUADRA-prima-del-trasloco-$(date +%F-%H%M).dump
  docker stop "zd-sq-$SQUADRA-app" > /dev/null 2>&1 || true
  if ! docker exec "zd-sq-$SQUADRA-db" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$dump"; then
    echo "!! backup non riuscito: $SQUADRA resta com'era"
    docker start "zd-sq-$SQUADRA-app" > /dev/null 2>&1 || true
    return 1
  fi
  echo "== backup in $dump"

  # la configurazione nuova; quella vecchia si tiene per tornare indietro
  sed -i -e '/^DB_HOST=/d' -e '/^DB_VECCHIO_/d' "$ENV"
  sed -i -e "s/^POSTGRES_USER=.*/POSTGRES_USER=$ruolo/" -e "s/^POSTGRES_DB=.*/POSTGRES_DB=$ruolo/" "$ENV"
  printf 'DB_HOST=%s\nDB_VECCHIO_USER=%s\nDB_VECCHIO_DB=%s\n' "$PG" "$vecchio_user" "$vecchio_db" >> "$ENV"

  if crea_db && ripristina_db "$dump"; then
    zds up -d --pull never
    if risponde 45; then
      docker stop "zd-sq-$SQUADRA-db" > /dev/null 2>&1 || true
      docker rm "zd-sq-$SQUADRA-db" > /dev/null 2>&1 || true
      echo "== $SQUADRA: database nel Postgres comune ($ruolo). Il Postgres suo e' spento; il volume resta."
      return 0
    fi
    echo "!! $SQUADRA non risponde sul Postgres comune"
    docker logs "zd-sq-$SQUADRA-app" --tail 10 2>&1 | grep -vi 'password' || true
  else
    echo "!! database nel Postgres comune non riuscito"
  fi

  # indietro: la squadra torna sul suo Postgres, che non e' mai stato toccato
  echo "== $SQUADRA: torno al Postgres suo"
  sed -i -e '/^DB_HOST=/d' -e '/^DB_VECCHIO_/d' \
    -e "s/^POSTGRES_USER=.*/POSTGRES_USER=$vecchio_user/" -e "s/^POSTGRES_DB=.*/POSTGRES_DB=$vecchio_db/" "$ENV"
  echo "DB_HOST=db" >> "$ENV"
  zds up -d --pull never
  risponde 45 && echo "== $SQUADRA di nuovo sul Postgres suo, e risponde" \
    || echo "!! $SQUADRA non risponde nemmeno sul Postgres suo: serve un intervento a mano (backup $dump)"
  return 1
}

# Un dato del proprietario, pulito per finire in .env.squadra: una riga sola,
# niente caratteri che il file d'ambiente di compose interpreterebbe ($, \,
# virgolette, apice in testa), al massimo 80 caratteri. Vuoto se non resta
# niente.
dato_admin() {
  printf '%s' "$1" | tr -d '\000-\037$\\"`' | sed -e "s/^[' ]*//" -e 's/ *$//' | cut -c1-80
}

# --------------------------------------------------------------- il proxy

proxy() {
  local dominio qui la
  dominio=$(leggi DOMINIO)
  qui=$(indirizzo "$DOMINIO_PROD")
  la=$(indirizzo "$dominio")
  if [ -z "$la" ] || [ "$la" != "$qui" ]; then
    echo "== $dominio non punta ancora a questa macchina (${la:-nessun indirizzo}; qui e' $qui)."
    echo "   Il gestionale gira, ma da fuori non si raggiunge: serve il record nel DNS della squadra"
    echo "   (CNAME verso $DOMINIO_PROD, o A verso $qui). Appena c'e', entro cinque minuti il proxy"
    echo "   lo aggancia da solo (deploy/lavori.sh) e Caddy chiede il certificato."
    # un certificato chiesto per un nome che non porta qui fallisce, e Let's
    # Encrypt conta i tentativi falliti: meglio non chiederlo affatto
    if [ -f "$SITO_CADDY" ]; then
      rm -f "$SITO_CADDY"
      ricarica_proxy
    fi
    return
  fi
  mkdir -p "$PROD/siti"
  # Il vecchio nome, dopo un cambio di dominio: per qualche mese manda al nuovo
  # con un 308 (stesso percorso, stesso metodo), così i link già girati vanno.
  # Solo se porta ancora qui, o il certificato non arriverebbe.
  local vecchio fino redirect=""
  vecchio=$(leggi DOMINIO_PRECEDENTE || true)
  fino=$(leggi PRECEDENTE_FINO || true)
  if [ -n "$vecchio" ] && [ -n "$fino" ] && [[ "$(date +%F)" < "$fino" ]] \
    && [ "$(indirizzo "$vecchio")" = "$qui" ]; then
    redirect="
# Il nome di prima, fino al $fino: manda al nuovo.
$vecchio {
	redir https://$dominio{uri} 308
}"
  fi
  cat > "$SITO_CADDY.nuovo" <<EOF
# Scritto da deploy/squadra-server.sh: si rigenera a ogni rilascio.
# Il gestionale di «$(leggi NOME_SQUADRA)», ospitato qui.
$dominio {
	encode zstd gzip

	request_body {
		max_size 25MB
	}

	header Strict-Transport-Security "max-age=31536000"

	reverse_proxy zd-sq-$SQUADRA-app:3000 {
		header_up X-Real-IP {remote_host}
		transport http {
			read_timeout 120s
		}
	}
}
$redirect
EOF
  if ! cmp -s "$SITO_CADDY.nuovo" "$SITO_CADDY" 2>/dev/null; then
    mv "$SITO_CADDY.nuovo" "$SITO_CADDY"
    ricarica_proxy
    echo "== Proxy: $dominio agganciato (il certificato lo chiede Caddy, ci vuole qualche secondo)"
  else
    rm -f "$SITO_CADDY.nuovo"
  fi
}

# ---------------------------------------------------------------- comandi

nuova() {
  prepara "${SQUADRA:-}"
  local dominio=${DOMINIO:-} nome=${NOME:-} email=${EMAIL:-}
  valida_dominio "$dominio"
  [ -n "$nome" ] || nome=$SQUADRA
  [ -n "$email" ] || email=admin@$dominio
  if [ -f "$ENV" ]; then
    echo "La squadra $SQUADRA c'e' gia' ($(leggi DOMINIO)): per aggiornarla, «rilascia $SQUADRA»."
    exit 1
  fi
  if [ ! -f "$PROD/docker-compose.squadra.yml" ]; then
    echo "Il codice in $PROD e' piu' vecchio delle squadre ospitate: prima un rilascio della produzione."
    exit 1
  fi
  local img
  immagini_versione "$(versione_corrente)" || { echo "Prima un rilascio della produzione."; exit 1; }

  echo "== Nuova squadra: $nome ($SQUADRA) su https://$dominio"
  mkdir -p "$CARTELLA"
  chmod 700 "$CARTELLA"
  local admin_pw push a_nome a_cognome a_nascita a_telefono
  admin_pw=$(casuale 12)
  push=$(chiavi_push)
  # il proprietario, se la console lo dice: compila il profilo del primo
  # amministratore. Un dato vuoto o sbagliato resta come prima (generico).
  a_nome=$(dato_admin "${ADMIN_NOME:-}")
  a_cognome=$(dato_admin "${ADMIN_COGNOME:-}")
  a_nascita=${ADMIN_NASCITA:-}
  if [ -n "$a_nascita" ] && ! { printf '%s' "$a_nascita" | grep -Eq '^(19|20)[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' \
    && date -d "$a_nascita" +%F > /dev/null 2>&1; }; then
    echo "== data di nascita «$a_nascita» non valida (AAAA-MM-GG): la lascio vuota"
    a_nascita=""
  fi
  a_telefono=$(printf '%s' "${ADMIN_TELEFONO:-}" | tr -cd '0-9+ -' | cut -c1-20 | sed -e 's/^ *//' -e 's/ *$//')
  umask 077
  cat > "$ENV" <<EOF
SQUADRA=$SQUADRA
DOMINIO=$dominio
NOME_SQUADRA=$nome
NOME_GESTIONALE=$nome
POSTGRES_USER=$(ruolo_db "$SQUADRA")
POSTGRES_PASSWORD=$(casuale 24)
POSTGRES_DB=$(ruolo_db "$SQUADRA")
DB_HOST=$PG
SESSION_SECRET=$(casuale 32)
SEED_ADMIN_EMAIL=$email
SEED_ADMIN_PASSWORD=$admin_pw
SEGRETO_LAVORI=$(casuale 24)
SEGRETO_WHATSAPP=$(casuale 16)
VAPID_PUBLIC_KEY=${push%% *}
VAPID_PRIVATE_KEY=${push##* }
VAPID_SUBJECT=mailto:$email
TZ=Europe/Rome
VERSIONE=$(versione_corrente)
SEED_ADMIN_NOME=$a_nome
SEED_ADMIN_COGNOME=$a_cognome
SEED_ADMIN_NASCITA=$a_nascita
SEED_ADMIN_TELEFONO=$a_telefono
EOF
  cat > "$CARTELLA/ACCESSO.txt" <<EOF
Gestionale di $nome: https://$dominio

Admin di partenza (da girare alla squadra, che poi cambia la password
dal profilo e completa «La mia squadra»: logo, colori, collegamenti):
  email:    $email
  password: $admin_pw

Il ponte WhatsApp e' suo: lo collega l'admin dal gestionale, inquadrando il
codice col telefono di chi lo gestisce.
EOF
  umask 022
  rilascia "$SQUADRA"
  echo "Credenziali dell'admin in $CARTELLA/ACCESSO.txt (solo sul server)."
}

rilascia() {
  prepara "$1"
  [ -f "$ENV" ] || { echo "La squadra $SQUADRA non c'e': prima «nuova»."; exit 1; }
  rete
  # le squadre nate prima del ponte: la chiave si aggiunge una volta sola
  if ! grep -q '^SEGRETO_WHATSAPP=' "$ENV"; then
    (umask 077; echo "SEGRETO_WHATSAPP=$(casuale 16)" >> "$ENV")
  fi
  # le squadre nate prima delle versioni fissate: si fermano a quella di adesso
  if ! grep -q '^VERSIONE=' "$ENV"; then
    (umask 077; echo "VERSIONE=$(versione_corrente)" >> "$ENV")
    echo "== $SQUADRA: fissata alla versione $(leggi VERSIONE)"
  fi
  immagini_versione "$(leggi VERSIONE)" || exit 1
  pg_condiviso || exit 1
  # nata col Postgres suo: trasloca nel comune (con backup, e indietro se non va)
  if ! condiviso; then
    if [ "$(leggi DB_HOST || true)" = "db" ]; then
      echo "!! $SQUADRA e' rimasta sul Postgres suo dopo un trasloco non riuscito: la riavvio cosi'."
      zds up -d --pull never
    else
      trasloca_db || echo "!! $SQUADRA: trasloco non riuscito, resta sul Postgres suo"
    fi
    proxy
    stato_una
    return
  fi
  crea_db
  if docker ps -q --filter "name=^zd-sq-$SQUADRA-app\$" | grep -q .; then
    echo "== $SQUADRA: backup"
    mkdir -p /root/backup
    backup_db "/root/backup/sq-$SQUADRA-$(date +%F-%H%M).dump"
    # restano gli ultimi dieci
    ls -1t /root/backup/sq-"$SQUADRA"-*.dump 2>/dev/null | tail -n +11 | xargs -r rm -f
  fi
  echo "== $SQUADRA: avvio, versione $(leggi VERSIONE)"
  # up ricrea app e ponte solo se l'immagine e' cambiata: le migrazioni le fa
  # l'app, e la sessione WhatsApp sta sul suo volume, quindi resta collegata
  zds up -d --pull never
  proxy
  local _
  for _ in $(seq 1 30); do
    docker exec zd-proxy wget -q -O /dev/null "http://zd-sq-$SQUADRA-app:3000/login" 2>/dev/null && break
    sleep 2
  done
  stato_una
}

rilascia_tutte() {
  local env trovate=0
  for env in /opt/squadra-*/.env.squadra; do
    [ -f "$env" ] || continue
    trovate=1
    # una squadra che non riparte non ferma le altre
    bash "$PROD/deploy/squadra-server.sh" rilascia "$(basename "$(dirname "$env")" | sed 's/^squadra-//')" \
      || echo "!! non riuscito: $env"
  done
  [ "$trovate" = 1 ] || echo "== Nessuna squadra ospitata"
}

stato_una() {
  local dominio codice ip
  dominio=$(leggi DOMINIO)
  echo "== Squadra $SQUADRA: $(leggi NOME_SQUADRA) — https://$dominio — versione $(leggi VERSIONE || echo '?') — database $(condiviso && echo "$(leggi POSTGRES_DB) nel Postgres comune" || echo 'suo')"
  docker ps --filter "name=zd-sq-$SQUADRA-" --format '{{.Names}}\t{{.Status}}'
  docker logs "zd-sq-$SQUADRA-app" --tail 8 2>&1 | grep -vi 'password' || true
  if [ -f "$SITO_CADDY" ]; then
    ip=$(indirizzo "$dominio")
    codice=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
      ${ip:+--resolve "$dominio:443:$ip"} "https://$dominio/login" || true)
    case "$codice" in
      200) echo "raggiungibile: https://$dominio/login risponde 200" ;;
      000)
        echo "https://$dominio non risponde, o il certificato non c'e' ancora. Dal proxy:"
        docker logs zd-proxy --since 2h 2>&1 | grep "$dominio" | grep -iE 'obtain|error|fail' | tail -5 || true
        ;;
      *) echo "https://$dominio/login risponde $codice (200 e' giusto)" ;;
    esac
  else
    echo "non raggiungibile da fuori: manca il record DNS per $dominio"
  fi
}

stato() {
  if [ -n "${1:-}" ]; then
    prepara "$1"
    stato_una
    return
  fi
  local env trovate=0
  for env in /opt/squadra-*/.env.squadra; do
    [ -f "$env" ] || continue
    trovate=1
    prepara "$(basename "$(dirname "$env")" | sed 's/^squadra-//')"
    stato_una
  done
  [ "$trovate" = 1 ] || echo "== Nessuna squadra ospitata"
}

# Cambia il nome a dominio di una squadra ospitata. Il nuovo deve già puntare
# qui. Il vecchio resta per sei mesi come redirect 308 verso il nuovo, e il
# gestionale, ripartendo col nuovo indirizzo, avvisa da solo le squadre
# collegate (messaggio firmato «trasloco»): i collegamenti restano in piedi.
cambia_dominio() {
  prepara "${SQUADRA:-}"
  [ -f "$ENV" ] || { echo "La squadra $SQUADRA non c'e'."; exit 1; }
  local nuovo=${DOMINIO:-} vecchio qui la fino
  vecchio=$(leggi DOMINIO)
  if [ "$nuovo" = "$vecchio" ]; then
    echo "$SQUADRA sta gia' su $nuovo."
    exit 1
  fi
  valida_dominio "$nuovo"
  qui=$(indirizzo "$DOMINIO_PROD")
  la=$(indirizzo "$nuovo")
  if [ -z "$la" ] || [ "$la" != "$qui" ]; then
    echo "$nuovo non punta ancora a questa macchina (${la:-nessun indirizzo}; qui e' $qui)."
    echo "Prima il record nel DNS (CNAME verso $DOMINIO_PROD, o A verso $qui), poi si rilancia."
    exit 1
  fi
  fino=$(date -d '+6 months' +%F)
  echo "== $SQUADRA: da $vecchio a $nuovo (il vecchio nome rimanda al nuovo fino al $fino)"
  # le righe di un redirect precedente, se c'era, lasciano il posto a queste
  sed -i -e '/^DOMINIO_PRECEDENTE=/d' -e '/^PRECEDENTE_FINO=/d' \
    -e "s#^DOMINIO=.*#DOMINIO=$nuovo#" "$ENV"
  printf 'DOMINIO_PRECEDENTE=%s\nPRECEDENTE_FINO=%s\n' "$vecchio" "$fino" >> "$ENV"
  sed -i "s#https://$vecchio#https://$nuovo#g" "$CARTELLA/ACCESSO.txt" 2>/dev/null || true
  # il nuovo INDIRIZZO_PUBBLICO ricrea l'app: ripartendo annuncia il trasloco
  rilascia "$SQUADRA"
}

# Toglie un gestionale ospitato senza perdere niente: backup finale del
# database, container fermati e tolti, proxy e rete staccati, cartella spostata
# in /opt/archivio. I volumi (database, allegati, sessione WhatsApp) restano:
# si cancellano solo a mano, sapendolo (vedi il messaggio alla fine).
rimuovi() {
  prepara "$1"
  protetta "$SQUADRA"
  if [ ! -f "$ENV" ]; then
    echo "La squadra $SQUADRA non c'e': niente da togliere."
    return
  fi
  local dominio archivio
  dominio=$(leggi DOMINIO)
  echo "== $SQUADRA: rimozione di https://$dominio"
  if condiviso || docker ps -q --filter "name=^zd-sq-$SQUADRA-db\$" | grep -q .; then
    mkdir -p /root/backup
    backup_db "/root/backup/sq-$SQUADRA-finale-$(date +%F-%H%M).dump"
    echo "== backup finale in /root/backup/sq-$SQUADRA-finale-*.dump"
  fi
  zds down --remove-orphans
  # il Postgres suo, se non aveva traslocato (non e' piu' nel compose)
  docker rm -f "zd-sq-$SQUADRA-db" > /dev/null 2>&1 || true
  if [ -f "$SITO_CADDY" ]; then
    rm -f "$SITO_CADDY"
    ricarica_proxy
    echo "== proxy: $dominio staccato"
  fi
  docker network disconnect "$RETE" zd-proxy > /dev/null 2>&1 || true
  docker network rm "$RETE" > /dev/null 2>&1 || true
  archivio=/opt/archivio/squadra-$SQUADRA-$(date +%Y%m%d%H%M%S)
  mkdir -p /opt/archivio
  mv "$CARTELLA" "$archivio"
  echo "== cartella spostata in $archivio (chiavi e accesso restano li')"
  echo "I dati restano: il database $(ruolo_db "$SQUADRA") nel Postgres comune e i volumi"
  echo "gestionale-sq-${SQUADRA}_*. Per cancellarli davvero: «elimina $SQUADRA»."
}

# Cancella per sempre un gestionale gia' tolto con «rimuovi»: i volumi dei
# dati (database, allegati, sessione WhatsApp) e la cartella archiviata. I
# backup in /root/backup restano. Non si annulla, quindi rifiuta tutto quello
# che non e' esattamente un gestionale ospitato gia' rimosso:
# - i nomi nostri (ops, www, test…: valida_squadra e la lista qui sotto);
# - un gestionale ancora attivo (cartella in /opt o container presenti);
# - una cartella che non e' un archivio di quel gestionale.
# Esce con 0 solo se alla fine non resta niente.
elimina() {
  prepara "$1"
  local archivio=${2:-} v resta=0
  riservato "$SQUADRA"
  protetta "$SQUADRA"
  if [ -e "$CARTELLA" ]; then
    echo "$CARTELLA c'e' ancora: il gestionale e' attivo. Prima «rimuovi $SQUADRA»."
    exit 1
  fi
  if docker ps -a --format '{{.Names}}' | grep -q "^zd-sq-$SQUADRA-"; then
    echo "Ci sono ancora container zd-sq-$SQUADRA-*: prima «rimuovi $SQUADRA»."
    exit 1
  fi
  # la cartella archiviata: quella indicata, se e' davvero sua, o tutte le sue
  local archivi=()
  if [ -n "$archivio" ]; then
    if ! printf '%s' "$archivio" | grep -Eq "^/opt/archivio/squadra-$SQUADRA-[0-9]{14}\$"; then
      echo "$archivio non e' un archivio di $SQUADRA: non tocco niente."
      exit 1
    fi
    [ -d "$archivio" ] && archivi+=("$archivio")
  else
    for v in /opt/archivio/squadra-"$SQUADRA"-*; do
      printf '%s' "$v" | grep -Eq "^/opt/archivio/squadra-$SQUADRA-[0-9]{14}\$" && [ -d "$v" ] && archivi+=("$v")
    done
  fi
  echo "== $SQUADRA: cancellazione definitiva"
  # solo i volumi di questo progetto, per nome esatto: «demo» non tocca «demo2»
  for v in $(docker volume ls -q | grep -E "^gestionale-sq-${SQUADRA}_(db-data|uploads|whatsapp)\$" || true); do
    docker volume rm "$v" > /dev/null && echo "== volume $v cancellato"
  done
  # il suo database e il suo utente nel Postgres comune
  local ruolo
  ruolo=$(ruolo_db "$SQUADRA")
  if docker ps -q --filter "name=^$PG\$" | grep -q .; then
    printf 'DROP DATABASE IF EXISTS %s WITH (FORCE);\nDROP ROLE IF EXISTS %s;\n' "$ruolo" "$ruolo" \
      | docker exec -i "$PG" psql -q -v ON_ERROR_STOP=1 -U postgres -d postgres > /dev/null \
      && echo "== database $ruolo cancellato"
  fi
  for v in "${archivi[@]}"; do
    rm -rf -- "$v" && echo "== cartella $v cancellata"
  done
  # controllo finale: esce bene solo se non resta niente
  if docker volume ls -q | grep -Eq "^gestionale-sq-${SQUADRA}_"; then
    echo "!! restano volumi di $SQUADRA:"; docker volume ls -q | grep -E "^gestionale-sq-${SQUADRA}_"; resta=1
  fi
  for v in "${archivi[@]}"; do
    [ -e "$v" ] && { echo "!! resta $v"; resta=1; }
  done
  if docker ps -q --filter "name=^$PG\$" | grep -q . \
    && docker exec "$PG" psql -At -U postgres -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$ruolo'" | grep -q 1; then
    echo "!! resta il database $ruolo"; resta=1
  fi
  [ "$resta" = 0 ] || exit 1
  echo "$SQUADRA cancellato. I backup restano in /root/backup/sq-$SQUADRA-*.dump"
}

# La password di un amministratore del gestionale, scelta da fuori (la console).
#
# Arriva in ADMIN_PASSWORD, mai sulla riga di comando: si passa all'app per
# stdin e non si stampa da nessuna parte. Si salva come la salva l'app (bcrypt,
# dentro il suo container, con le sue librerie). Tocca un utente solo: quello
# con l'email data, o l'admin di partenza (SEED_ADMIN_EMAIL), e solo se è
# amministratore.
#   CAMBIA=1  al primo accesso gli si chiede di cambiarla (deveCambiarePassword)
# Le sessioni sono cookie firmati senza un registro sul server: non si possono
# chiudere per una persona sola, e restano valide fino alla loro scadenza.
imposta_password() {
  prepara "$1"
  riservato "$SQUADRA"
  local email=${2:-} cambia=${CAMBIA:-0} esito tentativo
  [ -f "$ENV" ] || { echo "La squadra $SQUADRA non c'e'."; exit 1; }
  [ -n "${ADMIN_PASSWORD:-}" ] || { echo "Manca la password."; exit 1; }
  if [ "${#ADMIN_PASSWORD}" -lt 8 ]; then echo "Password troppo corta: almeno 8 caratteri."; exit 1; fi
  case "$ADMIN_PASSWORD" in *$'\n'*) echo "La password non puo' andare a capo."; exit 1 ;; esac
  [ -n "$email" ] || email=$(leggi SEED_ADMIN_EMAIL)
  docker ps -q --filter "name=^zd-sq-$SQUADRA-app\$" | grep -q . \
    || { echo "Il gestionale $SQUADRA non e' acceso."; exit 1; }

  # appena creato l'admin di partenza nasce con il seed, all'avvio: si aspetta
  for tentativo in $(seq 1 20); do
    esito=$(printf '%s\n%s' "$email" "$ADMIN_PASSWORD" | docker exec -i -e CAMBIA="$cambia" -w /app \
      "zd-sq-$SQUADRA-app" node -e '
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
let d = "";
process.stdin.on("data", (c) => (d += c)).on("end", async () => {
  const i = d.indexOf("\n");
  const email = d.slice(0, i).trim().toLowerCase();
  const password = d.slice(i + 1);
  const prisma = new PrismaClient();
  try {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return console.log("NESSUNO");
    if (!u.roles.includes("ADMIN")) return console.log("NON_ADMIN");
    await prisma.user.update({
      where: { id: u.id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        deveCambiarePassword: process.env.CAMBIA === "1",
      },
    });
    console.log("FATTO");
  } catch (e) {
    console.log("ERRORE " + (e && e.code ? e.code : "db"));
  } finally {
    await prisma.$disconnect();
  }
});' 2>/dev/null | tail -n 1) || esito="ERRORE exec"
    # si aspetta solo l'admin di partenza, che nasce col seed all'avvio
    [ "$esito" = "NESSUNO" ] && [ "$email" = "$(leggi SEED_ADMIN_EMAIL)" ] && [ "$tentativo" -lt 20 ] \
      && { sleep 3; continue; }
    break
  done
  case "$esito" in
    FATTO) ;;
    NESSUNO) echo "Nel gestionale $SQUADRA non c'e' un utente $email."; exit 1 ;;
    NON_ADMIN) echo "$email non e' un amministratore di $SQUADRA: non la cambio."; exit 1 ;;
    *) echo "Password non applicata ($esito)."; exit 1 ;;
  esac

  # ACCESSO.txt e .env.squadra restano in pari, se parlano di questo utente
  if [ "$email" = "$(leggi SEED_ADMIN_EMAIL)" ]; then
    (umask 077
      # fra apici: compose non interpreta i $ dentro; con un apice nella
      # password resta la vecchia (serve solo se l'admin andasse ricreato)
      case "$ADMIN_PASSWORD" in
        *"'"*) ;;
        *)
          PW="$ADMIN_PASSWORD" awk 'BEGIN{p=ENVIRON["PW"]} /^SEED_ADMIN_PASSWORD=/{print "SEED_ADMIN_PASSWORD='"'"'" p "'"'"'"; next} {print}' \
            "$ENV" > "$ENV.nuovo" && mv "$ENV.nuovo" "$ENV"
          ;;
      esac
      if [ -f "$CARTELLA/ACCESSO.txt" ]; then
        PW="$ADMIN_PASSWORD" awk 'BEGIN{p=ENVIRON["PW"]} /^  password: /{print "  password: " p; next} {print}' \
          "$CARTELLA/ACCESSO.txt" > "$CARTELLA/ACCESSO.txt.nuovo" && mv "$CARTELLA/ACCESSO.txt.nuovo" "$CARTELLA/ACCESSO.txt"
      fi)
  fi
  echo "== $SQUADRA: password di $email impostata$([ "$cambia" = 1 ] && echo ', da cambiare al primo accesso')."
}

# Risponde il gestionale di questa squadra? (dal proxy, sulla sua rete)
risponde() {
  local _
  for _ in $(seq 1 "${TENTATIVI:-${1:-45}}"); do
    docker exec zd-proxy wget -q -O /dev/null "http://zd-sq-$SQUADRA-app:3000/login" 2>/dev/null && return 0
    sleep 2
  done
  return 1
}

# Porta una squadra a un'altra versione (anche indietro), in sicurezza:
#   1. le immagini della versione ci sono (qui, o dal REGISTRO);
#   2. backup del database, che resta in /root/backup;
#   3. si cambia VERSIONE e si riparte: le migrazioni le fa l'app all'avvio;
#   4. se entro un minuto e mezzo il gestionale non risponde, si torna alla
#      versione di prima col database com'era, e si esce con errore.
# L'ultima riga è un JSON per chi l'ha chiesto (il portale ZeroDark):
#   {"version":"3.25.0","previous":"3.24.0"}                       fatto
#   {"version":"3.24.0","attempted":"3.25.0","rolled_back":true}   tornato indietro
aggiorna() {
  prepara "$1"
  riservato "$SQUADRA"
  local nuova=$2 prima dump
  valida_versione "$nuova"
  [ -f "$ENV" ] || { echo "La squadra $SQUADRA non c'e'."; exit 1; }
  prima=$(leggi VERSIONE || true)
  [ -n "$prima" ] || prima=$(versione_corrente)
  if [ "$nuova" = "$prima" ] && docker ps -q --filter "name=^zd-sq-$SQUADRA-app\$" | grep -q .; then
    echo "== $SQUADRA e' gia' alla versione $nuova."
    echo "{\"version\":\"$nuova\",\"previous\":\"$prima\"}"
    return
  fi
  immagini_versione "$nuova" || exit 1

  echo "== $SQUADRA: da $prima a $nuova"
  mkdir -p /root/backup
  # sul Postgres comune prima di tutto: da qui in poi backup e ritorno
  # indietro lavorano lì
  pg_condiviso || exit 1
  if ! condiviso; then
    trasloca_db || { echo "{\"version\":\"$prima\",\"attempted\":\"$nuova\",\"rolled_back\":true}"; exit 1; }
  fi
  dump=/root/backup/sq-$SQUADRA-prima-di-$nuova-$(date +%F-%H%M).dump
  backup_db "$dump"
  echo "== backup in $dump"

  sed -i "s/^VERSIONE=.*/VERSIONE=$nuova/" "$ENV"
  grep -q '^VERSIONE=' "$ENV" || echo "VERSIONE=$nuova" >> "$ENV"
  zds up -d --pull never
  if risponde 45; then
    echo "== $SQUADRA: versione $nuova, il gestionale risponde"
    echo "{\"version\":\"$nuova\",\"previous\":\"$prima\"}"
    return
  fi

  # non risponde: si torna com'era, codice e dati
  echo "!! $SQUADRA non risponde con la $nuova: torno alla $prima col database di prima"
  docker logs "zd-sq-$SQUADRA-app" --tail 15 2>&1 | grep -vi 'password' || true
  sed -i "s/^VERSIONE=.*/VERSIONE=$prima/" "$ENV"
  docker stop "zd-sq-$SQUADRA-app" > /dev/null 2>&1 || true
  # lo schema da capo: le tabelle che la versione nuova ha già creato non
  # devono restare, o il prossimo aggiornamento non riuscirebbe a ricrearle
  ripristina_db "$dump" || echo "!! ripristino del database con avvisi: controlla, il backup e' $dump"
  zds up -d --pull never
  if risponde 45; then
    echo "== $SQUADRA di nuovo alla $prima e risponde"
  else
    echo "!! $SQUADRA non risponde nemmeno con la $prima: serve un intervento a mano"
  fi
  echo "{\"version\":\"$prima\",\"attempted\":\"$nuova\",\"rolled_back\":true}"
  exit 1
}

# Le versioni pronte su questo server, e quella di una squadra se la si nomina:
#   {"available":["3.25.0","3.24.0"],"latest":"3.25.0","current":"3.24.0"}
versioni() {
  local disponibili ultima corrente=""
  disponibili=$(docker image ls gestionale-app --format '{{.Tag}}' \
    | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -t. -k1,1nr -k2,2nr -k3,3nr | uniq || true)
  ultima=$(versione_corrente)
  if [ -n "${1:-}" ]; then
    prepara "$1"
    [ -f "$ENV" ] || { echo "La squadra $SQUADRA non c'e'."; exit 1; }
    corrente=$(leggi VERSIONE || true)
  fi
  printf '{"available":[%s],"latest":"%s"%s}\n' \
    "$(printf '%s\n' $disponibili | sed 's/.*/"&"/' | paste -sd, -)" "$ultima" \
    "${corrente:+,\"current\":\"$corrente\"}"
}

# Le immagini delle versioni vecchie: restano le ultime TENERE (5) e tutte
# quelle che qualche squadra sta usando. Lo chiama il rilascio della produzione.
pulisci_versioni() {
  local tenere=${TENERE:-5} usate v
  usate=$(grep -h '^VERSIONE=' /opt/squadra-*/.env.squadra 2>/dev/null | cut -d= -f2 | sort -u || true)
  for v in $(docker image ls gestionale-app --format '{{.Tag}}' \
    | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -t. -k1,1nr -k2,2nr -k3,3nr | uniq | tail -n +"$((tenere + 1))"); do
    printf '%s\n' $usate | grep -qx "$v" && continue
    docker image rm "gestionale-app:$v" "gestionale-whatsapp:$v" > /dev/null 2>&1 || true
    echo "== versione $v tolta"
  done
}

# Gli hook del portale ZeroDark collegati all'agent (zdt-agent), se c'è: un
# link per ogni file eseguibile di deploy/console-hooks. I link seguono il
# codice, quindi un hook corretto arriva col rilascio; uno nuovo si collega qui.
# Lo chiama il rilascio della produzione; il modo «console» mostra lo stato.
collega_hook() {
  local cartella=/etc/zdt-agent/hooks h nome
  if [ ! -d /etc/zdt-agent ]; then
    echo "== Nessun agent del portale ZeroDark su questo server (/etc/zdt-agent)"
    return
  fi
  mkdir -p "$cartella"
  for h in "$PROD"/deploy/console-hooks/*; do
    [ -f "$h" ] && [ -x "$h" ] || continue
    nome=$(basename "$h")
    if [ "$(readlink -f "$cartella/$nome" 2>/dev/null)" != "$h" ]; then
      ln -sf "$h" "$cartella/$nome"
      echo "== hook $nome collegato"
    fi
  done
}

# Com'è messo il server dal punto di vista del portale ZeroDark.
console() {
  collega_hook
  echo "== Hook in /etc/zdt-agent/hooks:"
  ls -l /etc/zdt-agent/hooks 2>/dev/null | awk 'NR>1 {print "   " $9, $10, $11}'
  echo "== Agent: $(systemctl is-active zdt-agent 2>/dev/null || echo 'non trovato')"
  echo "== Versioni pronte: $(versioni)"
  echo "== Gestionali ospitati:"
  local env trovate=0
  for env in /opt/squadra-*/.env.squadra; do
    [ -f "$env" ] || continue
    trovate=1
    echo "   $(basename "$(dirname "$env")" | sed 's/^squadra-//') — $(grep '^DOMINIO=' "$env" | cut -d= -f2) — versione $(grep '^VERSIONE=' "$env" | cut -d= -f2)"
  done
  [ "$trovate" = 1 ] || echo "   nessuno"
  echo "== Postgres comune: $(docker ps --filter "name=^$PG\$" --format '{{.Status}}' | head -1)"
  echo "== Container zd-sq-*:"
  docker ps -a --filter "name=zd-sq-" --format '   {{.Names}}\t{{.Status}}' || true
  echo "== In archivio: $(ls -d /opt/archivio/squadra-* 2>/dev/null | xargs -r -n1 basename | paste -sd' ' - || true)"
}

# I gestionali nati prima che il loro nome puntasse qui: il sito nel proxy non
# c'e' (e da fuori si vede un errore SSL). Lo chiama deploy/lavori.sh ogni
# pochi minuti: appena il DNS arriva, si aggancia da solo, senza un rilascio.
# Chi ha gia' il suo sito non viene toccato.
aggancia() {
  local env
  for env in /opt/squadra-*/.env.squadra; do
    [ -f "$env" ] || continue
    prepara "$(basename "$(dirname "$env")" | sed 's/^squadra-//')"
    [ -f "$SITO_CADDY" ] && continue
    # i container devono girare: un gestionale fermo non si aggancia
    docker ps -q --filter "name=^zd-sq-$SQUADRA-app\$" | grep -q . || continue
    rete
    proxy | grep 'agganciato' || true
  done
}

# ------------------------------------------- il nostro gestionale, da qui in poi

# Il sito di riserva del nostro gestionale: ops.zerodarkteam.it verso il
# compose vecchio (zd-app). Serve durante la migrazione, e dopo se non riesce.
sito_riserva() {
  local riserva=$PROD/siti/ops-riserva.caddy
  mkdir -p "$PROD/siti"
  cat > "$riserva" <<EOF2
# Scritto da squadra-server.sh migra-produzione: il nostro gestionale sul
# compose vecchio (zd-app), finche' non e' la squadra «zerodark». Si toglie da
# solo quando la migrazione riesce.
$DOMINIO_PROD {
	encode zstd gzip
	request_body {
		max_size 25MB
	}
	header Strict-Transport-Security "max-age=31536000"
	reverse_proxy zd-app:3000 {
		header_up X-Real-IP {remote_host}
		transport http {
			read_timeout 120s
		}
	}
}
EOF2
}

# Una volta sola: il nostro gestionale lascia il compose della produzione (zd-app,
# zd-db, zd-whatsapp) e diventa la squadra ospitata «zerodark».
#   - chiavi e identità restano le sue (sessioni, notifiche push, lavori, admin
#     di partenza): si copiano da .env.prod, che resta per il proxy;
#   - il database passa nel Postgres comune (sq_zerodark), con un backup prima;
#   - allegati e sessione WhatsApp si copiano nei volumi della squadra;
#   - il proxy manda ops.zerodarkteam.it alla nuova (siti/sq-zerodark.caddy).
# Se la nuova non risponde si torna com'era: i container vecchi non sono mai
# stati cancellati, solo fermati, e ripartono; il proxy li ritrova con un sito
# di riserva (siti/ops-riserva.caddy). I volumi vecchi restano comunque.
migra_produzione() {
  prepara "$NOSTRA"
  local penv=$PROD/.env.prod v dump k riserva=$PROD/siti/ops-riserva.caddy
  if [ -f "$ENV" ]; then
    echo "== Il nostro gestionale e' gia' la squadra «$NOSTRA»."
    return 0
  fi
  # Il proxy legge il Caddyfile nuovo (senza il sito della produzione: ora ce
  # l'ha la squadra) solo ripartendo, perché è montato come file. Prima di
  # ripartire trova il sito di riserva verso zd-app: la produzione resta
  # raggiungibile finché la migrazione non la ferma, e anche se si ferma qui.
  sito_riserva
  docker restart zd-proxy > /dev/null
  sleep 3
  [ -f "$penv" ] || { echo "Manca $penv: non so le chiavi della produzione."; return 1; }
  docker ps -q --filter "name=^zd-db\$" | grep -q . || { echo "zd-db non e' acceso: niente da migrare."; return 1; }
  v=$(versione_corrente)
  immagini_versione "$v" || return 1
  pg_condiviso || return 1

  echo "== Il nostro gestionale diventa la squadra «$NOSTRA», versione $v"
  mkdir -p "$CARTELLA"
  chmod 700 "$CARTELLA"
  (
    umask 077
    {
      echo "SQUADRA=$NOSTRA"
      # copiate così come sono: le stesse chiavi, quindi le stesse sessioni,
      # le stesse notifiche, lo stesso admin di partenza
      for k in DOMINIO SESSION_SECRET SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD SEGRETO_LAVORI \
        SEGRETO_WHATSAPP VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT TZ; do
        grep -m1 "^$k=" "$penv" || true
      done
      # nessun nome: è il nostro, con il marchio Zero Dark
      echo "NOME_SQUADRA="
      echo "NOME_GESTIONALE="
      echo "POSTGRES_USER=$(ruolo_db "$NOSTRA")"
      echo "POSTGRES_PASSWORD=$(casuale 24)"
      echo "POSTGRES_DB=$(ruolo_db "$NOSTRA")"
      echo "DB_HOST=$PG"
      echo "VERSIONE=$v"
    } > "$ENV"
    grep -q '^SEGRETO_WHATSAPP=.' "$ENV" || { sed -i '/^SEGRETO_WHATSAPP=/d' "$ENV"; echo "SEGRETO_WHATSAPP=$(casuale 16)" >> "$ENV"; }
    grep -q '^TZ=' "$ENV" || echo "TZ=Europe/Rome" >> "$ENV"
    cat > "$CARTELLA/ACCESSO.txt" <<EOF2
Il nostro gestionale: https://$(leggi DOMINIO)
Era la produzione (zd-app, zd-db), dal $(date +%F) e' la squadra ospitata «$NOSTRA».
Gli accessi sono quelli di sempre.
EOF2
  )
  if [ "$(leggi DOMINIO)" != "$DOMINIO_PROD" ]; then
    echo "!! In .env.prod il dominio e' $(leggi DOMINIO), non $DOMINIO_PROD: mi fermo."
    rm -rf "$CARTELLA"
    return 1
  fi

  rete
  crea_db || { rm -rf "$CARTELLA"; return 1; }

  # da qui il gestionale e' fermo, un minuto o due
  echo "== Fermo la produzione vecchia e faccio il backup"
  docker stop zd-app zd-whatsapp > /dev/null 2>&1 || true
  mkdir -p /root/backup
  dump=/root/backup/prod-prima-di-$NOSTRA-$(date +%F-%H%M).dump
  if docker exec zd-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$dump" \
    && ripristina_db "$dump"; then
    echo "== database in $(ruolo_db "$NOSTRA") (backup in $dump)"
    zds create > /dev/null 2>&1 || true
    # allegati e sessione WhatsApp: copiati, gli originali restano dove sono
    for k in uploads whatsapp; do
      docker run --rm --entrypoint sh -v "gestionale_$k:/da:ro" -v "gestionale-sq-${NOSTRA}_$k:/a" \
        postgres:16-alpine -c 'find /a -mindepth 1 -delete; cp -a /da/. /a/' \
        && echo "== $k copiati"
    done
    zds up -d --pull never
    if risponde 60; then
      rm -f "$riserva"
      proxy || true
      # da fuori, attraverso il proxy: è questo che vedono le persone
      local codice="" _
      for _ in $(seq 1 15); do
        codice=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
          --resolve "$DOMINIO_PROD:443:127.0.0.1" "https://$DOMINIO_PROD/login" || true)
        [ "$codice" = 200 ] && break
        sleep 2
      done
      if [ -f "$SITO_CADDY" ] && [ "$codice" = 200 ]; then
        docker rm zd-app zd-whatsapp > /dev/null 2>&1 || true
        docker stop zd-db > /dev/null 2>&1 || true
        docker rm zd-db > /dev/null 2>&1 || true
        echo "== Fatto: https://$DOMINIO_PROD e' la squadra «$NOSTRA». I volumi vecchi"
        echo "   (gestionale_db-data, gestionale_uploads, gestionale_whatsapp) restano come copia."
        return 0
      fi
      echo "!! https://$DOMINIO_PROD dal proxy risponde ${codice:-niente}, non 200"
    else
      echo "!! la squadra «$NOSTRA» non risponde"
      docker logs "zd-sq-$NOSTRA-app" --tail 15 2>&1 | grep -vi 'password' || true
    fi
  else
    echo "!! backup o ripristino del database non riusciti"
  fi

  # indietro: la produzione vecchia riparte com'era, e il proxy la ritrova
  echo "== Torno alla produzione di prima"
  zds down > /dev/null 2>&1 || true
  rm -f "$SITO_CADDY"
  docker start zd-db zd-app zd-whatsapp > /dev/null 2>&1 || true
  sito_riserva
  ricarica_proxy || true
  mkdir -p /opt/archivio
  mv "$CARTELLA" "/opt/archivio/squadra-$NOSTRA-fallita-$(date +%Y%m%d%H%M%S)"
  echo "!! Migrazione non riuscita: il gestionale e' di nuovo sul compose vecchio (zd-app)."
  return 1
}

case "${1:-stato}" in
  nuova) nuova ;;
  dominio) cambia_dominio ;;
  rilascia) rilascia "${2:?quale squadra?}" ;;
  rilascia-tutte) rilascia_tutte ;;
  stato) stato "${2:-}" ;;
  rimuovi) rimuovi "${2:?quale squadra?}" ;;
  aggancia) aggancia ;;
  elimina) elimina "${2:?quale squadra?}" "${3:-}" ;;
  password) imposta_password "${2:?quale squadra?}" "${3:-}" ;;
  aggiorna) aggiorna "${2:?quale squadra?}" "${3:?quale versione?}" ;;
  versioni) versioni "${2:-}" ;;
  pulisci-versioni) pulisci_versioni ;;
  collega-hook) collega_hook ;;
  console) console ;;
  migra-produzione) migra_produzione ;;
  *) echo "uso: $0 nuova | dominio | rilascia <squadra> | rilascia-tutte | stato [squadra] | rimuovi <squadra> | elimina <squadra> [archivio] | password <squadra> [email] | aggiorna <squadra> <versione> | versioni [squadra] | aggancia"; exit 1 ;;
esac
