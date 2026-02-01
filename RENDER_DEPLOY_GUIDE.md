# 🚀 Guia de Deploy Manual no Render

## 🔍 Diagnóstico Atual

**Data**: 2026-02-01  
**Problema**: LIA não responde (chat e voz) devido a rotas 404

### Status Confirmado

✅ **Código Local**: CORRETO (commit `db86df6` com todas as correções)  
❌ **Código em Produção**: DESATUALIZADO (versão antiga sem as correções)

#### Evidências
```json
// Produção (ATUAL - INCORRETO)
{
  "status": "degraded",
  "env": "production",
  "timestamp": "2026-02-01T09:00:25.551Z",
  "checks": [{"name": "supabase", "status": "error"}]
}
// ❌ Falta campo "version"
// ❌ Falta lista de "routes"

// Esperado (CORRETO - após deploy)
{
  "status": "LIA Server Online",
  "version": "4.0.1",
  "env": "production",
  "routes": [
    "POST /api/conversations",
    "POST /api/location",
    "GET /api/health"
  ]
}
```

#### Testes de Rota (Produção Atual)
- ❌ `GET /api/conversations` → **404**
- ❌ `POST /api/location` → **400/404**
- ❌ `POST /api/conversations` → **404**

---

## 📋 PASSO A PASSO: Forçar Deploy no Render

### ETAPA 1: Acessar Dashboard do Render

1. Acesse: https://dashboard.render.com
2. Faça login com suas credenciais
3. Localize o serviço **`luminnus-platform-core`** (backend)

---

### ETAPA 2: Verificar Status do Último Deploy

1. Clique no serviço `luminnus-platform-core`
2. Verifique a seção **"Events"** ou **"Logs"**
3. Procure pelo commit mais recente:
   - ✅ **Se mostrar `db86df6`** → Deploy foi acionado, mas pode ter falhado
   - ❌ **Se NÃO mostrar `db86df6`** → Webhook não funcionou, precisa de deploy manual

#### Possíveis Cenários

**Cenário A**: Deploy em progresso  
→ Aguardar conclusão (pode levar 5-10 minutos)

**Cenário B**: Deploy falhou  
→ Verificar logs de erro (npm/pnpm, TypeScript, dependências)  
→ Prosseguir para ETAPA 3

**Cenário C**: Deploy não foi acionado  
→ Webhook GitHub → Render pode estar quebrado  
→ Prosseguir para ETAPA 3 (deploy manual)

---

### ETAPA 3: Forçar Deploy Manual

1. No dashboard do serviço `luminnus-platform-core`
2. Clique em **"Manual Deploy"** (canto superior direito)
3. Selecione **"Deploy latest commit"**
4. Confirme e aguarde

#### O que observar nos logs

✅ **Logs de sucesso esperados**:
```bash
==> Installing dependencies with pnpm...
==> pnpm install
==> Packages installed successfully

==> Building...
==> pnpm build
==> Build completed

==> Starting server...
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

❌ **Erros comuns**:
- `Module not found` → Problema de dependências (limpar cache, refazer)
- `TypeScript error` → Código não compila (verificar Git)
- `ECONNREFUSED` → Supabase inacessível (verificar variáveis de ambiente)

---

### ETAPA 4: Configurar Variáveis de Ambiente

#### 4.1. Backend (`luminnus-platform-core`)

Verifique se as seguintes variáveis estão configuradas:

```bash
# Obrigatórias
SUPABASE_URL=https://sua-instancia.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR...

# Recomendadas
PORT=3000
ALLOWED_ORIGINS=https://luminnus-dashboard.onrender.com
NODE_ENV=production

# Opcional (para logs detalhados)
DEBUG=true
```

#### 4.2. Frontend (`luminnus-dashboard`)

**CRÍTICO**: Adicione esta variável no serviço **`luminnus-dashboard`**:

```bash
VITE_API_URL=https://luminnus-platform-core.onrender.com
```

**Por quê?** O frontend precisa saber onde está o backend. Sem isso, ele tenta `http://localhost:3000` e falha.

