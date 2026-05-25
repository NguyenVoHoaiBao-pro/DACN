#Requires -Version 5.1
<#
.SYNOPSIS
  Kiem tra cau hinh VNPay thuc te — TMN Code, Return URL trong paymentUrl.

.EXAMPLE
  .\scripts\Test-VNPay-Config.ps1
  .\scripts\Test-VNPay-Config.ps1 -PaymentUrl "https://sandbox.vnpayment.vn/..."
#>
param(
    [string]$PaymentUrl = "",
    [string]$Gateway = "http://localhost:8080"
)

function Parse-VnpParam([string]$url, [string]$name) {
    if ($url -match "[?&]$name=([^&]+)") {
        return [System.Uri]::UnescapeDataString($matches[1])
    }
    return $null
}

Write-Host "=== Kiem tra cau hinh VNPay ===" -ForegroundColor Cyan

if ($PaymentUrl) {
    $url = $PaymentUrl
} else {
    Write-Host "`nHuong dan lay paymentUrl:" -ForegroundColor Yellow
    Write-Host "  1. Checkout chon VNPAY -> DevTools Network -> paymentUrl trong response"
    Write-Host "  2. Hoac POST /api/payment/create voi orderCode + Bearer token"
    Write-Host ""
    $url = Read-Host "Dan paymentUrl (hoac Enter de bo qua)"
    if (-not $url) { exit 0 }
}

$tmn = Parse-VnpParam $url "vnp_TmnCode"
$ret = Parse-VnpParam $url "vnp_ReturnUrl"
$hostPay = ([System.Uri]$url).Host

Write-Host "`n--- Tham so trong URL thanh toan ---" -ForegroundColor Yellow
Write-Host "  Host:           $hostPay"
Write-Host "  vnp_TmnCode:    $tmn"
Write-Host "  vnp_ReturnUrl:  $ret"

$ok = $true
if ($tmn -eq "YOUR_TMN_CODE" -or -not $tmn) {
    Write-Host "`n  LOI: TMN Code = YOUR_TMN_CODE hoac trong!" -ForegroundColor Red
    Write-Host "  -> order-service CHUA nap config. Restart sau khi sua application.yml / .env" -ForegroundColor Red
    $ok = $false
}
if ($hostPay -notmatch "sandbox\.vnpayment\.vn") {
    Write-Host "`n  CANH BAO: Khong phai Sandbox host (sandbox.vnpayment.vn)" -ForegroundColor Yellow
}
$expectedReturn = "http://localhost:8080/api/payment/vnpay/return"
if ($ret -ne $expectedReturn) {
    Write-Host "`n  CANH BAO: Return URL khac mong doi:" -ForegroundColor Yellow
    Write-Host "    Hien tai:  $ret"
    Write-Host "    Can:       $expectedReturn"
    Write-Host "  -> Khai bao DUNG URL nay tren VNPay Sandbox Merchant" -ForegroundColor Yellow
}

if ($ok -and $tmn) {
    Write-Host "`n  TMN Code da gui: $tmn" -ForegroundColor Green
    Write-Host "  Neu van loi 'Khong tim thay website':" -ForegroundColor Cyan
    Write-Host "    1. Dang nhap https://sandbox.vnpayment.vn/merchantv2/" -ForegroundColor White
    Write-Host "    2. Kiem tra Terminal ID = $tmn (cua BAN, khong copy project khac)" -ForegroundColor White
    Write-Host "    3. Return URL portal = $expectedReturn (khop 100%)" -ForegroundColor White
    Write-Host "    4. Hash Secret trong .env = Secret tren portal" -ForegroundColor White
    Write-Host "    5. Email hotrovnpay@vnpay.vn + ma tra cuu neu TMN chua kich hoat" -ForegroundColor White
}

# Test return URL reachable
Write-Host "`n--- Kiem tra Return URL co mo duoc khong ---" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri $expectedReturn -UseBasicParsing -TimeoutSec 5 -MaximumRedirection 0 -ErrorAction SilentlyContinue
    Write-Host "  Gateway tra HTTP $($r.StatusCode) (redirect/fail la binh thuong khi khong co params VNPay)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 302 -or $_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  Endpoint ton tai (HTTP redirect/400 — OK cho demo)" -ForegroundColor Green
    } else {
        Write-Host "  Khong ket noi duoc $expectedReturn — Gateway/order-service chua chay?" -ForegroundColor Red
    }
}
