$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$cinemaUrl = 'http://127.0.0.1:3080'
try {
  $status = Invoke-RestMethod "$cinemaUrl/api/status" -TimeoutSec 2
  if ($status.storage -eq 'local') { Start-Process $cinemaUrl; exit 0 }
} catch {}
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { Write-Host 'Node.js 22 ou plus est nécessaire. Installez-le depuis https://nodejs.org'; Read-Host 'Entrée pour fermer'; exit 1 }
$nodeMajor = [int]((& $nodeCommand.Source --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { Write-Host "CinemaOS nécessite Node.js 22 ou plus (version détectée : $nodeMajor). Installez-le depuis https://nodejs.org"; Read-Host 'Entrée pour fermer'; exit 1 }
$database = Join-Path $PSScriptRoot 'data\library.json'
if (-not (Test-Path -LiteralPath $database)) { Write-Host "Base CinemaOS absente : $database`nAttendez la fin de la synchronisation OneDrive, puis relancez CinemaOS."; Read-Host 'Entrée pour fermer'; exit 1 }
Start-Process -FilePath $nodeCommand.Source -ArgumentList 'src/app-server.js' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
for ($attempt=0; $attempt -lt 30; $attempt++) {
  try {
    $status = Invoke-RestMethod "$cinemaUrl/api/status" -TimeoutSec 1
    if ($status.storage -eq 'local') { Start-Process $cinemaUrl; exit 0 }
  } catch {}
  Start-Sleep -Milliseconds 300
}
Write-Host 'CinemaOS ne répond pas. Ouvrez un terminal dans ce dossier et lancez npm start pour voir le diagnostic.'
Read-Host 'Entrée pour fermer'
