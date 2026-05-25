#Requires -Version 5.1
<#
.SYNOPSIS
  Import split microservice SQL dumps into MySQL (Docker or local).

.EXAMPLE
  .\scripts\Import-Databases.ps1
  .\scripts\Import-Databases.ps1 -Host 127.0.0.1 -Port 3306 -User root -Password ""
#>
param(
    [string]$Host = "127.0.0.1",
    [int]$Port = 3306,
    [string]$User = "root",
    [string]$Password = ""
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SchemaDir = Join-Path $Root "database\schemas"
if (-not (Test-Path $SchemaDir)) {
    Write-Host "Chua co database/schemas. Chay: python scripts/split-database.py" -ForegroundColor Red
    exit 1
}

$mysql = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysql) {
    Write-Host "Can lenh mysql trong PATH (hoac MySQL client tu Docker)." -ForegroundColor Red
    exit 1
}

$files = Get-ChildItem $SchemaDir -Filter "*.sql" | Sort-Object Name
Write-Host "Import $($files.Count) database(s) -> ${Host}:${Port}" -ForegroundColor Cyan

foreach ($f in $files) {
    Write-Host "  -> $($f.Name)" -ForegroundColor Yellow
    if ($Password) {
        & mysql -h $Host -P $Port -u $User -p$Password < $f.FullName
    } else {
        & mysql -h $Host -P $Port -u $User < $f.FullName
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED: $($f.Name)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "Import xong." -ForegroundColor Green
