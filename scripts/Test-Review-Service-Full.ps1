#Requires -Version 5.1
param(
    [string]$ProductId = '1',
    [string]$ReviewUrl = 'http://localhost:8087',
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

Write-Host ''; Write-Host 'review-service - smoke test' -ForegroundColor Cyan; Write-Host ''

try {
    $r = Invoke-RestMethod -Uri ($ReviewUrl + '/api/reviews?product_id=' + $ProductId + '&page=0&size=5') -TimeoutSec 20
    Assert-Ok 'GET /api/reviews (public)' ($r.status -eq 200)
} catch { Assert-Ok 'GET /api/reviews' $false $_.Exception.Message }

try {
    $r = Invoke-RestMethod -Uri ($ReviewUrl + '/api/reviews/summary?product_id=' + $ProductId) -TimeoutSec 20
    Assert-Ok 'GET /api/reviews/summary' ($r.status -eq 200)
} catch { Assert-Ok 'GET /api/reviews/summary' $false $_.Exception.Message }

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
        $r = Invoke-RestMethod -Uri ($ReviewUrl + '/api/reviews/my?page=0&size=5') -Headers $h -TimeoutSec 20
        Assert-Ok 'GET /api/reviews/my (JWT)' ($r.status -eq 200)
    } catch { Assert-Ok 'GET /api/reviews/my' $false $_.Exception.Message }
}

Write-Host ''; Write-Host ("KET QUA: $passed OK, $failed FAIL") -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' }); Write-Host ''
if ($failed -gt 0) { exit 1 }
