#Requires -Version 5.1
<#
.SYNOPSIS
  Liệt kê và xóa ảnh sản phẩm không hợp lệ trong electro_catalog_db.

.EXAMPLE
  .\scripts\Remove-InvalidProductImages.ps1
  .\scripts\Remove-InvalidProductImages.ps1 -Execute
  .\scripts\Remove-InvalidProductImages.ps1 -Execute -Report .\scripts\invalid-images-report.csv
#>
param(
    [switch]$Execute,
    [string]$Report = "",
    [int]$ShowLimit = 50
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PyScript = Join-Path $PSScriptRoot "cleanup-invalid-product-images.py"

if (-not (Test-Path $PyScript)) {
    Write-Host "Khong tim thay: $PyScript" -ForegroundColor Red
    exit 1
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $python) {
    Write-Host "Can Python 3 + pymysql: pip install pymysql" -ForegroundColor Red
    exit 1
}

$argsList = @($PyScript, "--show-limit", $ShowLimit)
if ($Report) {
    $argsList += @("--report", $Report)
}
if ($Execute) {
    $argsList += "--execute"
}

Push-Location $Root
try {
    & $python.Source @argsList
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
