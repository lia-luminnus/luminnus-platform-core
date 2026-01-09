# LIA — Memória Cognitiva (Impecável) — Guia Oficial

**Versão:** 1.1  
**Status:** SSOT (Fonte Única de Verdade)  
**Objetivo:** Memória cognitiva robusta, auditável e segura que:
- Mantém continuidade real entre chat e voz (multimodal primeiro).
- Salva automaticamente o "perfil base" do cliente a partir do cadastro/onboarding.
- Enriquecer ao longo do tempo com sinais úteis (sem lixo).
- Permite editar, corrigir e deletar memórias sob comando do cliente.
- Preserva isolamento multi-tenant e paridade Admin ↔ Dashboard-client.

---

## 1) Princípios Inegociáveis

### 1.1 Separação rígida: Histórico ≠ Memória
- **Histórico (`messages`)**: registro completo da conversa. Serve para continuidade imediata. Pode conter "ok/estou esperando".
- **Memória Cognitiva (`memories`)**: conhecimento durável e acionável. Só entra o que melhora experiência e produtividade futura.

**Regra:** Histórico é a "prova do que aconteceu". Memória é o "perfil inteligente do cliente".

### 1.2 Memória é sempre do cliente e do tenant
Toda memória possui escopo:
- `tenant_id` (empresa)
- `user_id` (pessoa)
- `scope` (`personal` | `tenant_shared`)
- opcional: `conversation_id` (se for algo ligado a um projeto específico)

### 1.3 Controle do cliente
- "Isso está errado" → corrigir memória (com atualização auditável).
- "Esquece isso" → deletar/invalidar.
- "Salva isso" → salvar com prioridade e precisão.

---

## 2) Camadas de Memória (Arquitetura)

### Camada A — Histórico (Conversa)
**Tabela:** `messages`
Campos mínimos:
- `tenant_id, user_id, conversation_id`
- `role` (user/assistant/system/tool)
- `content` (texto)
- `modality` (chat/voice)
- `created_at`
- `attachments` (metadados, se houver)

Função: continuidade entre chat e voz dentro do mesmo `conversation_id`.

### Camada B — Memória Cognitiva (Long-Term)
**Tabela:** `memories`
Campos recomendados:
- `tenant_id, user_id, scope`
- `category` (ver Seção 4)
- `key` (ex.: `user.name`, `tenant.name`, `user.role`, `tenant.segment`)
- `value` (texto/JSON)
- `confidence` (0–1)
- `status` (`active` | `deprecated` | `deleted`)
- `source` (`profile_seed` | `explicit_user` | `inferred` | `admin_system`)
- `source_ref` (ex.: `onboarding`, `message_id`, `integration:google`)
- `created_at, updated_at`

### Camada C — Working Memory (ContextPack)
Não é banco: é o pacote de contexto montado pelo backend a cada interação.
- resumo do histórico recente
- memórias relevantes (B)
- estado de tarefas/artefatos (ex.: planilha criada, link persistido)
- modo atual (chat/voice/multimodal)

**Regra:** chat e voz consomem o MESMO ContextPack.

---

## 3) Regra-chave: Profile Seed (Memória Inicial Automática)
O sistema deve gravar automaticamente um "perfil base" do cliente ao final do cadastro/onboarding.
Isso NÃO depende do usuário pedir "salva isso".

### 3.1 Quando gravar
- Após cadastro/login inicial (primeira sessão válida).
- Após completar onboarding (segmento, metas, preferências, ferramentas).
- Após atualizar configurações do perfil (nome, empresa, cargo, fuso).

### 3.2 O que gravar automaticamente (permitido e obrigatório)
**Categoria: Identity & Profile (personal)**
- `user.name` (nome)
- `user.preferred_language`
- `user.timezone` / `user.locale`
- `user.role_title` (cargo/função, se coletado)
- `user.communication_style` (ex.: direto, objetivo)

**Categoria: Tenant & Business (tenant_shared)**
- `tenant.name` (empresa)
- `tenant.segment` (ex.: imobiliária, varejo, serviços)
- `tenant.business_model` (se coletado no onboarding)
- `tenant.primary_goals` (lista curta: ex.: "vender mais", "reduzir custos", "automatizar suporte")

**Categoria: Constraints & Preferences**
- `prefs.no_emojis` / `prefs.no_tech_terms` / `prefs.short_answers`
- `prefs.channels_enabled` (whatsapp, email, etc.)

**Fonte:** `source=profile_seed` e `source_ref=onboarding|profile`.

### 3.3 O que NÃO gravar no Profile Seed
- qualquer conversa livre
- fillers ("ok", "bom dia")
- transcrição de voz
- dados sensíveis não solicitados

