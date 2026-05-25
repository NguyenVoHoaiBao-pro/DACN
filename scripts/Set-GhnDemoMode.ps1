#Requires -Version 5.1
<#
.SYNOPSIS
  Bat/tat che do demo GHN loi (Fault Tolerance) qua bien GHN_BASE_URL trong .env

.EXAMPLE
  .\scripts\Set-GhnDemoMode.ps1 -Mode down
  .\scripts\Set-GhnDemoMode.ps1 -Mode up
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("up", "down")]
    [string]$Mode
)

$Root = Split-Path $PSScriptRoot -Parent
$EnvFile = Join-Path $Root ".env"
$GhnUp = "https://online-gateway.ghn.vn"
$GhnDown = "http://127.0.0.1:59999"

if (-not (Test-Path $EnvFile)) {
    Write-Host "Khong tim thay .env - tao tu .env.example" -ForegroundColor Yellow
    Copy-Item (Join-Path $Root ".env.example") $EnvFile
}

$content = Get-Content $EnvFile -Raw
$newUrl = if ($Mode -eq "down") { $GhnDown } else { $GhnUp }

if ($content -match "(?m)^GHN_BASE_URL=.*$") {
    $content = $content -replace "(?m)^GHN_BASE_URL=.*$", "GHN_BASE_URL=$newUrl"
} else {
    $content += "`nGHN_BASE_URL=$newUrl`n"
}

Set-Content -Path $EnvFile -Value $content.TrimEnd() -NoNewline -Encoding UTF8
Add-Content -Path $EnvFile -Value "" -Encoding UTF8

$color = if ($Mode -eq "down") { "Red" } else { "Green" }
Write-Host "GHN_BASE_URL = $newUrl" -ForegroundColor $color
Write-Host ""
Write-Host "Buoc tiep theo (BAT BUOC):" -ForegroundColor Cyan
Write-Host '  1. Restart order-service (hoac STOP.ps1 roi START.ps1 -SkipDocker)'
Write-Host '  2. Chay: .\scripts\Demo-FaultTolerance.ps1 -Phase stress'
Write-Host '  3. Mo: http://localhost:8086/actuator/circuitbreakers'
