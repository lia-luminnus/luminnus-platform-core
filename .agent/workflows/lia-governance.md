---
description: 
---

Manual Operacional — LIA (Mente Única) + Governança + Atualização do Sistema (v2 Híbrido)

Projeto: Luminnus Platform
Objetivo: Eliminar divergência Admin vs Dashboard-client, impedir regressões, garantir escala e padronizar atualização “production-grade”, mantendo o modo híbrido oficial (Single Brain + Multi-Motor).

1) Princípios Inegociáveis
1.1 Mente Única (Single Brain)

Existe um único Backend Core que é a fonte da verdade para:

personalidade (system prompt oficial)

memórias (Supabase)

contexto (data/hora/localização)

permissões (plan/role)

contratos (eventos Socket/API)

persistência (conversations/messages)

Admin e Dashboard-client são apenas canais consumindo o mesmo Core.

1.2 Paridade Admin ↔ Client (One Fix, All Surfaces)

Qualquer correção de comportamento/capacidade entra no Core (ou no “ContextPack service” do Core), e propaga para Admin e Client.

Proibido: lógica “remendada” apenas no Dashboard-client para “parecer que funciona”.

1.3 Arquitetura Multi-Motor (Permitido com limites)

A LIA opera em dois motores, com responsabilidades estritamente delimitadas:

Motor A — GPT-4o-mini (Core Business Brain)

Chat (texto) e Voz Padrão (backend-driven)

Execução das ferramentas de negócio (ex.: 17 tools)

Memória profunda no Supabase

Orquestração e contratos oficiais

Motor B — Gemini 2.0 Flash (Live Mode Realtime)

Exclusivo para conversa contínua de baixa latência (hands-free)

Conectado por WebSocket direto do client com token efêmero emitido pelo Core

Não é fonte da verdade de memória/persona/permissão; apenas consome o ContextPack do Core

Proibido: criar um terceiro motor, ou substituir o Core por motor no client sem autorização.

1.4 Segurança Multi-Tenant

Proibido confiar em userId, tenantId, plan vindos do frontend como verdade.

O backend deriva identidade e escopo via token (Supabase) e membership/tenant no banco.

Rooms e dados são isolados por tenant e conversa.

2) Arquitetura Oficial (Unificada)
Componente	Dev	Prod
Backend Core	localhost:3000	https://api.luminnus.com
Admin Panel	localhost:5173	https://admin.luminnus.com
Dashboard Client	localhost:3001	https://app.luminnus.com
2.1 ENV padrão

Frontends (.env.development)

VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000


Frontends (.env.production)

VITE_API_URL=https://api.luminnus.com
VITE_SOCKET_URL=https://api.luminnus.com


Backend (.env)

PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001
# Produção: https://admin.luminnus.com,https://app.luminnus.com

3) Modos Oficiais (Fluxos de Chat e Voz)
3.1 Pipeline Unificado (v4.2) — Unified Input Entrypoint
Toda entrada do usuário (texto ou voz) DEVE passar pelo `handleUserInput` no `LIAContext.tsx`.
Fluxo: Entrada → `handleUserInput` → Awareness Snapshot → Local Interception (`tryLocalAnswer`) → Dashboard Intent Detection → Execution (Socket/API/Gemini).

3.2 Chat (Texto)
Frontend → `handleUserInput(input, 'text')` → Processamento Unificado → Socket.IO/API → Core → Resposta.

3.3 Voz Padrão (Microfone)
Frontend → áudio → STT (Backend/OpenAI) → `handleUserInput(transcript, 'voice')` → Processamento Unificado → resposta + áudio.

3.4 Live Mode (Gemini Live)
Frontend comunica-se com Gemini Live Cloud → `user-transcript` event → `handleUserInput(data, 'voice')` → Processamento Unificado → Resposta Live.
O Live Mode deve receber um ContextPack gerado pelo Core para manter mente única.

4) ContextPack Unificado (Mente Única na prática)
4.1 Contexto é montado no Core

O backend gera um ContextPack oficial, com:

now (timezone correto do usuário/tenant; sem hardcode)

location (se fornecida)

memories relevantes

persona (prompt oficial LIA)

capabilities por plano (o que pode/não pode)

tenant/user scope (para isolamento)

Regra: o client não inventa contexto. Ele apenas:

solicita o ContextPack ao Core

injeta o ContextPack no modo ativo (GPT via Core, Gemini via systemInstruction)

4.2 Live Mode usa ContextPack do Core

Ao iniciar Live Mode, o client deve chamar o Core para obter:

