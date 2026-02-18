# 🏗️ Plano de Integração WhatsApp Multi-Tenant via Twilio Subaccounts

> **Data:** 2026-02-11  
> **Arquitecto:** LIA / Antigravity  
> **Status:** 📋 PLANEADO — Pendente aprovação

---

## 📊 Análise do Estado Atual (O que já existe)

### Stack Atual — Meta Cloud API (BYO)
O sistema WhatsApp atual usa a **Meta Cloud API diretamente**, com modelo BYO (Bring Your Own):

| Componente | Localização | Descrição |
|-----------|-------------|-----------|
| `whatsapp_connections` | `supabase/migrations/20240113_whatsapp_schema.sql` | Tabela principal com `config_json` (JSONB) contendo `phone_number_id`, `waba_id`, `access_token`, `verify_token` |
| `WhatsAppService` | `apps/lia-viva/.../services/whatsappService.ts` | Serviço que fala com `graph.facebook.com` diretamente |
| `WhatsAppRepository` | `apps/lia-viva/.../repositories/WhatsAppRepository.ts` | Repo para Supabase (CRUD de connections, conversations, leads, etc.) |
| `WhatsAppController` | `apps/lia-viva/.../controllers/WhatsAppController.ts` | 597 linhas — settings, connections, playbooks, conversations, leads, kanban, audio, briefings |
| `whatsapp-webhook.ts` (lia-viva) | `apps/lia-viva/.../routes/whatsapp-webhook.ts` | Webhook que identifica tenant por `phone_number_id` da Meta |
| `whatsapp.ts` (routes) | `apps/lia-viva/.../routes/whatsapp.ts` | Setup de rotas: settings, config, connections, playbooks, conversations, summaries, kanban, leads, audio, briefings, KPIs |
| `whatsapp-admin.ts` (lia-viva) | `apps/lia-viva/.../routes/whatsapp-admin.ts` | Admin: platform-config, overview, tenants |
| `whatsappEmbedded.ts` (packages/api) | `packages/api/src/routes/whatsappEmbedded.ts` | OAuth Embedded Signup flow com Meta |
| `whatsappWebhook.ts` (packages/api) | `packages/api/src/routes/whatsappWebhook.ts` | Webhook duplicado no packages/api |
| `whatsappIntegrations.ts` (packages/api) | `packages/api/src/routes/whatsappIntegrations.ts` | Rotas de integração: status, save-manual, test-webhook, reconnect, disconnect, quick-start, save-quick |
| `whatsappAdmin.ts` (packages/api) | `packages/api/src/routes/whatsappAdmin.ts` | Admin duplicado no packages/api |
| `WhatsAppConfig.tsx` | `Dashboard-client/components/whatsapp/WhatsAppConfig.tsx` | Config do agente (tenant side) — playbooks, settings |
| `WhatsAppIntegration.tsx` | `Dashboard-client/components/integrations/WhatsAppIntegration.tsx` | Hub de integração — Embedded Signup, config manual, status, test webhook |
| `AdminWhatsAppGovernance.tsx` | `apps/web/src/components/admin/AdminWhatsAppGovernance.tsx` | Painel admin — platform config, overview, tenants list |

### Credenciais Twilio Master (do [REDACTED])
```
Account SID: [REDACTED]
Auth Token: [REDACTED]
API Key SID: [REDACTED]
API Secret: [REDACTED]
```

---

## ⚠️ Análise de Riscos e Dependências

### 🔴 ALTO RISCO — Não danificar
| Arquivo | Risco | Razão |
|---------|-------|-------|
| `WhatsAppController.ts` | 🔴 ALTO | 597 linhas — orquestra tudo (conversations, leads, kanban, audio, briefings) |
| `whatsapp-webhook.ts` (lia-viva) | 🔴 ALTO | Processa mensagens em produção, identifica tenant por `phone_number_id` |
| `WhatsAppRepository.ts` | 🔴 ALTO | 344 linhas — todas as queries do ecossistema WhatsApp dependem deste |
| `whatsappService.ts` | 🟡 MÉDIO | Será refatorado (Meta → Twilio), mas precisa manter compat durante transição |
| `whatsapp_connections` (tabela) | 🔴 ALTO | Tabela base — alterar schema pode quebrar queries existentes |

### 🟢 SEGUROS para adicionar
| Item | Razão |
|------|-------|
| Nova tabela `twilio_subaccounts` | Isolada, não toca tabelas existentes |
| Novo serviço `TwilioOnboardingService` | Novo arquivo, sem conflitos |
| Novas rotas `/api/twilio/*` | Namespace separado |
| Novos env vars `TWILIO_*` | Aditivos |

