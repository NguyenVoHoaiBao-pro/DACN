# SETUP_ENV.ps1
# Automates Python virtual environment setup and packages installation.

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "⚙️  STARTING ENVIRONMENT SETUP" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Check Python installation
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python was not found on your system PATH! Please install Python 3.8+."
}

# Get active directory
$RootDir = Split-Path -Parent $PSScriptRoot

# 2. Setup Virtual Environment
$VenvDir = Join-Path $RootDir ".venv"
if (-not (Test-Path $VenvDir)) {
    Write-Host "Creating Python Virtual Environment in $VenvDir..." -ForegroundColor Yellow
    python -m venv $VenvDir
} else {
    Write-Host "Python Virtual Environment already exists in $VenvDir." -ForegroundColor Green
}

# 3. Activate and Install dependencies
$PipPath = Join-Path $VenvDir "Scripts\pip.exe"
$ReqPath = Join-Path $RootDir "requirements.txt"

if (Test-Path $ReqPath) {
    Write-Host "Installing/Upgrading dependencies from $ReqPath..." -ForegroundColor Yellow
    & $PipPath install --upgrade pip
    & $PipPath install -r $ReqPath
    Write-Host "Dependencies successfully installed!" -ForegroundColor Green
} else {
    Write-Warning "requirements.txt not found at $ReqPath!"
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🎉 ENVIRONMENT SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
