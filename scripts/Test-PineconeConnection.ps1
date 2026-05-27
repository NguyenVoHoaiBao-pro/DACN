param(
    [string]$ApiKey = "",
    [string]$ExpectedIndexName = "electro-store-products",
    [int]$ExpectedDimension = 4096
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\_common.ps1"

$root = Get-ProjectRoot
Import-DotEnv -Path (Join-Path $root ".env") | Out-Null

if (-not $ApiKey) {
    $ApiKey = $env:PINECONE_API_KEY
}

Write-Host "=== Kiem tra ket noi Pinecone ===" -ForegroundColor Cyan

if (-not $ApiKey) {
    Write-Host "FAIL: Chua co PINECONE_API_KEY trong .env" -ForegroundColor Red
    Write-Host "Them vao .env (xem .env.example va docs/CHATBOT_PINECONE.md):" -ForegroundColor Yellow
    Write-Host "  PINECONE_API_KEY=pcsk-..." -ForegroundColor DarkGray
    Write-Host "  PINECONE_INDEX_NAME=electro-store-products" -ForegroundColor DarkGray
    Write-Host "  PINECONE_REGION=us-east-1" -ForegroundColor DarkGray
    Write-Host "  PINECONE_PROJECT_ID=..." -ForegroundColor DarkGray
    exit 1
}

Write-Host "API key: OK (do dai $($ApiKey.Length) ky tu)" -ForegroundColor Green

$headers = @{
    "Api-Key"                 = $ApiKey
    "X-Pinecone-Api-Version"  = "2025-04"
}

try {
    $resp = Invoke-RestMethod -Uri "https://api.pinecone.io/indexes" -Headers $headers -Method GET -TimeoutSec 30
} catch {
    Write-Host "FAIL: Khong goi duoc Pinecone Control API" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
    exit 1
}

Write-Host "Pinecone Control API: OK" -ForegroundColor Green

$indexes = @($resp.indexes)
if ($indexes.Count -eq 0) {
    Write-Host "WARN: Tai khoan chua co index nao. Tao index '$ExpectedIndexName' (dim=$ExpectedDimension, cosine) tren app.pinecone.io" -ForegroundColor Yellow
    exit 2
}

Write-Host "So index trong project: $($indexes.Count)" -ForegroundColor Cyan
foreach ($idx in $indexes) {
    $name = $idx.name
    $dim = $idx.dimension
    $ready = $idx.status.ready
    $state = $idx.status.state
    $region = $null
    if ($idx.spec.serverless) { $region = $idx.spec.serverless.region }
    Write-Host ("  - {0} | dim={1} | ready={2} | state={3} | region={4}" -f $name, $dim, $ready, $state, $region)
}

$target = $indexes | Where-Object { $_.name -eq $ExpectedIndexName } | Select-Object -First 1
if (-not $target) {
    Write-Host "WARN: Khong thay index '$ExpectedIndexName'. Dat PINECONE_INDEX_NAME khop ten index tren Pinecone." -ForegroundColor Yellow
    exit 2
}

Write-Host "Index '$ExpectedIndexName': tim thay" -ForegroundColor Green
if ($target.dimension -ne $ExpectedDimension) {
    Write-Host "WARN: dimension=$($target.dimension) (ung dung can $ExpectedDimension cho nvidia/nv-embed-v1)" -ForegroundColor Yellow
}
if (-not $target.status.ready) {
    Write-Host "WARN: Index chua ready (state=$($target.status.state))" -ForegroundColor Yellow
    exit 2
}

if ($target.spec.serverless.region) {
    Write-Host "Goi y .env: PINECONE_REGION=$($target.spec.serverless.region)" -ForegroundColor DarkGray
    Write-Host "         PINECONE_ENVIRONMENT=$($target.spec.serverless.region)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Ket luan: API key + index Pinecone OK. Tiep theo:" -ForegroundColor Green
Write-Host "  1) Dien PINECONE_* vao .env (region + project-id)" -ForegroundColor DarkGray
Write-Host "  2) Restart chatbot-service" -ForegroundColor DarkGray
Write-Host "  3) .\scripts\Reingest-Chatbot.ps1" -ForegroundColor DarkGray

# Kiem tra chatbot-service
if (Test-PortOpen -Port 8092) {
    try {
        $rag = Invoke-RestMethod "http://localhost:8092/api/chatbot/rag-status" -TimeoutSec 10
        Write-Host "chatbot rag-status: indexEmpty=$($rag.data.indexEmpty) ingestRunning=$($rag.data.ingestRunning)" -ForegroundColor Cyan
    } catch {
        Write-Host "chatbot rag-status: loi goi API" -ForegroundColor Yellow
    }
} else {
    Write-Host "chatbot-service (:8092) chua chay - chay START.ps1 truoc khi ingest/chat" -ForegroundColor Yellow
}

exit 0
