#Requires -Version 5.1
<#
.SYNOPSIS
  Đánh dấu sản phẩm Nổi Bật (is_featured = 1) trong electro_catalog_db.

.DESCRIPTION
  Mặc định dùng Admin API qua Gateway (không cần mysql client).
  Có thể dùng -UseSql nếu đã cài MySQL CLI và kết nối trực tiếp DB.

.EXAMPLE
  .\scripts\Set-FeaturedProducts.ps1
  .\scripts\Set-FeaturedProducts.ps1 -Username admin -Password admin123
  .\scripts\Set-FeaturedProducts.ps1 -VerifyOnly
  .\scripts\Set-FeaturedProducts.ps1 -UseSql -MySqlHost 127.0.0.1 -Port 3306
#>
param(
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$Username = "admin",
    [string]$Password = "admin123",
    [switch]$UseSql,
    [string]$MySqlHost = "127.0.0.1",
    [int]$Port = 3306,
    [string]$DbUser = "root",
    [string]$DbPassword = "",
    [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"
$SqlFile = Join-Path $PSScriptRoot "set-featured-products.sql"

# id, ten hien thi, bat lai is_active (iPhone 16 dang bi an)
$FeaturedProducts = @(
    @{ Id = 106; Name = "MacBook Air 15 inch M2 2023"; Activate = $false }
    @{ Id = 108; Name = "MacBook Pro 14 inch M3 Pro 2023"; Activate = $false }
    @{ Id = 121; Name = "iPad Air M3 11 inch 128GB WiFi"; Activate = $false }
    @{ Id = 133; Name = "iPad Mini 7 A17 128GB WiFi"; Activate = $false }
    @{ Id = 583; Name = "iPhone 16 Pro Max"; Activate = $true }
    @{ Id = 587; Name = "Dong ho Thong minh (Apple Watch Series 9)"; Activate = $false }
    @{ Id = 87;  Name = "Samsung Galaxy Buds 2 Pro"; Activate = $false }
    @{ Id = 259; Name = "Sony Bravia 7 Mini LED 4K 55 inch"; Activate = $false }
    @{ Id = 149; Name = "Samsung Galaxy Tab S9 Fe WiFi 128GB"; Activate = $false }
    @{ Id = 113; Name = "Dell XPS"; Activate = $false }
    @{ Id = 574; Name = "Robot hut bui Roborock S7 MaxV Ultra"; Activate = $false }
    @{ Id = 65;  Name = "Bo loa Sony 5.1 HT-S700RF 1000W"; Activate = $false }
)

function Get-FeaturedCountFromApi {
    param([string]$BaseUrl)
    $uri = '{0}/api/products/featured?page=0{1}size=1' -f $BaseUrl, '&'
    $r = Invoke-RestMethod -Uri $uri -Method Get
    return [int]$r.data.totalElements
}

function Set-FeaturedViaApi {
    param(
        [string]$BaseUrl,
        [string]$User,
        [string]$Pass,
        [array]$Products
    )

    Write-Host "Dang dang nhap Admin ($User)..." -ForegroundColor Cyan
    $loginBody = @{ username = $User; password = $Pass } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginBody

    $token = $login.data.accessToken
    if (-not $token) { $token = $login.data.token }
    if (-not $token) { throw "Khong lay duoc JWT tu /api/auth/login" }

    $headers = @{
        Authorization = "Bearer $token"
        "Content-Type"  = "application/json"
    }

    $ok = 0
    foreach ($p in $Products) {
        $body = @{ isFeatured = $true }
        if ($p.Activate) { $body.status = "ACTIVE" }

        try {
            $null = Invoke-RestMethod -Uri "$BaseUrl/api/admin/products/$($p.Id)" -Method Put `
                -Headers $headers -Body ($body | ConvertTo-Json)
            Write-Host "  OK  #$($p.Id) - $($p.Name)" -ForegroundColor Green
            $ok++
        }
        catch {
            Write-Host "  FAIL #$($p.Id) - $($p.Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    return $ok
}

function Set-FeaturedViaSql {
    param([string]$SqlPath)

    $mysql = Get-Command mysql -ErrorAction SilentlyContinue
    if (-not $mysql) {
        throw "Khong co lenh mysql trong PATH. Bo -UseSql hoac cai MySQL client."
    }

    if ($DbPassword) {
        Get-Content $SqlPath -Raw | & mysql -h $MySqlHost -P $Port -u $DbUser -p$DbPassword
    } else {
        Get-Content $SqlPath -Raw | & mysql -h $MySqlHost -P $Port -u $DbUser
    }

    if ($LASTEXITCODE -ne 0) { throw "SQL that bai (exit $LASTEXITCODE)" }
}

Write-Host "=== Electro Store - Gan san pham Noi Bat ===" -ForegroundColor Cyan
Write-Host "Gateway: $GatewayUrl" -ForegroundColor Gray

if ($VerifyOnly) {
    try {
        $count = Get-FeaturedCountFromApi -BaseUrl $GatewayUrl
        Write-Host "`nSan pham Noi Bat dang hien (API): $count" -ForegroundColor Yellow
        if ($count -gt 0) {
            $listUri = '{0}/api/products/featured?page=0{1}size=20' -f $GatewayUrl, '&'
            $list = Invoke-RestMethod -Uri $listUri -Method Get
            $list.data.content | ForEach-Object {
                Write-Host "  #$($_.id) - $($_.name)" -ForegroundColor White
            }
        }
    } catch {
        Write-Host "Khong goi duoc API: $_" -ForegroundColor Red
    }
    exit 0
}

Write-Host "`nSe gan Noi Bat cho $($FeaturedProducts.Count) san pham:" -ForegroundColor Yellow
$FeaturedProducts | ForEach-Object {
    $extra = if ($_.Activate) { " (+ bat lai is_active)" } else { "" }
    Write-Host "  -> #$($_.Id) $($_.Name)$extra" -ForegroundColor White
}

if ($UseSql) {
    Write-Host "`nChe do: SQL truc tiep ($MySqlHost`:$Port)" -ForegroundColor Cyan
    Set-FeaturedViaSql -SqlPath $SqlFile
} else {
    Write-Host "`nChe do: Admin API" -ForegroundColor Cyan
    $updated = Set-FeaturedViaApi -BaseUrl $GatewayUrl -User $Username -Pass $Password -Products $FeaturedProducts
    Write-Host "`nCap nhat thanh cong: $updated/$($FeaturedProducts.Count)" -ForegroundColor $(if ($updated -eq $FeaturedProducts.Count) { "Green" } else { "Yellow" })
}

try {
    $count = Get-FeaturedCountFromApi -BaseUrl $GatewayUrl
    Write-Host "`nKiem tra API featured: totalElements = $count" -ForegroundColor Green
} catch {
    Write-Host "`nKhong kiem tra duoc API (Gateway/catalog chua san sang?)" -ForegroundColor Yellow
}

Write-Host "F5 Frontend -> tab 'Noi Bat' tren Trang chu." -ForegroundColor Gray
