---
description: Protocolo Exclusivo de Memória Cognitiva e Aprendizado Contínuo da LIA
---

# 🧠 Protocolo de Memória Cognitiva LIA

Este documento define a arquitetura neural e os padrões de evolução do conhecimento da LIA. A memória não é apenas armazenamento, é a base da inteligência personalizada que permite à LIA entender o contexto de cada negócio de forma única.

## 1. Camadas de Memória (Neural Layers)

A LIA opera com uma arquitetura de memória tripla para otimizar precisão e custo computacional:

1.  **Memória de Curto Prazo (Buffered)**: Histórico imediato da conversa atual (últimas 10-20 mensagens). Mantém o fluxo do diálogo.
2.  **Memória Visuo-Cognitiva (Short-Term Vision)**: Contexto de imagens, prints e arquivos analisados na sessão atual. Deve ser persistida como descrição textual no histórico para consumo por modelos não-visuais (Ex: modo voz).
3.  **Memória de Médio Prazo (Relevant Tasks)**: Dados de tarefas em andamento, status de projetos e interações recentes.
4.  **Memória de Longo Prazo (Knowledge Base)**: Fatos estabelecidos sobre o usuário, empresa e histórico vetorial (RAG).

## 2. Ciclo de Aprendizado (Learning Loop)

A LIA deve decidir ativamente o que vale a pena ser lembrado:

-   **Critério de Relevância (Worthy Check)**:
    -   **NÃO SALVAR**: Interações triviais ("ok", "estou aqui", "bom dia"), confirmações de leitura ou repetições.
    -   **SALVAR OBRIGATORIAMENTE**: Mudanças de processos, nomes de pessoas importantes, preferências de estilo, datas críticas, exceções de regras de negócio.
-   **SSOT (Single Source of Truth)**: Toda memória deve ser persistida no banco central (Supabase) via `memories` table, nunca apenas localmente.

## 3. Gestão de Contexto e Truncamento

Para evitar alucinações e perda de performance:

-   **Truncamento Gracioso**: Quando o histórico exceder o limite de tokens, cortar as mensagens mais antigas, mas extrair um **resumo cognitivo** antes da remoção.
-   **Marcador de Truncamento**: Inserir `[...histórico anterior sintetizado em memória cognitiva...]` para sinalizar ao modelo o estado do buffer.

## 4. Governança e Paridade Admin ↔ Client

-   **Isolamento Multi-tenant**: O `tenant_id` é a chave mestra. Uma memória nunca pode vazar entre empresas.
-   **Persistência Multimodal**: Se um arquivo foi analisado no modo Multimodal, a conclusão/extração DEVE estar disponível no modo Chat e Voz através da injeção de metadados de análise no histórico.
-   **Paridade de Comportamento**: O Admin e o Cliente devem interagir com a mesma LIA (Single Brain), consumindo as mesmas memórias e perfis via `lia-runtime`.
-   **Transparência**: O cliente tem o direito soberano de visualizar, editar e deletar memórias coletadas sobre ele através do Dashboard.

## 5. Especificações Técnicas e Observabilidade

### Logs de Memória (Qualidade)
Devemos monitorar:
- `memory.seeded`: Sucesso na injeção de dados de onboarding.
- `memory.save_attempt`: Decisão de salvar (Worthy: true/false).
- `retrieval.query`: Filtros e latência de busca semântica.
- `conflict.detected`: Quando uma nova informação contradiz uma memória existente.

### Constraint de Banco de Dados (Imutável)
Para evitar duplicação e garantir a integridade dos fatos:

```sql
-- Executar no Supabase SQL Editor se não existir
ALTER TABLE memories
ADD CONSTRAINT memories_tenant_user_scope_key_unique
UNIQUE (tenant_id, user_id, scope, key);
```

## 6. Critérios de Aceite (Definition of Done)

- [ ] LIA reconhece o usuário e seu contexto de negócio imediatamente ao iniciar (Profile Seed).
- [ ] LIA não polui o banco com confirmações vazias ("ok", "entendi").
- [ ] Transição fluida entre Chat, Voz e Dashboard mantendo o mesmo `conversation_id`.
- [ ] Retrieval prioriza metadados (`scope`, `category`) antes da busca vetorial pura.
- [ ] Embeddings são versionados para evitar obsolescência após atualizações de modelo.

## 7. Troubleshooting Multimodal (Conexão Visual)

Se a LIA falhar em "ver" um arquivo enviado anteriormente:
1. **Verificação de Link**: O roteador `AIRouter` deve ter bypass para termos como "print" e "imagem".
2. **Snapshot de Análise**: O `OutputFormatter` deve garantir que a extração visual contenha metadados (OCR/JSON) que sejam salvos no `content` da mensagem para busca rápida.
3. **Persistência de History**: O `memoryService` deve ignorar a role do autor ao buscar por anexos, garantindo que o upload do usuário ative a consciência visual do assistente.