---

## 🗺️ Plano Estruturado em Fases

### FASE 1: Database — Migração SQL (ADITIVA)
> **Princípio:** Só adicionar colunas e tabelas. NUNCA remover ou renomear.

**Arquivo:** `supabase/migrations/20260211_twilio_subaccounts.sql`

**Nova tabela `twilio_subaccounts`:**
```sql
CREATE TABLE IF NOT EXISTS twilio_subaccounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,  -- 1 subconta por tenant
    
    -- Credenciais Twilio da Subconta
    twilio_account_sid TEXT NOT NULL,
    twilio_auth_token TEXT NOT NULL,  -- encriptado em produção
    
    -- Número atribuído
    twilio_phone_number TEXT,         -- +351912345678
    twilio_phone_sid TEXT,            -- PN... SID do número na Twilio
    
    -- Onboarding
    onboarding_status TEXT NOT NULL DEFAULT 'pending',
    -- pending | provisioning | number_acquired | webhook_configured | active | failed | suspended
    onboarding_flow TEXT NOT NULL DEFAULT 'new_number',
    -- new_number | byon (Bring Your Own Number / Embedded Signup)
    onboarding_error TEXT,
    
    -- Billing
    billing_mode TEXT DEFAULT 'start_plan',
    -- start_plan | plus_plan | enterprise
    
    -- Webhook
    webhook_url TEXT,
    webhook_configured_at TIMESTAMPTZ,
    
    -- Meta associação (para BYON que vem do Embedded Signup)
    meta_waba_id TEXT,
    meta_phone_number_id TEXT,
    meta_business_id TEXT,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ
);
```

**Colunas adicionais em `whatsapp_connections`:**
```sql
-- Manter retrocompatibilidade, apenas adicionar coluna de referência
ALTER TABLE whatsapp_connections 
    ADD COLUMN IF NOT EXISTS twilio_subaccount_id UUID REFERENCES twilio_subaccounts(id),
    ADD COLUMN IF NOT EXISTS provider_type TEXT DEFAULT 'meta';
    -- provider_type: 'meta' (atual) | 'twilio' (novo)
```

**Índices e RLS:**
```sql
CREATE INDEX idx_twilio_sub_tenant ON twilio_subaccounts(tenant_id);
CREATE INDEX idx_twilio_sub_sid ON twilio_subaccounts(twilio_account_sid);
CREATE INDEX idx_twilio_sub_phone ON twilio_subaccounts(twilio_phone_number);
CREATE INDEX idx_twilio_sub_status ON twilio_subaccounts(onboarding_status);
```

**Impacto:** ✅ ZERO — Tabela nova + colunas opcionais em tabela existente

---

### FASE 2: Backend — TwilioOnboardingService
> **Princípio:** Novo arquivo isolado. Nenhum arquivo existente é alterado.

**Arquivo:** `apps/lia-viva/lia-live-view/server/services/twilioOnboardingService.ts`

**Responsabilidades:**
1. **Criar Subconta Twilio** via API REST
2. **Fluxo A — Número Novo:** Buscar + comprar número + configurar webhook
3. **Fluxo B — BYON:** Gerar config para Embedded Signup, receber callback
4. **Rollback:** Se falhar, reverter subconta
5. **Health Check:** Validar credenciais master
6. **Saldo Global:** Consultar balance da conta master

**Dependência:** Pacote `twilio` (npm) — PRECISA SER INSTALADO

```
npm install twilio
npm install -D @types/twilio
```

**Estrutura da classe:**
```typescript
class TwilioOnboardingService {
  // Master Account
  static async healthCheck(): Promise<MasterHealthResult>
  static async getMasterBalance(): Promise<{ currency: string, balance: string }>
  
  // Subaccount Management
  static async createSubaccount(tenantId: string, friendlyName: string): Promise<SubaccountResult>
  static async suspendSubaccount(tenantId: string): Promise<void>
  static async reactivateSubaccount(tenantId: string): Promise<void>
  
  // Flow A: New Number
  static async searchAvailableNumbers(countryCode: string, options?: SearchOptions): Promise<AvailableNumber[]>
  static async purchaseNumber(tenantId: string, phoneNumber: string): Promise<PurchaseResult>
  static async configureWebhook(tenantId: string): Promise<void>
  static async provisionNewNumber(tenantId: string, countryCode: string): Promise<ProvisionResult>
  
  // Flow B: BYON / Embedded Signup
  static async initByonFlow(tenantId: string): Promise<ByonInitResult>
  static async handleByonCallback(tenantId: string, twilioPayload: any): Promise<void>
  
  // Monitoring
  static async getTopConsumers(hours?: number): Promise<ConsumerReport[]>
  static async getSubaccountUsage(tenantId: string): Promise<UsageData>
  
  // Rollback
  private static async rollbackSubaccount(sid: string, reason: string): Promise<void>
}
```

