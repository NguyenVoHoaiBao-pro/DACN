#Requires -Version 5.1
<#
.SYNOPSIS
  Kiem thu day du user-service (sau auth): profile, wishlist, addresses, gateway.

.EXAMPLE
  .\scripts\Test-User-Service-Full.ps1
  .\scripts\Test-User-Service-Full.ps1 -Username khang_test -Password 123456
#>
param(
    [string]$Username = $env:TEST_USERNAME,
    [string]$Password = $env:TEST_PASSWORD,
    [int]$ProductId = 1
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

if (-not $Username) { $Username = 'khang_test' }
if (-not $Password) { $Password = '123456' }

$auth = 'http://localhost:8081'
$user = 'http://localhost:8083'
$gw = 'http://localhost:8080'

$passed = 0
$failed = 0
$token = $null
$addressId = $null

function Assert-Ok {
    param([string]$Label, [bool]$Ok, [string]$Detail = '')
    if ($Ok) {
        $script:passed++
        Write-Host ('  [OK] ' + $Label) -ForegroundColor Green
        if ($Detail) { Write-Host ('       ' + $Detail) -ForegroundColor DarkGray }
    } else {
        $script:failed++
        Write-Host ('  [FAIL] ' + $Label) -ForegroundColor Red
        if ($Detail) { Write-Host ('       ' + $Detail) -ForegroundColor DarkGray }
    }
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' user-service - Full E2E test' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ('  User: ' + $Username) -ForegroundColor DarkGray
Write-Host ''

try {
    $login = Invoke-RestMethod -Uri ($auth + '/api/auth/login') -Method POST `
        -Body (@{ username = $Username; password = $Password } | ConvertTo-Json) `
        -ContentType 'application/json' -TimeoutSec 25
    $ok = ($login.status -eq 200) -and $login.data.accessToken
    Assert-Ok 'POST auth login' $ok
    if ($ok) { $token = $login.data.accessToken }
} catch {
    Assert-Ok 'POST auth login' $false $_.Exception.Message
}

if (-not $token) {
    Write-Host 'Dung lai: can JWT. Kiem tra auth :8081, Redis, mat khau DB.' -ForegroundColor Red
    exit 1
}

$hdr = @{ Authorization = ('Bearer ' + $token) }

try {
    $internal = Invoke-RestMethod -Uri ($user + '/api/internal/users/login') -Method POST `
        -Body (@{ username = $Username; password = $Password } | ConvertTo-Json) `
        -ContentType 'application/json' -TimeoutSec 20
    Assert-Ok 'POST internal/users/login success=true' ($internal.success -eq $true)
} catch {
    Assert-Ok 'POST internal/users/login' $false $_.Exception.Message
}

try {
    $me = Invoke-RestMethod -Uri ($user + '/api/users/me') -Headers $hdr -TimeoutSec 20
    Assert-Ok 'GET /api/users/me' (($me.status -eq 200) -and $me.data.username)
} catch {
    Assert-Ok 'GET /api/users/me' $false $_.Exception.Message
}

try {
    $upd = Invoke-RestMethod -Uri ($user + '/api/users/me') -Method PUT -Headers $hdr `
        -Body (@{ name = 'E2E Test User'; phone = '0901234567' } | ConvertTo-Json) `
        -ContentType 'application/json' -TimeoutSec 20
    Assert-Ok 'PUT /api/users/me' ($upd.status -eq 200)
} catch {
    Assert-Ok 'PUT /api/users/me' $false $_.Exception.Message
}

try {
    Invoke-RestMethod -Uri ($user + '/api/users/search?keyword=test&page=0&size=5') -Headers $hdr -TimeoutSec 20 | Out-Null
    Assert-Ok 'GET /api/users/search (staff)' $false 'Expected 403 for CUSTOMER'
} catch {
    $code = [int]$_.Exception.Response.StatusCode
    Assert-Ok 'GET /api/users/search -> 403' ($code -eq 403) ('HTTP ' + $code)
}

try {
    $wl = Invoke-RestMethod -Uri ($user + '/api/wishlist?page=0&size=5') -Headers $hdr -TimeoutSec 20
    Assert-Ok 'GET /api/wishlist' ($wl.status -eq 200)
} catch {
    Assert-Ok 'GET /api/wishlist' $false $_.Exception.Message
}

try {
    Invoke-RestMethod -Uri ($user + '/api/wishlist/product/' + $ProductId) -Method DELETE -Headers $hdr -TimeoutSec 20 -ErrorAction SilentlyContinue | Out-Null
} catch {}

try {
    $add = Invoke-RestMethod -Uri ($user + '/api/wishlist') -Method POST -Headers $hdr `
        -Body (@{ productId = $ProductId; variantId = $null } | ConvertTo-Json) `
        -ContentType 'application/json' -TimeoutSec 20
    Assert-Ok 'POST /api/wishlist' ($add.status -in 200, 201)
} catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    Assert-Ok 'POST /api/wishlist' ($code -in 200, 201, 400) ('HTTP ' + $code)
}

try {
    $chk = Invoke-RestMethod -Uri ($user + '/api/wishlist/check/' + $ProductId) -Headers $hdr -TimeoutSec 20
    Assert-Ok 'GET /api/wishlist/check/{productId}' ($chk.status -eq 200)
} catch {
    Assert-Ok 'GET /api/wishlist/check' $false $_.Exception.Message
}

try {
    $addrs = Invoke-RestMethod -Uri ($user + '/api/addresses') -Headers $hdr -TimeoutSec 20
    Assert-Ok 'GET /api/addresses' ($addrs.status -eq 200)
} catch {
    Assert-Ok 'GET /api/addresses' $false $_.Exception.Message
}

try {
    $created = Invoke-RestMethod -Uri ($user + '/api/addresses') -Method POST -Headers $hdr `
        -Body (@{
            receiverName = 'E2E Receiver'
            phone          = '0901234567'
            province       = 'Ho Chi Minh'
            district       = 'Quan 1'
            ward           = 'Ben Nghe'
            addressDetail  = '123 Test St'
            isDefault      = $true
            label          = 'E2E'
        } | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 20
    $addressId = $created.data.id
    Assert-Ok 'POST /api/addresses' (($created.status -in 200, 201) -and $addressId)
} catch {
    Assert-Ok 'POST /api/addresses' $false $_.Exception.Message
}

if ($addressId) {
    try {
        $def = Invoke-RestMethod -Uri ($user + '/api/addresses/' + $addressId + '/default') -Method PUT -Headers $hdr -TimeoutSec 20
        Assert-Ok 'PUT /api/addresses/{id}/default' ($def.status -eq 200)
    } catch {
        Assert-Ok 'PUT addresses default' $false $_.Exception.Message
    }
    try {
        $del = Invoke-RestMethod -Uri ($user + '/api/addresses/' + $addressId) -Method DELETE -Headers $hdr -TimeoutSec 20
        Assert-Ok 'DELETE /api/addresses/{id}' ($del.status -eq 200)
    } catch {
        Assert-Ok 'DELETE /api/addresses/{id}' $false $_.Exception.Message
    }
}

$gwUp = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8080 -WarningAction SilentlyContinue).TcpTestSucceeded
if ($gwUp) {
    try {
        $gme = Invoke-RestMethod -Uri ($gw + '/api/users/me') -Headers $hdr -TimeoutSec 20
        Assert-Ok 'Gateway GET /api/users/me' ($gme.status -eq 200)
    } catch {
        Assert-Ok 'Gateway GET /api/users/me' $false $_.Exception.Message
    }
    try {
        $gaddr = Invoke-RestMethod -Uri ($gw + '/api/addresses') -Headers $hdr -TimeoutSec 20
        Assert-Ok 'Gateway GET /api/addresses' ($gaddr.status -eq 200)
    } catch {
        Assert-Ok 'Gateway GET /api/addresses' $false $_.Exception.Message
    }
    try {
        Invoke-RestMethod -Uri ($gw + '/api/internal/users/username/' + $Username) -Headers $hdr -TimeoutSec 15 | Out-Null
        Assert-Ok 'Gateway internal blocked' $false 'Expected 403'
    } catch {
        $code = [int]$_.Exception.Response.StatusCode
        Assert-Ok 'Gateway /api/internal -> 403' ($code -in 403, 404) ('HTTP ' + $code)
    }
} else {
    Write-Host '  [SKIP] Gateway :8080 khong mo' -ForegroundColor Yellow
}

try {
    Invoke-RestMethod -Uri ($user + '/api/users/me') -TimeoutSec 15 | Out-Null
    Assert-Ok 'GET /me without token' $false
} catch {
    $code = [int]$_.Exception.Response.StatusCode
    Assert-Ok 'GET /me without token' ($code -in 401, 403) ('HTTP ' + $code)
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
$summaryColor = if ($failed -eq 0) { 'Green' } else { 'Yellow' }
Write-Host (' KET QUA: ' + $passed + ' OK, ' + $failed + ' FAIL') -ForegroundColor $summaryColor
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

if ($failed -gt 0) { exit 1 }
exit 0
