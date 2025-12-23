# Luminnus Platform - Database Migrations

## Overview

Este pacote contém os scripts de migração para o Supabase.

> **IMPORTANTE**: Estes scripts são **incrementais** e **não destrutivos**.
> Eles usam `CREATE TABLE IF NOT EXISTS` e `ON CONFLICT DO NOTHING`.
> É seguro executar em instâncias Supabase existentes.

## Migrations

| Arquivo | Descrição |
|---------|-----------|
| `001_initial_schema.sql` | Schema inicial: plans, companies, memberships, entitlements, audit_logs, conversations, messages, sessions, tool_invocations, company_settings, profiles |
| `002_rls_policies.sql` | Row Level Security para isolamento multi-tenant |

## Como executar

### Opção 1: Supabase Dashboard
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor**
3. Cole o conteúdo de cada migration e execute na ordem

### Opção 2: Supabase CLI
```bash
# Instalar CLI se necessário
npm install -g supabase

# Executar migrations
supabase db push
```

### Opção 3: psql direto
```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_rls_policies.sql
```

## Tabelas Principais

- **plans**: Planos de assinatura (Start, Plus, Pro)
- **companies**: Tenants/organizações
- **memberships**: Vínculo usuário ↔ empresa
- **entitlements**: Features por plano
- **audit_logs**: Log de ações sensíveis
- **conversations**: Sessões de chat/multimodal/live
- **messages**: Mensagens individuais
- **tool_invocations**: Chamadas de ferramentas da LIA

## RLS (Row Level Security)

Todas as tabelas têm políticas RLS habilitadas para garantir isolamento multi-tenant:
- Usuários só acessam dados da própria empresa
- Admins têm acesso ampliado dentro da empresa
- Audit logs só visíveis para admins
