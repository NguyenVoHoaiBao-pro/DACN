# START_SERVER.ps1 — Chạy FastAPI reco-service (port 5003)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

$PythonPath = Join-Path $RootDir ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonPath)) {
    Write-Warning "Chua co .venv — chay: .\scripts\SETUP_ENV.ps1"
    $PythonPath = "python"
}

$port = if ($env:AI_PORT) { $env:AI_PORT } else { "5003" }
Write-Host "Uvicorn app:app -> http://localhost:$port" -ForegroundColor Cyan
& $PythonPath -m uvicorn app:app --host 0.0.0.0 --port $port
