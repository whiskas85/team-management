# Gli accessi dei portali sul server: squadre ospitate e ambienti di test.
#
# Entra sul server con ssh e mostra, per ogni portale, quello che serve per
# entrare: dominio, email e password dell'admin di partenza; per i test anche
# la password del proxy. La password di root si chiede una volta sola.
#
# Uso:
#   .\portali.ps1                 tutti: squadre ospitate e ambienti di test
#   .\portali.ps1 demo            solo la squadra ospitata "demo"
#   .\portali.ps1 -Chiave C:\Users\nome\.ssh\id_ed25519   (il FILE della chiave ssh)
#   .\portali.ps1 -Server altro.server.it -Utente root
#
# La password di root NON va scritta qui: la chiede ssh quando entra.
#
# Se Windows blocca gli script:
#   powershell -ExecutionPolicy Bypass -File .\portali.ps1
#
# Il file e' scritto apposta senza lettere accentate e senza blocco param():
# cosi' funziona anche se viene salvato con una codifica diversa.

$ErrorActionPreference = 'Stop'

# Lanciato col doppio clic (o "Esegui con PowerShell") la finestra si chiude
# appena lo script finisce: alla fine, e anche dopo un errore, si aspetta Invio.
function Aspetta {
  Write-Host ''
  Read-Host 'Premi Invio per chiudere' | Out-Null
}
trap {
  Write-Host ('Errore: ' + $_) -ForegroundColor Red
  Aspetta
  exit 1
}

# ------------------------------------------------------------ gli argomenti
$Squadra = ''
$Server = 'ops.zerodarkteam.it'
$Utente = 'root'
$Chiave = ''

$i = 0
while ($i -lt $args.Count) {
  $a = [string]$args[$i]
  switch -Regex ($a) {
    '^-Chiave$' { $i++; $Chiave = [string]$args[$i] }
    '^-Server$' { $i++; $Server = [string]$args[$i] }
    '^-Utente$' { $i++; $Utente = [string]$args[$i] }
    default     { $Squadra = $a }
  }
  $i++
}

# -Chiave e' il percorso di un file: se non esiste, si ignora (e si avvisa),
# e ssh chiede la password come sempre
if ($Chiave -and -not (Test-Path -LiteralPath $Chiave -PathType Leaf)) {
  Write-Host "-Chiave deve essere il percorso del file della chiave ssh, non la password: la ignoro." -ForegroundColor Yellow
  $Chiave = ''
}

# il nome finisce in un comando sul server: solo minuscole, cifre e trattini
if ($Squadra -and $Squadra -notmatch '^[a-z][a-z0-9-]{1,29}$') {
  Write-Host "Nome della squadra non valido: '$Squadra' (minuscole, cifre e trattini)." -ForegroundColor Red
  Aspetta
  exit 1
}

# ------------------------------------------------- quello che gira sul server
# Va al server come script codificato (vedi sotto), non come comandi sulla
# riga di ssh: li' PowerShell toglierebbe le virgolette e li romperebbe.
$script = @'
set -u
mostra() {
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
    echo "Non c'e' una squadra ospitata '$SQUADRA'. Quelle che ci sono:"
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

# il nome della squadra in testa, e niente a capo alla Windows: bash
# prenderebbe il carattere in piu' come parte dei comandi
$tutto = ("SQUADRA='" + $Squadra + "'`n" + $script) -replace "`r", ''

# Lo script viaggia in base64 dentro il comando: solo lettere, cifre, + / =.
# Niente virgolette che PowerShell possa togliere, e niente dipendenza dal
# passare dati a ssh con la pipe, che su PowerShell 5 a volte arriva vuota.
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($tutto))

$argomenti = @()
if ($Chiave) { $argomenti += @('-i', $Chiave) }
$argomenti += @(($Utente + '@' + $Server), ('echo ' + $b64 + ' | base64 -d | bash'))

Write-Host ('Entro su ' + $Utente + '@' + $Server + ' (la password la chiede ssh) ...') -ForegroundColor Cyan
# i messaggi di ssh su stderr (avvisi, "password:") non sono errori dello script
$ErrorActionPreference = 'Continue'
& ssh @argomenti
if ($LASTEXITCODE -ne 0) {
  Write-Host ('ssh ha risposto ' + $LASTEXITCODE + ': password sbagliata, o il server non si raggiunge da questa rete.') -ForegroundColor Yellow
}
Aspetta
