# 🔑 Como Obter as Credenciais do Supabase

## 📋 Passo a Passo

### 1. Acesse seu Projeto no Supabase
- Vá para: https://app.supabase.com
- Faça login
- Selecione seu projeto LIA

### 2. Navegue até as Configurações de API
- No menu lateral, clique em **Settings** (⚙️)
- Clique em **API**

### 3. Copie as Credenciais

Você verá 3 seções importantes:

#### 📍 Project URL
```
URL: https://xxxxxxxxxxxxx.supabase.co
```
→ Copie e cole no `.env` como `SUPABASE_URL`

#### 🔓 API Keys - anon public
```
anon
public
eyJhbGciOiJIUz...
```
→ Copie a chave que começa com `eyJhbGciOiJIUz...`
→ Cole no `.env` como `SUPABASE_ANON_KEY`

#### 🔐 API Keys - service_role (⚠️ Secret!)
```
service_role
secret
eyJhbGciOiJIUz...
```
→ Clique em **Reveal** para mostrar
→ Copie a chave que começa com `eyJhbGciOiJIUz...`
→ Cole no `.env` como `SUPABASE_SERVICE_KEY`

---

## 📝 Exemplo do .env

Seu arquivo `.env` deve ficar assim:

```env
# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxx

# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...

# Dev User (opcional)
DEV_USER_ID=00000000-0000-0000-0000-000000000001
```

---

## ⚠️ IMPORTANTE

1. **Nunca compartilhe** a `SUPABASE_SERVICE_KEY` - ela dá acesso total ao banco
2. Use `SUPABASE_ANON_KEY` apenas no frontend (se necessário)
3. O arquivo `.env` **NÃO** deve ser commitado no Git (já está no .gitignore)

---

## ✅ Depois de Configurar

Execute novamente o teste:
```bash
node test-supabase.js
```

Deve mostrar:
- ✅ Variáveis de ambiente carregadas
- ✅ Conexão com Supabase OK
- ✅ Tabelas existem
- ✅ Operações CRUD funcionam

---

## 🆘 Se der erro "Tabelas não encontradas"

Significa que você ainda não executou o SQL do schema. Siga:

1. No Supabase Dashboard → **SQL Editor**
2. Clique em **New query**
3. Copie TODO o conteúdo de `database/schema.sql`
4. Cole e clique em **Run**
5. Aguarde execução (✅ Success)
6. Execute `node test-supabase.js` novamente
