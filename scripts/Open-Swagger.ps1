#Requires -Version 5.1
<#
.SYNOPSIS
  Mo Swagger UI tung service hoac tat ca (API Gateway).

.EXAMPLE
  .\scripts\Open-Swagger.ps1
  .\scripts\Open-Swagger.ps1 -Service catalog
  .\scripts\Open-Swagger.ps1 -All
#>
param(
    [ValidateSet('gateway', 'auth', 'catalog', 'user', 'cart', 'order', 'review', 'statistics', 'all')]
    [string]$Service = 'gateway'
)

$urls = @{
    gateway    = 'http://localhost:8080/swagger-ui.html'
    auth       = 'http://localhost:8081/swagger-ui/index.html'
    catalog    = 'http://localhost:8082/swagger-ui/index.html'
    user       = 'http://localhost:8083/swagger-ui/index.html'
    cart       = 'http://localhost:8084/swagger-ui/index.html'
    order      = 'http://localhost:8086/swagger-ui/index.html'
    review     = 'http://localhost:8087/swagger-ui/index.html'
    statistics = 'http://localhost:8088/swagger-ui/index.html'
}

function Open-Url([string]$Url) {
    Write-Host "  -> $Url" -ForegroundColor Cyan
    Start-Process $Url
}

Write-Host 'Swagger UI - Electro Store' -ForegroundColor Magenta
if ($Service -eq 'all') {
    foreach ($u in $urls.Values) { Open-Url $u; Start-Sleep -Milliseconds 400 }
} else {
    Open-Url $urls[$Service]
}