---

## 4) Taxonomia de Memória (Client Intelligence Model)

### 4.1 Categorias oficiais
1) **Identity & Profile (personal)**
   - nome, idioma, fuso, estilo, cargo
2) **Tenant & Business (tenant_shared)**
   - empresa, segmento, oferta, estrutura, regras do negócio
3) **Operating Model (tenant_shared/personal)**
   - processos, SLAs, padrões, playbooks, prioridades
4) **Goals & KPIs**
   - metas, métricas, prazos relevantes
5) **Tools & Integrations**
   - sistemas conectados, preferências de uso, limitações
6) **People & Contacts (tenant_shared)**
   - equipe, papéis, contatos internos (não sensíveis)
7) **Projects (optional by conversation_id)**
   - contexto de um projeto ativo ("Projeto X", "Cliente Y")

### 4.2 Proibido salvar (Noise)
- "ok", "blz", "tô esperando", "bom dia", "valeu"
- mensagens sem valor futuro
- qualquer coisa que não mude comportamento futuro da LIA

---

## 5) Política de Salvamento (Memory Gate)

### 5.1 Triggers
Memória pode ser criada por:
1) **Profile Seed** (automático e confiável)
2) **Comando explícito do cliente** ("salva", "lembra", "anota")
3) **Inferência controlada** (somente quando claramente útil e durável)

### 5.2 Heurística para inferência (mínimo)
Só salvar por inferência se:
- tem utilidade futura clara (preferência/regra/processo/identidade)
- não é filler
- é estável (não muda em horas)
- `confidence >= 0.70`
Caso contrário: perguntar objetivamente se quer salvar.

### 5.3 Anti-lixo (bloqueio no backend)
Mesmo que o frontend tente salvar, o backend deve recusar se:
- `isMemoryWorthy=false`
- categoria indefinida
- key/value fracos

---

## 6) Correção, Edição e Deleção (Governança)

### 6.1 Correção
Se o cliente disser "isso está errado":
1) identificar memória candidata (por key/categoria)
2) pedir o dado correto em 1 pergunta objetiva
3) atualizar (`upsert`) e deprecar a antiga

### 6.2 Deleção ("esquece isso")
- padrão: `status=deleted` (soft delete)
- hard delete: apenas sob exigência formal (compliance)

### 6.3 Conflitos
- Só 1 memória ativa por `key+scope`.
- A anterior vira `deprecated` com audit trail.

---

## 7) Continuidade Chat ↔ Voz (Multimodal)

### 7.1 Regra de continuidade
Ao iniciar voz dentro do multimodal:
- carregar histórico (`messages`) do `conversation_id`
- carregar resumo incremental ("rolling summary")
- carregar memórias relevantes por categoria

Resultado: a LIA continua o assunto sem reiniciar.

### 7.2 ContextPack obrigatório
O backend deve montar um ContextPack unificado para:
- Chat Mode
- Multi-Modal (texto + voz)

---

## 8) SSOT e Paridade Admin ↔ Client
- A policy de memória deve existir em um módulo central (SSOT), consumido por Admin e Dashboard-client.
- Backend é a barreira final (não confia no client).

Arquivos SSOT sugeridos:
- `.agent/workflows/lia-cognitive-memory.md` (este documento)
- `@luminnus/lia-runtime`: `memoryPolicy.ts` (policy executável)

---

## 9) Observabilidade (qualidade)
Logs mínimos:
- `memory.seeded` (onboarding/profile)
- `memory.save_attempt` (worthy true/false + reason)
- `memory.updated`, `memory.deleted`

Métricas:
- % de saves rejeitados por lixo
- top categorias salvas
- taxa de correção (memória errada)

---

## 10) Critério de Aceite (DoD)
- LIA sabe nome do usuário e empresa ao iniciar conversa (Profile Seed OK).
- LIA não salva "ok/estou esperando".
- LIA continua do chat para voz sem perder contexto (mesmo conversation_id).
- Cliente consegue corrigir e deletar memórias.
- Admin e Client exibem o mesmo comportamento (SSOT real).

---

## 11) SQL para Constraint Única (OBRIGATÓRIO)

Para que o `upsert` funcione corretamente, a tabela `memories` **DEVE** ter a seguinte constraint:

```sql
-- Executar no Supabase SQL Editor
ALTER TABLE memories
ADD CONSTRAINT memories_user_id_key_unique UNIQUE (user_id, key);
```

Sem essa constraint, o código de `saveMemory` falhará com o erro:
> `there is no unique or exclusion constraint matching the ON CONFLICT specification`
