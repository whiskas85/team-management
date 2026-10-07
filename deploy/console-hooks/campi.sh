# Letto dagli hook della console (con «.»), non si lancia da solo.
#
# L'agent passa i campi del task in due modi: come variabili ZDT_APP_* e come
# JSON su stdin. Le versioni vecchie dell'agent non mettono tutti i campi
# nell'ambiente (la password, l'archivio), e allora si prendono dal JSON. Le
# variabili già valorizzate vincono. Niente viene stampato: la password passa
# per una pipe, non per la riga di comando.
if [ ! -t 0 ] && command -v python3 > /dev/null 2>&1; then
  ZDT_STDIN=$(cat || true)
  if [ -n "$ZDT_STDIN" ]; then
    zdt_campo() {
      printf '%s' "$ZDT_STDIN" | python3 -c '
import json, sys
try:
    v = json.load(sys.stdin).get(sys.argv[1])
except Exception:
    v = None
sys.stdout.write("" if v is None else str(v))' "$1" 2> /dev/null || true
    }
    [ -n "${ZDT_APP_NAME:-}" ] || ZDT_APP_NAME=$(zdt_campo name)
    [ -n "${ZDT_APP_DOMAIN:-}" ] || ZDT_APP_DOMAIN=$(zdt_campo domain)
    [ -n "${ZDT_APP_EMAIL:-}" ] || ZDT_APP_EMAIL=$(zdt_campo email)
    [ -n "${ZDT_APP_ADMIN_PASSWORD:-}" ] || ZDT_APP_ADMIN_PASSWORD=$(zdt_campo admin_password)
    [ -n "${ZDT_APP_ARCHIVE_PATH:-}" ] || ZDT_APP_ARCHIVE_PATH=$(zdt_campo archive_path)
    [ -n "${ZDT_APP_VERSION:-}" ] || ZDT_APP_VERSION=$(zdt_campo version)
    # il proprietario, primo amministratore (agent 0.1.5 li mette anche
    # nell'ambiente): nome, cognome, nascita AAAA-MM-GG, telefono
    [ -n "${ZDT_APP_FIRST_NAME:-}" ] || ZDT_APP_FIRST_NAME=$(zdt_campo first_name)
    [ -n "${ZDT_APP_LAST_NAME:-}" ] || ZDT_APP_LAST_NAME=$(zdt_campo last_name)
    [ -n "${ZDT_APP_BIRTH_DATE:-}" ] || ZDT_APP_BIRTH_DATE=$(zdt_campo birth_date)
    [ -n "${ZDT_APP_PHONE:-}" ] || ZDT_APP_PHONE=$(zdt_campo phone)
    unset -f zdt_campo
  fi
  unset ZDT_STDIN
fi
