#Requires -Version 5.1
<#
.SYNOPSIS
  Demo Circuit Breaker (Resilience4j) — order-service / GHN shipping.

.EXAMPLE
  .\scripts\Demo-CircuitBreaker.ps1
  .\scripts\Demo-CircuitBreaker.ps1 -SimulateGhnDown
#>
param(
    [switch]$SimulateGhnDown
)

$ErrorActionPreference = "Continue"
$Gateway = "http://localhost:8080"
$OrderActuator = "http://localhost:8086/actuator"

Write-Host "=== Demo Circuit Breaker (Resilience4j) ===" -ForegroundColor Cyan

function Show-CircuitBreakers {
    try {
        $cb = Invoke-RestMethod -Uri "$OrderActuator/circuitbreakers" -Method Get
        Write-Host "`nTrang thai Circuit Breaker (order-service):" -ForegroundColor Yellow
        $cb.circuitBreakers.PSObject.Properties | ForEach-Object {
            $name = $_.Name
            $state = $_.Value.state
            $color = switch ($state) {
                "CLOSED" { "Green" }
                "OPEN" { "Red" }
                "HALF_OPEN" { "Yellow" }
                default { "White" }
            }
            Write-Host "  $name -> $state" -ForegroundColor $color
        }
    } catch {
        Write-Host "  Khong doc duoc actuator (order-service chua chay?): $_" -ForegroundColor Red
    }
}

Write-Host "`n[1] Kiem tra he thong dang chay..." -ForegroundColor Cyan
try {
    $products = Invoke-RestMethod -Uri "$Gateway/api/products?page=0&size=1" -Method Get
    Write-Host "  Catalog OK — totalElements=$($products.data.totalElements)" -ForegroundColor Green
} catch {
    Write-Host "  Gateway/Catalog chua san sang. Chay START.ps1 truoc." -ForegroundColor Red
    exit 1
}

Show-CircuitBreakers

Write-Host "`n[2] Goi tinh phi ship (GHN qua Circuit Breaker ghn-shipping)..." -ForegroundColor Cyan
$body = @{
    toDistrictId = 3695
    toWardCode   = "90737"
    orderSubtotal = 500000
} | ConvertTo-Json

try {
    $ship = Invoke-RestMethod -Uri "$Gateway/api/shipping/checkout" -Method Post `
        -ContentType "application/json" -Body $body
    Write-Host "  shippingFee=$($ship.data.shippingFee) | service=$($ship.data.serviceName) | error=$($ship.data.error)" -ForegroundColor Green
} catch {
    Write-Host "  Shipping API loi: $_" -ForegroundColor Red
}

Show-CircuitBreakers

if ($SimulateGhnDown) {
    Write-Host "`n[3] HUONG DAN mo Circuit OPEN (lam thu cong):" -ForegroundColor Yellow
    Write-Host "  a) Sua order-service application.yml:" -ForegroundColor White
    Write-Host "       ghn.base-url: http://127.0.0.1:59999" -ForegroundColor Gray
    Write-Host "  b) Restart order-service" -ForegroundColor White
    Write-Host "  c) Goi POST /api/shipping/checkout 4-5 lan lien tiep" -ForegroundColor White
    Write-Host "  d) Xem actuator: http://localhost:8086/actuator/circuitbreakers" -ForegroundColor White
    Write-Host "     -> ghn-shipping chuyen sang OPEN" -ForegroundColor White
    Write-Host "  e) Lan goi tiep theo tra fallback 30000d NGAY (khong doi timeout GHN)" -ForegroundColor White
} else {
    Write-Host "`n[3] Tip: chay voi -SimulateGhnDown de xem huong dan mo Circuit OPEN" -ForegroundColor Gray
}

Write-Host "`nEndpoint cho giang vien:" -ForegroundColor Cyan
Write-Host "  http://localhost:8086/actuator/circuitbreakers" -ForegroundColor White
Write-Host "  http://localhost:8086/actuator/circuitbreakerevents" -ForegroundColor White
