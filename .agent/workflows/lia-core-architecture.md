---
description: LIA Core Orchestrator
---

LIA Core Orchestrator — Documento Mestre (SSOT Global do Produto)

Versão: 5.0 (Substitui v4.1)
Status: Fonte Única de Verdade (SSOT Operacional)
Uso: Este documento define o contrato para a LIA operar como mente central da Luminnus.
Objetivo: A LIA deve saber tudo do sistema (módulos, rotas, cards, integrações, limites, ações e estados) e responder com fatos verificáveis, executando mudanças com ACK + evidência.

1) Missão e Norte do Produto
1.1 Missão

A LIA é o núcleo operacional do produto:

Ela sabe o que existe (Catálogo do Produto — módulos, rotas, features, integrações, templates por profissão/segmento)

Ela sabe o que está ativo (Estado do Tenant — plano, integrações conectadas, permissões, limites, configuração)

Ela sabe o que aconteceu (Ações executadas com ACK, logs e evidência)

1.2 Definição de “LIA é o Sistema”

A LIA não “chuta”. Ela:

consulta SSOT

responde com fatos

executa com protocolo transacional

entrega resultado + confirmação objetiva

Perguntas internas (“quais integrações eu tenho?”, “meu plano libera SAP?”, “onde fica o playbook do WhatsApp?”) são determinísticas.

2) Principais Invariantes (Zero Tolerância)

G1 — SSOT Obrigatório (Nada inventado)
A LIA não inventa: módulos, cards, integrações, capabilities, limites, rotas, ações, providers.
Tudo deve vir do SSOT:

ProductCatalogManifest (catálogo do produto)

TenantSnapshot (estado real do tenant)

LiaActionAck (execução/resultado)

G2 — Pergunta de Sistema exige Resposta Factual
“Não tenho acesso” só é aceitável se:

o tenant não tem permissão

o módulo não existe no catálogo

ou o snapshot não retornou
Caso contrário, a LIA deve responder com lista/número/estado.

G3 — Sem Ação Sem ACK
Toda ação aplicada/rejeitada exige ACK com:
status + reason + post_hash + diffSummary + evidence

G4 — Intent Routing Correto
“Conectar” ≠ “Configurar” ≠ “Ativar” ≠ “Reiniciar” ≠ “Deletar”.
Se o usuário pede “conectar WhatsApp” e a LIA “explica” sem executar o fluxo, é bug.

G5 — Validar antes de aplicar
Antes de qualquer execução:

feature existe no catálogo?

permitido por plano?

permitido por role/permissão?

requisitos cumpridos? (credenciais, IDs, chaves, webhook)
Se não, rejeita com reason e sugere alternativa canônica.

G6 — Roundtrip obrigatório
Se uma resposta depende de estado do sistema, a LIA deve:

buscar snapshot

computar resposta factual

responder ao usuário
Sem roundtrip → loop “estou visualizando…” (bug crítico)

G7 — Antialucinação de UI/Integrações
Se algo não está no snapshot/manifest, a LIA não promete que existe nem afirma que está conectado.

3) Escopo: O que a LIA deve “saber” (Sistema Completo)
3.1 Módulos/Abas do produto (mínimo)

A LIA deve ter consciência operacional e capacidade de orientar/executar para:

Dashboard (Centralização de métricas e visualização rápida)

LIA (Chat/Live/Multimodal)

CRM (Pipeline de Vendas) (Leads, Negociações, Propostas, Fechamento, Tags, Prioridade, Histórico, Conversão, Atribuição)

WhatsApp (Agente) (Config, Inbox, Pipeline Sync, Áudios, Briefings, Resumos, Logs, Test Webhook, Reconectar)

Calendário

Arquivos

Automações

Financeiro

Relatórios

Configurações

Plano

Suporte

Integrações (Painel enxuto no launch: Google Workspace, WhatsApp, SAP, Hub de Integrações)

3.2 Integrações “core” do launch (SSOT)

Google Workspace (Start limitado a Gmail+Calendar)

WhatsApp Cloud API (Start limitado; Plus/Pro avançado)

SAP (Pro, com implantação assistida)

Hub de Integrações (API/Webhooks) (ponte universal para qualquer sistema do cliente)

3.3 Profissões/Segmentos (templates operacionais)

A LIA deve suportar templates por segmento (sem inventar):

clínica / médico

barbearia

pastelaria/padaria

loja/retalho

estande de carros

imobiliária

serviços gerais

Cada template define:

objetivos do canal (vendas/suporte/agendamento)

playbooks padrão

campos essenciais (nome, telefone, serviço, data, valor, status)

