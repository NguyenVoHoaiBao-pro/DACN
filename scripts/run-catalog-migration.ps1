# Chạy một file migration SQL lên electro_catalog_db (đọc .env ở thư mục gốc repo)
param(
    [Parameter(Mandatory = $true)]
    [string]$MigrationFile
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env"
if (-not (Test-Path $envPath)) { throw "Missing .env at $envPath" }

$vars = @{}
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or $line -notmatch "=") { return }
    $k, $v = $line -split "=", 2
    $vars[$k.Trim()] = $v.Trim().Trim('"').Trim("'")
}

$sqlPath = if ([System.IO.Path]::IsPathRooted($MigrationFile)) { $MigrationFile } else { Join-Path $root $MigrationFile }
if (-not (Test-Path $sqlPath)) { throw "SQL file not found: $sqlPath" }

$host_ = $vars["MYSQL_HOST"]
$port = $vars["MYSQL_PORT"]
$user = $vars["MYSQL_USER"]
$pass = $vars["MYSQL_PASSWORD"]

Write-Host "Running migration on electro_catalog_db: $sqlPath"
& mysql --host=$host_ --port=$port --user=$user --password=$pass --ssl-mode=REQUIRED electro_catalog_db < $sqlPath
if ($LASTEXITCODE -ne 0) { throw "mysql exited with code $LASTEXITCODE" }
Write-Host "Done."
