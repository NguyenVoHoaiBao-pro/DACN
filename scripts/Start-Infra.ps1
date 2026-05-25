#Requires -Version 5.1
<#
.SYNOPSIS
  Khoi dong ha tang Docker (MySQL + Redis) cho Electro Store.

.EXAMPLE
  .\scripts\Start-Infra.ps1
#>
param(
    [switch]$Down
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"
$Root = Get-ProjectRoot

Push-Location $Root
try {
    if ($Down) {
        Write-Host 'Dang dung MySQL + Redis (docker compose down)...' -ForegroundColor Yellow
        docker compose down
        Write-Host 'Da dung ha tang.' -ForegroundColor Green
        return
    }

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker chua cai hoac chua chay. Mo Docker Desktop roi thu lai.'
    }

    Write-Host 'Dang khoi dong MySQL + Redis (docker compose up -d)...' -ForegroundColor Cyan
    docker compose up -d
    Wait-ForPort -Port 3306 -Label 'MySQL (3306)' -TimeoutSec 90
    Wait-ForPort -Port 6379 -Label 'Redis (6379)' -TimeoutSec 60

    Write-Host ''
    Write-Host 'Ha tang san sang:' -ForegroundColor Green
    Write-Host '  MySQL  -> localhost:3306  (root, mat khau trong)'
    Write-Host '  Redis  -> localhost:6379'
    Write-Host ''
    Write-Host 'Tiep theo chay:  .\START.ps1 -SkipDocker' -ForegroundColor Yellow
} finally {
    Pop-Location
}
