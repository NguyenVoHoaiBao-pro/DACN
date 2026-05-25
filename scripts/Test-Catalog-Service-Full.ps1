#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test day du catalog-service (public GET + gateway + internal block).
#>
param(
    [string]$ProductId = '1',
    [string]$GatewayUrl = 'http://localhost:8080',
    [string]$CatalogUrl = 'http://localhost:8082'
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
Write-Host 'catalog-service - Full smoke test' -ForegroundColor Cyan
Write-Host ''

try {
    $r = Invoke-RestMethod -Uri ($CatalogUrl + '/api/products?page=0&size=3') -TimeoutSec 20
    Assert-Ok 'GET /api/products' ($r.status -eq 200)
} catch { Assert-Ok 'GET /api/products' $false $_.Exception.Message }

try {
    $r = Invoke-RestMethod -Uri ($CatalogUrl + '/api/products/' + $ProductId) -TimeoutSec 20
    Assert-Ok 'GET /api/products/{id}' ($r.status -eq 200)
} catch { Assert-Ok 'GET /api/products/{id}' $false $_.Exception.Message }

try {
    $r = Invoke-RestMethod -Uri ($CatalogUrl + '/api/categories?page=0&size=5') -TimeoutSec 20
    Assert-Ok 'GET /api/categories' ($r.status -eq 200)
} catch { Assert-Ok 'GET /api/categories' $false $_.Exception.Message }

try {
    $r = Invoke-RestMethod -Uri ($CatalogUrl + '/api/producers') -TimeoutSec 20
    Assert-Ok 'GET /api/producers' ($r.status -eq 200)
} catch { Assert-Ok 'GET /api/producers' $false $_.Exception.Message }

try {
    $r = Invoke-RestMethod -Uri ($CatalogUrl + '/api/products/internal/' + $ProductId) -TimeoutSec 20
    Assert-Ok 'GET internal product' ($null -ne $r.id)
} catch { Assert-Ok 'GET internal product' $false $_.Exception.Message }

try {
    Invoke-RestMethod -Uri ($GatewayUrl + '/api/products?page=0&size=3') -TimeoutSec 20 | Out-Null
    Assert-Ok 'Gateway GET /api/products' $true
} catch { Assert-Ok 'Gateway GET /api/products' $false $_.Exception.Message }

try {
    Invoke-WebRequest -Uri ($GatewayUrl + '/api/internal/catalog/variants/1/cart-info') -UseBasicParsing -TimeoutSec 15 | Out-Null
    Assert-Ok 'Gateway internal blocked' $false 'Expected 403'
} catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    Assert-Ok 'Gateway /api/internal/catalog -> 403' ($code -eq 403) ('HTTP ' + $code)
}

Write-Host ''
Write-Host ('KET QUA: ' + $passed + ' OK, ' + $failed + ' FAIL') -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' })
Write-Host ''
if ($failed -gt 0) { exit 1 }
