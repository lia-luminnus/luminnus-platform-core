# Luminnus Platform Core

**Source of Truth único** para todo o ecossistema Luminnus/LIA.

## 🚀 Quick Start

```bash
# Instalar dependências
pnpm install

# Rodar em desenvolvimento (API + Apps)
pnpm dev

# Rodar apenas a API
cd packages/api && pnpm dev
```

## 📁 Estrutura

```
luminnus-platform-core/
├── apps/
│   ├── web/           # Site + Admin (Vite + React)
│   ├── dashboard/     # Dashboard do Cliente
│   └── lia-modes/     # ChatMode, Multimodal, LiveMode
├── packages/
│   ├── api/           # Backend API (Express)
│   ├── core/          # Business logic (planos, gating)
│   ├── database/      # SQL/migrations Supabase
│   └── shared/        # Types, constants
├── .env.example
├── .env.development
└── .env.staging
```

## 🔌 Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `GET /health` | Status do sistema e serviços |
| `GET /version` | Versão da API e ambiente |
| `GET /api/me` | Dados do usuário autenticado |
| `WS /ws` | WebSocket para Chat/Multimodal/Live |

## ⚙️ Variáveis de Ambiente

```bash
NODE_ENV=development
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx  # Apenas backend!
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
BASE_URL=http://localhost:5000
WS_URL=ws://localhost:5000
```

## 📊 Planos

| Plano | Modos | Principais Features |
|-------|-------|---------------------|
| **Start** | Chat | Chat básico, calendário simples |
| **Plus** | Multimodal | + Arquivos, relatórios |
| **Pro** | Live | + Voz/vídeo, automações |

## 🗄️ Database

Migrations estão em `packages/database/migrations/`:

1. `001_initial_schema.sql` - Schema inicial
2. `002_rls_policies.sql` - Row Level Security

Execute no Supabase SQL Editor ou via CLI.

## 📝 Migração

Após este scaffold:

1. Clone repos existentes para dentro dos apps
2. Ajuste imports para usar `@luminnus/shared`
3. Configure `.env.development` com chaves reais
4. Execute migrations no Supabase
5. Teste endpoints com `curl`

## 🧪 Testar Endpoints

```bash
# Health check
curl http://localhost:5000/health

# Version
curl http://localhost:5000/version

# Me (com token mockado em dev)
curl http://localhost:5000/api/me -H "Authorization: Bearer test"
```