**Passos**:
1. Acesse o dashboard do Render
2. Clique no serviço **`luminnus-dashboard`**
3. Vá em **"Environment"** (menu lateral)
4. Clique em **"Add Environment Variable"**
5. Nome: `VITE_API_URL`
6. Valor: `https://luminnus-platform-core.onrender.com`
7. Clique em **"Save Changes"**
8. **IMPORTANTE**: Clique em **"Manual Deploy"** para rebuild com a nova variável

---

### ETAPA 5: Validação Pós-Deploy

#### 5.1. Health Check (Backend)

Abra o terminal e execute:

```powershell
curl.exe https://luminnus-platform-core.onrender.com/api/health
```

**Resposta esperada**:
```json
{
  "status": "LIA Server Online",
  "version": "4.0.1",
  "env": "production",
  "routes": [
    "POST /api/conversations",
    "POST /api/location",
    "GET /api/health"
  ]
}
```

✅ **Critérios de sucesso**:
- Campo `version` presente e igual a `4.0.1` (ou superior)
- Campo `routes` lista `/api/conversations` e `/api/location`
- Status = `LIA Server Online` (não `degraded`)

---

#### 5.2. Teste de Conversa (API)

```powershell
curl.exe -X POST https://luminnus-platform-core.onrender.com/api/conversations -H "Content-Type: application/json" -d "{\"mode\":\"chat\",\"title\":\"Teste Deploy\",\"userId\":\"test-user-id\",\"tenantId\":\"test-tenant-id\"}"
```

**Resposta esperada**: Status 200/201 com JSON contendo:
```json
{
  "id": "uuid...",
  "title": "Teste Deploy",
  "mode": "chat",
  "created_at": "..."
}
```

❌ **Se retornar 404**: Deploy não foi aplicado corretamente  
❌ **Se retornar 500**: Problema com Supabase (verificar credenciais)

---

#### 5.3. Teste de Localização (API)

```powershell
curl.exe -X POST https://luminnus-platform-core.onrender.com/api/location -H "Content-Type: application/json" -d "{\"latitude\":-23.5,\"longitude\":-46.6,\"address\":\"São Paulo\"}"
```

**Resposta esperada**: Status 200 (sem 404)

---

#### 5.4. Teste End-to-End (Dashboard)

1. Acesse: https://luminnus-dashboard.onrender.com
2. Faça login com suas credenciais
3. Abra o **DevTools** do navegador (F12)
4. Vá na aba **Console**
5. Procure por logs de API:

```javascript
📡 [API Config] {
  url: "https://luminnus-platform-core.onrender.com",
  socketUrl: "https://luminnus-platform-core.onrender.com",
  isDev: false,
  isProd: true,
  isRenderProduction: true
}
```

✅ **Deve mostrar**: `luminnus-platform-core.onrender.com`  
❌ **NÃO deve mostrar**: `localhost:3000`

6. **Teste de Chat**:
   - Digite uma mensagem: "Olá, LIA!"
   - Pressione Enter
   - A LIA deve responder **sem precisar dar refresh na página**

7. **Teste de Voz**:
   - Clique no botão de microfone
   - NÃO deve aparecer erro "Falha ao criar conversa"
   - O microfone deve capturar áudio

---

## 🛠️ Troubleshooting

### Problema 1: Deploy falha com erro de dependência

**Sintomas**:
```
npm ERR! Cannot find module 'express'
```

**Solução**:
1. Verifique se `pnpm-lock.yaml` está commitado no Git
2. No Render, vá em **Settings** > **Build & Deploy**
3. Ative **"Clear build cache and deploy"**
4. Faça novo deploy manual

---

### Problema 2: Rotas 404 mesmo após deploy bem-sucedido

**Sintomas**:
- Health check mostra `version: 4.0.1` ✅
- Mas `/api/conversations` retorna 404 ❌

**Diagnóstico**: Middleware CORS ou ordem de registro de rotas

**Solução**:
1. Verifique logs do servidor no Render
2. Procure por: `✅ Conversation routes (/api/conversations)`
3. Se NÃO aparecer, o problema é no código (verificar `server.ts`)
4. Se aparecer, problema é CORS:
   - Adicione variável `ALLOWED_ORIGINS` no Render:
     ```
     ALLOWED_ORIGINS=https://luminnus-dashboard.onrender.com
     ```
   - Faça rebuild