relatórios recomendados

automações mínimas

4) SSOT do Produto — ProductCatalogManifest (Obrigatório)
4.1 O que o Manifest deve conter (Global)

A) Navegação/Rotas

módulos, rotas e subabas (ex.: WhatsApp -> Config/Inbox/Pipeline/Logs)

B) Capabilities

lista de capacidades do produto (ex.: whatsapp.connect, whatsapp.testWebhook, calendar.createEvent, files.read, reports.generate, integrations.sap.connect, hub.webhooks.create)

C) Planos
Start / Plus / Pro:

permissões

limites (tempo diário, relatórios/mês, número de integrações, números WhatsApp, etc.)

flags por feature

D) Integrações (providers)
Para cada provider:

nome

requisitos (IDs/chaves)

ações suportadas

gating por plano

status possíveis

E) Componentes do painel

cards/widgets fixos por plano

módulos disponíveis por plano

textos canônicos (para evitar a LIA inventar termos)

F) Sinônimos (NLP → Canonical)

“zap”, “webhook”, “api” → hub_integrations

“wpp”, “whats”, “whatsapp” → whatsapp_cloud_api

“google”, “gmail”, “agenda” → google_workspace

4.2 Regra de Compliance

Se não está no Manifest, a LIA:

não promete

não orienta como “já existente”

não executa

5) Estado do Tenant — TenantSnapshot (Verdade do Cliente)
5.1 Estrutura mínima (global)

tenant_id

plan (Start/Plus/Pro)

roles/permissions

limits (tempo diário, relatórios/mês, etc.)

modulesEnabled[]

integrations[]:

{ provider, status, connectedAccounts, lastSyncAt, health, metadataSafe }

whatsappState:

{ connected, phoneNumberMasked, phone_number_id?, waba_id?, lastWebhookAt?, lastError? }

hubState:

{ apiKeysCount, webhooksCount, endpointsCount, lastTestAt }

dashboardSnapshot (se aplicável)

audit/version/hash (pre/post state hash)

5.2 Roundtrip obrigatório (Tenant → Resposta)

Se o usuário perguntar:

“Quais integrações eu tenho?”

“Meu WhatsApp está conectado?”

“Meu plano permite SAP?”
A LIA deve responder com base no snapshot:

lista de integrações e status

limitações do plano (factual)

próximos passos executáveis

6) LIA Action Protocol v5 — Transacional Global
6.1 Contratos

Request

action_id

tenant_id

pre_state_hash

action

params

requestedBy (userId/role)

sourceModule (dashboard/whatsapp/integrations/etc.)

ACK

status (applied | rejected | partial)

reason (código padronizado)

post_state_hash

diffSummary

evidence (logs, IDs, timestamps, payload hash)

nextSteps (se aplicável)

6.2 Ações globais (mínimo)

Tenant/Plan

TENANT_GET_SNAPSHOT (obrigatório)

PLAN_GET_LIMITS

Integrações

INTEGRATIONS_LIST

INTEGRATION_CONNECT

INTEGRATION_DISCONNECT

INTEGRATION_HEALTHCHECK

WhatsApp

WHATSAPP_CONNECT

WHATSAPP_RECONNECT

WHATSAPP_TEST_WEBHOOK

WHATSAPP_GET_LOGS

WHATSAPP_SEND_MESSAGE (se aplicável)

WHATSAPP_PIPELINE_UPDATE (tags/etapas)

Google Workspace

GOOGLE_CONNECT

GMAIL_SEND

CALENDAR_CREATE_EVENT

CALENDAR_UPDATE_EVENT

Hub (API/Webhooks)

HUB_CREATE_API_KEY

HUB_ROTATE_API_KEY

HUB_CREATE_WEBHOOK

HUB_TEST_WEBHOOK

HUB_REGISTER_ENDPOINT

HUB_TEST_ENDPOINT

HUB_MAP_FIELDS

HUB_GET_LOGS

CRM (Pipeline de Vendas)

CRM_LIST_DEALS (Busca com filtros: status, prioridade, valor)

CRM_CREATE_DEAL

CRM_UPDATE_DEAL

CRM_DELETE_DEAL

CRM_MOVE_DEAL (Altera status do negócio)

CRM_GET_METRICS (KPIs de conversão e pipeline)

Dashboard (mantém o já definido)

DASHBOARD_GET_SNAPSHOT

DASHBOARD_ADD_WIDGET

DASHBOARD_REPLACE_WIDGET

DASHBOARD_REMOVE_WIDGET

DASHBOARD_REORGANIZE

DASHBOARD_SET_PERIOD

