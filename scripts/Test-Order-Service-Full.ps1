#Requires -Version 5.1
param(
    [string]$Username = 'khang_test',
    [string]$Password = '123456',
    [string]$OrderUrl = 'http://localhost:8086',
    [string]$AuthUrl = 'http://localhost:8081'
)

$ErrorActionPreference = 'Continue'
$passed = 0; $failed = 0
function Assert-Ok($label, $ok, $detail = '') {
    if ($ok) { $script:passed++; Write-Host ('  [OK] ' + $label) -ForegroundColor Green }
    else { $script:failed++; Write-Host ('  [FAIL] ' + $label) -ForegroundColor Red; if ($detail) { Write-Host ('       ' + $detail) -ForegroundColor DarkGray } }
}

Write-Host ''; Write-Host 'order-service - smoke test' -ForegroundColor Cyan; Write-Host ''

try {
    $r = Invoke-RestMethod -Uri ($OrderUrl + '/api/coupons') -TimeoutSec 20
    Assert-Ok 'GET /api/coupons (public)' ($r.status -eq 200)
} catch { Assert-Ok 'GET /api/coupons' $false $_.Exception.Message }

$token = $null
try {
    $login = Invoke-RestMethod -Method POST -Uri ($AuthUrl + '/api/auth/login') -ContentType 'application/json' `
        -Body (@{ username = $Username; password = $Password } | ConvertTo-Json) -TimeoutSec 20
    $token = $login.data.accessToken
    Assert-Ok 'Login auth' ($null -ne $token)
} catch { Assert-Ok 'Login auth' $false $_.Exception.Message }

if ($token) {
    $h = @{ Authorization = "Bearer $token" }
    try {
        Invoke-RestMethod -Uri ($OrderUrl + '/api/orders?page=0&size=3') -Headers $h -TimeoutSec 20 | Out-Null
        Assert-Ok 'GET /api/orders (JWT + USER_ORDER_HISTORY)' $true
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        Assert-Ok 'GET /api/orders (JWT + USER_ORDER_HISTORY)' ($code -eq 200) ('HTTP ' + $code)
    }
}

try {
    $r = Invoke-RestMethod -Uri ($OrderUrl + '/api/orders/internal/statistics/overview') -TimeoutSec 20
    Assert-Ok 'GET internal statistics/overview' ($null -ne $r)
} catch { Assert-Ok 'GET internal statistics/overview' $false $_.Exception.Message }

Write-Host ''; Write-Host ("KET QUA: $passed OK, $failed FAIL") -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' }); Write-Host ''
if ($failed -gt 0) { exit 1 }
