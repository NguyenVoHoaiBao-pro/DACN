#Requires -Version 5.1
<#
.SYNOPSIS
  Xem log cac service Java kem Trace ID / Span ID (demo Distributed Tracing).

.PARAMETER Service
  Ten service (order-service, catalog-service, api-gateway, all)

.PARAMETER TraceId
  Loc theo traceId cu the (tu header X-Trace-Id hoac Zipkin)

.EXAMPLE
  .\scripts\Watch-TraceLogs.ps1 -Service order-service
  .\scripts\Watch-TraceLogs.ps1 -Service all
  .\scripts\Watch-TraceLogs.ps1 -Service catalog-service -TraceId abc123def456
#>
param(
    [ValidateSet(
        "all", "api-gateway", "order-service", "catalog-service", "cart-service",
        "auth-service", "user-service", "review-service", "statistics-service"
    )]
    [string]$Service = "order-service",

    [string]$TraceId = ""
)

$Root = Split-Path $PSScriptRoot -Parent
$RunDir = Join-Path $Root ".run"

if (-not (Test-Path $RunDir)) {
    Write-Host "Khong tim thay .run — chay START.ps1 truoc." -ForegroundColor Red
    exit 1
}

function Show-LogHeader {
    param([string]$Name, [string]$Path)
    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    Write-Host "  File: $Path" -ForegroundColor DarkGray
    Write-Host "  Format: LEVEL [service-name, traceId, spanId] message" -ForegroundColor DarkGray
}

function Tail-LogFile {
    param([string]$Name, [string]$Path)
    if (-not (Test-Path $Path)) {
        Write-Host "  (chua co log — service chua chay?)" -ForegroundColor Yellow
        return
    }
    Show-LogHeader -Name $Name -Path $Path
    if ($TraceId) {
        Get-Content $Path -Tail 80 -ErrorAction SilentlyContinue |
            Select-String -Pattern $TraceId |
            Select-Object -Last 25 |
            ForEach-Object { Write-Host $_.Line }
        if (-not $?) { Write-Host "  Khong thay traceId '$TraceId' trong 80 dong cuoi." -ForegroundColor Yellow }
    } else {
        Get-Content $Path -Tail 15 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
        Write-Host "  (theo doi: Get-Content '$Path' -Wait -Tail 10)" -ForegroundColor DarkGray
    }
}

$services = @(
    "api-gateway", "order-service", "catalog-service", "cart-service",
    "auth-service", "user-service", "review-service", "statistics-service"
)

Write-Host "Distributed Tracing — xem log console" -ForegroundColor Magenta
Write-Host "Zipkin UI: http://localhost:9411" -ForegroundColor DarkGray
Write-Host "Tip: DevTools -> Response header X-Trace-Id -> tim tren Zipkin / log" -ForegroundColor DarkGray

if ($Service -eq "all") {
    foreach ($s in $services) {
        Tail-LogFile -Name $s -Path (Join-Path $RunDir "$s.log")
    }
} else {
    Tail-LogFile -Name $Service -Path (Join-Path $RunDir "$Service.log")
}

Write-Host ""
