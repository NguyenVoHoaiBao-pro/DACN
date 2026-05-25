#Requires -Version 5.1
<#
.SYNOPSIS
  Kiem tra port / trang thai cac microservice Electro Store.

.EXAMPLE
  .\check-all-services.ps1

.EXAMPLE
  .\check-all-services.ps1 -Minimal
#>
param(
    [switch]$Minimal,
    [switch]$Watch
)

. "$PSScriptRoot\scripts\_common.ps1"

function Show-StatusTable {
    param($Services)

    $infra = @(
        @{ Name = 'MySQL (Docker)'; Port = 3306; Required = $true }
        @{ Name = 'Redis (Docker)'; Port = 6379; Required = $true }
    )

    Write-Host ''
    Write-Host '=== Ha tang ===' -ForegroundColor Cyan
    foreach ($item in $infra) {
        $up = Test-PortOpen -Port $item.Port
        $status = if ($up) { 'UP' } else { 'DOWN' }
        $color = if ($up) { 'Green' } else { 'Red' }
        Write-Host ("  {0,-28} :{1,-5} [{2}]" -f $item.Name, $item.Port, $status) -ForegroundColor $color
    }

    Write-Host ''
    Write-Host '=== Microservices (JDK local) ===' -ForegroundColor Cyan
    $upCount = 0
    $total = $Services.Count
    foreach ($svc in $Services) {
        $up = Test-PortOpen -Port $svc.Port
        if ($up) { $upCount++ }
        $status = if ($up) { 'UP' } else { 'DOWN' }
        $color = if ($up) { 'Green' } else { 'Red' }
        Write-Host ("  {0,-28} :{1,-5} [{2}]  {3}" -f $svc.Name, $svc.Port, $status, $svc.Description) -ForegroundColor $color
        if (-not $up) {
            $logPath = Join-Path (Get-ProjectRoot) ".run\$($svc.Name).log"
            if (Test-Path $logPath) {
                Write-Host "       -> log: $logPath" -ForegroundColor DarkGray
            }
        }
    }

    Write-Host ''
    Write-Host "Tong microservices: $upCount / $total UP" -ForegroundColor $(if ($upCount -eq $total) { 'Green' } else { 'Yellow' })
    if ($upCount -lt $total) {
        Write-Host 'Mot so service chua len - doi them hoac chay lai: .\STOP.ps1 ; .\START.ps1 -SkipDocker' -ForegroundColor Yellow
    }

    # Eureka quick check
    if (Test-PortOpen -Port 8761) {
        try {
            $resp = Invoke-WebRequest -Uri 'http://localhost:8761/' -UseBasicParsing -TimeoutSec 5
            if ($resp.StatusCode -eq 200) {
                Write-Host 'Eureka UI: http://localhost:8761  (mo trinh duyet de xem danh sach dang ky)' -ForegroundColor DarkGray
            }
        } catch { }
    }
    if (Test-PortOpen -Port 8080) {
        Write-Host 'Gateway:   http://localhost:8080' -ForegroundColor DarkGray
    }
    Write-Host ''
}

$all = Get-ElectroServices
if ($Minimal) {
    $names = Get-MinimalServiceNames
    $services = $all | Where-Object { $names -contains $_.Name }
} else {
    $services = $all
}

if ($Watch) {
    while ($true) {
        Clear-Host
        Write-Host "Electro Store - $(Get-Date -Format 'HH:mm:ss')  (Ctrl+C de thoat)" -ForegroundColor Magenta
        Show-StatusTable -Services $services
        Start-Sleep -Seconds 5
    }
} else {
    Write-Host 'Electro Store - Service Health Check' -ForegroundColor Magenta
    Show-StatusTable -Services $services
}
