# Shared helpers for Electro Store local dev scripts.

function Get-ProjectRoot {
    if ($PSScriptRoot -match '[\\/]scripts$') {
        return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
    }
    return $PSScriptRoot
}

function Get-DriveFreeGB {
    param([string]$DriveLetter = 'C')
    $d = Get-PSDrive -Name $DriveLetter -ErrorAction SilentlyContinue
    if ($d) { return [math]::Round($d.Free / 1GB, 2) }
    return $null
}

function Get-MavenSettingsArgs {
    param([string]$Root)
    $cFree = Get-DriveFreeGB -DriveLetter 'C'
    if ($null -ne $cFree -and $cFree -lt 2) {
        $settings = Join-Path $Root 'scripts\maven-settings-d-drive.xml'
        if (Test-Path $settings) {
            Write-Host "  Canh bao: o C: con $cFree GB (Maven mac dinh ghi vao C:\Users\...\.m2)" -ForegroundColor Yellow
            Write-Host "  -> Dung Maven repo tren o D: .maven-repository" -ForegroundColor Yellow
            return @('-s', $settings)
        }
    }
    return @()
}

function Test-SharedJarInstalled {
    param([string]$Root)
    $fromC = Join-Path $env:USERPROFILE '.m2\repository\com\electro\shared\0.0.1-SNAPSHOT\shared-0.0.1-SNAPSHOT.jar'
    $fromD = Join-Path $Root '.maven-repository\com\electro\shared\0.0.1-SNAPSHOT\shared-0.0.1-SNAPSHOT.jar'
    return (Test-Path $fromC) -or (Test-Path $fromD)
}

function Get-MavenCommand {
    if ($env:MAVEN_CMD -and (Test-Path $env:MAVEN_CMD)) {
        return $env:MAVEN_CMD
    }
    if ($env:MAVEN_HOME) {
        $candidate = Join-Path $env:MAVEN_HOME 'bin\mvn.cmd'
        if (Test-Path $candidate) { return $candidate }
    }
    $defaults = @(
        'C:\apache-maven-3.9.16\bin\mvn.cmd',
        'C:\apache-maven-3.9.9\bin\mvn.cmd',
        'C:\Program Files\Apache\maven\bin\mvn.cmd'
    )
    foreach ($path in $defaults) {
        if (Test-Path $path) { return $path }
    }
    $fromPath = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if ($fromPath) { return $fromPath.Source }
    throw "Khong tim thay Maven. Dat MAVEN_CMD hoac cai Maven va them vao PATH."
}

