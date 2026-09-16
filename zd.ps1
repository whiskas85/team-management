<#
.SYNOPSIS
  Comando unico per i due ambienti del gestionale.

.DESCRIPTION
  Da qui si comanda l'ambiente di TEST, che gira su questo computer:

    test  -> porta 3100, volumi  zerodark-test_db-data / zerodark-test_uploads

  La produzione non e' piu' qui: dal 16 settembre 2026 sta sul server, su
  https://ops.zerodarkteam.it, e si aggiorna da li' (vedi deploy/DEPLOY.md).
  I volumi gestionale_* rimasti su questo computer sono la copia di riserva di
  quel trasloco: lo script non li tocca e non li riaccende.

.EXAMPLE
  .\zd.ps1 up test          # avvia (o ricostruisce) l'ambiente di test
  .\zd.ps1 logs test        # guarda cosa dice
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
    # Riaccendere i container locali di prod non riporterebbe indietro la
    # produzione: creerebbe una seconda copia, ferma al giorno del trasloco,
    # su cui qualcuno potrebbe mettersi a lavorare senza accorgersene.
    if ($Ambiente -eq 'prod') {
      Write-Host "La produzione non gira piu' su questo computer." -ForegroundColor Yellow
      Write-Host "Sta su https://ops.zerodarkteam.it: si aggiorna dal server," -ForegroundColor Yellow
      Write-Host "come spiegato in deploy/DEPLOY.md." -ForegroundColor Yellow
      break
    }
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
    # I dati veri stanno sul server, non piu' nel container qui accanto: questo
    # comando andra' rifatto per andarseli a prendere via SSH (vedi DA-FARE.md).
    Write-Host "I dati veri non sono piu' su questo computer." -ForegroundColor Yellow
    Write-Host "Stanno sul server: per ora si scarica a mano un dump da li'" -ForegroundColor Yellow
    Write-Host "e lo si ripristina nel test. Vedi DA-FARE.md." -ForegroundColor Yellow
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
