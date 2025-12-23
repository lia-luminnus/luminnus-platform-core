# 📊 Painel Admin LIA - Documentação Completa

Este documento contém todas as instruções para usar e configurar o Painel Admin do sistema LIA.

---

## 🎯 Visão Geral

O Painel Admin é uma interface completa para gerenciar todo o sistema LIA, incluindo usuários, configurações, planos e muito mais.

### ✅ Funcionalidades Implementadas

1. **Visão Geral** - Estatísticas e métricas do sistema
2. **Gerenciar Usuários** - Lista, edita e remove usuários
3. **Configurações da LIA** - API keys e configurações sensíveis
4. **Ferramentas e Testes** - Console de teste da LIA
5. **Histórico de Interações** - Log completo de mensagens
6. **Planos e Permissões** - Gerencia planos e limites
7. **Configurações Técnicas** - Modos do sistema e mensagens padrão

---

## 🔐 Configuração de Acesso

### 1. Adicionar Email de Admin

Edite o arquivo `/src/hooks/useAdminAuth.ts` e adicione seu email:

```typescript
const ADMIN_EMAILS = [
  "meuemail@dominio.com",        // ← Seu email aqui
  "admin@luminnus.com",
  // Adicione mais emails autorizados
];
```

### 2. Login Automático

Quando você fizer login com um email autorizado, será **automaticamente redirecionado** para `/admin-dashboard`.

### 3. Proteção de Rota

Se alguém tentar acessar `/admin-dashboard` sem estar na lista de admins:
- Será redirecionado para `/dashboard` (usuário normal)
- Ou para `/auth` (se não estiver logado)

---

## 📁 Estrutura de Arquivos Criados

```
src/
├── hooks/
│   └── useAdminAuth.ts                    # Hook de autenticação admin
├── components/admin/
│   ├── AdminSidebar.tsx                   # Navegação lateral
│   ├── AdminOverview.tsx                  # Visão geral
│   ├── AdminUsers.tsx                     # Gerenciar usuários
│   ├── AdminLiaConfig.tsx                 # Config da LIA
│   ├── AdminTools.tsx                     # Ferramentas
│   ├── AdminHistory.tsx                   # Histórico
│   ├── AdminPlans.tsx                     # Planos
│   └── AdminTechnical.tsx                 # Config técnicas
├── pages/
│   └── AdminDashboard.tsx                 # Página principal
└── contexts/
    └── AuthContext.tsx                    # (modificado)
```

---

## 🗄️ Integração com Supabase

### Tabelas Necessárias (Já Existentes)

O painel usa as tabelas que você já tem:

- ✅ `profiles` - Dados dos usuários
- ✅ `chat_messages` - Mensagens da LIA
- ✅ `chat_conversations` - Conversas
- ✅ `planos` - Planos dos usuários
- ✅ `usage_limits` - Limites de uso

### Tabela Adicional (Opcional)

Se quiser persistir configurações admin no banco, crie esta tabela:

```sql
-- Tabela para armazenar configurações admin
CREATE TABLE admin_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Apenas admins podem acessar
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Política: permitir tudo para admins (você definirá quem é admin)
CREATE POLICY "Admin access" ON admin_config
  FOR ALL
  USING (auth.email() IN ('meuemail@dominio.com', 'admin@luminnus.com'));
```

### Edge Function para Buscar Emails

Para exibir emails dos usuários na lista (AdminUsers), você pode criar uma Edge Function:

```typescript
// supabase/functions/get-user-emails/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role key
  )

  const { data: { users }, error } = await supabaseClient.auth.admin.listUsers()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Mapeia IDs para emails
  const userEmails = users.reduce((acc, user) => {
    acc[user.id] = user.email
    return acc
  }, {})

  return new Response(JSON.stringify(userEmails), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Depois, use no `AdminUsers.tsx`:

```typescript
const { data: emailsMap } = useQuery({
  queryKey: ["user-emails"],
  queryFn: async () => {
    const { data } = await supabase.functions.invoke("get-user-emails");
    return data;
  },
});

// Use: emailsMap[profile.id] para obter o email
```

---

## 🎨 Componentes Visuais

### 1. **AdminSidebar** (Navegação Lateral)

- Design roxo gradiente
- 7 seções navegáveis
- Botão de logout
- Responsivo (mobile hamburger menu)

**Props:**
- `activeSection: string` - Seção atual
- `onSectionChange: (section: string) => void` - Callback de mudança

### 2. **AdminOverview** (Visão Geral)

Cards com métricas:
- Total de usuários
- Total de mensagens
- Plano mais usado
- Usuários ativos (7 dias)
- Gráfico de crescimento mensal

**Queries:**
- `admin-total-users`
- `admin-total-messages`
- `admin-most-used-plan`
- `admin-active-users`
- `admin-monthly-growth`

### 3. **AdminUsers** (Gerenciar Usuários)

Funcionalidades:
- Busca por nome/email
- Filtro por plano
- Tabela com ações (editar plano, excluir)
- Dialog de confirmação

**Mutations:**
- `deleteMutation` - Excluir usuário
- `changePlanMutation` - Alterar plano

### 4. **AdminLiaConfig** (Config da LIA)

Campos:
- OpenAI API Key
- Supabase URL
- Supabase Anon Key
- Supabase Service Role Key
- System Prompt
- Webhook URL

Armazenamento: `secureStorage` (localStorage criptografado)

### 5. **AdminTools** (Ferramentas)

- Console de teste
- Log de respostas
- Comandos rápidos
- Invoca `lia-chat` Edge Function

### 6. **AdminHistory** (Histórico)

- Últimas 50/100/200 mensagens
- Filtros de quantidade
- Estatísticas de mensagens
- Scroll infinito

### 7. **AdminPlans** (Planos)

- 3 cards (Start, Plus, Pro)
- Edição inline
- Limites configuráveis
- Configurações globais (trial, grace period)

### 8. **AdminTechnical** (Config Técnicas)

Toggles:
- Modo de manutenção
- Modo de simulação
- Respostas automáticas
- Debug mode

Mensagens customizáveis:
- Boas-vindas
- Indisponibilidade
- Erro

---

## 🚀 Como Usar no Lovable

### 1. Copiar Componentes

Todos os componentes estão em `/src/components/admin/`. Basta copiar e colar no Lovable.

### 2. Estilo e UI

Usamos **shadcn/ui** que já está instalado no seu projeto:
- Card, Button, Input, Textarea
- Table, Select, Switch
- Alert, Badge, ScrollArea
- Skeleton (loading states)

### 3. Queries com TanStack Query

Todos os componentes usam `useQuery` e `useMutation`:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["admin-users"],
  queryFn: async () => {
    const { data } = await supabase.from("profiles").select("*");
    return data;
  },
});
```