**Impacto:** ✅ ZERO — Arquivo novo

---

### FASE 3: Backend — TwilioMessageService (Envio de Mensagens)
> **Princípio:** Novo serviço que coexiste com `whatsappService.ts`

**Arquivo:** `apps/lia-viva/lia-live-view/server/services/twilioMessageService.ts`

**Responsabilidades:**
1. Instanciar `Client` da Twilio usando credenciais da **subconta** (NUNCA da master)
2. Enviar mensagens via API da Twilio (garantir custo na subconta correta)
3. Validar assinatura de webhook Twilio

**Estrutura:**
```typescript
class TwilioMessageService {
  // Buscar credenciais da subconta no banco
  static async getSubaccountClient(tenantId: string): Promise<Twilio>
  
  // Enviar mensagem usando subconta
  static async sendMessage(tenantId: string, to: string, body: string): Promise<MessageResult>
  static async sendTemplateMessage(tenantId: string, to: string, templateSid: string, vars: any): Promise<MessageResult>
  
  // Validação de webhook
  static validateWebhookSignature(url: string, params: any, signature: string, authToken: string): boolean
}
```

**Impacto:** ✅ ZERO — Arquivo novo

---

### FASE 4: Backend — Rotas Twilio (Novas)
> **Princípio:** Namespace `/api/twilio/*` — separado das rotas WhatsApp existentes

**Arquivo:** `apps/lia-viva/lia-live-view/server/routes/twilio-onboarding.ts`

**Rotas novas:**
```
POST /api/twilio/onboard/new-number     — Fluxo A: Provisionar número novo
POST /api/twilio/onboard/byon/start     — Fluxo B: Iniciar Embedded Signup
POST /api/twilio/onboard/byon/callback  — Fluxo B: Callback do signup
GET  /api/twilio/numbers/search         — Buscar números disponíveis
GET  /api/twilio/subaccount/status      — Status do onboarding do tenant
POST /api/twilio/subaccount/suspend     — Suspender subconta
POST /api/twilio/subaccount/reactivate  — Reativar subconta
```

**Arquivo:** `apps/lia-viva/lia-live-view/server/routes/twilio-admin.ts`

**Rotas admin:**
```
GET  /api/admin/twilio/health           — Health check da master
GET  /api/admin/twilio/balance          — Saldo da conta master
GET  /api/admin/twilio/top-consumers    — Top consumidores 24h
GET  /api/admin/twilio/subaccounts      — Lista todas subcontas
```

**Impacto:** ✅ ZERO — Arquivos novos, precisam ser registrados em `server.ts`

---

### FASE 5: Webhook Centralizado — Roteador Inteligente
> **Princípio:** Nova rota `/api/twilio/webhook` — NÃO altera o webhook Meta existente

**Arquivo:** `apps/lia-viva/lia-live-view/server/routes/twilio-webhook.ts`

**Lógica:**
```
POST /api/twilio/webhook
  1. Recebe POST da Twilio
  2. Valida assinatura (X-Twilio-Signature)
  3. Extrai AccountSid do payload (identifica subconta/tenant)
  4. Busca tenant_id via twilio_subaccounts.twilio_account_sid
  5. Instancia contexto do agente LIA para esse tenant
  6. Processa mensagem
  7. Responde usando TwilioMessageService (credenciais da subconta)
```

**CRÍTICO — Identificação por `AccountSid`:**
```typescript
// DO payload da Twilio:
const accountSid = req.body.AccountSid; // SID da subconta!

// Buscar tenant:
const { data } = await supabase
  .from('twilio_subaccounts')
  .select('tenant_id')
  .eq('twilio_account_sid', accountSid)
  .single();
```

**Impacto:** ✅ ZERO — Arquivo novo. O webhook Meta (`/api/whatsapp/webhook`) continua funcionando.

---

### FASE 6: Modificações MÍNIMAS em Arquivos Existentes

