$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerScript = Join-Path $Root "workout-server.js"
$Cloudflared = Join-Path (Split-Path -Parent $Root) "work\tools\cloudflared.exe"
$Port = 4177

$BundledNode = "C:\Users\FwJab\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$Node = if (Test-Path $BundledNode) { $BundledNode } else { "node" }

if (-not (Test-Path $ServerScript)) {
  throw "Could not find workout-server.js at $ServerScript"
}

if (-not (Test-Path $Cloudflared)) {
  throw "Could not find cloudflared.exe at $Cloudflared"
}

Write-Host ""
Write-Host "Hunter Workout System public launcher" -ForegroundColor Cyan
Write-Host "Starting local workout server on http://127.0.0.1:$Port ..."

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $listener) {
  $server = Start-Process -FilePath $Node -ArgumentList @($ServerScript) -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 2
}

$ready = $false
for ($i = 0; $i -lt 10; $i++) {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/state" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 1
  }
}

if (-not $ready) {
  throw "The workout server did not start on port $Port."
}

Write-Host "Server is ready." -ForegroundColor Green
Write-Host ""
Write-Host "Creating public Cloudflare link..." -ForegroundColor Cyan
Write-Host "When you see a https://...trycloudflare.com URL, send that to your friends." -ForegroundColor Yellow
Write-Host "Keep this window open while everyone uses the site." -ForegroundColor Yellow
Write-Host ""

& $Cloudflared tunnel --url "http://127.0.0.1:$Port"