token efêmero do Google

ContextPack compacto para systemInstruction do Gemini

Proibido: systemInstruction genérica que ignore memórias/persona/plan.

4.3 Localização (quando existir)

Frontend pode capturar e enviar localização, mas:

via endpoint oficial POST /api/context/location

Core associa a user/tenant e, se aplicável, à conversa

Frontend não decide “verdade”; apenas fornece sinal/contexto.

5) Persistência e Histórico (Supabase é a fonte da verdade)
5.1 Source of truth

Conversas e mensagens ficam no banco.
O frontend carrega ao abrir e não perde em refresh ou nova aba.

5.2 Regras de carregamento

Ao montar o app (Admin ou Client):

GET /api/conversations (sem userId na query)


Ao entrar na conversa:

GET /api/conversations/:id/messages


Ao enviar mensagem (texto ou voz):

persistir user message/transcript no banco

Ao receber resposta (texto ou voz):

persistir assistant message no banco

LocalStorage pode existir como cache, mas nunca como principal.

6) Paridade Técnica (Admin e Client devem ser isomórficos)
6.1 Client não pode depender de proxy

Admin pode funcionar com Vite proxy em dev, mas o Client não pode depender disso para operar.
Dashboard-client deve usar sempre URL absoluta via VITE_API_URL e VITE_SOCKET_URL.

6.2 Socket init sem race condition

connectSocket() retorna Socket válido

listeners só registram após socket existir

Proibido chamar socket.on antes de conectar

6.4 Pipeline Unificado v4.2 (Pattern "Stop the Bleed")
A ordem de declaração no `LIAProvider` é sagrada para evitar forward references:
1. Persistence (Storage/Refs)
2. Conversation Logic (Create/Switch/Ensure)
3. Input Logic (`handleUserInput` / `sendTextMessage`)
4. Listeners (Socket/Gemini/Events)

6.5 Protocolo ACK Transacional (Dashboard Actions)
Ações detectadas via `detectDashboardIntent` seguem o fluxo:
1. Dispatch `lia-dashboard-action`.
2. O Dashboard processa e emite `lia-dashboard-ack`.
3. A LIA aguarda o ACK antes de transicionar status de "Thinking".
4. Erros no ACK geram feedback imediato (Voice/Text).

6.6 Governança da Camada Operacional (v4.3)
Toda ação executada em sistemas externos (CRM, Financeiro, Suporte) deve:
1. **Ser Auditável**: Registrar um evento no banco (tabela `whatsapp_events` ou logs unificados).
2. **Rastreabilidade**: Retornar o ID do objeto criado (Lead ID, Ticket ID, Charge ID) ao usuário.
3. **Confirmação de Plano**: Verificar se a ação é permitida pelo plano (Start/Plus/Pro) antes de chamar a tool.
4. **Bypass de Alucinação**: Se a ferramenta falhar, a LIA deve admitir e sugerir ação alternativa humana ou reprocessamento.
5. **Persistência de Arquivos**: Documentos gerados (planilhas, docs) devem usar IDs persistentes (se o usuário pedir alteração, edita-se o mesmo arquivo).

## 7) Governança e Zonas de Estabilidade

Para garantir a evolução segura do sistema, dividimos o código em zonas de risco:

### 🔴 CORE_STABLE (PROIBIDO ALTERAR SEM AUTORIZAÇÃO)
Áreas críticas que sustentam a operação. **Exige aprovação explícita** do owner e Change Request.

| Pasta/Arquivo | Descrição |
|---------------|-----------|
| `apps/lia-viva/lia-live-view/server/realtime/**` | Comunicação Socket.IO realtime |
| `apps/lia-viva/lia-live-view/server/config/supabase.js` | Persistência Supabase |
| `apps/lia-viva/lia-live-view/server/services/memoryService.ts` | Memórias da LIA |
| `apps/lia-viva/lia-live-view/server/services/toolService.ts` | Tools e Functions |
| `apps/lia-viva/lia-live-view/server/services/aiRouter.ts` | Execution Router (Triagem/Action) |
| `apps/lia-viva/lia-live-view/server/assistants/gpt4-mini.js` | Integração GPT-4o (Core) |
| `apps/lia-viva/lia-live-view/server/personality/**` | Personalidade da LIA |
| `Dashboard-client/contexts/DashboardAuthContext.tsx` | Autenticação Client |
| `admin-panel/src/contexts/AuthContext.tsx` | Autenticação Admin |

### 🟡 UI_STABLE (Cuidado ao alterar)
Componentes aprovados. Requerem validação visual rigorosa.