#### 6.1 — `server.ts` (APENAS adicionar imports e registros)
```diff
+ import { setupTwilioOnboardingRoutes } from './routes/twilio-onboarding.js';
+ import { setupTwilioWebhookRoutes } from './routes/twilio-webhook.js';
+ import twilioAdminRoutes from './routes/twilio-admin.js';

  // Na seção de setupRoutes:
+ setupTwilioOnboardingRoutes(app);
+ setupTwilioWebhookRoutes(app);
+ app.use('/api/admin/twilio', twilioAdminRoutes);
```

**Linhas alteradas:** ~6 linhas aditivas  
**Risco:** 🟢 MÍNIMO

#### 6.2 — `.env` / `.env.example` (APENAS adicionar variáveis)
```env
# ===========================================================
# TWILIO (Conta Master)
# ===========================================================
TWILIO_ACCOUNT_SID=[REDACTED]
TWILIO_AUTH_TOKEN=[REDACTED]
TWILIO_API_KEY_SID=[REDACTED]
TWILIO_API_KEY_SECRET=[REDACTED]
TWILIO_WEBHOOK_BASE_URL=https://api.luminnus.ai/api/twilio/webhook
```

**Risco:** 🟢 ZERO

#### 6.3 — `whatsapp-webhook.ts` (MODIFICAÇÃO futura — NÃO na Fase 1)
> Na implementação final, poderá ser adicionado um check para rotear entre Meta e Twilio baseado no `provider_type` da connection. MAS isto será feito apenas após a Fase 5 estar validada.

**Risco:** 🟡 MÉDIO — Só implementar quando tudo mais estiver testado

---

### FASE 7: Frontend — Atualização do Hub de Integrações
> **Princípio:** Adicionar opções ao `WhatsAppIntegration.tsx` existente

**Arquivo:** `Dashboard-client/components/integrations/WhatsAppIntegration.tsx`

**Modificações:**
1. Adicionar um **seletor de modo**: "Configuração Meta (atual)" vs "Configuração Twilio (novo)"
2. No modo Twilio, mostrar:
   - **Fluxo A:** Botão "Obter Número Novo" → selecionar país → confirmar compra
   - **Fluxo B:** Botão "Usar Meu Número" → Embedded Signup flow

**Impacto:** 🟡 MÉDIO — Arquivo existente será modificado, mas adiciona funcionalidade

---

### FASE 8: Admin Dashboard — Widget Twilio
> **Princípio:** Adicionar seção ao `AdminWhatsAppGovernance.tsx`

**Modificações:**
1. Nova tab/seção "Twilio Master" com:
   - Widget de saldo ($USD)
   - Health check status
   - Top consumers (subcontas com mais mensagens)
   - Lista de subcontas com status

**Impacto:** 🟡 MÉDIO — Adiciona UI ao componente existente

---

## 📁 Mapa de Arquivos — O que será Criado vs Modificado

### ✨ NOVOS (13 arquivos)
| # | Arquivo | Tipo |
|---|---------|------|
| 1 | `supabase/migrations/20260211_twilio_subaccounts.sql` | SQL Migration |
| 2 | `apps/lia-viva/.../services/twilioOnboardingService.ts` | Backend Service |
| 3 | `apps/lia-viva/.../services/twilioMessageService.ts` | Backend Service |
| 4 | `apps/lia-viva/.../routes/twilio-onboarding.ts` | Backend Routes |
| 5 | `apps/lia-viva/.../routes/twilio-webhook.ts` | Backend Routes |
| 6 | `apps/lia-viva/.../routes/twilio-admin.ts` | Backend Routes |
| 7 | `apps/lia-viva/.../repositories/TwilioRepository.ts` | Backend Repo |
| 8 | `apps/lia-viva/.../validators/twilio.schema.ts` | Validation Schemas |
| 9 | `apps/lia-viva/.../types/twilio.types.ts` | TypeScript Types |
| 10 | `packages/api/src/routes/twilioAdmin.ts` | API duplicated (packages) |
| 11 | `Dashboard-client/components/integrations/TwilioOnboarding.tsx` | Frontend Component |
| 12 | `Dashboard-client/components/admin/TwilioAdminPanel.tsx` | Admin Component |
| 13 | `apps/lia-viva/.../services/twilioEncryption.ts` | Encryption helper |

### ✏️ MODIFICADOS (5 arquivos — mudanças mínimas)
| # | Arquivo | Mudança | Linhas |
|---|---------|---------|--------|
| 1 | `server.ts` | Adicionar imports + setup de rotas Twilio | ~6 |
| 2 | `.env.example` | Adicionar vars TWILIO_* | ~8 |
| 3 | `.env` (Render) | Adicionar vars TWILIO_* | ~5 |
| 4 | `WhatsAppIntegration.tsx` | Adicionar tab "Twilio" com seletor de modo | ~50 |
| 5 | `AdminWhatsAppGovernance.tsx` | Adicionar seção Twilio Master | ~40 |