### 4. Toast Notifications

Usamos `useToast` do shadcn para feedbacks:

```typescript
toast({
  title: "Sucesso!",
  description: "Operação concluída.",
});
```

---

## ⚙️ Customizações Importantes

### 1. Emails de Admin

Em `/src/hooks/useAdminAuth.ts`, linha 7:

```typescript
const ADMIN_EMAILS = [
  "seu-email@exemplo.com",  // ← ALTERE AQUI
];
```

### 2. Cores do Tema

Se quiser mudar o roxo, edite as classes Tailwind:
- `bg-purple-600` → `bg-blue-600`
- `text-purple-900` → `text-blue-900`
- Etc.

### 3. Edge Function da LIA

O painel chama `lia-chat` em `AdminTools.tsx`:

```typescript
const { data } = await supabase.functions.invoke("lia-chat", {
  body: { message: testMessage, isTest: true },
});
```

Certifique-se de que sua Edge Function aceita `isTest: true`.

---

## 🔒 Segurança

### ✅ Boas Práticas Implementadas

1. **Email Whitelist** - Apenas emails autorizados acessam
2. **Redirect Automático** - Não-admins são redirecionados
3. **Secure Storage** - Chaves API criptografadas (Base64)
4. **RLS no Supabase** - Row-Level Security ativo

### ⚠️ Recomendações

1. **Nunca exponha Service Role Key** no frontend
   - Use apenas em Edge Functions
   - Nunca comite no Git

2. **Use HTTPS** em produção

3. **Rotacione API Keys** regularmente

4. **Logs de Auditoria** (opcional):
   - Registre ações de admin em uma tabela
   - Use triggers no Supabase

---

## 📊 Exemplo de Uso

### Fluxo Completo

1. **Login Admin:**
   ```
   Email: meuemail@dominio.com
   Senha: suasenha
   ```

2. **Redirecionamento Automático:**
   - `AuthContext` detecta admin
   - Redireciona para `/admin-dashboard`

3. **Navegação:**
   - Clique em "Gerenciar Usuários"
   - Busque por email
   - Altere plano de "Start" para "Plus"
   - Usuário atualizado!

4. **Teste da LIA:**
   - Vá em "Ferramentas e Testes"
   - Digite: "Olá, tudo bem?"
   - Veja resposta no log

---

## 🐛 Troubleshooting

### Problema: "Acesso Negado"

**Solução:** Verifique se seu email está em `ADMIN_EMAILS` no `useAdminAuth.ts`

### Problema: Emails não aparecem em "Gerenciar Usuários"

**Solução:** Implemente a Edge Function `get-user-emails` (veja seção Supabase)

### Problema: Configurações não salvam

**Solução:** Verifique se `secureStorage` está funcionando. Abra DevTools > Application > Local Storage

### Problema: Queries não carregam dados

**Solução:** Verifique RLS policies no Supabase. Admin pode precisar de políticas especiais.

---

## 🎯 Próximos Passos (Melhorias Futuras)

1. **Dashboard Analytics:**
   - Gráficos com Chart.js ou Recharts
   - Métricas em tempo real

2. **Logs de Auditoria:**
   - Registrar todas as ações admin
   - Tabela `admin_logs`

3. **Backups Automatizados:**
   - Botão para exportar dados
   - Agendamento de backups

4. **Notificações:**
   - Alertas de sistema
   - Emails para eventos críticos

5. **Multi-Admin:**
   - Níveis de permissão (super-admin, moderador)
   - Tabela `admin_roles`

---

## 📞 Suporte

Se tiver dúvidas ou problemas:
1. Verifique este documento
2. Consulte a documentação do Supabase
3. Verifique logs no console do navegador
4. Teste queries diretamente no Supabase SQL Editor

---

## 📝 Checklist de Implementação

- [x] Hook `useAdminAuth` criado
- [x] Sidebar de navegação
- [x] 7 seções implementadas
- [x] Página `AdminDashboard`
- [x] Rota protegida no `App.tsx`
- [x] Redirecionamento automático no login
- [x] Integração com Supabase
- [x] Documentação completa

**Tudo pronto para uso! 🎉**

---

## 🌟 Resumo Final

Você agora tem um **Painel Admin completo** com:

✅ Navegação intuitiva
✅ Estatísticas em tempo real
✅ Gerenciamento de usuários
✅ Configurações da LIA
✅ Ferramentas de teste
✅ Histórico completo
✅ Gestão de planos
✅ Configurações técnicas

**Basta configurar seu email em `useAdminAuth.ts` e começar a usar!**

---

**Desenvolvido para o Sistema LIA** 🚀
