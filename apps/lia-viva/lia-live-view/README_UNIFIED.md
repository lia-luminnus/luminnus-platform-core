# 🚀 LIA UNIFIED - Arquitetura Consolidada

**Versão:** 4.0.0
**Porta:** 3000 (Unificada)
**Status:** ✅ Pronto para Uso

---

## 🎯 INÍCIO RÁPIDO

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Ambiente
Criar arquivo `.env` na raiz do projeto:
```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
PORT=3000
NODE_ENV=development
```

### 3. Executar

**Desenvolvimento (Frontend + Backend juntos):**
```bash
npm run dev
```

**Produção:**
```bash
npm run build
npm start
```

---

## 📦 SCRIPTS DISPONÍVEIS

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Frontend (Vite) + Backend (Express) em paralelo |
| `npm run dev:frontend` | Apenas frontend (Vite) |
| `npm run dev:backend` | Apenas backend (Node + Express) |
| `npm run build` | Build de produção (gera `dist/`) |
| `npm start` | Servidor unificado (produção) |
| `npm run preview` | Preview do build |

---

## 🌐 ENDPOINTS DISPONÍVEIS

### Saúde
- `GET /api/health` - Status do servidor

### Sessão
- `GET /api/session` - Sessão atual + API Key
- `GET /api/history` - Histórico de mensagens
- `POST /api/history/save` - Salvar mensagem

### Chat
- `POST /chat` - Conversa com GPT-4o/Mini
- `POST /api/stt` - Speech-to-Text (Whisper)
- `POST /api/tts` - Text-to-Speech

### Memórias
- `GET /api/memories` - Listar memórias
- `POST /api/memory/save` - Salvar memória
- `DELETE /api/memories/:id` - Deletar memória

### Ferramentas
- `POST /api/web-search` - Busca web (Google)

### WebSocket
- `ws://localhost:3000` - Socket.io Realtime

---

## 🔍 VERIFICAÇÃO RÁPIDA

```bash
# 1. Saúde do servidor
curl http://localhost:3000/api/health

# 2. Sessão
curl http://localhost:3000/api/session

# 3. Memórias
curl http://localhost:3000/api/memories
```

---

## 🏗️ ARQUITETURA

```
Port 3000 (UNIFICADO)
├── Express Server
│   ├── APIs REST (/api/*)
│   ├── Socket.io (WebSocket)
│   ├── WebRTC Realtime
│   ├── GPT-4o/Mini
│   └── Gemini Live API
│
└── Frontend
    ├── Vite (Dev)
    └── Static Files (Prod - dist/)
```

---

## 📚 DOCUMENTAÇÃO

- **MIGRATION_GUIDE.md** - Guia completo de migração
- **AUDIT_REPORT.md** - Relatório de auditoria
- **CRITICAL_FIXES_REPORT.md** - Correções críticas
- **ARCHITECTURE_CONSOLIDATION.md** - Arquitetura consolidada

---

## ⚙️ CONFIGURAÇÃO

### Variáveis de Ambiente (`.env`)

```env
# OpenAI (Obrigatório)
OPENAI_API_KEY=sk-...

# Gemini (Obrigatório para Gemini Live)
GEMINI_API_KEY=AIza...
# OU
GOOGLE_API_KEY=AIza...
# OU
API_KEY=AIza...

# Google Search (Opcional)
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...

# Servidor
PORT=3000
NODE_ENV=development
```

---

## 🐛 PROBLEMAS COMUNS

### "Cannot find module"
- Verificar que `npm install` foi executado
- Verificar imports em `server/` usam extensão `.js`

### "Port 3000 already in use"
```bash
# Windows
taskkill /F /IM node.exe

# Linux/Mac
pkill -f node
```

### "API Key not configured"
- Verificar arquivo `.env` existe
- Verificar chaves estão corretas

---

## ✅ STATUS DE FUNCIONALIDADES

| Funcionalidade | Status |
|----------------|--------|
| Frontend (React) | ✅ Funcionando |
| Backend (Express) | ✅ Funcionando |
| GPT-4o/Mini | ✅ Funcionando |
| Gemini Live | ✅ Funcionando |
| Socket.io | ✅ Funcionando |
| WebRTC | ✅ Funcionando |
| Memórias | ✅ Funcionando |
| Web Search | ✅ Funcionando |
| TTS/STT | ✅ Funcionando |

---

## 🎉 PRONTO!

Depois de `npm install`, execute:
```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

**Desenvolvido por:** Luminnus Intelligence
**Última Atualização:** 2025-12-03
**Versão:** 4.0.0