---

### Problema 3: Frontend aponta para localhost

**Sintomas**:
- Console do navegador mostra: `http://localhost:3000`
- Erro: `net::ERR_CONNECTION_REFUSED`

**Solução**:
1. Verifique se `VITE_API_URL` está configurada no serviço **`luminnus-dashboard`**
2. Se estiver configurada, faça **rebuild do frontend**
3. Se não estiver, adicione conforme ETAPA 4.2

---

### Problema 4: Voz não funciona (erro `btoa is not defined`)

**Sintomas**:
- Chat funciona ✅
- Voz trava com erro no console:
  ```
  Uncaught ReferenceError: btoa is not defined
  ```

**Diagnóstico**: Deploy não incluiu correção do AudioWorklet

**Solução**:
1. Confirme que o arquivo `packages/lia-runtime/src/live/geminiLiveService.ts` foi atualizado com o conversor Base64 manual (linhas 523-537)
2. Verifique se o commit `db86df6` foi deployado
3. Se necessário, force rebuild do backend

---

### Problema 5: Supabase connection failed

**Sintomas**:
- Health check mostra: `"supabase": "error"`

**Solução**:
1. Verifique variáveis no Render:
   - `SUPABASE_URL` → deve começar com `https://`
   - `SUPABASE_SERVICE_KEY` → deve ser um JWT longo
2. Teste conexão manual:
   ```powershell
   curl.exe https://sua-instancia.supabase.co/rest/v1/
   ```
3. Se retornar 200, o problema é na chave (regenerar no Supabase)

---

## ✅ Checklist de Sucesso

Marque cada item conforme validar:

### Backend
- [ ] Health check retorna `version: 4.0.1`
- [ ] Health check lista rotas (`/api/conversations`, `/api/location`)
- [ ] `POST /api/conversations` retorna 200/201 (não 404)
- [ ] `POST /api/location` retorna 200 (não 404)
- [ ] Logs do servidor mostram: `✅ Conversation routes`

### Frontend
- [ ] Variável `VITE_API_URL` configurada no Render
- [ ] Console do navegador mostra URL de produção (não localhost)
- [ ] Chat envia mensagem e recebe resposta **sem refresh**
- [ ] Sem erros 404 no console (Network tab)

### Voz
- [ ] Botão de voz inicia sem erro "Falha ao criar conversa"
- [ ] Microfone captura áudio (ícone muda para "gravando")
- [ ] Sem erro `btoa is not defined` no console

---

## 📊 Resumo Executivo

| Item | Status Atual | Status Esperado | Ação |
|------|--------------|-----------------|------|
| Código no Git | ✅ Correto (db86df6) | ✅ | Nenhuma |
| Deploy Backend | ❌ Desatualizado | ✅ 4.0.1 | Deploy manual (ETAPA 3) |
| Variável `VITE_API_URL` | ❓ Desconhecido | ✅ Configurada | Verificar/Adicionar (ETAPA 4) |
| Health Check | ❌ `degraded` | ✅ `4.0.1` | Aguardar deploy |
| Rotas API | ❌ 404 | ✅ 200/201 | Aguardar deploy |
| Chat | ❌ Não responde | ✅ Responde | Aguardar deploy |
| Voz | ❌ Erro ao iniciar | ✅ Funciona | Aguardar deploy |

---

## 🆘 Suporte

Se após seguir todos os passos o problema persistir:

1. **Capture logs completos**:
   - Backend: Render Dashboard → Serviço → Logs → Copiar últimas 100 linhas
   - Frontend: DevTools → Console → Screenshot

2. **Verifique variáveis de ambiente**:
   - Liste todas as variáveis configuradas no Render
   - Valide se não há caracteres especiais ou espaços extras

3. **Teste local**:
   ```powershell
   cd D:\luminnus-platform-core
   pnpm install
   pnpm --filter lia-live-view dev
   ```
   - Se funcionar localmente mas falhar no Render, o problema é de configuração de ambiente

---

**Última atualização**: 2026-02-01  
**Commit de referência**: `db86df6`  
**Versão esperada**: `4.0.1`