### 🚫 NÃO TOCADOS (preservados intactos)
| Arquivo | Razão |
|---------|-------|
| `WhatsAppController.ts` | Continua funcionando com Meta API |
| `WhatsAppRepository.ts` | Continua funcionando com tabelas atuais |
| `whatsappService.ts` | Continua como serviço Meta — Twilio usa serviço separado |
| `whatsapp-webhook.ts` | Continua processando webhooks Meta |
| `whatsapp.ts` (routes) | Rotas existentes intactas |
| `whatsapp-admin.ts` | Admin Meta intacto |
| `whatsappEmbedded.ts` | Embedded Signup Meta intacto |
| Todas tabelas existentes | Schema aditivo apenas |

---

## 🔄 Ordem de Execução

```
FASE 1 ─── Database (migração SQL)
  │
  ├── ✅ Sem dependências
  │
FASE 2 ─── TwilioOnboardingService + TwilioRepository + Types
  │
  ├── Depende: FASE 1 + npm install twilio
  │
FASE 3 ─── TwilioMessageService
  │
  ├── Depende: FASE 2
  │
FASE 4 ─── Rotas (onboarding + admin)
  │
  ├── Depende: FASE 2 e 3
  │
FASE 5 ─── Webhook Centralizado
  │
  ├── Depende: FASE 3 e 4
  │
FASE 6 ─── Modificações mínimas (server.ts, .env)
  │
  ├── Depende: FASE 4 e 5
  │
FASE 7 ─── Frontend (Hub de Integrações)
  │
  ├── Depende: FASE 4 (rotas precisam existir)
  │
FASE 8 ─── Admin Dashboard (widgets Twilio)
  │
  └── Depende: FASE 4 (rotas admin)
```

---

## 🛡️ Variáveis de Ambiente (Render)

```env
# Twilio Master Account
TWILIO_ACCOUNT_SID=[REDACTED]
TWILIO_AUTH_TOKEN=[REDACTED]

# Twilio API Key (para auth segura)
TWILIO_API_KEY_SID=[REDACTED]
TWILIO_API_KEY_SECRET=[REDACTED]

# Webhook base URL
TWILIO_WEBHOOK_BASE_URL=https://api.luminnus.ai/api/twilio/webhook
```

---

## ✅ Checklist de Validação

- [ ] FASE 1: Migração aplicada no Supabase sem erros
- [ ] FASE 1: Tabelas existentes continuam funcionando
- [ ] FASE 2: `npm install twilio` sem conflitos
- [ ] FASE 2: TwilioOnboardingService cria subconta de teste
- [ ] FASE 3: TwilioMessageService envia mensagem de teste
- [ ] FASE 4: Todas as rotas respondem corretamente
- [ ] FASE 5: Webhook recebe e roteia mensagem corretamente
- [ ] FASE 6: `npm run build` sem erros
- [ ] FASE 6: Deploy no Render sem falhas
- [ ] FASE 7: Hub de Integrações mostra opção Twilio
- [ ] FASE 8: Admin Dashboard mostra saldo e subcontas
- [ ] Webhook Meta existente continua funcionando
- [ ] Conversas existentes não são afetadas
- [ ] Nenhum arquivo em produção foi quebrado

---

## 🔑 Decisões Arquitecturais

1. **Coexistência Meta + Twilio:** O sistema suportará AMBOS os provedores simultaneamente. Tenants que já usam Meta continuam via Meta. Novos tenants podem escolher Twilio.

2. **Webhook separado:** `/api/twilio/webhook` é diferente de `/api/whatsapp/webhook`. Isso evita quebrar o webhook Meta existente.

3. **Identificação por AccountSid:** No webhook Twilio, identificamos o tenant pelo `AccountSid` da subconta (não pelo número de telefone). Isso é mais robusto.

4. **Credenciais da subconta para envio:** Mensagens são SEMPRE enviadas usando as credenciais da subconta do tenant, nunca da master. Isso isola custos corretamente.

5. **Encriptação de tokens:** `twilio_auth_token` será encriptado em repouso usando AES-256-GCM com chave derivada de env var.

6. **Rollback automático:** Se qualquer etapa do onboarding falhar (ex: sem saldo para comprar número), a subconta é automaticamente revertida.

---

**Aguardando aprovação para iniciar implementação.**  
**Qual fase deseja que comece primeiro?**
