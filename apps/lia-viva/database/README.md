# 📊 Database Setup - Supabase

## 🚀 Passo a Passo

### 1. Criar Conta no Supabase
1. Acesse: https://supabase.com
2. Clique em "Start your project"
3. Crie uma conta (GitHub recomendado)

### 2. Criar Novo Projeto
1. Clique em "New Project"
2. Nome: `lia-database` (ou outro de sua preferência)
3. Database Password: **GUARDE ESSA SENHA!**
4. Region: escolha a mais próxima (ex: South America)
5. Clique em "Create new project"
6. Aguarde ~2 minutos para provisionar

### 3. Executar Schema SQL
1. No Supabase Dashboard, vá em **SQL Editor** (menu lateral)
2. Clique em **New query**
3. Copie todo o conteúdo de `database/schema.sql`
4. Cole no editor
5. Clique em **Run** (Ctrl+Enter)
6. ✅ Verifique se todas as tabelas foram criadas

### 4. Obter Credenciais
1. Vá em **Settings** > **API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** (⚠️ Secret!) → `SUPABASE_SERVICE_KEY`

### 5. Configurar .env
1. Copie `.env.example` para `.env`
2. Preencha as variáveis com suas credenciais:
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_KEY=sua-chave-service-role
```

### 6. Testar Conexão
```bash
node -e "import('./config/supabase.js').then(m => m.testConnection())"
```

Deve exibir: `✅ Supabase conectado com sucesso`

---

## 📋 Tabelas Criadas

### `users`
Armazena dados dos usuários e preferências.

### `conversations`
Histórico de todas as conversas.

### `messages`
Todas as mensagens com embeddings para busca semântica.

### `function_calls`
Rastreamento de funções/ferramentas usadas.

---

## 🔍 Queries Úteis

### Ver todas as conversas
```sql
SELECT * FROM conversations ORDER BY updated_at DESC;
```

### Ver mensagens de uma conversa
```sql
SELECT * FROM messages 
WHERE conversation_id = 'conv_xxx' 
ORDER BY created_at ASC;
```

### Estatísticas de uso
```sql
SELECT * FROM user_conversation_stats;
```

### Buscar conversas recentes
```sql
SELECT * FROM recent_conversations LIMIT 10;
```

---

## ⚠️ Importante

1. **Nunca commite o arquivo `.env`** (já está no .gitignore)
2. A `SUPABASE_SERVICE_KEY` é **SECRETA** - não compartilhe
3. Use `SUPABASE_ANON_KEY` apenas no frontend
4. RLS está habilitado - garante segurança dos dados

---

## 🛠️ Manutenção

### Backup
- Supabase faz backup automático diário
- Acesse em **Database** > **Backups**

### Monitoramento
- **Database** > **Reports** - visualize uso
- **API** > **Logs** - veja queries em tempo real

### Migrações
Para futuras alterações no schema, crie arquivos em:
- `database/migrations/001_nome_migracao.sql`
