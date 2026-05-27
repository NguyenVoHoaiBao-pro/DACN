param(
    [string]$Username = "admin",
    [string]$Password = "admin123",
    [string]$GatewayBaseUrl = "http://localhost:8080",
    [string]$ChatbotBaseUrl = "http://localhost:8092",
    [int]$TimeoutSec = 900
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\_common.ps1"

$root = Get-ProjectRoot
$envLoaded = Import-DotEnv -Path (Join-Path $root ".env")
if ($envLoaded) {
    Write-Host "Da nap bien moi truong tu .env" -ForegroundColor DarkGray
}

function Invoke-JsonApi {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers,
        [object]$Body = $null,
        [int]$Timeout = 60
    )

    $params = @{
        Method      = $Method
        Uri         = $Uri
        TimeoutSec  = $Timeout
        ErrorAction = "Stop"
    }

    if ($Headers) {
        $params.Headers = $Headers
    }

    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    return Invoke-RestMethod @params
}

Write-Host "=== Reingest Chatbot (Pinecone) ===" -ForegroundColor Cyan
Write-Host "Gateway : $GatewayBaseUrl" -ForegroundColor DarkGray
Write-Host "Chatbot : $ChatbotBaseUrl" -ForegroundColor DarkGray
Write-Host "Vector  : Pinecone (cloud) - khong can Docker Chroma :8000" -ForegroundColor DarkGray

if (-not $env:PINECONE_API_KEY) {
    Write-Host "Canh bao: PINECONE_API_KEY chua co trong .env" -ForegroundColor Yellow
}
if (-not $env:PINECONE_INDEX_NAME) {
    Write-Host "Dung index mac dinh: electro-store-products (tao tren Pinecone, dim=4096, cosine)" -ForegroundColor DarkYellow
}

Wait-ForPort -Port 8080 -Label "api-gateway :8080" -TimeoutSec 60 | Out-Null
Wait-ForPort -Port 8092 -Label "chatbot-service :8092" -TimeoutSec 60 | Out-Null

Write-Host "[1/4] Dang dang nhap admin qua gateway..." -ForegroundColor Yellow
$loginResp = Invoke-JsonApi -Method "POST" -Uri "$GatewayBaseUrl/api/auth/login" -Body @{
    username = $Username
    password = $Password
}

$token = $loginResp.data.accessToken
if (-not $token) {
    throw "Khong lay duoc accessToken. Kiem tra tai khoan admin."
}
Write-Host "  OK da lay JWT." -ForegroundColor Green

Write-Host "[2/4] Trigger ingest sang Pinecone (nen)..." -ForegroundColor Yellow
Write-Host "  Luu y: Neu doi embedding/index, xoa vector cu tren Pinecone console truoc khi ingest." -ForegroundColor DarkGray
$headers = @{ Authorization = "Bearer $token" }
$ingestResp = Invoke-JsonApi -Method "POST" -Uri "$ChatbotBaseUrl/api/chatbot/ingest" -Headers $headers -Timeout 60
$ingestMessage = "Da gui lenh ingest."
if ($ingestResp -and $ingestResp.message) {
    $ingestMessage = $ingestResp.message
}
Write-Host ("  " + $ingestMessage) -ForegroundColor Green

Write-Host "[3/4] Theo doi trang thai RAG..." -ForegroundColor Yellow
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$ready = $false

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5

    try {
        $statusResp = Invoke-JsonApi -Method "GET" -Uri "$ChatbotBaseUrl/api/chatbot/rag-status" -Timeout 30
    } catch {
        $detail = $_.Exception.Message
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            try {
                $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                $body = $reader.ReadToEnd()
                $reader.Close()
                if ($body) { $detail = "HTTP $code - $body" }
                else { $detail = "HTTP $code - $detail" }
            } catch {
                $detail = "HTTP $code - $detail"
            }
        }
        Write-Host "  Canh bao: rag-status loi - $detail" -ForegroundColor Yellow
        Write-Host "  (Thu lai sau 5s. Neu lap lai: restart chatbot-service sau khi mvn compile.)" -ForegroundColor DarkGray
        continue
    }
    $indexEmpty = [bool]$statusResp.data.indexEmpty
    $ingestRunning = [bool]$statusResp.data.ingestRunning
    $hint = $statusResp.data.hint

    Write-Host ("  RAG: indexEmpty={0}, ingestRunning={1}" -f $indexEmpty, $ingestRunning) -ForegroundColor Cyan

    if (-not $indexEmpty -and -not $ingestRunning) {
        $ready = $true
        break
    }

    if ($hint) {
        Write-Host ("  Hint: " + $hint) -ForegroundColor DarkGray
    }
}

if (-not $ready) {
    throw "Timeout sau ${TimeoutSec}s: RAG index chua san sang. Xem .run\chatbot-service.log (Pinecone API key / index dim 4096)."
}

Write-Host "[4/4] Hoan tat." -ForegroundColor Yellow
Write-Host "Chatbot da ingest xong len Pinecone." -ForegroundColor Green
Write-Host "Test: hoi cau shop co dong ho thong minh nao" -ForegroundColor Green
