# RUN_TRAINING.ps1
# Huấn luyện offline SVD + TF-IDF (Hybrid).

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " STARTING MODEL TRAINING PIPELINE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$RootDir = Split-Path -Parent $PSScriptRoot
$PythonPath = Join-Path $RootDir ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonPath)) {
    Write-Warning "Virtual Environment Python not found, using system Python..."
    $PythonPath = "python"
}

Push-Location $RootDir
try {
    Write-Host "Working directory: $RootDir" -ForegroundColor Yellow
    Write-Host "Running: python -m collaborativefiltering.train" -ForegroundColor Yellow

    & $PythonPath -m collaborativefiltering.train
    if ($LASTEXITCODE -ne 0) {
        throw "Training failed with exit code $LASTEXITCODE"
    }

    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host " MODEL TRAINING COMPLETED!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Cyan
}
catch {
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host " MODEL TRAINING FAILED!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
