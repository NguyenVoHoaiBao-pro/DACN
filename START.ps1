#Requires -Version 5.1
<#
.SYNOPSIS
  Khoi dong toan bo microservices bang JDK local (khong Docker cho Java).

.DESCRIPTION
  1. Docker Compose: MySQL + Redis (neu chua -SkipDocker)
  2. Build module shared
  3. Mo tung Spring Boot service trong cua so PowerShell thu nho (heap ~384MB)

.PARAMETER SkipDocker
  Bo qua docker compose (da chay MySQL/Redis san).

.PARAMETER SkipBuild
  Bo qua mvn install shared.

.PARAMETER Minimal
  Chi chay discovery, config, auth, user, catalog, gateway (tiet kiem RAM).

.EXAMPLE
  .\START.ps1

.EXAMPLE
  .\START.ps1 -Minimal

.EXAMPLE
  .\START.ps1 -SkipDocker
#>
param(
    [switch]$SkipDocker,
    [switch]$SkipBuild,
    [switch]$Minimal
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\scripts\_common.ps1"

$Root = Get-ProjectRoot
$envFile = Join-Path $Root '.env'
if (Import-DotEnv -Path $envFile) {
    Write-Host "Da nap bien moi truong tu .env" -ForegroundColor DarkGray
    if ($env:MYSQL_HOST -and $env:MYSQL_HOST -ne 'localhost' -and -not $SkipDocker) {
        Write-Host "Phat hien MYSQL_HOST=$($env:MYSQL_HOST) - goi y: .\START.ps1 -SkipDocker" -ForegroundColor Yellow
    }
}

$Maven = Get-MavenCommand
$RunDir = Join-Path $Root '.run'
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

Write-Host ''
Write-Host '========================================' -ForegroundColor Magenta
Write-Host '  Electro Store - START (JDK local)' -ForegroundColor Magenta
Write-Host '========================================' -ForegroundColor Magenta
Write-Host "Maven: $Maven"
Write-Host "Root:  $Root"
if ($Minimal) { Write-Host 'Che do: MINIMAL (6 services)' -ForegroundColor Yellow }
Write-Host ''

# --- 1. Ha tang Docker ---
if (-not $SkipDocker) {
    Write-Host '[1/4] Ha tang Docker (MySQL + Redis)...' -ForegroundColor Cyan
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Can Docker Desktop cho MySQL/Redis. Hoac dung -SkipDocker neu DB da chay.'
    }
    Push-Location $Root
    docker compose up -d
    Pop-Location
    Wait-ForPort -Port 3306 -Label 'MySQL' -TimeoutSec 90
    Wait-ForPort -Port 6379 -Label 'Redis' -TimeoutSec 60
} else {
    Write-Host '[1/4] Bo qua Docker (-SkipDocker).' -ForegroundColor DarkGray
}

# --- 2. Build shared ---
$mvnExtra = Get-MavenSettingsArgs -Root $Root
if (-not $SkipBuild) {
    if ((Get-DriveFreeGB -DriveLetter 'C') -lt 1 -and (Test-SharedJarInstalled -Root $Root)) {
        Write-Host '[2/4] Bo qua build shared (o C: day, jar shared da co san).' -ForegroundColor Yellow
        Write-Host '       Neu can build lai: giai phong o C: hoac dung -SkipBuild' -ForegroundColor DarkGray
    } else {
        Write-Host '[2/4] Build shared module...' -ForegroundColor Cyan
        & $Maven @mvnExtra -f (Join-Path $Root 'shared\pom.xml') install -DskipTests -q
        if ($LASTEXITCODE -ne 0) {
            $cFree = Get-DriveFreeGB -DriveLetter 'C'
            if ($null -ne $cFree -and $cFree -lt 2) {
                throw "Build shared that bai: o C: chi con $cFree GB. Maven can ghi vao C:\Users\$env:USERNAME\.m2. Giai phong o C: hoac chay: .\START.ps1 -SkipDocker -SkipBuild"
            }
            throw 'Build shared that bai. Xem log Maven phia tren.'
        }
        Write-Host '  OK shared.' -ForegroundColor Green
    }
} else {
    Write-Host '[2/4] Bo qua build shared (-SkipBuild).' -ForegroundColor DarkGray
}

