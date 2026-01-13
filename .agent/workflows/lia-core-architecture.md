# LIA System-Aware Dashboard — Documento Mestre (SSOT Operacional)

Versão: 4.1 (Substitui v3.0)
Uso: Este documento é a fonte de verdade para validar se a LIA está operando como “mente do sistema”.
Objetivo: Quando algo falhar, o time volta aqui e identifica qual contrato/invariante foi quebrado, o que está faltando e como corrigir, sem achismo.

## 1) Missão e Norte do Produto
### 1.1 Missão
A LIA deve atuar como orquestradora nativa do Dashboard:
- Ela sabe o que existe (catálogo do produto)
- Ela sabe o que está ativo agora (estado do tenant)
- Ela sabe o que aconteceu (execução com ACK + evidência)

### 1.2 Definição de “LIA é o Sistema”
A LIA não “tenta”. Ela consulta SSOT e responde com fatos.
Perguntas internas (“quantos widgets?”, “quais gráficos?”) são determinísticas.

## 2) Principais Invariantes (Zero Tolerância)
Se qualquer item abaixo quebrar, o sistema está fora de conformidade.

**I1 — SSOT Obrigatório**
A LIA não inventa `widgetType`, `capability`, limite ou `provider`. Tudo vem de SSOT:
- `systemManifest.ts` (produto/catálogo)
- `DashboardSnapshot` (estado)
- `LiaActionAck` (execução)

**I2 — Sem Resposta Genérica para Pergunta Interna**
“Estou visualizando…” não pode ser resposta final. Se o usuário perguntou “quantos” / “quais”, a resposta deve retornar número/lista.

**I3 — Sem Ação Sem ACK**
Toda ação aplicada (ou rejeitada) precisa de ACK com: `status` + `reason` + `post_hash` + `diffSummary`.

**I4 — Intent Routing Correto**
“Adicionar” ≠ “Substituir”. Se o usuário pediu ADD e a LIA dispara REPLACE, isso é bug crítico.

**I5 — Validar Antes de Aplicar**
Antes de aplicar patch:
- Widget existe no `WidgetRegistry`?
- Está permitido no plano/segmento?
Se não, rejeita com `reason` e sugere alternativa canônica.

## 3) Arquitetura Operacional (Mapa de Responsabilidades)
### 3.1 Componentes
- **LIAContext.tsx** — Orquestra chat, memória, roteamento e respostas locais
- **LiaActionHandler.ts** — Router de ações + validação + execução transacional
- **DashboardContext.tsx** — SSOT do estado do dashboard (FE), aplica patch e persiste versão
- **backendService.ts** — Chat/memória/Whisper/multimodal e integrações via API
- **Backend API / Supabase** — persistência, RPCs, versões, dados normalizados

### 3.2 Regra de Ouro
Se for factual e interno → responder localmente (sem depender de backend/LLM).
Se for mudança de estado → ação transacional com `pre_hash` e ACK.

## 4) SSOT do Produto — systemManifest.ts (Obrigatório)
### 4.1 O que o Manifest deve conter
- **Widgets**: `canonicalType`, `category` (kpi/chart/table/ops), `supportedProps` / `constraints`, `defaultConfig`, `planGating`, `segmentOverrides`.
- **Synonyms (NLP → Canonical)**: Ex.: “pizza”, “gráfico de pizza”, “pie” → `donut_breakdown` (ou o canônico real do teu registry).
- **Plans**: Start / Plus / Pro: permissões, limites, recursos.
- **Integrations**: Providers (Google Workspace, WhatsApp, Slack, ERP, etc.) e capacidades por provider.
- **Modules**: CRM, Financeiro, Relatórios, WhatsApp, etc.

### 4.2 Regra de Compliance
Se não está no manifest, a LIA não pode prometer nem executar.

## 5) Estado do Dashboard — DashboardSnapshot (Verdade do Tenant)
### 5.1 Estrutura mínima do Snapshot
- `hash` (pre_state_hash)
- `widgets[]`: { id, type, title, position, metricKey, config }
- `layout` (grid)
- `globals` (dateRange, filters)
- `version` (se existir)
- `capabilities` (por tenant/plan)

### 5.2 Roundtrip obrigatório (Snapshot → Resposta)
Se LIA disparou `DASHBOARD_GET_SNAPSHOT`, então:
1. Recebe snapshot
2. Computa resposta factual
3. Envia resposta final ao usuário
Sem isso, cai no loop “estou visualizando…” (bug atual detectado).

## 6) LIA-Action Protocol v4.x — Transacional Completo
### 6.1 Contratos
- **Request**: `action_id`, `tenant_id`, `pre_state_hash`, `action`, `params`.
- **ACK**: `status` (applied | rejected | partial), `reason` (código padronizado), `post_state_hash`, `diffSummary`, `evidence`.

### 6.2 Ações (todas devem ser transacionais)
| Ação | Objetivo | Status |
|------|----------|--------|
| `DASHBOARD_GET_SNAPSHOT` | Ler estado atual | Obrigatório |
| `DASHBOARD_ADD_WIDGET` | Adicionar widget | Obrigatório |
| `DASHBOARD_REPLACE_WIDGET` | Substituir mantendo posição | Obrigatório |
| `DASHBOARD_REMOVE_WIDGET` | Remover widget | Obrigatório |
| `DASHBOARD_REORGANIZE` | Reordenar layout | Obrigatório |
| `DASHBOARD_SET_PERIOD` | Alterar período | Obrigatório |

