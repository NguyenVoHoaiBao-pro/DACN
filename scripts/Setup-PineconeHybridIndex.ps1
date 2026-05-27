param(
    [string]$IndexName = "electro-store-products",
    [int]$Dimension = 4096,
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_common.ps1"

$root = Get-ProjectRoot
Import-DotEnv -Path (Join-Path $root ".env") | Out-Null

if (-not $env:PINECONE_API_KEY) {
    throw "Can PINECONE_API_KEY trong .env"
}

$headers = @{
    "Api-Key"                = $env:PINECONE_API_KEY
    "X-Pinecone-Api-Version" = "2025-04"
    "Content-Type"           = "application/json"
}

Write-Host "=== Tao lai index Pinecone cho Hybrid (dotproduct + sparse) ===" -ForegroundColor Cyan
Write-Host "Index: $IndexName | dim=$Dimension | metric=dotproduct | region=$Region" -ForegroundColor DarkGray

try {
    Invoke-RestMethod -Uri "https://api.pinecone.io/indexes/$IndexName" -Method DELETE -Headers $headers -TimeoutSec 60 | Out-Null
    Write-Host "Da xoa index cu." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} catch {
    Write-Host "Khong xoa duoc index (co the chua ton tai): $($_.Exception.Message)" -ForegroundColor DarkGray
}

$body = @{
    name      = $IndexName
    dimension = $Dimension
    metric    = "dotproduct"
    spec      = @{
        serverless = @{
            cloud  = "aws"
            region = $Region
        }
    }
} | ConvertTo-Json -Depth 5

$created = Invoke-RestMethod -Uri "https://api.pinecone.io/indexes" -Method POST -Headers $headers -Body $body -TimeoutSec 60
Write-Host "Tao index: state=$($created.status.state)" -ForegroundColor Green

for ($i = 1; $i -le 30; $i++) {
    $idx = Invoke-RestMethod -Uri "https://api.pinecone.io/indexes/$IndexName" -Headers $headers
    if ($idx.status.ready) {
        Write-Host "Index ready. Host=$($idx.host)" -ForegroundColor Green
        break
    }
    Write-Host "[$i] Cho index ready..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "Tiep theo:" -ForegroundColor Cyan
Write-Host "  1) Restart chatbot-service (RAG_HYBRID_ENABLED=true)" -ForegroundColor DarkGray
Write-Host "  2) .\scripts\Reingest-Chatbot.ps1" -ForegroundColor DarkGray
