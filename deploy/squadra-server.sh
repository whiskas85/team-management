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
#   bash /opt/gestionale/deploy/squadra-server.sh rilascia pippo
#   bash /opt/gestionale/deploy/squadra-server.sh rilascia-tutte
#   bash /opt/gestionale/deploy/squadra-server.sh stato [pippo]
#   bash /opt/gestionale/deploy/squadra-server.sh rimuovi pippo
#   bash /opt/gestionale/deploy/squadra-server.sh aggancia   (lo fa da sé lavori.sh)
#   bash /opt/gestionale/deploy/squadra-server.sh elimina pippo [/opt/archivio/squadra-pippo-…]
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
# Le password non passano mai dal log dell'automazione, che su un repository
# pubblico è pubblico.

set -euo pipefail

PROD=/opt/gestionale
DOMINIO_PROD=ops.zerodarkteam.it
IMMAGINE=gestionale-app:latest
IMMAGINE_WHATSAPP=gestionale-whatsapp:latest

casuale() { openssl rand -hex "$1"; }

valida_squadra() {
  # finisce in nomi di cartelle, container e volumi: solo minuscole e trattini
  if ! printf '%s' "$1" | grep -Eq '^[a-z][a-z0-9-]{1,29}$' || printf '%s' "$1" | grep -Eq '^test[0-9]*$'; then
    echo "Nome breve non valido: «$1» (minuscole, cifre e trattini; non test…)"
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
  for img in "$IMMAGINE" "$IMMAGINE_WHATSAPP"; do
    if ! docker image inspect "$img" > /dev/null 2>&1; then
      echo "Manca l'immagine $img: prima un rilascio della produzione."
      exit 1
    fi
  done

  echo "== Nuova squadra: $nome ($SQUADRA) su https://$dominio"
  mkdir -p "$CARTELLA"
  chmod 700 "$CARTELLA"
  local admin_pw push
  admin_pw=$(casuale 12)
  push=$(chiavi_push)
  umask 077
  cat > "$ENV" <<EOF
SQUADRA=$SQUADRA
DOMINIO=$dominio
NOME_SQUADRA=$nome
NOME_GESTIONALE=$nome
POSTGRES_USER=zerodark
POSTGRES_PASSWORD=$(casuale 24)
POSTGRES_DB=zerodark
SESSION_SECRET=$(casuale 32)
SEED_ADMIN_EMAIL=$email
SEED_ADMIN_PASSWORD=$admin_pw
SEGRETO_LAVORI=$(casuale 24)
SEGRETO_WHATSAPP=$(casuale 16)
VAPID_PUBLIC_KEY=${push%% *}
VAPID_PRIVATE_KEY=${push##* }
VAPID_SUBJECT=mailto:$email
TZ=Europe/Rome
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
  if docker ps -q --filter "name=^zd-sq-$SQUADRA-db\$" | grep -q .; then
    echo "== $SQUADRA: backup"
    mkdir -p /root/backup
    docker exec "zd-sq-$SQUADRA-db" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
      > "/root/backup/sq-$SQUADRA-$(date +%F-%H%M).dump"
    # restano gli ultimi dieci
    ls -1t /root/backup/sq-"$SQUADRA"-*.dump 2>/dev/null | tail -n +11 | xargs -r rm -f
  fi
  echo "== $SQUADRA: avvio con le immagini della produzione"
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
  echo "== Squadra $SQUADRA: $(leggi NOME_SQUADRA) — https://$dominio"
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
  if [ ! -f "$ENV" ]; then
    echo "La squadra $SQUADRA non c'e': niente da togliere."
    return
  fi
  local dominio archivio
  dominio=$(leggi DOMINIO)
  echo "== $SQUADRA: rimozione di https://$dominio"
  if docker ps -q --filter "name=^zd-sq-$SQUADRA-db\$" | grep -q .; then
    mkdir -p /root/backup
    docker exec "zd-sq-$SQUADRA-db" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
      > "/root/backup/sq-$SQUADRA-finale-$(date +%F-%H%M).dump"
    echo "== backup finale in /root/backup/sq-$SQUADRA-finale-*.dump"
  fi
  zds down --remove-orphans
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
  echo "I dati restano nei volumi gestionale-sq-${SQUADRA}_*: per cancellarli davvero,"
  echo "  docker volume rm gestionale-sq-${SQUADRA}_db-data gestionale-sq-${SQUADRA}_uploads gestionale-sq-${SQUADRA}_whatsapp"
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
  case "$SQUADRA" in
    ops | www | zd | gestionale) echo "«$SQUADRA» non e' un gestionale ospitato: non lo cancello."; exit 1 ;;
  esac
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
  [ "$resta" = 0 ] || exit 1
  echo "$SQUADRA cancellato. I backup restano in /root/backup/sq-$SQUADRA-*.dump"
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

case "${1:-stato}" in
  nuova) nuova ;;
  dominio) cambia_dominio ;;
  rilascia) rilascia "${2:?quale squadra?}" ;;
  rilascia-tutte) rilascia_tutte ;;
  stato) stato "${2:-}" ;;
  rimuovi) rimuovi "${2:?quale squadra?}" ;;
  aggancia) aggancia ;;
  elimina) elimina "${2:?quale squadra?}" "${3:-}" ;;
  *) echo "uso: $0 nuova | dominio | rilascia <squadra> | rilascia-tutte | stato [squadra] | rimuovi <squadra> | elimina <squadra> [archivio] | aggancia"; exit 1 ;;
esac
