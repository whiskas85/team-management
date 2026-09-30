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
#
# Ogni squadra ha la sua cartella, /opt/squadra-<nome>, con il suo .env.squadra
# (chiavi e password sue, permessi 600) e ACCESSO.txt con l'admin di partenza.
# Il codice invece è quello della produzione: docker-compose.squadra.yml sta in
# /opt/gestionale e usa l'immagine già costruita dal rilascio. Per questo
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
RETE=zd-bordo
IMMAGINE=gestionale-app:latest

casuale() { openssl rand -hex "$1"; }

valida_squadra() {
  # finisce in nomi di cartelle, container e volumi: solo minuscole e trattini
  if ! printf '%s' "$1" | grep -Eq '^[a-z][a-z0-9-]{1,29}$' || printf '%s' "$1" | grep -Eq '^test[0-9]*$'; then
    echo "Nome breve non valido: «$1» (minuscole, cifre e trattini; non test…)"
    exit 1
  fi
}

prepara() {
  SQUADRA=$1
  valida_squadra "$SQUADRA"
  CARTELLA=/opt/squadra-$SQUADRA
  ENV=$CARTELLA/.env.squadra
  SITO_CADDY=$PROD/siti/sq-$SQUADRA.caddy
}

leggi() { grep "^$1=" "$ENV" | cut -d= -f2-; }

zds() {
  docker compose -p "gestionale-sq-$SQUADRA" -f "$PROD/docker-compose.squadra.yml" \
    --env-file "$ENV" --project-directory "$CARTELLA" "$@"
}

rete() {
  docker network inspect "$RETE" > /dev/null 2>&1 || docker network create "$RETE" > /dev/null
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
    echo "   (CNAME verso $DOMINIO_PROD, o A verso $qui). Poi si rilancia e il proxy lo prende da solo."
    # un certificato chiesto per un nome che non porta qui fallisce, e Let's
    # Encrypt conta i tentativi falliti: meglio non chiederlo affatto
    if [ -f "$SITO_CADDY" ]; then
      rm -f "$SITO_CADDY"
      ricarica_proxy
    fi
    return
  fi
  mkdir -p "$PROD/siti"
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
  if ! printf '%s' "$dominio" | grep -Eq '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$'; then
    echo "Dominio non valido: «$dominio» (es. gestionale.pippo.it)"
    exit 1
  fi
  case "$dominio" in
    *zerodarkteam.it) echo "$dominio e' un nome nostro: alla squadra serve il suo."; exit 1 ;;
  esac
  if grep -qs "^DOMINIO=$dominio\$" /opt/squadra-*/.env.squadra; then
    echo "$dominio e' gia' usato da un'altra squadra ospitata."
    exit 1
  fi
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
  if ! docker image inspect "$IMMAGINE" > /dev/null 2>&1; then
    echo "Manca l'immagine $IMMAGINE: prima un rilascio della produzione."
    exit 1
  fi

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
EOF
  umask 022
  rilascia "$SQUADRA"
  echo "Credenziali dell'admin in $CARTELLA/ACCESSO.txt (solo sul server)."
}

rilascia() {
  prepara "$1"
  [ -f "$ENV" ] || { echo "La squadra $SQUADRA non c'e': prima «nuova»."; exit 1; }
  rete
  if docker ps -q --filter "name=^zd-sq-$SQUADRA-db\$" | grep -q .; then
    echo "== $SQUADRA: backup"
    mkdir -p /root/backup
    docker exec "zd-sq-$SQUADRA-db" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
      > "/root/backup/sq-$SQUADRA-$(date +%F-%H%M).dump"
    # restano gli ultimi dieci
    ls -1t /root/backup/sq-"$SQUADRA"-*.dump 2>/dev/null | tail -n +11 | xargs -r rm -f
  fi
  echo "== $SQUADRA: avvio con l'immagine della produzione"
  # up ricrea l'app solo se l'immagine e' cambiata: le migrazioni le fa lei
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

case "${1:-stato}" in
  nuova) nuova ;;
  rilascia) rilascia "${2:?quale squadra?}" ;;
  rilascia-tutte) rilascia_tutte ;;
  stato) stato "${2:-}" ;;
  *) echo "uso: $0 nuova | rilascia <squadra> | rilascia-tutte | stato [squadra]"; exit 1 ;;
esac
