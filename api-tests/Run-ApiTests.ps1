#Requires -Version 5.1
<#
.SYNOPSIS
  Chay smoke test API (goi scripts/Test-Each-Service.ps1).

.EXAMPLE
  .\api-tests\Run-ApiTests.ps1
  .\api-tests\Run-ApiTests.ps1 -Service catalog
#>
param(
    [string]$Username = 'khang_test',
    [string]$Password = 'any',
    [ValidateSet('all', 'auth', 'user', 'catalog', 'cart', 'order', 'review', 'statistics')]
    [string]$Service = 'all'
)

$root = Split-Path $PSScriptRoot -Parent
$testScript = Join-Path $root 'scripts\Test-Each-Service.ps1'

if (-not (Test-Path $testScript)) {
    Write-Error "Khong tim thay: $testScript"
    exit 1
}

Write-Host 'Electro Store — API Tests (PowerShell)' -ForegroundColor Cyan
Write-Host "  REST Client: mo thu muc api-tests\*.http trong Cursor" -ForegroundColor DarkGray
Write-Host ''

& $testScript -Username $Username -Password $Password -Service $Service
