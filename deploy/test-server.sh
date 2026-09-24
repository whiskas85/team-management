#!/usr/bin/env bash
#
# L'ambiente di test sulla macchina della produzione.
#
# Lo chiama l'automazione Rilascio (.github/workflows/rilascio.yml) via ssh,
# come root. Si può lanciare anche a mano dal server:
#
#   bash /opt/gestionale/deploy/test-server.sh rilascia main
#   bash /opt/gestionale/deploy/test-server.sh copia-dati
#   bash /opt/gestionale/deploy/test-server.sh stato
#
# «rilascia» fa tutto quello che serve, e rifarlo non rompe niente: la prima
# volta crea la cartella, il file .env.test con chiavi nuove e la password del
# proxy; le volte dopo aggiorna il codice al ramo chiesto e ricostruisce.
#
# «copia-dati» porta nel test il database e gli allegati della produzione.
# La produzione la legge soltanto: un pg_dump e una copia del volume.
#
# Le password non passano mai dal log dell'automazione, che su un repository
# pubblico è pubblico: stanno in /opt/gestionale-test/ACCESSO.txt, permessi
# 600, e si leggono entrando sul server.

set -euo pipefail

PROD=/opt/gestionale
TEST=/opt/gestionale-test
DOMINIO_TEST=test.zerodarkteam.it
DOMINIO_PROD=ops.zerodarkteam.it
SITO_CADDY=$PROD/siti/test.caddy
RETE=zd-bordo

zdt() {
  docker compose -p gestionale-test -f "$TEST/docker-compose.test.yml" \
    --env-file "$TEST/.env.test" --project-directory "$TEST" "$@"
}

casuale() { openssl rand -hex "$1"; }

rete() {
  docker network inspect "$RETE" > /dev/null 2>&1 || docker network create "$RETE" > /dev/null
}

# ------------------------------------------------------------------ codice

codice() {
  local ramo=$1
  if [ ! -d "$TEST/.git" ]; then
    echo "== Prima volta: copia del codice in $TEST"
    git clone -q "$(git -C "$PROD" remote get-url origin)" "$TEST"
  fi
  git -C "$TEST" fetch -q origin
  # staccato dal ramo: il test si porta dove si vuole, senza merge da fare
  git -C "$TEST" checkout -q --detach "origin/$ramo"
  echo "== Codice del test: $ramo, $(git -C "$TEST" log --oneline -1)"
  if [ ! -f "$TEST/docker-compose.test.yml" ]; then
    echo "Il ramo $ramo non ha docker-compose.test.yml: e' piu' vecchio dell'ambiente di test."
    exit 1
  fi
}

# ------------------------------------------------------- chiavi e password

