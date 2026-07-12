# RUN_TRAINING.ps1
# Automates offline training pipeline compilation.

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🏋️  STARTING MODEL TRAINING PIPELINE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$RootDir = Split-Path -Parent $PSScriptRoot
$PythonPath = Join-Path $RootDir ".venv\Scripts\python.exe"
$ScriptPath = Join-Path $RootDir "collaborativefiltering\train.py"

# Use system python fallback if virtualenv doesn't exist
if (-not (Test-Path $PythonPath)) {
    Write-Warning "Virtual Environment Python not found, using system Python..."
    $PythonPath = "python"
}

Write-Host "Executing training script at $ScriptPath..." -ForegroundColor Yellow
& $PythonPath $ScriptPath

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🏆 MODEL TRAINING COMPLETED!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