function Test-PortOpen {
    param([int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        $ok = $async.AsyncWaitHandle.WaitOne(800)
        if ($ok -and $client.Connected) {
            $client.Close()
            return $true
        }
        $client.Close()
    } catch { }
    return $false
}

function Wait-ForElectroServices {
    <#
    .SYNOPSIS
      Doi tat ca service mo port (poll song song). Tra ve $true neu full UP.
    #>
    param(
        [array]$Services,
        [int]$TimeoutSec = 180
    )
    if (-not $Services -or $Services.Count -eq 0) { return $true }

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $pending = @($Services)
    Write-Host "  Doi toi da ${TimeoutSec}s cho $($Services.Count) microservice..." -ForegroundColor DarkGray

    while ((Get-Date) -lt $deadline -and $pending.Count -gt 0) {
        $still = @()
        foreach ($svc in $pending) {
            if (Test-PortOpen -Port $svc.Port) {
                Write-Host "  OK  $($svc.Name) (:$($svc.Port))" -ForegroundColor Green
            } else {
                $still += $svc
            }
        }
        $pending = $still
        if ($pending.Count -eq 0) { return $true }
        Start-Sleep -Seconds 3
    }

    foreach ($svc in $pending) {
        Write-Host ('  FAIL ' + $svc.Name + ' (:' + $svc.Port + ') - xem .run\' + $svc.Name + '.log') -ForegroundColor Red
    }
    return $false
}

function Wait-ForGatewayReady {
    <#
    .SYNOPSIS
      Doi Gateway route duoc catalog/statistics qua Eureka (tranh 503 luc vua START).
    #>
    param([int]$TimeoutSec = 120)

    if (-not (Test-PortOpen -Port 8080)) {
        Write-Host '  SKIP Gateway readiness - port 8080 chua mo' -ForegroundColor Yellow
        return $false
    }

    $probes = @(
        @{ Url = 'http://localhost:8080/api/products/best-sellers?page=0&size=1'; Label = 'catalog/products' },
        @{ Url = 'http://localhost:8080/api/categories/root'; Label = 'catalog/categories' }
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    Write-Host "  Doi Gateway route Eureka (toi da ${TimeoutSec}s)..." -ForegroundColor DarkGray

    while ((Get-Date) -lt $deadline) {
        $allOk = $true
        foreach ($probe in $probes) {
            try {
                $resp = Invoke-WebRequest -Uri $probe.Url -UseBasicParsing -TimeoutSec 20
                if ($resp.StatusCode -ne 200) {
                    $allOk = $false
                    break
                }
            } catch {
                $code = $null
                if ($_.Exception.Response) {
                    $code = [int]$_.Exception.Response.StatusCode
                }
                if ($code -eq 503 -or $code -eq 502 -or $null -eq $code) {
                    $allOk = $false
                    break
                }
            }
        }
        if ($allOk) {
            Write-Host '  OK  Gateway da route catalog (Eureka san sang)' -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 4
    }

    Write-Host '  WARN Gateway van 503 — doi them ~30s roi F5 trang web, hoac chay lai START.ps1' -ForegroundColor Yellow
    return $false
}

function Wait-ForPort {
    param(
        [int]$Port,
        [string]$Label = "port $Port",
        [int]$TimeoutSec = 120
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    Write-Host "  Dang cho $Label..." -ForegroundColor DarkGray
    while ((Get-Date) -lt $deadline) {
        if (Test-PortOpen -Port $Port) {
            Write-Host "  OK: $Label san sang." -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
    }
    throw "Timeout: $Label chua san sang sau ${TimeoutSec}s."
}

function Import-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $false }
    Get-Content $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) { return }
        $eq = $line.IndexOf('=')
        if ($eq -lt 1) { return }
        $name = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        Set-Item -Path "Env:$name" -Value $value
    }
    return $true
}

function Get-ElectroServices {
  return @(
        @{ Name = 'discovery-server'; Port = 8761; Phase = 1; Description = 'Eureka' }
        @{ Name = 'config-server';    Port = 8888; Phase = 2; Description = 'Config Server'; WaitAfterSec = 8 }
        @{ Name = 'auth-service';     Port = 8081; Phase = 3; Description = 'Auth' }
        @{ Name = 'user-service';     Port = 8083; Phase = 3; Description = 'User + Wishlist' }
        @{ Name = 'catalog-service';  Port = 8082; Phase = 3; Description = 'Catalog + Inventory' }
        @{ Name = 'cart-service';     Port = 8084; Phase = 3; Description = 'Cart' }
        @{ Name = 'order-service';    Port = 8086; Phase = 3; Description = 'Order + Warranty' }
        @{ Name = 'review-service';   Port = 8087; Phase = 3; Description = 'Reviews' }
        @{ Name = 'statistics-service'; Port = 8088; Phase = 3; Description = 'Statistics + Redis' }
        @{ Name = 'api-gateway';      Port = 8080; Phase = 4; Description = 'API Gateway'; WaitAfterSec = 12 }
    )
}

function Get-MinimalServiceNames {
    return @(
        'discovery-server', 'config-server',
        'auth-service', 'user-service', 'catalog-service',
        'api-gateway'
    )
}

function Start-ElectroService {
    param(
        [string]$Root,
        [string]$Maven,
        [hashtable]$Service,
        [string]$RunDir
    )
    $modulePath = Join-Path $Root $Service.Name
    if (-not (Test-Path (Join-Path $modulePath 'pom.xml'))) {
        throw "Khong tim thay module: $($Service.Name)"
    }
  if (Test-PortOpen -Port $Service.Port) {
        Write-Host "  Bo qua $($Service.Name) - port $($Service.Port) da mo." -ForegroundColor Yellow
        return
    }

    $logFile = Join-Path $RunDir "$($Service.Name).log"
    $javaOpts = '-Xms128m -Xmx384m'
    $cmd = @"
Set-Location '$modulePath'
`$env:JAVA_TOOL_OPTIONS = '$javaOpts'
& '$Maven' spring-boot:run -q 2>&1 | Tee-Object -FilePath '$logFile'
"@

    Start-Process powershell.exe -WindowStyle Minimized -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmd
    ) | Out-Null

    Write-Host "  Da khoi dong $($Service.Name) (:$($Service.Port)) - log: $logFile" -ForegroundColor Cyan
}

function Stop-PortProcess {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        if ($procId -and $procId -gt 0) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}
