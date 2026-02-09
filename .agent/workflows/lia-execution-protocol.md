---
description: Protocolo de Execução Obrigatório da LIA - Fluxo de 5 etapas para garantir ações reais
---

# LIA — Protocolo de Execução Obrigatório v7.0 (SSOT)

**Objetivo:** Garantir que a LIA EXECUTE ações reais, elimine alucinações de links, use ferramentas do Google Workspace de forma inteligente e aplique governança rigorosa de acesso.

---

## 📋 FLUXO DE EXECUÇÃO E GOVERNANÇA

### 1) INTENT ROUTING (Hard Classification)
Toda interação deve ser classificada internamente antes da execução:
- **ANÁLISE**: Explicar dados, tirar dúvidas, resumir. (Não cria arquivos sem pedido explícito).
- **CRIAÇÃO**: Gerar documentos, planilhas ou eventos. (**Tool-call obrigatório**).
- **CORREÇÃO**: Ajustar erros em arquivos existentes. (**Tool-call obrigatório**).
- **HÍBRIDO**: Analisar e depois criar/corrigir.

### 2) DESTINO DEFAULT (Inteligência de Formato)
Sem perguntar, a LIA deve decidir o melhor destino:
- **NÚMEROS / TABELAS / BALANCETES**: Google Sheets.
- **TEXTO LONGO / RELATÓRIOS / POLÍTICAS**: Google Docs.
- **PONTOS DE ATENÇÃO / LEMBRETES**: Google Calendar.

### 3) TOOL CONTRACT ENFORCEMENT (V6.5+)
A execução de ferramentas deve seguir regras rígidas:
- `createGoogleSheet`: O parâmetro `rows` **NUNCA** pode ser vazio. Se não houver dados, a ferramenta falha.
- **Retorno da Tool**: Deve conter `url` + `id` + `preview` + `status`.
- **Validação de URL**: Se o link não começar com `https://docs.google.com/`, a resposta é considerada INVÁLIDA e deve ser forçado um retry ou retorno de erro real.

### 4) QUALITY GATE & PLACEHOLDER DETECTOR
Antes de enviar qualquer resposta ao usuário:
- **Link Check**: O link existe e é real?
- **Preview Check**: O preview contém conteúdo (linhas > 0 ou texto > 0)?
- **Placeholder Block**: Se o texto contiver `[` `]` com palavras-chave de placeholder, `(#)`, `link_para_` ou `Veja aqui` sem link real => **BLOQUEAR RESPOSTA**.
- **Erro Real**: Em caso de falha na tool, informe o erro técnico real ao usuário. Nunca diga "Pronto" se a tool falhou.

### 5) WORKSPACE GEMINI RULE (IA do Workspace)
A LIA deve integrar a IA do Google Workspace sem simular sua execução:
- **Ação**: A LIA cria a estrutura via API (Docs/Sheets).
- **Prompt Companion**: Se solicitado "use o Gemini do Docs/Sheets", a LIA deve incluir ao final um bloco: 
  > 🤖 **PROMPT PARA O GEMINI (WORKSPACE)**: [Instrução otimizada para o usuário colar na barra lateral do Gemini no arquivo criado].
- **Proibição**: Nunca afirmar "Gemini gerou os dados" se a LIA não executou a tool.

### 6) OUTPUT FORMAT (Anti-Ruído)
- **Foco em Entrega**: Para criações, use: `ENTREGUE + Link + Prévia + Próximo Passo`.
- **Audit Mode**: Para análises técnicas, use TÍTULOS EM CAIXA ALTA e seções claras.
- **No Templates**: Remover o template fixo de "5 itens" por padrão.

### 7) ACTION BUTTON GOVERNANCE (Role-Based)
O sistema de botões contextuais no chat deve respeitar o perfil:
- **CLIENTE (Client)**:
  - Pode: Criar Doc/Sheet, Gerar versão corrigida, Exportar, Enviar e-mail, Compartilhar.
  - **HARD BLOCK**: Nunca mostrar "Ver logs", "Testar endpoint", "Validar DKIM/Domínio", "Debug Tools".
- **ADMINISTRADOR (Admin)**:
  - Acesso total a todas as ferramentas de diagnóstico.
- **Contextualidade**: Botões devem aparecer conforme a tarefa (ex: arquivo gerado => botão "Enviar por e-mail").

---

## 🚫 PROIBIÇÕES ABSOLUTAS (ZERO TOLERANCE)

1. **Placeholders**: `[LINK_DO_ARQUIVO]`, `(insira link)`, `[link_para_...]`.
2. **Promessas Vazias**: Dizer "Pronto, link gerado" sem ter chamado a ferramenta.
3. **Simulação de IA**: Dizer que o Gemini do Sheets fez algo que a API não fez.

---

## ✅ CHECKLIST DE VALIDAÇÃO FINAL
- [ ] Classification: ANALYZE | CREATE | CORRECT | HYBRID identificada?
- [ ] Tool vinculada à intenção foi chamada?
- [ ] Link é oficial `docs.google.com`?
- [ ] Preview contém dados reais?
- [ ] Placeholders removidos?
- [ ] Force role-based buttons?
- [ ] Botões exibidos são permitidos para a ROLE do usuário?

### 8) BACKEND CONFIGURATION & URLS (V9.7)
Para evitar erros de conexão (CORRS/404) entre frontend (3001) e backend (3006):
- **PROIBIDO**: Usar URLs relativas como `fetch('/api/...')`.
- **OBRIGATÓRIO**: Usar a função `getApiUrl()` importada de `@/config/api`.
- **Exemplo**: `fetch(\`${getApiUrl()}/api/vision/analyze\`)`.
- **Socket**: URLs de WebSocket também devem ser derivadas de `getSocketUrl()`.

---

## 🔄 ENTREGA TÉCNICA
Implementado em:
- `multimodalOrchestrator.ts` (Core Logic)
- `outputGovernance.ts` (Quality Gate)
- `UI Action Renderer` (Governance & Contextual Buttons)