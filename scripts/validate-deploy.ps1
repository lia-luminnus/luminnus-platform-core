# Script de Validação de Deploy - LIA Platform
# Versão: 1.0
# Data: 2026-02-01

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  LIA Platform - Validação de Deploy" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://luminnus-platform-core.onrender.com"
$EXPECTED_VERSION = "4.0.1"
$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null,
        [string]$ExpectedStatus = "200",
        [string]$ExpectedContent = $null
    )
    
    Write-Host "🔍 Testando: $Name" -ForegroundColor Yellow
    Write-Host "   URL: $Url"
    Write-Host "   Método: $Method"
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -UseBasicParsing -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $Body -UseBasicParsing -ErrorAction Stop
        }
        
        $statusCode = $response.StatusCode
        $content = $response.Content
        
        # Verificar status code
        if ($statusCode -like "*$ExpectedStatus*") {
            Write-Host "   ✅ Status: $statusCode (OK)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Status: $statusCode (Esperado: $ExpectedStatus)" -ForegroundColor Red
            $script:testsFailed++
            return $false
        }
        
        # Verificar conteúdo se especificado
        if ($ExpectedContent) {
            if ($content -like "*$ExpectedContent*") {
                Write-Host "   ✅ Conteúdo contém: $ExpectedContent" -ForegroundColor Green
            } else {
                Write-Host "   ❌ Conteúdo NÃO contém: $ExpectedContent" -ForegroundColor Red
                Write-Host "   Resposta: $content" -ForegroundColor Gray
                $script:testsFailed++
                return $false
            }
        }
        
        $script:testsPassed++
        Write-Host ""
        return $true
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        Write-Host "   ❌ Erro: Status $statusCode" -ForegroundColor Red
        Write-Host "   Detalhes: $($_.Exception.Message)" -ForegroundColor Gray
        $script:testsFailed++
        Write-Host ""
        return $false
    }
}

# ====================
# TESTE 1: Health Check
# ====================
Write-Host "📋 TESTE 1: Health Check" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────" -ForegroundColor Gray

$healthResult = Test-Endpoint `
    -Name "Health Check" `
    -Url "$BACKEND_URL/api/health" `
    -Method "GET" `
    -ExpectedStatus "200" `
    -ExpectedContent "version"

if ($healthResult) {
    try {
        $healthResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/health" -Method GET -UseBasicParsing
        
        Write-Host "📊 Detalhes do Health Check:" -ForegroundColor Cyan
        Write-Host "   Status: $($healthResponse.status)"
        Write-Host "   Version: $($healthResponse.version)"
        Write-Host "   Environment: $($healthResponse.env)"
        
        if ($healthResponse.version -eq $EXPECTED_VERSION) {
            Write-Host "   ✅ Versão correta: $EXPECTED_VERSION" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Versão incorreta: $($healthResponse.version) (Esperado: $EXPECTED_VERSION)" -ForegroundColor Yellow
        }
        
        if ($healthResponse.routes) {
            Write-Host "   Rotas disponíveis:"
            foreach ($route in $healthResponse.routes) {
                Write-Host "      - $route" -ForegroundColor Gray
            }
        }
        Write-Host ""
    } catch {
        Write-Host "   ⚠️ Não foi possível parsear resposta JSON" -ForegroundColor Yellow
    }
}

# ====================
# TESTE 2: Rotas de Conversa
# ====================
Write-Host "📋 TESTE 2: Rotas de Conversa" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────" -ForegroundColor Gray

# 2.1: GET /api/conversations
Test-Endpoint `
    -Name "GET /api/conversations (sem userId)" `
    -Url "$BACKEND_URL/api/conversations" `
    -Method "GET" `
    -ExpectedStatus "400"

Test-Endpoint `
    -Name "GET /api/conversations (com userId)" `
    -Url "$BACKEND_URL/api/conversations?userId=test-user-id" `
    -Method "GET" `
    -ExpectedStatus "200"

# 2.2: POST /api/conversations
$conversationBody = @{
    mode = "chat"
    title = "Teste de Deploy"
    userId = "test-user-id"
    tenantId = "test-tenant-id"
} | ConvertTo-Json

Test-Endpoint `
    -Name "POST /api/conversations" `
    -Url "$BACKEND_URL/api/conversations" `
    -Method "POST" `
    -Body $conversationBody `
    -ExpectedStatus "200" `
    -ExpectedContent "id"

# ====================
# TESTE 3: Rota de Localização
# ====================
Write-Host "📋 TESTE 3: Rota de Localização" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────" -ForegroundColor Gray

$locationBody = @{
    latitude = -23.5505
    longitude = -46.6333
    address = "São Paulo, SP"
} | ConvertTo-Json

Test-Endpoint `
    -Name "POST /api/location" `
    -Url "$BACKEND_URL/api/location" `
    -Method "POST" `
    -Body $locationBody `
    -ExpectedStatus "200"

# ====================
# TESTE 4: Verificação de CORS
# ====================
Write-Host "📋 TESTE 4: Verificação de CORS" -ForegroundColor Magenta
Write-Host "─────────────────────────────────────" -ForegroundColor Gray

try {
    $corsResponse = Invoke-WebRequest `
        -Uri "$BACKEND_URL/api/health" `
        -Method OPTIONS `
        -UseBasicParsing `
        -ErrorAction SilentlyContinue
    
    $corsHeaders = $corsResponse.Headers
    
    if ($corsHeaders.'Access-Control-Allow-Origin') {
        Write-Host "   ✅ CORS configurado: $($corsHeaders.'Access-Control-Allow-Origin')" -ForegroundColor Green
        $script:testsPassed++
    } else {
        Write-Host "   ⚠️ CORS pode não estar configurado" -ForegroundColor Yellow
        $script:testsFailed++
    }
} catch {
    Write-Host "   ⚠️ Não foi possível verificar CORS" -ForegroundColor Yellow
    $script:testsFailed++
}
Write-Host ""

# ====================
# RESUMO DOS TESTES
# ====================
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "           RESUMO DOS TESTES          " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   ✅ Testes Aprovados: $testsPassed" -ForegroundColor Green
Write-Host "   ❌ Testes Falharam: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "🎉 TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ O deploy está correto e o backend está funcionando." -ForegroundColor Green
    Write-Host "✅ Você pode acessar o dashboard e testar a LIA." -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️ ALGUNS TESTES FALHARAM" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📖 Consulte o guia de troubleshooting:" -ForegroundColor Cyan
    Write-Host "   D:\luminnus-platform-core\RENDER_DEPLOY_GUIDE.md" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔧 Ações sugeridas:" -ForegroundColor Cyan
    Write-Host "   1. Verificar se o deploy foi concluído no Render" -ForegroundColor Gray
    Write-Host "   2. Forçar rebuild manual do backend" -ForegroundColor Gray
    Write-Host "   3. Verificar variáveis de ambiente (SUPABASE_URL, etc.)" -ForegroundColor Gray
    exit 1
}