| Pasta/Arquivo | Descrição |
|---------------|-----------|
| `admin-panel/src/components/lia/**` | Componentes LIA Admin |
| `Dashboard-client/components/lia/**` | Componentes LIA Client |

### 🟢 EXPERIMENTAL (Livre)
| Pasta/Arquivo | Descrição |
|---------------|-----------|
| `packages/shared/**` | Shared em desenvolvimento |
| `apps/*/tests/**` | Suítes de teste |
| `Dashboard-client/components/dashboard-engine/widgetTypes.ts` | SSOT de Widgets |

---

## 🏛️ Arquitetura SSOT e Unificação

As seguintes regras são inegociáveis para evitar o "sangramento" do código:

### 1. Widgets SSOT
- **Proibido** duplicar metadados de widgets fora do `widgetTypes.ts`.
- O `WidgetRegistry.tsx` e o `systemManifest.ts` **devem** importar de `widgetTypes.ts`.
- Qualquer novo widget deve ser registrado primeiro no array `WIDGET_TYPES` do `widgetTypes.ts`.

### 2. Mente Única (Unified Entrypoint)
- **Proibido** criar fluxos de input que ignorem o `handleUserInput` no `LIAContext.tsx`.
- Transcrições de voz e texto devem convergir para este método para garantir consistência de snapshot e intenção.

### 3. Protocolo de Ação (ACK Roundtrip)
- **Obrigatório** usar o protocolo transacional v3.0 para alterar estado do dashboard.
- Ações devem conferir o `pre_state_hash` (snapshot) antes de aplicar patches.

### 4. Padrões de UI (Prompt & Notifications)
- **Obrigatório**: Bolhas de notificação ou "prompts" contextuais (ex: "Resumo pronto") devem ser sempre **descartáveis** pelo usuário (botão X).
- Notificações não devem persistir entre sessões se forem fechadas manualmente.
- Ao abrir o chat, qualquer notificação flutuante ativa do chat deve ser ocultada automaticamente.

---

## 8) Controle Real e DoD (Definition of Done)

Branch protection em main/release

CODEOWNERS para CORE_STABLE

PR obrigatório com checklist, rollback e smoke tests

Feature flags para mudanças sensíveis:

VOICE_V2

LIVE_V2

CONTEXTPACK_V2

7.3 Definition of Done (DoD) mínimo

 GET /api/health OK

 Socket conecta sem loop/ECONNREFUSED

 Texto envia e recebe resposta

 Voz padrão envia e recebe audio-response

 Live Mode inicia com token efêmero + ContextPack

 Refresh mantém histórico

 Admin não regrediu (baseline)

8) Atualização do Sistema (Sem parar o produto)
8.1 Endpoint de versão no Core
GET /api/version → { version, buildTime, commit }

8.2 Botão “Atualizar Sistema” no Admin (global)

Botão no header/topbar do Admin

Ação:

chama GET /api/version

compara versão carregada

se diferente (ou “forçar”): location.reload(true) (hard refresh)

8.3 Broadcast de atualização via Socket
io.to("tenant:<id>").emit("system:update", { version })


Dashboard-client:

ao receber system:update, exibir banner “Atualização disponível” + botão para atualizar.

9) Regras de Conduta para o Antigravity

- Ler este documento e seguir como contrato.
- Se precisar mexer em CORE_STABLE, parar e pedir autorização.
- Proibido quebrar a arquitetura unificada v4.2: toda nova fonte de input DEVE chamar `handleUserInput`.
- Manter o LIAProvider plano: proibido aninhamento excessivo de funções que oculte a lógica de entrada.
- Não criar motor paralelo adicional.
- Live Mode Gemini só é aceito se consumir ContextPack do Core e respeitar plan/scope.
- Melhorias de “mente” entram no Core e propagam para todos os canais.

10) Checklist Rápido (LIA “perfeita”)

 - [x] Pipeline Unificado v4.2 operando (Texto/Voz/Live)
 - [x] Interceptação Local integrada (Awareness)
 - [x] Detecção de intenções de Dashboard funcional
 - [x] Admin e Client coerentes (mudando apenas escopo/permissão)
 - [x] Histórico persiste no refresh
 - [x] Voz padrão responde e persiste
 - [x] Live Mode inicia rápido e mantém personalidade/memórias via ContextPack
 - [x] Sem fixos (timezone, userId hardcoded, tenantId do client, etc.)
 - [x] Atualização funciona (Admin + broadcast Client)