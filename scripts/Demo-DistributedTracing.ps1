#Requires -Version 5.1
<#
.SYNOPSIS
  Demo Distributed Tracing — Zipkin UI (Micrometer + OpenTelemetry).

.EXAMPLE
  .\scripts\Demo-DistributedTracing.ps1
#>
param(
    [string]$Gateway = "http://localhost:8080",
    [string]$ZipkinUi = "http://localhost:9411"
)

$ErrorActionPreference = "Continue"

Write-Host "=== Demo Distributed Tracing (Zipkin UI) ===" -ForegroundColor Cyan

Write-Host "`n[1] Kiem tra Zipkin Docker..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $ZipkinUi -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host "  OK Zipkin UI: $ZipkinUi" -ForegroundColor Green
    Write-Host "  -> Mo trinh duyet, bam RUN QUERY sau khi goi API" -ForegroundColor Gray
} catch {
    Write-Host "  Zipkin chua chay. Chay: docker compose up -d zipkin" -ForegroundColor Red
}

Write-Host "`n[2] Kiem tra Gateway..." -ForegroundColor Yellow
try {
    $resp = Invoke-WebRequest -Uri "$Gateway/api/products?page=0&size=3" -UseBasicParsing -TimeoutSec 15
    $traceId = $resp.Headers["X-Trace-Id"]
    Write-Host "  GET /api/products -> HTTP $($resp.StatusCode)" -ForegroundColor Green
    if ($traceId) {
        Write-Host "  X-Trace-Id: $traceId" -ForegroundColor Cyan
        Write-Host "  Zipkin: tim trace theo traceId hoac service api-gateway" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Loi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Chay .\START.ps1 -SkipDocker truoc" -ForegroundColor Gray
    exit 1
}

Write-Host "`n[3] Huong dan Zipkin UI (cho giang vien):" -ForegroundColor Yellow
Write-Host "  1. Mo $ZipkinUi" -ForegroundColor White
Write-Host "  2. Service Name: api-gateway (hoac order-service)" -ForegroundColor White
Write-Host "  3. Bam Run Query / Search" -ForegroundColor White
Write-Host "  4. Click 1 trace -> timeline: gateway X ms -> catalog Y ms" -ForegroundColor White
Write-Host ""
Write-Host "  Demo day du: checkout (can JWT) -> trace order -> cart -> user" -ForegroundColor Cyan
Write-Host "  Log: Get-Content .\.run\order-service.log -Tail 20" -ForegroundColor DarkGray