# --- 3. Chon danh sach service ---
$all = Get-ElectroServices
if ($Minimal) {
    $names = Get-MinimalServiceNames
    $selected = $all | Where-Object { $names -contains $_.Name }
} else {
    $selected = $all
}

Write-Host '[3/4] Khoi dong Spring Boot services...' -ForegroundColor Cyan
$phases = $selected | Group-Object Phase | Sort-Object Name
foreach ($phaseGroup in $phases) {
    Write-Host "  --- Phase $($phaseGroup.Name) ---" -ForegroundColor DarkCyan
    foreach ($svc in $phaseGroup.Group) {
        Start-ElectroService -Root $Root -Maven $Maven -Service $svc -RunDir $RunDir
        if ($svc.WaitAfterSec) {
            Start-Sleep -Seconds $svc.WaitAfterSec
        } elseif ($phaseGroup.Name -eq 3) {
            # Tranh mo dong thoi 7 JVM + Maven (gây 6 service DOWN khi check sớm)
            Start-Sleep -Seconds 5
        }
    }
    if ($phaseGroup.Name -lt 4) {
        Start-Sleep -Seconds 3
    }
}

# --- 4. Doi tat ca service mo port ---
Write-Host '[4/5] Cho cac service san sang (mo port)...' -ForegroundColor Cyan
$allReady = Wait-ForElectroServices -Services $selected -TimeoutSec 180

if ($allReady) {
    Write-Host '[5/5] Kiem tra Gateway route qua Eureka...' -ForegroundColor Cyan
    $null = Wait-ForGatewayReady -TimeoutSec 120
}

Write-Host ''
if ($allReady) {
    Write-Host '========================================' -ForegroundColor Green
    Write-Host '  Tat ca service da san sang!' -ForegroundColor Green
    Write-Host '========================================' -ForegroundColor Green
} else {
    Write-Host '========================================' -ForegroundColor Yellow
    Write-Host '  Mot so service CHUA len port!' -ForegroundColor Yellow
    Write-Host '========================================' -ForegroundColor Yellow
    Write-Host '  Goi y:' -ForegroundColor Yellow
    Write-Host '    - Doi them 30-60s roi chay: .\check-all-services.ps1' -ForegroundColor DarkGray
    Write-Host '    - Xem log loi: .run\<ten-service>.log' -ForegroundColor DarkGray
    Write-Host '    - Khoi dong lai: .\STOP.ps1 ; .\START.ps1 -SkipDocker' -ForegroundColor DarkGray
}
Write-Host '  API Gateway:  http://localhost:8080'
Write-Host '  Eureka:       http://localhost:8761'
Write-Host '  Zipkin Trace: http://localhost:9411  (docker compose up -d zipkin)'
Write-Host '  Log files:    .run\*.log'
Write-Host ''
Write-Host 'Swagger UI (tung service):' -ForegroundColor Cyan
Write-Host '  Gateway (tat ca):  http://localhost:8080/swagger-ui.html'
Write-Host '  auth-service:      http://localhost:8081/swagger-ui/index.html'
Write-Host '  catalog-service:   http://localhost:8082/swagger-ui/index.html'
Write-Host '  user-service:      http://localhost:8083/swagger-ui/index.html'
Write-Host '  cart-service:      http://localhost:8084/swagger-ui/index.html'
Write-Host '  order-service:     http://localhost:8086/swagger-ui/index.html'
Write-Host '  review-service:    http://localhost:8087/swagger-ui/index.html'
Write-Host '  statistics-service:http://localhost:8088/swagger-ui/index.html'
Write-Host '  reco-service:        http://localhost:5003/docs  (FastAPI, Eureka: reco-service)'
Write-Host ''
Write-Host 'Kiem tra trang thai:  .\check-all-services.ps1' -ForegroundColor Yellow
Write-Host 'Dung he thong:        .\STOP.ps1' -ForegroundColor Yellow
Write-Host ''
