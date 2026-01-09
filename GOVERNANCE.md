# 🛡️ Governança de Código - Luminnus Platform

> **"Não mexer no que funciona"** - Regra de ouro

---

## Zonas de Estabilidade

### 🔴 CORE_STABLE (PROIBIDO ALTERAR SEM AUTORIZAÇÃO)

Qualquer alteração nestas áreas **exige aprovação explícita** do owner.

| Pasta/Arquivo | Descrição |
|---------------|-----------|
| `apps/lia-viva/lia-live-view/server/realtime/**` | Comunicação Socket.IO em tempo real |
| `apps/lia-viva/lia-live-view/server/config/supabase.js` | Conexão e persistência Supabase |
| `apps/lia-viva/lia-live-view/server/services/memoryService.ts` | Sistema de memórias da LIA |
| `apps/lia-viva/lia-live-view/server/services/toolService.ts` | Ferramentas e funções da LIA |
| `apps/lia-viva/lia-live-view/server/assistants/gpt4-mini.js` | Integração GPT-4o |
| `apps/lia-viva/lia-live-view/server/routes/conversations.ts` | Rotas de conversas |
| `apps/lia-viva/lia-live-view/server/personality/**` | Personalidade da LIA |
| `Dashboard-client/contexts/DashboardAuthContext.tsx` | Autenticação do Dashboard |
| `admin-panel/src/contexts/AuthContext.tsx` | Autenticação do Admin |

### 🟡 UI_STABLE (Cuidado ao alterar)

Componentes aprovados que funcionam. Alterações requerem testes visuais.

| Pasta/Arquivo | Descrição |
|---------------|-----------|
| `admin-panel/src/components/lia/**` | Componentes LIA do Admin Panel |
| `Dashboard-client/components/lia/**` | Componentes LIA do Dashboard |

### 🟢 EXPERIMENTAL (Livre para iterar)

Áreas onde pode-se experimentar sem risco.

| Pasta/Arquivo | Descrição |
|---------------|-----------|
| `packages/shared/**` | Componentes compartilhados em desenvolvimento |
| `apps/*/tests/**` | Testes |
| `docs/**` | Documentação |

---

## Regras de Alteração

### Para CORE_STABLE

❌ **PROIBIDO**:
- Commit direto em `main` ou `release`
- Alterar sem descrição de impacto
- Alterar sem plano de rollback
- Alterar múltiplos arquivos críticos de uma vez

✅ **OBRIGATÓRIO**:
1. Criar branch: `fix/descrição` ou `feature/descrição`
2. Preencher Change Request (ver template abaixo)
3. Smoke tests passando
4. Aprovação do owner
5. Merge via Pull Request

### Template de Change Request

```markdown
## Change Request

**O que vai mudar:**
[Descrição clara da alteração]

**Por que precisa mudar:**
[Justificativa do negócio/técnica]

**Arquivos impactados:**
- [ ] arquivo1.ts
- [ ] arquivo2.js

**Risco:** [ ] Baixo  [ ] Médio  [ ] Alto

**Plano de rollback:**
[Como reverter se der problema]

**Smoke tests:**
- [ ] GET /api/health passa
- [ ] Socket.IO conecta com token válido
- [ ] Mensagem enviada e resposta recebida
- [ ] Refresh mantém histórico
```

---

## Smoke Tests Obrigatórios

Antes de qualquer merge em CORE_STABLE:

```bash
# 1. Health check
curl http://localhost:3000/api/health
# Esperado: {"ok":true}

# 2. Socket conecta (verificar no console do navegador)
# Esperado: Console mostra "✅ Socket conectado"

# 3. Enviar mensagem e receber resposta
# Esperado: LIA responde corretamente

# 4. Refresh mantém histórico
# Esperado: Mensagens persistem após F5
```

---

## Feature Flags

Para mudanças sensíveis, usar flags no `.env`:

```env
# Habilitar nova versão do socket
LIA_SOCKET_V2=false

# Habilitar nova persistência
PERSISTENCE_V2=false

# Habilitar nova voz
VOICE_V2=false
```

---

## Contrato de Eventos

Ver arquivo: [`events.contract.ts`](./apps/lia-viva/lia-live-view/server/contracts/events.contract.ts)

Regras:
- Versionar mudanças (v1, v2)
- Manter compatibilidade retroativa
- Documentar payloads

---

## Prompt de Governança para Antigravity

> Copie e cole este prompt no início de sessões de desenvolvimento:

```
A partir de agora, é proibido alterar qualquer arquivo em CORE_STABLE sem autorização explícita.

CORE_STABLE inclui: backend core, auth, realtime, contratos de socket/eventos, e rotas de conversas/mensagens.

Qualquer mudança nessas áreas exige:
1. Descrição do impacto
2. Lista de arquivos
3. Plano de rollback
4. Smoke tests passando

Mudanças devem ser feitas apenas via branch + PR. Não pode commit direto em main/release.

Se durante a implementação você perceber que precisa mexer em CORE_STABLE, pare e me peça autorização antes de prosseguir.
```

---

**Última atualização:** 2026-01-02
