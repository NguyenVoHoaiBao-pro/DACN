#Requires -Version 5.1
<#
.SYNOPSIS
  Dung microservices Java (theo port) va tuy chon ha tang Docker.

.PARAMETER KeepInfra
  Chi dung Java, giu MySQL + Redis chay trong Docker.

.EXAMPLE
  .\STOP.ps1

.EXAMPLE
  .\STOP.ps1 -KeepInfra
#>
param(
    [switch]$KeepInfra,
    [switch]$Minimal
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\scripts\_common.ps1"

$Root = Get-ProjectRoot
$all = Get-ElectroServices
if ($Minimal) {
    $names = Get-MinimalServiceNames
    $services = $all | Where-Object { $names -contains $_.Name }
} else {
    $services = $all
}

Write-Host 'Dang dung microservices Java...' -ForegroundColor Yellow
foreach ($svc in ($services | Sort-Object Port -Descending)) {
    if (Test-PortOpen -Port $svc.Port) {
        Stop-PortProcess -Port $svc.Port
        Write-Host "  Da giai phong port $($svc.Port) ($($svc.Name))" -ForegroundColor DarkGray
    }
}

# Java con sot (mvn spring-boot:run) - optional gentle kill by window title is unreliable; ports above suffice

if (-not $KeepInfra) {
    Write-Host 'Dang dung Docker (MySQL + Redis)...' -ForegroundColor Yellow
    Push-Location $Root
    docker compose down 2>$null
    Pop-Location
    Write-Host 'Da docker compose down.' -ForegroundColor Green
} else {
    Write-Host 'Giữ MySQL + Redis ( -KeepInfra ).' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Hoan tat. Kiem tra: .\check-all-services.ps1' -ForegroundColor Cyan
