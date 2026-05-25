#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test tung microservice qua port truc tiep (khong qua gateway).

.EXAMPLE
  .\scripts\Test-Each-Service.ps1
  .\scripts\Test-Each-Service.ps1 -Username khang_test -Password any
  .\scripts\Test-Each-Service.ps1 -Service catalog
#>
param(
    [string]$Username = 'khang_test',
    [string]$Password = '',
    [ValidateSet('all', 'auth', 'user', 'catalog', 'cart', 'order', 'review', 'statistics')]
    [string]$Service = 'all'
)

$ErrorActionPreference = 'Continue'

$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env'
if ($envFile -and (Test-Path $envFile)) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $k = $Matches[1].Trim()
            $v = $Matches[2].Trim()
            if (-not [string]::IsNullOrWhiteSpace($v)) { Set-Item -Path "Env:$k" -Value $v }
        }
    }
}
if (-not $Password) { $Password = $(if ($env:TEST_PASSWORD) { $env:TEST_PASSWORD } else { '123456' }) }

function Test-PortUp([int]$Port) {
    try {
        $c = New-Object System.Net.Sockets.TcpClient
        $a = $c.BeginConnect('127.0.0.1', $Port, $null, $null)
        $ok = $a.AsyncWaitHandle.WaitOne(1500, $false)
        if ($ok) { $c.EndConnect($a) }
        $c.Close()
        return $ok
    } catch { return $false }
}

function Invoke-ServiceTest {
    param(
        [string]$Name,
        [int]$Port,
        [string]$SwaggerPath = '/swagger-ui/index.html',
        [scriptblock[]]$ApiTests
    )
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host " $Name (port $Port)" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta

    if (-not (Test-PortUp -Port $Port)) {
        Write-Host "  [SKIP] Port $Port chua mo - chay START.ps1 hoac khoi dong $Name" -ForegroundColor Red
        return @{ Name = $Name; Up = $false; Passed = 0; Failed = 0; Skipped = 1 }
    }

    $swaggerUrl = "http://localhost:$Port$SwaggerPath"
    try {
        $sw = Invoke-WebRequest -Uri $swaggerUrl -UseBasicParsing -TimeoutSec 8
        Write-Host "  Swagger UI: $swaggerUrl -> $($sw.StatusCode)" -ForegroundColor Green
    } catch {
        $alt = "http://localhost:$Port/swagger-ui.html"
        try {
            $sw = Invoke-WebRequest -Uri $alt -UseBasicParsing -TimeoutSec 8
            Write-Host "  Swagger UI: $alt -> $($sw.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "  Swagger UI: khong mo duoc ($swaggerUrl)" -ForegroundColor Yellow
        }
    }

    $passed = 0
    $failed = 0
    foreach ($test in $ApiTests) {
        & $test
        if ($script:LastTestOk) { $passed++ } else { $failed++ }
    }
    return @{ Name = $Name; Up = $true; Passed = $passed; Failed = $failed; Skipped = 0 }
}

function Invoke-Api {
    param(
        [string]$Label,
        [string]$Method = 'GET',
        [string]$Url,
        [hashtable]$Headers = @{},
        $Body = $null
    )
    try {
        $params = @{
            Uri             = $Url
            Method          = $Method
            UseBasicParsing = $true
            TimeoutSec      = 20
            Headers         = $Headers
        }
        if ($null -ne $Body) {
            $params.ContentType = 'application/json'
            $params.Body = ($Body | ConvertTo-Json -Compress)
        }
        $r = Invoke-WebRequest @params
        $script:LastTestOk = ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300)
        $color = if ($script:LastTestOk) { 'Green' } else { 'Red' }
        Write-Host "  [$($r.StatusCode)] $Label" -ForegroundColor $color
        Write-Host "         $Method $Url" -ForegroundColor DarkGray
    } catch {
        $script:LastTestOk = $false
        $code = $null
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        Write-Host "  [FAIL$(if ($code) { " $code" })] $Label" -ForegroundColor Red
        Write-Host "         $Method $Url" -ForegroundColor DarkGray
        if ($_.ErrorDetails.Message) {
            $msg = $_.ErrorDetails.Message
            if ($msg.Length -gt 120) { $msg = $msg.Substring(0, 120) + '...' }
            Write-Host "         $msg" -ForegroundColor DarkGray
        }
    }
}

