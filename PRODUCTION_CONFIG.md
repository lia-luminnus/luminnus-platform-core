# Configuração de Produção - LIA Platform

## 🚨 Problema Resolvido: Erro 404 nas Rotas de API

### O Que Foi Corrigido

#### 1. Backend Unificado (`apps/lia-viva/lia-live-view/server/server.ts`)
- ✅ Removido health check duplicado
- ✅ Adicionado logger para todas as requisições `/api` 
- ✅ Melhorado o health check para incluir versão, env e lista de rotas
- ✅ Adicionados logs detalhados mostrando quais rotas foram registradas

#### 2. Configuração Centralizada de API (`Dashboard-client/config/api.ts`)
- ✅ Criado SSOT (Single Source of Truth) para URLs de API
- ✅ Detecção automática de ambiente (localhost, Render production)
- ✅ Fallback inteligente com prioridade: ENV > Auto-detect > Localhost

#### 3. Frontend (`Dashboard-client`)
- ✅ Atualizado `LIAContext.tsx` para usar configuração centralizada
- ✅ Atualizado `backendService.ts` para usar configuração centralizada
- ✅ Atualizado `socketService.ts` para usar configuração centralizada

### Como Configurar para Produção

#### Opção 1: Variável de Ambiente (Recomendado)
No painel do Render, adicione:
```bash
VITE_API_URL=https://luminnus-platform-core.onrender.com
```

#### Opção 2: Detecção Automática
Se você não definir `VITE_API_URL`, o sistema detecta automaticamente:
- Em produção (Render): `https://luminnus-platform-core.onrender.com`
- Em desenvolvimento: `http://localhost:3000`

### Validação

#### 1. Teste de Health Check
```bash
curl https://luminnus-platform-core.onrender.com/api/health
```

Resposta esperada:
```json
{
  "status": "LIA Server Online",
  "version": "4.0.1",
  "port": 3000,
  "env": "production",
  "timestamp": "2026-01-31T...",
  "routes": [
    "POST /api/conversations",
    "POST /api/location",
    "POST /api/chat",
    "POST /api/vision/analyze",
    "POST /api/multimodal/analyze",
    "GET /api/health"
  ]
}
```

#### 2. Teste de Criação de Conversa
```bash
curl -X POST https://luminnus-platform-core.onrender.com/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"mode":"chat","title":"Teste","userId":"test-user-id"}'
```

#### 3. Teste de Localização
```bash
curl -X POST https://luminnus-platform-core.onrender.com/api/location \
  -H "Content-Type: application/json" \
  -d '{"latitude":-23.5,"longitude":-46.6,"address":"São Paulo"}'
```

### Logs Importantes

No console do navegador, você deve ver:
```
📡 [API Config] {
  url: "https://luminnus-platform-core.onrender.com",
  socketUrl: "https://luminnus-platform-core.onrender.com",
  isDev: false,
  isProd: true,
  isRenderProduction: true,
  isLocalhost: false
}
```

No servidor (Render logs), você deve ver:
```
🚀 [Server] Iniciando setup de rotas...
   ✅ Session routes (includes /api/location)
   ✅ Chat routes
   ✅ Memory routes
   ✅ Vision routes (/api/vision/analyze)
   ✅ Multimodal routes (/api/multimodal/analyze)
   ✅ Conversation routes (/api/conversations)
✅ [Server] Todas as rotas de API registradas com sucesso
🚀 LIA Unified Server ready on http://0.0.0.0:3000 [production]
```

E para cada requisição de API:
```
📥 [API] POST /api/conversations | Origin: https://luminnus-dashboard.onrender.com
```

### Troubleshooting

#### Problema: Ainda recebo 404
1. Verifique se o serviço está rodando:
   ```bash
   curl https://luminnus-platform-core.onrender.com/api/health
   ```

2. Verifique os logs do Render para confirmar que as rotas foram registradas

3. Verifique no console do navegador se a URL está correta:
   - Deve mostrar `https://luminnus-platform-core.onrender.com`
   - NÃO deve mostrar `http://localhost:3000`

#### Problema: CORS Error
1. Verifique se `ALLOWED_ORIGINS` está configurado no Render:
   ```bash
   ALLOWED_ORIGINS=https://luminnus-dashboard.onrender.com
   ```

2. Os logs do servidor devem mostrar:
   ```
   📥 [API] POST /api/conversations | Origin: https://luminnus-dashboard.onrender.com
   ```

### Estrutura de Arquivos Alterados
```
apps/lia-viva/lia-live-view/server/
  └── server.ts                        # Backend unificado corrigido

Dashboard-client/
  ├── config/
  │   └── api.ts                       # 🆕 Configuração centralizada
  └── components/
      └── lia/
          ├── LIAContext.tsx           # Atualizado para usar getApiUrl()
          └── services/
              ├── backendService.ts    # Atualizado para usar getApiUrl()
              └── socketService.ts     # Atualizado para usar getSocketUrl()
```