configurazione() {
  if [ -f "$TEST/.env.test" ]; then
    return
  fi
  echo "== Prima volta: chiavi nuove in $TEST/.env.test"
  local admin_pw proxy_pw
  admin_pw=$(casuale 12)
  proxy_pw=$(casuale 12)
  umask 077
  cat > "$TEST/.env.test" <<EOF
POSTGRES_USER=zerodark
POSTGRES_PASSWORD=$(casuale 24)
POSTGRES_DB=zerodark
SESSION_SECRET=$(casuale 32)
SEED_ADMIN_EMAIL=admin@$DOMINIO_TEST
SEED_ADMIN_PASSWORD=$admin_pw
TZ=Europe/Rome
PROXY_UTENTE=zd
PROXY_PASSWORD=$proxy_pw
EOF
  cat > "$TEST/ACCESSO.txt" <<EOF
Ambiente di test: https://$DOMINIO_TEST

1. Il browser chiede utente e password (e' il proxy, prima del gestionale):
   utente:   zd
   password: $proxy_pw

2. Poi il login del gestionale.
   Prima di copiare i dati dalla produzione c'e' solo l'admin di partenza:
     email:    admin@$DOMINIO_TEST
     password: $admin_pw
   Dopo «test-copia-dati» valgono le stesse credenziali della produzione.
EOF
  umask 022
}

leggi() { grep "^$1=" "$TEST/.env.test" | cut -d= -f2-; }

# --------------------------------------------------------------- il proxy

# L'indirizzo di un nome come lo vede internet, non come se lo ricorda questa
# macchina: il DNS che usa il server tiene in memoria per un'ora anche i «non
# esiste», e un nome cercato prima di crearlo restava fuori dal proxy per
# niente. Si chiede a Cloudflare con il nslookup che sta nel container di
# Caddy; se quella strada non c'e', si torna al DNS del server.
# Un nome che non esiste ancora non e' un guasto: e' «nessun indirizzo».
indirizzo() {
  local ip
  ip=$({ docker exec zd-proxy nslookup "$1" 1.1.1.1 2>/dev/null || true; } \
    | awk '/^Address/ && $2 !~ /:/ {print $2; exit}')
  if [ -z "$ip" ]; then
    ip=$({ getent ahostsv4 "$1" 2>/dev/null || true; } | awk 'NR==1 {print $1}')
  fi
  printf '%s' "$ip"
}

proxy() {
  local qui la
  qui=$(indirizzo "$DOMINIO_PROD")
  la=$(indirizzo "$DOMINIO_TEST")
  if [ -z "$la" ] || [ "$la" != "$qui" ]; then
    echo "== Il nome $DOMINIO_TEST non punta ancora a questa macchina (${la:-nessun indirizzo})."
    echo "   Il test gira, ma da fuori non si raggiunge: serve il record nel DNS."
    echo "   Appena c'e', si rilancia «test» e il proxy lo prende da solo."
    # Caddy chiederebbe un certificato per un nome che non porta qui, e
    # Let's Encrypt conta i tentativi falliti: meglio non chiederlo affatto.
    if [ -f "$SITO_CADDY" ]; then
      rm -f "$SITO_CADDY"
      docker exec zd-proxy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
    fi
    return
  fi

  # l'impronta della password si calcola una volta sola: bcrypt ha un sale
  # casuale, e rifarla a ogni rilascio cambierebbe il file senza motivo. Sta
  # fuori da .env.test perche' i suoi «$» il compose li leggerebbe come variabili
  if [ ! -s "$TEST/proxy.hash" ]; then
    (umask 077; docker exec zd-proxy caddy hash-password --plaintext "$(leggi PROXY_PASSWORD)" \
      > "$TEST/proxy.hash")
  fi
  local hash
  hash=$(cat "$TEST/proxy.hash")
  mkdir -p "$PROD/siti"
  cat > "$SITO_CADDY.nuovo" <<EOF
# Scritto da deploy/test-server.sh: si rigenera a ogni rilascio del test.
$DOMINIO_TEST {
	encode zstd gzip

	request_body {
		max_size 25MB
	}

	header Strict-Transport-Security "max-age=31536000"
	# un ambiente di prova non deve finire nei motori di ricerca
	header X-Robots-Tag "noindex, nofollow"

	# prima del gestionale, una password del proxy: dentro ci sono i dati
	# veri della squadra, e senza questa chi non la conosce non vede nemmeno
	# la pagina di accesso
	basic_auth {
		$(leggi PROXY_UTENTE) $hash
	}

	reverse_proxy zd-test-app:3000 {
		header_up X-Real-IP {remote_host}
		transport http {
			read_timeout 120s
		}
	}
}
EOF
  if ! cmp -s "$SITO_CADDY.nuovo" "$SITO_CADDY" 2>/dev/null; then
    mv "$SITO_CADDY.nuovo" "$SITO_CADDY"
    docker exec zd-proxy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
    echo "== Proxy: $DOMINIO_TEST aggiunto"
  else
    rm -f "$SITO_CADDY.nuovo"
  fi
}

# ---------------------------------------------------------------- comandi

rilascia() {
  local ramo=${1:-main}
  rete
  codice "$ramo"
  configurazione
  echo "== Ricostruzione"
  zdt up -d --build
  proxy
  docker image prune -f --filter until=24h > /dev/null
  stato
}

copia_dati() {
  [ -f "$TEST/.env.test" ] || { echo "Il test non c'e' ancora: prima «test»."; exit 1; }
  local dump=/root/backup/per-test.dump
  mkdir -p /root/backup

  echo "== Dump della produzione (sola lettura)"
  docker exec zd-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$dump"

  echo "== Database del test: svuotato e riempito"
  zdt stop app
  docker exec zd-test-db sh -c \
    'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
  # --no-owner: l'utente del database di prod puo' chiamarsi diversamente
  docker exec -i zd-test-db sh -c \
    'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' < "$dump"
  rm -f "$dump"

  echo "== Allegati"
  docker run --rm \
    -v gestionale_uploads:/da:ro \
    -v gestionale-test_uploads:/a \
    alpine sh -c 'find /a -mindepth 1 -delete && cp -a /da/. /a/'

  zdt start app
  echo "Fatto. Nel test ora si entra con le credenziali della produzione."
  echo "Le credenziali del portale federale restano illeggibili: e' voluto."
}

stato() {
  echo "== Test"
  if [ -d "$TEST/.git" ]; then
    echo "codice: $(git -C "$TEST" log --oneline -1)"
    docker ps --filter name=zd-test- --format '{{.Names}}\t{{.Status}}'
    echo "-- ultime righe dell'app di test"
    # senza le righe che parlano di password: questo finisce nel log
    # dell'automazione, che su un repository pubblico è pubblico
    docker logs zd-test-app --tail 15 2>&1 | grep -vi 'password' || true
  else
    echo "non ancora preparato"
  fi
  if [ -f "$SITO_CADDY" ]; then
    # da fuori, certificato compreso: 401 vuol dire che il proxy chiede la
    # password, cioe' che e' tutto come deve essere
    # --resolve: il nome con l'indirizzo che vede internet, non con quello che
    # il DNS del server magari si ricorda ancora come «non esiste»
    local codice ip
    ip=$(indirizzo "$DOMINIO_TEST")
    codice=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
      ${ip:+--resolve "$DOMINIO_TEST:443:$ip"} "https://$DOMINIO_TEST/" || true)
    case "$codice" in
      401)
        echo "raggiungibile: https://$DOMINIO_TEST (chiede la password, giusto)"
        # e con la password: la pagina di accesso del gestionale deve rispondere
        local dentro
        dentro=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
          -u "$(leggi PROXY_UTENTE):$(leggi PROXY_PASSWORD)" \
          ${ip:+--resolve "$DOMINIO_TEST:443:$ip"} "https://$DOMINIO_TEST/login" || true)
        echo "con la password del proxy, /login risponde $dentro (200 e' giusto)"
        ;;
      000)
        echo "https://$DOMINIO_TEST non risponde, o il certificato non c'e' ancora. Dal proxy:"
        docker logs zd-proxy --since 2h 2>&1 | grep "$DOMINIO_TEST" \
          | grep -iE 'obtain|error|fail' | tail -5 || true
        ;;
      *) echo "https://$DOMINIO_TEST risponde $codice: senza password dovrebbe dare 401" ;;
    esac
  else
    echo "non raggiungibile da fuori: manca il record DNS per $DOMINIO_TEST"
  fi
}

case "${1:-stato}" in
  rilascia) rilascia "${2:-main}" ;;
  copia-dati) copia_dati ;;
  stato) stato ;;
  *) echo "uso: $0 rilascia <ramo> | copia-dati | stato"; exit 1 ;;
esac
