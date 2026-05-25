#Requires -Version 5.1
<#
.SYNOPSIS
  Demo Fault Tolerance — GHN sap, order-service van song.

.PARAMETER Phase
  normal      — Trang thai binh thuong (GHN OK)
  stress      — Goi shipping 5 lan (can GHN base-url sai truoc)
  prove-alive — Chung minh catalog + order van hoat dong khi GHN loi
  all         — Chay normal -> pause -> stress -> prove-alive

.EXAMPLE
  .\scripts\Demo-FaultTolerance.ps1 -Phase normal
  .\scripts\Set-GhnDemoMode.ps1 -Mode down
  .\scripts\Demo-FaultTolerance.ps1 -Phase stress
#>
param(
    [ValidateSet("normal", "stress", "prove-alive", "all")]
    [string]$Phase = "all"
)

$ErrorActionPreference = "Continue"
$Gateway = "http://localhost:8080"
$OrderActuator = "http://localhost:8086/actuator"
$ShippingBody = @{
    toDistrictId  = 3695
    toWardCode    = "90737"
    toProvinceId  = 202
    orderSubtotal = 500000
} | ConvertTo-Json

function Write-Title($msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function Show-CircuitBreakers {
    try {
        $cb = Invoke-RestMethod -Uri "$OrderActuator/circuitbreakers" -Method Get -TimeoutSec 5
        Write-Host "Circuit Breaker (order-service):" -ForegroundColor Yellow
        $cb.circuitBreakers.PSObject.Properties | ForEach-Object {
            $state = $_.Value.state
            $color = switch ($state) {
                "CLOSED" { "Green" }
                "OPEN" { "Red" }
                "HALF_OPEN" { "Yellow" }
                default { "White" }
            }
            Write-Host ("  {0,-20} -> {1}" -f $_.Name, $state) -ForegroundColor $color
        }
    } catch {
        Write-Host "  Khong doc duoc actuator: $_" -ForegroundColor Red
        Write-Host "  Kiem tra order-service :8086" -ForegroundColor Gray
    }
}

function Invoke-ShippingCheckout {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $r = Invoke-RestMethod -Uri "$Gateway/api/shipping/checkout" -Method Post `
            -ContentType "application/json" -Body $ShippingBody -TimeoutSec 30
        $sw.Stop()
        $fee = $r.data.shippingFee
        $fmt = $r.data.shippingFeeFormatted
        Write-Host ("  OK {0}ms | shippingFee={1} ({2}) error={3}" -f `
            $sw.ElapsedMilliseconds, $fee, $fmt, $r.data.error) -ForegroundColor Green
        return @{ Ok = $true; Ms = $sw.ElapsedMilliseconds; Fee = $fee }
    } catch {
        $sw.Stop()
        Write-Host ("  FAIL {0}ms | {1}" -f $sw.ElapsedMilliseconds, $_.Exception.Message) -ForegroundColor Red
        return @{ Ok = $false; Ms = $sw.ElapsedMilliseconds; Fee = 0 }
    }
}

function Test-PhaseNormal {
    Write-Title "BUOC 1: Trang thai BINH THUONG"
    try {
        $p = Invoke-RestMethod -Uri "$Gateway/api/products?page=0&size=1" -TimeoutSec 10
        Write-Host "  Catalog qua Gateway: OK (totalElements=$($p.data.totalElements))" -ForegroundColor Green
    } catch {
        Write-Host "  Catalog/Gateway chua san sang. Chay .\START.ps1 -SkipDocker" -ForegroundColor Red
        return
    }
    Show-CircuitBreakers
    Write-Host ""
    Write-Host "  Goi tinh phi ship (GHN that):" -ForegroundColor Yellow
    $r = Invoke-ShippingCheckout
    if ($r.Fee -eq 30000) {
        Write-Host "  (Dang tra fallback 30k - GHN loi hoac Circuit da OPEN)" -ForegroundColor Yellow
    }
}

function Test-PhaseStress {
    Write-Title "BUOC 2: Kich hoat Circuit OPEN (goi 5 lan)"
    Write-Host "  Yeu cau: .\scripts\Set-GhnDemoMode.ps1 -Mode down + restart order-service" -ForegroundColor Gray
    Write-Host ""
    Show-CircuitBreakers
    foreach ($i in 1..5) {
        Write-Host "  Lan $i" -ForegroundColor White
        Invoke-ShippingCheckout | Out-Null
    }
    Write-Host ""
    Show-CircuitBreakers
    Write-Host ""
    Write-Host "  Ky vong: ghn-shipping = OPEN, lan cuoi ~30000d va nhanh hon lan dau" -ForegroundColor Cyan
}

function Test-PhaseProveAlive {
    Write-Title "BUOC 3: Chung minh HE THONG KHONG SAP"
    $checks = @(
        @{ Name = "Catalog (ban hang)"; Url = "$Gateway/api/products?page=0&size=1" }
        @{ Name = "Order health"; Url = "http://localhost:8086/actuator/health" }
        @{ Name = "Gateway health"; Url = "$Gateway/actuator/health" }
    )
    foreach ($c in $checks) {
        try {
            Invoke-RestMethod -Uri $c.Url -TimeoutSec 10 | Out-Null
            Write-Host ("  [OK] {0}" -f $c.Name) -ForegroundColor Green
        } catch {
            Write-Host ("  [FAIL] {0}: {1}" -f $c.Name, $_.Exception.Message) -ForegroundColor Red
        }
    }
    Write-Host ""
    Write-Host "  Shipping (fallback khi GHN loi):" -ForegroundColor Yellow
    $r = Invoke-ShippingCheckout
    if ($r.Ok -and $r.Fee -eq 30000) {
        Write-Host "  => Order-service van tra phi ship fallback - checkout khong crash" -ForegroundColor Green
    }
    Show-CircuitBreakers
    Write-Host ""
    Write-Host "  Mo frontend: http://localhost:5173/shop - san pham van hien" -ForegroundColor Cyan
}

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  DEMO FAULT TOLERANCE - Electro Store" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

switch ($Phase) {
    "normal" { Test-PhaseNormal }
    "stress" { Test-PhaseStress }
    "prove-alive" { Test-PhaseProveAlive }
    "all" {
        Test-PhaseNormal
        Write-Host ""
        Write-Host "--- Truoc buoc 2: chay Set-GhnDemoMode -Mode down, restart order-service, Enter ---" -ForegroundColor Yellow
        Read-Host
        Test-PhaseStress
        Test-PhaseProveAlive
    }
}

Write-Host ""
Write-Host "Tai lieu: docs\DEMO_FAULT_TOLERANCE_GIANG_VIEN.md" -ForegroundColor DarkGray
Write-Host "Actuator: $OrderActuator/circuitbreakers" -ForegroundColor DarkGray
