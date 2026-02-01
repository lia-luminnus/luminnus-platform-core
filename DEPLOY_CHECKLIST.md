# ✅ Checklist de Deploy - Luminnus Platform

## Pré-Deploy (Local)

- [ ] Todos os testes passaram localmente
- [ ] Build local funcionando (`pnpm build`)
- [ ] Variáveis de ambiente configuradas
- [ ] Commit com mensagem descritiva

## Deploy no Render

- [ ] Push para GitHub realizado
- [ ] Webhook acionou deploy automaticamente (verificar "Events")
- [ ] Se não acionou, forçar "Manual Deploy"
- [ ] Aguardar conclusão do build (5-10 min)
- [ ] Verificar logs de deploy sem erros

## Validação Pós-Deploy

### Backend
- [ ] Health check retorna `version: 4.0.x`
  ```powershell
  curl.exe https://luminnus-platform-core.onrender.com/api/health
  ```
- [ ] Rotas listadas incluem `/api/conversations` e `/api/location`
- [ ] Teste de criação de conversa:
  ```powershell
  curl.exe -X POST https://luminnus-platform-core.onrender.com/api/conversations -H "Content-Type: application/json" -d '{"mode":"chat","title":"Test","userId":"test-id","tenantId":"test-tenant"}'
  ```
  Deve retornar 200/201 (não 404)

### Frontend
- [ ] Acessar `https://luminnus-dashboard.onrender.com`
- [ ] Fazer login
- [ ] Abrir DevTools (F12) → Console
- [ ] Verificar se `API_URL` aponta para `.onrender.com` (não localhost)
- [ ] Sem erros 404 no Network tab

### LIA (Chat Mode)
- [ ] Enviar mensagem de texto → LIA responde
- [ ] Mensagem aparece sem precisar dar refresh
- [ ] Sem erro "Não foi possível obter conversa ativa"
- [ ] Console mostra: `[LIAHub] ✅ Plano do contexto: <plan> → Nível: X`

### LIA (Voz/Live Mode)
- [ ] Clicar no botão de voz/microfone
- [ ] Popup de permissão do navegador aparece
- [ ] Microfone ativa (ícone muda)
- [ ] Sem erro "Falha ao criar conversa para o modo Live"
- [ ] Sem erro `btoa is not defined` no console

### Multimodal (Plano Plus)
- [ ] Usuário com plano Plus acessa sem ver "Modo Bloqueado"
- [ ] Console **NÃO** mostra: `[LIAHub] 🔒 Acesso negado`
- [ ] Pode enviar imagens/arquivos
- [ ] LIA responde considerando o contexto multimodal

### WhatsApp (Agente)
- [ ] Cliente vê campo de input de telefone na aba "Conexão Rápida"
- [ ] Status carrega em menos de 10s (ou mostra botão "Tentar Novamente")
- [ ] Sem dados do admin exibidos para cliente
- [ ] Console **NÃO** mostra: `🚨 [WhatsApp] TENANT MISMATCH!`

## Validação de Segurança

- [ ] Logs de tenant validation funcionando corretamente
- [ ] API retorna `tenant_id` nas respostas do WhatsApp
- [ ] Frontend valida `tenant_id` antes de exibir dados
- [ ] Sem vazamento de dados entre tenants

## Performance

- [ ] Cache do WhatsApp Status reduz queries (verificar logs: `[WhatsApp Status] Cache hit`)
- [ ] Dashboard carrega em menos de 3 segundos
- [ ] Sem loading infinito em nenhuma página

## Rollback (Se Necessário)

Se algo falhar:
1. No Render, clicar em "Rollback" para deploy anterior
2. Investigar logs de erro
3. Corrigir localmente e refazer deploy

## Notas

- **Timeout ProfileService**: Se aparecer `[DashboardAuth] Timeout/erro no perfil (usando fallback)`, verificar conexão com Supabase
- **Modo Bloqueado Indevido**: Verificar logs `[LIAHub] ⏳ Aguardando carregamento do plano...` (deve desbloquear após 3s)
- **Erro 404 Persistente**: Forçar rebuild manual no Render e aguardar conclusão

---

**Última atualização**: 2026-02-01  
**Versão esperada**: `4.0.1` (backend) | `4.0.0` (frontend)
