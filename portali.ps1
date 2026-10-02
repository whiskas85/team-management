<#
.SYNOPSIS
  Gli accessi dei portali sul server: le squadre ospitate e gli ambienti di test.

.DESCRIPTION
  Entra sul server con ssh e legge, cartella per cartella, quello che serve
  per entrare in ogni portale: dominio, email e password dell'admin di
  partenza, e per i test la password del proxy.

  I comandi non passano dalla riga di ssh, dove PowerShell toglie le
  virgolette e li rompe: vanno al server come uno script da eseguire
  (bash -s). La password di root si chiede una volta sola.

  Le password stanno solo sul server (file ACCESSO.txt e .env.squadra, permessi
  600): qui si leggono e si mostrano, non si salvano da nessuna parte. Quella
  dell'admin e' quella di partenza: se l'admin l'ha cambiata dal profilo, non
  vale piu'.

.EXAMPLE
  .\portali.ps1                 # tutti: squadre ospitate e ambienti di test
  .\portali.ps1 demo            # solo la squadra ospitata «demo»
  .\portali.ps1 -Chiave C:\Users\me\.ssh\id_ed25519
#>

param(
  # Il nome breve della squadra (quello di squadra-nuova). Vuoto: tutte.
  [Parameter(Position = 0)]
  [string]$Squadra = '',

  [string]$Server = 'ops.zerodarkteam.it',
  [string]$Utente = 'root',

  # La chiave ssh, se non e' quella predefinita (o se si entra con la password, vuota)
  [string]$Chiave = ''
)

$ErrorActionPreference = 'Stop'
# lo script va al server in UTF-8: in PowerShell 5 di serie sarebbe ASCII
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

# il nome finisce in un comando sul server: solo minuscole, cifre e trattini
if ($Squadra -and $Squadra -notmatch '^[a-z][a-z0-9-]{1,29}$') {
  throw "Nome della squadra non valido: «$Squadra» (minuscole, cifre e trattini)."
}

$script = @'
set -u
mostra() {
  # $1 cartella, $2 file di impostazioni
  echo
  echo "== $(basename "$1")"
  if [ -f "$1/ACCESSO.txt" ]; then
    cat "$1/ACCESSO.txt"
  else
    grep -E '^(DOMINIO|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|PROXY_UTENTE|PROXY_PASSWORD)=' "$1/$2" 2>/dev/null
  fi
}

if [ -n "$SQUADRA" ]; then
  if [ -d "/opt/squadra-$SQUADRA" ]; then
    mostra "/opt/squadra-$SQUADRA" .env.squadra
  else
    echo "Non c'e' una squadra ospitata «$SQUADRA». Quelle che ci sono:"
    ls -d /opt/squadra-* 2>/dev/null | sed 's#/opt/squadra-#  #' || true
  fi
  exit 0
fi

echo "######## Squadre ospitate"
trovate=0
for d in /opt/squadra-*/; do
  [ -d "$d" ] || continue
  trovate=1
  mostra "${d%/}" .env.squadra
done
[ "$trovate" = 1 ] || echo "(nessuna: si creano dal Rilascio, modo squadra-nuova)"

echo
echo "######## Ambienti di test"
for d in /opt/gestionale-test*/; do
  [ -d "$d" ] || continue
  mostra "${d%/}" .env.test
done
exit 0
'@

# il nome della squadra in testa allo script, e niente a capo «alla Windows»:
# bash li prenderebbe per parte dei comandi
$tutto = ("SQUADRA='$Squadra'`n" + $script) -replace "`r", ''

$argomenti = @()
if ($Chiave) { $argomenti += @('-i', $Chiave) }
$argomenti += @("$Utente@$Server", 'bash -s')

Write-Host "Entro su $Utente@$Server ..." -ForegroundColor Cyan
$tutto | & ssh @argomenti
if ($LASTEXITCODE -ne 0) {
  Write-Host "ssh ha risposto $($LASTEXITCODE): password sbagliata, o il server non si raggiunge da questa rete." -ForegroundColor Yellow
}
