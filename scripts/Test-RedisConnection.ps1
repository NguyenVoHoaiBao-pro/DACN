#Requires -Version 5.1
<#
.SYNOPSIS
  Kiem tra ket noi Redis Cloud (doc .env giong START.ps1).

.EXAMPLE
  .\scripts\Test-RedisConnection.ps1
#>
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\_common.ps1"

$Root = Get-ProjectRoot
$envFile = Join-Path $Root '.env'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Electro Store - Test Redis Cloud' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan

if (Import-DotEnv -Path $envFile) {
    Write-Host "Da nap: $envFile" -ForegroundColor DarkGray
} else {
    Write-Host "Khong tim thay .env tai $envFile" -ForegroundColor Yellow
    Write-Host 'Dat bien REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_SSL thu cong.' -ForegroundColor Yellow
}

$hostName = $env:REDIS_HOST
$port = [int]($env:REDIS_PORT)
$user = $env:REDIS_USERNAME
$pass = $env:REDIS_PASSWORD
$sslFlag = $env:REDIS_SSL
$url = $env:REDIS_URL

if (-not $hostName -and -not $url) {
    Write-Host 'Loi: Chua co REDIS_HOST hoac REDIS_URL trong .env' -ForegroundColor Red
    exit 1
}

function Show-MaskedSecret([string]$s) {
    if (-not $s) { return '(empty)' }
    if ($s.Length -le 4) { return '****' }
    return $s.Substring(0, 4) + ('*' * ($s.Length - 4))
}

Write-Host ''
Write-Host '[1/3] Cau hinh tu .env' -ForegroundColor Cyan
if ($url) {
    Write-Host "  REDIS_URL      = $(Show-MaskedSecret $url)" -ForegroundColor Green
    Write-Host "  (uu tien - bo qua test host/port rieng neu URL OK)" -ForegroundColor DarkGray
} else {
    Write-Host "  REDIS_HOST     = $hostName"
    Write-Host "  REDIS_PORT     = $port"
    Write-Host "  REDIS_USERNAME = $(if ($user) { $user } else { '(empty)' })"
    Write-Host "  REDIS_PASSWORD = $(Show-MaskedSecret $pass)"
    Write-Host "  REDIS_SSL      = $sslFlag"
}

Write-Host ''
Write-Host '[2/3] Kiem tra mang (DNS + TCP)' -ForegroundColor Cyan
if ($hostName) {
    try {
        $dns = Resolve-DnsName $hostName -ErrorAction Stop | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1
        Write-Host "  DNS OK -> $($dns.IPAddress)" -ForegroundColor Green
    } catch {
        Write-Host "  DNS FAIL: $_" -ForegroundColor Red
    }

    $tcp = Test-NetConnection -ComputerName $hostName -Port $port -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
        Write-Host "  TCP port $port MO (co the ket noi socket)" -ForegroundColor Green
    } else {
        Write-Host "  TCP port $port DONG hoac bi chan firewall" -ForegroundColor Red
    }
}

Write-Host ''
Write-Host '[3/3] Kiem tra Redis PING (Python)' -ForegroundColor Cyan

$python = $null
foreach ($cmd in @('python', 'python3', 'py')) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($found) { $python = $found.Source; break }
}

if (-not $python) {
    Write-Host '  Python chua cai — bo qua test PING.' -ForegroundColor Yellow
    Write-Host '  Cai Python roi chay: pip install redis' -ForegroundColor Yellow
    Write-Host '  Hoac dung redis-cli (neu co):' -ForegroundColor Yellow
    if ($sslFlag -eq 'true') {
        Write-Host "    redis-cli -h $hostName -p $port --tls -u default -a <password> PING" -ForegroundColor DarkGray
    } else {
        Write-Host "    redis-cli -h $hostName -p $port -a <password> PING" -ForegroundColor DarkGray
    }
    exit 2
}

$pyScript = Join-Path $PSScriptRoot 'test_redis_connection.py'
& $python $pyScript
$code = $LASTEXITCODE
if ($null -eq $code) { $code = 0 }

Write-Host ''
if ($code -eq 0) {
    Write-Host 'Thanh cong — cap nhat REDIS_SSL trong .env theo goi y tren, roi restart auth-service.' -ForegroundColor Green
} else {
    Write-Host 'That bai — xem log tren; kiem tra password / database Active tren Redis Cloud.' -ForegroundColor Red
}

exit $code