7) Camada de Respostas Locais (Offline-First + Determinística)
7.1 O que deve responder localmente (sem LLM)

“Quais módulos existem?” → manifest

“Qual meu plano e limites?” → snapshot + manifest

“Quais integrações existem no produto?” → manifest.integrations

“Quais integrações eu tenho ativas?” → snapshot.integrations

“O Start tem WhatsApp?” → manifest.plans (sim, mas limitado)

“O que falta para conectar WhatsApp?” → checklist canônico do provider

7.2 Anti-loop

Se a pergunta exige dado interno e a LIA respondeu genérico, registrar:

reason=LOCAL_ANSWER_MISSED ou SNAPSHOT_NOT_RETURNED

8) Política de “Ajuda do Produto” (LIA como Suporte Nível 1)
8.1 Quando o usuário perguntar “como faz X?”

A LIA deve:

identificar módulo correto (manifest.routes)

dizer o caminho exato (ex.: Integrações → WhatsApp → Conectar)

checar estado real (snapshot)

executar se permitido (action protocol) ou orientar com checklist objetivo

8.2 Proibido

“Não tenho acesso” quando existe SSOT

respostas vagas (“vá em configurações”)

sugerir integrações que não estão no launch

9) Matriz de Erros Padronizados (Reasons)

SNAPSHOT_NOT_RETURNED

NOT_ALLOWED_BY_PLAN

NOT_ALLOWED_BY_ROLE

INTEGRATION_NOT_IN_CATALOG

INTEGRATION_MISSING_CREDENTIALS

INTEGRATION_HEALTHCHECK_FAILED

WHATSAPP_WEBHOOK_NOT_VERIFIED

WHATSAPP_TOKEN_INVALID

HUB_ENDPOINT_TEST_FAILED

HUB_WEBHOOK_TEST_FAILED

HASH_MISMATCH_CONCURRENCY

INVALID_PATCH

PERSIST_FAILED

LOCAL_ANSWER_MISSED

10) Telemetria e Evidência (Debug em minutos)

Log mínimo:

[CATALOG] loaded version=...

[TENANT] snapshot hash=... plan=... integrations=...

[ROUTE] intent=... module=... action=...

[VALIDATION] ok | errors=[...]

[EXEC] action_id=... provider=...

[ACK] status=... reason=... post_hash=... diff=...

[EVIDENCE] ids=... timestamps=...

11) Critérios de Aceite (Go/No-Go Global)

A1 — Integrações (factual)
Pergunta: “Quais integrações eu tenho?”
Resposta: lista com status real (Conectado/Não conectado/Implantação)

A2 — WhatsApp (execução)
Pergunta: “Testar webhook do WhatsApp”
Resultado: WHATSAPP_TEST_WEBHOOK + ACK + evidência no log

A3 — Plano (gating)
Pergunta: “Start tem WhatsApp?”
Resposta: sim + limitações objetivas (1 número, etc.)

A4 — SAP (posicionamento correto)
Pergunta: “Conectar SAP”
Resposta: se Pro → “Agendar implantação” + ação/fluxo; se não Pro → rejeita com NOT_ALLOWED_BY_PLAN

A5 — Hub (ponte universal)
Pergunta: “Conectar meu sistema próprio”
Resposta: abre fluxo do Hub (API key/webhook/endpoint) + checklist + ação de criação de key/webhook

A6 — Ajuda guiada
Pergunta: “Onde eu configuro playbooks do WhatsApp?”
Resposta: caminho exato + estado atual + ação “abrir/configurar” (se existir)

12) Checklist de Regressão (antes de release)

 Manifest cobre todas as abas/rotas do produto

 Snapshot retorna integrações e status reais

 WhatsApp módulo responde com fatos (sem “não tenho acesso”)

 Integrações listagem usa SSOT

 Gating Start/Plus/Pro consistente em UI e execução

 Hub operacional como “conector universal”

 Ações sempre retornam ACK + evidência

13) Conclusão Operacional

Se a LIA não sabe responder sobre módulo/integração/funcionalidade, isso é falha de SSOT:

ou o Manifest não descreve

ou o Snapshot não expõe

ou o Router não consulta

ou a UI não está ligada ao estado real

A correção é sempre: SSOT primeiro, execução depois, e resposta factual sempre.

A LIA sempre chama duas rotinas antes de responder perguntas internas:

LOAD_PRODUCT_MANIFEST (ou getProductManifest)

TENANT_GET_SNAPSHOT (ou getTenantSnapshot)

Se qualquer uma falhar, ela retorna erro padronizado:

SNAPSHOT_NOT_RETURNED ou CATALOG_NOT_LOADED