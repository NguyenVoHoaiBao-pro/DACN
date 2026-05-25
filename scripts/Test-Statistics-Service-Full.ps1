#Requires -Version 5.1
param(
    [string]$UserId = '1',
    [string]$ProductId = '1',
    [string]$StatisticsUrl = 'http://localhost:8088',
    [string]$GatewayUrl = 'http://localhost:8080',
    [string]$AuthUrl = 'http://localhost:8081',
    [string]$Username = 'khang_test',
    [string]$Password = '123456'
)

$ErrorActionPreference = 'Continue'
$passed = 0; $failed = 0
function Assert-Ok($label, $ok, $detail = '') {
    if ($ok) { $script:passed++; Write-Host ('  [OK] ' + $label) -ForegroundColor Green }
    else { $script:failed++; Write-Host ('  [FAIL] ' + $label) -ForegroundColor Red; if ($detail) { Write-Host ('       ' + $detail) -ForegroundColor DarkGray } }
}

Write-Host ''; Write-Host 'statistics-service - full smoke test' -ForegroundColor Cyan; Write-Host ''

try {
    $body = @{ userId = [int]$UserId; productId = [int]$ProductId; actionType = 'VIEW' } | ConvertTo-Json
    $r = Invoke-RestMethod -Method POST -Uri ($StatisticsUrl + '/api/interactions/track') -ContentType 'application/json' -Body $body -TimeoutSec 20
    Assert-Ok 'POST track VIEW' ($r.status -eq 200 -and [decimal]$r.data.interactionScore -eq 1)
} catch { Assert-Ok 'POST track VIEW' $false $_.Exception.Message }

try {
    $body = @{ userId = [int]$UserId; productId = 99; actionType = 'CLICK' } | ConvertTo-Json
    $r = Invoke-RestMethod -Method POST -Uri ($StatisticsUrl + '/api/interactions/track') -ContentType 'application/json' -Body $body -TimeoutSec 20
    Assert-Ok 'POST track CLICK -> CART score 3' ($r.status -eq 200 -and $r.data.actionType -eq 'CART' -and [decimal]$r.data.interactionScore -eq 3)
} catch { Assert-Ok 'POST track CLICK' $false $_.Exception.Message }

try {
    $body = @{ userId = [int]$UserId; productId = 98; actionType = 'RATING'; rating = 4.5 } | ConvertTo-Json
    $r = Invoke-RestMethod -Method POST -Uri ($StatisticsUrl + '/api/interactions/track') -ContentType 'application/json' -Body $body -TimeoutSec 20
    Assert-Ok 'POST track RATING -> RATED' ($r.status -eq 200 -and $r.data.actionType -eq 'RATED' -and [decimal]$r.data.interactionScore -eq 4.5)
} catch { Assert-Ok 'POST track RATING' $false $_.Exception.Message }

try {
    $r = Invoke-RestMethod -Uri ($StatisticsUrl + '/api/recommendations/user/' + $UserId) -TimeoutSec 20
    Assert-Ok 'GET /api/recommendations/user/{id}' ($r.status -eq 200)
} catch { Assert-Ok 'GET recommendations' $false $_.Exception.Message }

try {
    $r = Invoke-RestMethod -Uri ($GatewayUrl + '/api/recommendations/user/' + $UserId) -TimeoutSec 20
    Assert-Ok 'Gateway GET recommendations' ($r.status -eq 200)
} catch { Assert-Ok 'Gateway recommendations' $false $_.Exception.Message }

$token = $null
try {
    $login = Invoke-RestMethod -Method POST -Uri ($AuthUrl + '/api/auth/login') -ContentType 'application/json' `
        -Body (@{ username = $Username; password = $Password } | ConvertTo-Json) -TimeoutSec 20
    $token = $login.data.accessToken
} catch { }

if ($token) {
    $h = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
    try {
        $body = @{ userId = [int]$UserId; productId = [int]$ProductId; actionType = 'VIEW' } | ConvertTo-Json
        $r = Invoke-RestMethod -Method POST -Uri ($GatewayUrl + '/api/interactions/track') -Headers $h -Body $body -TimeoutSec 20
        Assert-Ok 'Gateway POST track (JWT)' ($r.status -eq 200)
    } catch { Assert-Ok 'Gateway POST track' $false $_.Exception.Message }

    try {
        Invoke-WebRequest -Uri ($StatisticsUrl + '/api/admin/statistics/overview') -Headers $h -UseBasicParsing -TimeoutSec 20 | Out-Null
        Assert-Ok 'Admin overview CUSTOMER -> 403' $false 'Got 200'
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Assert-Ok 'Admin overview CUSTOMER -> 403' ($code -eq 403) "Status $code"
    }

    try {
        Invoke-WebRequest -Uri ($StatisticsUrl + '/api/admin/statistics/overview') -UseBasicParsing -TimeoutSec 20 | Out-Null
        Assert-Ok 'Admin overview no JWT -> denied' $false 'Got 200'
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Assert-Ok 'Admin overview no JWT -> denied' ($code -in 401, 403) "Status $code"
    }
}

Write-Host ''; Write-Host ("KET QUA: $passed OK, $failed FAIL") -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' }); Write-Host ''
if ($failed -gt 0) { exit 1 }
