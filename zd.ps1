<#
.SYNOPSIS
  Comando unico per i due ambienti del gestionale.

.DESCRIPTION
  Ci sono due stack Docker separati e indipendenti:

    prod  -> porta 3000, volumi  gestionale_db-data / gestionale_uploads
    test  -> porta 3100, volumi  zerodark-test_db-data / zerodark-test_uploads

  Sono davvero separati: database, caricamenti e chiavi non si toccano.
  Prod resta esattamente dov'era, con i suoi dati: questo script non li sposta.

.EXAMPLE
  .\zd.ps1 up test          # avvia (o ricostruisce) l'ambiente di test
  .\zd.ps1 logs test        # guarda cosa dice
  .\zd.ps1 copia-da-prod    # porta i dati di prod dentro al test
  .\zd.ps1 down test        # spegne il test, SENZA cancellare i suoi dati
  .\zd.ps1 stato            # cosa sta girando
#>

param(
  [Parameter(Position = 0)]
  [ValidateSet('up', 'down', 'logs', 'stato', 'psql', 'copia-da-prod', 'azzera-test', 'aiuto')]
  [string]$Comando = 'aiuto',

  [Parameter(Position = 1)]
  [ValidateSet('prod', 'test')]
  [string]$Ambiente = 'prod'
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

# Prod usa il progetto storico "gestionale" e il file .env di sempre: cosi' i
# volumi restano quelli, e i dati veri non si spostano di un millimetro.
$Progetti = @{
  prod = @{ Progetto = 'gestionale';     EnvFile = '.env';      Porta = 3000 }
  test = @{ Progetto = 'zerodark-test';  EnvFile = '.env.test'; Porta = 3100 }
}

function Invoca-Compose {
  param([string]$Amb, [string[]]$Argomenti)
  $c = $Progetti[$Amb]
  if (-not (Test-Path $c.EnvFile)) {
    throw "Manca il file $($c.EnvFile): serve per l'ambiente $Amb."
  }
  & docker compose --env-file $c.EnvFile -p $c.Progetto @Argomenti
  if ($LASTEXITCODE -ne 0) { throw "docker compose ha risposto $LASTEXITCODE" }
}

switch ($Comando) {

  'up' {
    $c = $Progetti[$Ambiente]
    Write-Host "Avvio l'ambiente $Ambiente (progetto $($c.Progetto))..." -ForegroundColor Cyan
    Invoca-Compose $Ambiente @('up', '-d', '--build')
    Write-Host ""
    Write-Host "Pronto: http://localhost:$($c.Porta)" -ForegroundColor Green
    if ($Ambiente -eq 'test') {
      Write-Host "In test l'attivazione delle polizze verso il portale federale e' bloccata." -ForegroundColor Yellow
    }
  }

  'down' {
    Write-Host "Spengo l'ambiente $Ambiente. I dati restano nei volumi." -ForegroundColor Cyan
    # niente -v: i volumi non si toccano mai da qui
    Invoca-Compose $Ambiente @('down')
  }

  'logs' {
    Invoca-Compose $Ambiente @('logs', '-f', '--tail', '100', 'app')
  }

  'psql' {
    $c = $Progetti[$Ambiente]
    & docker compose --env-file $c.EnvFile -p $c.Progetto exec db psql -U zerodark -d zerodark
  }

  'stato' {
    foreach ($a in 'prod', 'test') {
      $c = $Progetti[$a]
      Write-Host ""
      Write-Host "--- $a (progetto $($c.Progetto), porta $($c.Porta)) ---" -ForegroundColor Cyan
      if (Test-Path $c.EnvFile) {
        & docker compose --env-file $c.EnvFile -p $c.Progetto ps
      } else {
        Write-Host "  non configurato: manca $($c.EnvFile)" -ForegroundColor DarkGray
      }
    }
    Write-Host ""
    Write-Host "--- volumi ---" -ForegroundColor Cyan
    & docker volume ls --filter name=gestionale --filter name=zerodark-test
  }

  'copia-da-prod' {
    Write-Host "Copio i dati di PROD dentro al TEST." -ForegroundColor Cyan
    Write-Host "Il database di test viene sovrascritto. Prod viene solo letto." -ForegroundColor Yellow
    $r = Read-Host "Confermi? (scrivi: si)"
    if ($r -ne 'si') { Write-Host "Annullato."; break }

    $prod = $Progetti['prod']; $test = $Progetti['test']
    $dump = Join-Path $env:TEMP "zd-prod-$(Get-Date -Format yyyyMMdd-HHmmss).sql"

    Write-Host "Estraggo da prod..." -ForegroundColor DarkGray
    & docker compose --env-file $prod.EnvFile -p $prod.Progetto exec -T db `
      pg_dump -U zerodark -d zerodark --clean --if-exists | Set-Content -Path $dump -Encoding UTF8
    if ($LASTEXITCODE -ne 0) { throw "pg_dump non riuscito" }

    Write-Host "Verso dentro al test..." -ForegroundColor DarkGray
    Get-Content $dump -Encoding UTF8 | & docker compose --env-file $test.EnvFile -p $test.Progetto exec -T db `
      psql -U zerodark -d zerodark -v ON_ERROR_STOP=0 | Out-Null

    Remove-Item $dump -ErrorAction SilentlyContinue
    Write-Host "Fatto. Nota: le credenziali del portale federale restano illeggibili in test," -ForegroundColor Green
    Write-Host "perche' sono cifrate con la chiave di prod. E' voluto." -ForegroundColor Green
  }

  'azzera-test' {
    Write-Host "Cancello database e caricamenti dell'ambiente di TEST." -ForegroundColor Yellow
    Write-Host "Prod non viene toccata." -ForegroundColor Yellow
    $r = Read-Host "Confermi? (scrivi: azzera)"
    if ($r -ne 'azzera') { Write-Host "Annullato."; break }
    Invoca-Compose 'test' @('down', '-v')
    Write-Host "Test azzerato. Riavvialo con  .\zd.ps1 up test" -ForegroundColor Green
  }

  default {
    Get-Help $PSCommandPath -Detailed
  }
}