$token = $null
function Get-TestToken {
    if ($script:token) { return $script:token }
    if (-not (Test-PortUp 8081) -or -not (Test-PortUp 8083)) {
        Write-Host "`n[JWT] Bo qua - can auth (8081) + user (8083) de login" -ForegroundColor Yellow
        return $null
    }
    $body = @{ username = $Username; password = $Password }
    try {
        $r = Invoke-RestMethod -Uri 'http://localhost:8081/api/auth/login' -Method POST -Body ($body | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 20
        if ($r.status -eq 200 -and $r.data.accessToken) {
            $script:token = $r.data.accessToken
            Write-Host "`n[JWT] Login thanh cong user=$Username" -ForegroundColor Green
            return $script:token
        }
    } catch {}
    Write-Host "`n[JWT] Login that bai - kiem tra user-service va username trong DB" -ForegroundColor Yellow
    return $null
}

function AuthHeader {
    $t = Get-TestToken
    if (-not $t) { return @{} }
    return @{ Authorization = "Bearer $t" }
}

$results = @()

if ($Service -eq 'all' -or $Service -eq 'auth') {
    $results += Invoke-ServiceTest -Name 'auth-service' -Port 8081 -ApiTests @(
        { Invoke-Api -Label 'OpenAPI docs' -Url 'http://localhost:8081/v3/api-docs' }
        { Invoke-Api -Label 'Login (can user-service)' -Method POST -Url 'http://localhost:8081/api/auth/login' -Body @{ username = $Username; password = $Password } }
    )
}

if ($Service -eq 'all' -or $Service -eq 'user') {
    $results += Invoke-ServiceTest -Name 'user-service' -Port 8083 -ApiTests @(
        {
            try {
                $ir = Invoke-RestMethod -Uri 'http://localhost:8083/api/internal/users/login' -Method POST `
                    -Body (@{ username = $Username; password = $Password } | ConvertTo-Json) `
                    -ContentType 'application/json' -TimeoutSec 20
                $script:LastTestOk = ($ir.success -eq $true)
                $color = if ($script:LastTestOk) { 'Green' } else { 'Red' }
                Write-Host "  [$(if ($script:LastTestOk) { 'OK' } else { 'FAIL' })] Internal verify login (success=$($ir.success))" -ForegroundColor $color
            } catch { $script:LastTestOk = $false; Write-Host "  [FAIL] Internal verify login" -ForegroundColor Red }
        }
        { Invoke-Api -Label 'GET /api/users/me (JWT)' -Url 'http://localhost:8083/api/users/me' -Headers (AuthHeader) }
        { Invoke-Api -Label 'GET /api/wishlist (JWT)' -Url 'http://localhost:8083/api/wishlist?page=0&size=5' -Headers (AuthHeader) }
        { Invoke-Api -Label 'GET /api/addresses (JWT)' -Url 'http://localhost:8083/api/addresses' -Headers (AuthHeader) }
        { Invoke-Api -Label 'Gateway GET /api/users/me' -Url 'http://localhost:8080/api/users/me' -Headers (AuthHeader) }
    )
}

if ($Service -eq 'all' -or $Service -eq 'catalog') {
    $results += Invoke-ServiceTest -Name 'catalog-service' -Port 8082 -ApiTests @(
        { Invoke-Api -Label 'GET products' -Url 'http://localhost:8082/api/products?page=0&size=3' }
        { Invoke-Api -Label 'GET categories' -Url 'http://localhost:8082/api/categories?page=0&size=5' }
        { Invoke-Api -Label 'GET product by id=1' -Url 'http://localhost:8082/api/products/1' }
    )
}

if ($Service -eq 'all' -or $Service -eq 'cart') {
    $results += Invoke-ServiceTest -Name 'cart-service' -Port 8084 -ApiTests @(
        { Invoke-Api -Label 'GET /api/cart (JWT)' -Url 'http://localhost:8084/api/cart' -Headers (AuthHeader) }
    )
}

if ($Service -eq 'all' -or $Service -eq 'order') {
    $results += Invoke-ServiceTest -Name 'order-service' -Port 8086 -ApiTests @(
        { Invoke-Api -Label 'GET coupons (public)' -Url 'http://localhost:8086/api/coupons' }
        { Invoke-Api -Label 'GET /api/orders (JWT)' -Url 'http://localhost:8086/api/orders?page=0&size=5' -Headers (AuthHeader) }
    )
}

if ($Service -eq 'all' -or $Service -eq 'review') {
    $results += Invoke-ServiceTest -Name 'review-service' -Port 8087 -ApiTests @(
        { Invoke-Api -Label 'GET reviews product_id=1' -Url 'http://localhost:8087/api/reviews?product_id=1&page=0&size=5' }
        { Invoke-Api -Label 'GET review summary' -Url 'http://localhost:8087/api/reviews/summary?product_id=1' }
    )
}

if ($Service -eq 'all' -or $Service -eq 'statistics') {
    $results += Invoke-ServiceTest -Name 'statistics-service' -Port 8088 -ApiTests @(
        {
            Invoke-Api -Label 'POST track VIEW' -Method POST -Url 'http://localhost:8088/api/interactions/track' -Body @{
                userId     = 1
                productId  = 1
                actionType = 'VIEW'
            }
        }
        { Invoke-Api -Label 'GET recommendations' -Url 'http://localhost:8088/api/recommendations/user/1' }
    )
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TOM TAT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
foreach ($r in $results) {
    if (-not $r.Up) {
        Write-Host "  $($r.Name): OFF" -ForegroundColor Red
    } elseif ($r.Failed -eq 0) {
        Write-Host "  $($r.Name): OK ($($r.Passed) tests)" -ForegroundColor Green
    } else {
        Write-Host "  $($r.Name): $($r.Passed) OK, $($r.Failed) FAIL" -ForegroundColor Yellow
    }
}

Write-Host "`nMo Swagger tung service:" -ForegroundColor Cyan
Write-Host "  .\scripts\Open-Swagger.ps1 -Service catalog"
Write-Host "  (gateway) .\scripts\Open-Swagger.ps1 -Service gateway`n"
