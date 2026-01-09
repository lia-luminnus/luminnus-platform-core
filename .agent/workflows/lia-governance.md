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
3.1 Chat (Texto) — Core-Driven (Oficial)

Frontend → Socket.IO/API → Core → GPT-4o-mini → (tools/memória/persistência) → resposta via Socket/API.

3.2 Voz Padrão (Microfone) — Core-Driven (Oficial)

Frontend → áudio → Core → Whisper (STT) → GPT-4o-mini → TTS (Nova) → audio-response + persistência.

3.3 Live Mode (Hands-Free) — Client-Edge-Driven (Oficial)

Frontend abre WebSocket com Gemini 2.0 Flash usando token efêmero emitido pelo Core.
O Live Mode deve receber um ContextPack gerado pelo Core para manter mente única (ver seção 4).

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

6.3 Contratos únicos (eventos e payloads)

Admin e Client escutam e emitem os mesmos eventos.
Qualquer novo evento deve ser versionado e documentado em events.contract.ts.

7) Governança “Não Mexer no que Funciona”
7.1 Zonas
Zona	Regra
CORE_STABLE	não alterar sem autorização explícita
UI_STABLE	alterar com cautela e validação visual
EXPERIMENTAL	livre
7.2 Controle real

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

Ler este documento e seguir como contrato.

Se precisar mexer em CORE_STABLE, parar e pedir autorização.

Não criar motor paralelo adicional.

Live Mode Gemini só é aceito se consumir ContextPack do Core e respeitar plan/scope.

Melhorias de “mente” entram no Core e propagam para todos os canais.

10) Checklist Rápido (LIA “perfeita”)

 Admin e Client coerentes (mudando apenas escopo/permissão)

 Histórico persiste no refresh

 Voz padrão responde e persiste

 Live Mode inicia rápido e mantém personalidade/memórias via ContextPack

 Sem fixos (timezone, userId hardcoded, tenantId do client, etc.)

 Atualização funciona (Admin + broadcast Client)