## 7) Resolução de Alvo (Sem Pedir ID ao Usuário)
Ordem de resolução:
1. `widgetId` (se houver)
2. `title` (fuzzy)
3. `type` (top match)
4. Fallback determinístico (mais recente, do topo, mesma categoria).
Se ambíguo: uma pergunta objetiva (duas opções no máximo).

## 8) Intent Routing (ADD ≠ REPLACE) — Política de Roteamento
### 8.1 Mapeamento por verbos
- **Adicionar / Incluir / Inserir / Colocar** → `ADD_WIDGET`
- **Trocar / Substituir / No lugar de** → `REPLACE_WIDGET`
- **Remover / Excluir / Apagar** → `REMOVE_WIDGET`
- **Reorganizar / Ordenar / Mover** → `REORGANIZE`
- **Período / Ontem / Últimos 7 dias** → `SET_PERIOD`

### 8.2 Guardrails
- `REPLACE_WIDGET` sem alvo resolvido → `rejected` com reason `TARGET_NOT_FOUND`.
- `ADD_WIDGET` nunca deve chamar replace “por padrão”.
- Se conflito de layout no `ADD`, informar e aplicar posicionamento padrão.

## 9) Camada de Respostas Locais (Offline-First)
### 9.1 O que entra aqui (obrigatório)
- “Quantos widgets/gráficos existem no sistema?” → `systemManifest`
- “Quantos widgets eu tenho no dashboard agora?” → `DashboardSnapshot`
- “Quais gráficos estão aparecendo no meu dashboard?” → filtra `snapshot.widgets` por categoria chart.
- “Meu plano e limites?” → `manifest.plans` + `tenant context`.

### 9.2 Anti-loop / Anti-cache burro
Se a pergunta mudou, a resposta não pode repetir a anterior. Se repetir, registrar `reason=LOCAL_ANSWER_MISSED`.

## 10) Validações e Erros Padronizados (Catálogo de Reasons)
- `UNKNOWN_WIDGET_TYPE`
- `WIDGET_NOT_IN_REGISTRY`
- `NOT_ALLOWED_BY_PLAN`
- `NOT_ALLOWED_BY_SEGMENT`
- `TARGET_NOT_FOUND`
- `HASH_MISMATCH_CONCURRENCY`
- `INVALID_PATCH`
- `PERSIST_FAILED`
- `SNAPSHOT_NOT_RETURNED`
- `LOCAL_ANSWER_MISSED`

## 11) Telemetria (Debug em minutos)
### 11.1 Log padrão (obrigatório)
🧩 `[LIA-ACTION] received action_id=... action=...`  
📦 `[SNAPSHOT] pre_hash=... widgets=...`  
🧠 `[RESOLVE] target=... reason=...`  
✅ `[VALIDATION] ok | errors=[...]`  
🛠️ `[APPLY] patch=...`  
💾 `[PERSIST] version=...`  
📣 `[ACK] status=... post_hash=... diff=...`  
🗣️ `[CHAT] final_answer=...`

## 12) Critérios de Aceite (Gatilhos de Go/No-Go)
- **A1**: Pergunta: “Quantos widgets tenho?” → Resposta: número + lista curta.
- **A2**: Pergunta: “Quais gráficos aparecem agora?” → Resposta: lista só de charts.
- **A3**: Pergunta: “Adicione gráfico de pizza” → Resultado: `ADD_WIDGET` canônico + ACK.
- **A4**: Pergunta: “Troque ranking por pizza” → Resultado: resolve alvo + `REPLACE_WIDGET`.
- **A5**: Pergunta: “KPIs em cima...” → Resultado: `REORGANIZE` patch válido.

## 13) Matriz de Falhas Conhecidas
- **Caso 1**: “pizza_chart não encontrado” → Falha I1+I5. Correção: alinhar synonyms ao Registry.
- **Caso 2**: ADD interpretado como REPLACE → Falha I4. Correção: ajustar roteamento.
- **Caso 3**: “Estou visualizando…” infinito → Falha I2+Roundtrip. Correção: resposta factual.
- **Caso 4**: Respostas repetidas → Falha anti-cache. Correção: camada local determinística.

## 14) Checklist de Regressão
- [ ] `systemManifest.ts` alinhado ao Registry.
- [ ] `GET_SNAPSHOT` retorna snapshot real.
- [ ] Roundtrip snapshot → resposta garantido.
- [ ] `add` ≠ `replace` no roteamento.
- [ ] Fail explique motivo + alternativa.

## 15) Template de Post-Mortem
- Incidente / Ação / Alvo / Hash / Reason / Invariante quebrado / Correção aplicada.

## 16) Delta v3.0 → v4.1
- ADD/REMOVE/REORGANIZE transacionais obrigatórios.
- Respostas internas local-first (sem LLM).
- `systemManifest` vira SSOT oficial.
- Erros padronizados (`reason codes`).

---
**Conclusão Operacional**: Este documento é o "contrato de qualidade". Se a LIA falhar, identifique qual invariante foi quebrado e corrija o ponto de controle.
