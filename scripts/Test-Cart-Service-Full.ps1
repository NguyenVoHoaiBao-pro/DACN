#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test day du cart-service (JWT + CRUD + gateway).
#>
param(
    [string]$VariantId = '115',
    [string]$Username = 'khang_test',
    [string]$Password = '123456',
    [string]$AuthUrl = 'http://localhost:8081',
    [string]$CartUrl = 'http://localhost:8084',
    [string]$GatewayUrl = 'http://localhost:8080'
)

$ErrorActionPreference = 'Continue'
$passed = 0
$failed = 0

function Assert-Ok($label, $ok, $detail = '') {
    if ($ok) {
        $script:passed++
        Write-Host ('  [OK] ' + $label) -ForegroundColor Green
    } else {
        $script:failed++
        Write-Host ('  [FAIL] ' + $label) -ForegroundColor Red
        if ($detail) { Write-Host ('       ' + $detail) -ForegroundColor DarkGray }
    }
}

Write-Host ''
Write-Host 'cart-service - Full smoke test' -ForegroundColor Cyan
Write-Host ''

$token = $null
try {
    $login = Invoke-RestMethod -Method POST -Uri ($AuthUrl + '/api/auth/login') -ContentType 'application/json' `
        -Body (@{ username = $Username; password = $Password } | ConvertTo-Json) -TimeoutSec 20
    $token = $login.data.accessToken
    Assert-Ok 'Login auth -> JWT' ($null -ne $token)
} catch { Assert-Ok 'Login auth -> JWT' $false $_.Exception.Message }

if (-not $token) {
    Write-Host ''
    Write-Host ('KET QUA: ' + $passed + ' OK, ' + $failed + ' FAIL') -ForegroundColor Yellow
    exit 1
}

$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
$cartItemId = $null

try {
    $r = Invoke-RestMethod -Uri ($CartUrl + '/api/cart') -Headers $headers -TimeoutSec 20
    Assert-Ok 'GET /api/cart' ($r.status -eq 200)
} catch { Assert-Ok 'GET /api/cart' $false $_.Exception.Message }

try {
    $body = @{ variantId = [int]$VariantId; quantity = 1 } | ConvertTo-Json
    $r = Invoke-RestMethod -Method POST -Uri ($CartUrl + '/api/cart') -Headers $headers -Body $body -TimeoutSec 20
    Assert-Ok 'POST /api/cart add item' ($r.status -eq 200)
    if ($r.data.items -and $r.data.items.Count -gt 0) { $cartItemId = $r.data.items[0].id }
} catch { Assert-Ok 'POST /api/cart add item' $false $_.Exception.Message }

if ($cartItemId) {
    try {
        $body = @{ quantity = 2 } | ConvertTo-Json
        $r = Invoke-RestMethod -Method PUT -Uri ($CartUrl + '/api/cart/' + $cartItemId) -Headers $headers -Body $body -TimeoutSec 20
        Assert-Ok 'PUT /api/cart/{id}' ($r.status -eq 200)
    } catch { Assert-Ok 'PUT /api/cart/{id}' $false $_.Exception.Message }

    try {
        $r = Invoke-RestMethod -Method DELETE -Uri ($CartUrl + '/api/cart/' + $cartItemId) -Headers $headers -TimeoutSec 20
        Assert-Ok 'DELETE /api/cart/{id}' ($r.status -eq 200)
    } catch { Assert-Ok 'DELETE /api/cart/{id}' $false $_.Exception.Message }
}

try {
    Invoke-RestMethod -Uri ($CartUrl + '/api/cart') -TimeoutSec 15 | Out-Null
    Assert-Ok 'GET /api/cart no JWT -> 401/403' $false 'Expected unauthorized'
} catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    Assert-Ok 'GET /api/cart no JWT -> 401/403' ($code -in 401, 403) ('HTTP ' + $code)
}

try {
    $r = Invoke-RestMethod -Uri ($GatewayUrl + '/api/cart') -Headers $headers -TimeoutSec 20
    Assert-Ok 'Gateway GET /api/cart' ($r.status -eq 200)
} catch { Assert-Ok 'Gateway GET /api/cart' $false $_.Exception.Message }

Write-Host ''
Write-Host ('KET QUA: ' + $passed + ' OK, ' + $failed + ' FAIL') -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' })
Write-Host ''
if ($failed -gt 0) { exit 1 }
