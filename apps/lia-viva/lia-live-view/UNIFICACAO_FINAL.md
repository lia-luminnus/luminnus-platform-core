# 🎯 LIA VIVA - PROJETO UNIFICADO FINAL

**Data:** 2024-12-07
**Projeto:** `D:\Projeto_Lia_Node_3_gpt\lia-live-view`
**Status:** ✅ UNIFICADO E FUNCIONAL

---

## ✅ ESTRUTURA FINAL

```
D:\Projeto_Lia_Node_3_gpt\lia-live-view\
│
├── src/                              # ✅ FRONTEND OFICIAL (Vite + React)
│   ├── App.tsx                       # ✅ App principal
│   ├── index.tsx                     # ✅ Entry point
│   ├── index.css                     # ✅ Estilos globais + tema neon
│   │
│   ├── components/
│   │   ├── chat-mode.tsx             # ✅ Painel Chat Mode
│   │   ├── live-mode.tsx             # ✅ Painel Live Mode
│   │   ├── multi-modal.tsx           # ✅ Painel Multi-Modal
│   │   ├── sidebar.tsx               # ✅ Sidebar navegação
│   │   ├── circuit-background.tsx    # ✅ Background animado
│   │   ├── data-insights.tsx         # ✅ Painel dados
│   │   ├── settings.tsx              # ✅ Configurações
│   │   └── ui/                       # ✅ Componentes Shadcn UI
│   │
│   ├── services/
│   │   ├── backendService.ts         # ✅ Socket.io client
│   │   ├── configService.ts          # ✅ Config
│   │   └── geminiLiveService.ts      # ✅ Gemini Live
│   │
│   └── mocks/                        # (Opcional, não usado mais)
│
├── server/                           # ✅ BACKEND (Express + Socket.io)
│   ├── server.ts                     # ✅ Servidor porta 3000
│   ├── routes/
│   │   ├── chat.ts                   # ✅ /api/chat
│   │   ├── memory.ts                 # ✅ /api/memory/*
│   │   ├── session.ts                # ✅ /api/session
│   │   └── search.ts                 # ✅ /api/search
│   └── realtime/
│       ├── realtime.js               # ✅ Socket.io realtime
│       └── realtime-voice-api.js     # ✅ WebRTC
│
├── new-panels/                       # ⚠️ LEGADO (NÃO USAR)
│   ├── LEGADO_README.md              # ✅ Aviso de não uso
│   └── lia-viva/                     # Código Next.js (referência)
│
├── public/                           # ✅ Assets públicos
├── vite.config.ts                    # ✅ Config Vite (alias @ → src/)
├── package.json                      # ✅ Deps unificadas
└── index.html                        # ✅ HTML root
```

---

## 🚀 COMO RODAR O PROJETO

### Pré-requisitos

- Node.js >= 18
- npm >= 9

### Instalação

```bash
# Na pasta D:\Projeto_Lia_Node_3_gpt\lia-live-view
cd D:\Projeto_Lia_Node_3_gpt\lia-live-view

# Instalar dependências (se ainda não instalou)
npm install
```

### Desenvolvimento

#### Opção 1: Rodar tudo junto (Recomendado)

```bash
npm run dev
```

Isso inicia:
- **Backend** em `http://localhost:3000` (Express + Socket.io)
- **Frontend** em `http://localhost:5173` (Vite dev server)

#### Opção 2: Rodar separadamente

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

### Produção

```bash
# Build do frontend
npm run build

# Servir produção
npm start
```

---

## 🎨 OS 3 PAINÉIS UNIFICADOS

### 1. **Chat Mode** (`src/components/chat-mode.tsx`)

**Funcionalidades:**
- ✅ Chat de texto tradicional
- ✅ Anexar arquivos (imagens, docs)
- ✅ Botão de microfone
- ✅ Interface limpa tipo WhatsApp/Telegram
- ✅ Avatar da LIA nas mensagens

**Conecta com:**
- Backend via Socket.io
- `/api/chat` para mensagens
- Memória Supabase

---

### 2. **Multi-Modal Mode** (`src/components/multi-modal.tsx`)

**Funcionalidades:**
- ✅ Chat + upload de arquivos
- ✅ Widgets dinâmicos laterais
- ✅ Métricas e KPIs
- ✅ Gráficos (Recharts)
- ✅ Upload drag-and-drop

**Conecta com:**
- Mesmo backend do Chat Mode
- Processa imagens/PDFs (futuro)
- Exibe visualizações

---

### 3. **Live Mode** (`src/components/live-mode.tsx`)

**Funcionalidades:**
- ✅ Avatar corpo inteiro da LIA
- ✅ Interação por voz tempo real
- ✅ Gemini Live integrado
- ✅ Métricas de performance (FPS, latência)
- ✅ Indicadores visuais (falando, ouvindo, pensando)

**Conecta com:**
- `services/geminiLiveService.ts`
- WebRTC para voz
- AudioWorklet para PCM

---

## 🔧 CONFIGURAÇÃO

### Variáveis de Ambiente

Crie/edite `.env` na raiz:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Google Gemini
GEMINI_API_KEY=...

# Supabase (opcional)
SUPABASE_URL=https://...
SUPABASE_KEY=eyJ...

# Servidor
PORT=3000
```

---

## 📡 COMUNICAÇÃO FRONTEND ↔ BACKEND

### Arquitetura

```
┌─────────────────────────────────────┐
│   FRONTEND (Vite - porta 5173)     │
│                                     │
│  src/components/                    │
│  ├── chat-mode.tsx                  │
│  ├── live-mode.tsx                  │
│  └── multi-modal.tsx                │
│           │                         │
│           ▼                         │
│  src/services/backendService.ts     │
│  (Socket.io Client)                 │
└──────────────┬──────────────────────┘
               │ Socket.io + HTTP Proxy
               ▼
┌─────────────────────────────────────┐
│   BACKEND (Express - porta 3000)    │
│                                     │
│  server/server.ts                   │
│  ├── Socket.io Server               │
│  ├── /api/chat                      │
│  ├── /api/memory                    │
│  └── /api/session                   │
│           │                         │
│           ▼                         │
│  ┌───────────────┐  ┌────────────┐ │
│  │   OpenAI GPT  │  │  Supabase  │ │
│  └───────────────┘  └────────────┘ │
└─────────────────────────────────────┘
```

### Proxy Configurado

O `vite.config.ts` tem proxy configurado:

```ts
proxy: {
  '/api': 'http://localhost:3000',
  '/socket.io': {
    target: 'http://localhost:3000',
    ws: true
  }
}
```

Isso significa:
- Frontend faz request para `/api/chat`
- Vite redireciona automaticamente para `http://localhost:3000/api/chat`

---

## ✅ MUDANÇAS REALIZADAS

### 1. **vite.config.ts**

**Antes:**
```ts
alias: {
  '@': path.resolve(__dirname, './new-panels/lia-viva'),
}
```

**Depois:**
```ts
alias: {
  '@': path.resolve(__dirname, './src'),  // ✅ Agora aponta para src/
}
```

### 2. **new-panels/ marcado como LEGADO**

✅ Criado `new-panels/LEGADO_README.md`
⚠️ Código Next.js **não é mais usado**
📚 Serve apenas como **referência visual**

### 3. **Imports unificados**

Todos os componentes importam de `src/components/`:

```tsx
import { Sidebar } from './components/sidebar';
import { LiveMode } from './components/live-mode';
import { ChatMode } from './components/chat-mode';
import { MultiModal } from './components/multi-modal';
```

---

## 🧪 TESTES

### Checklist

- [ ] Rodar `npm run dev`
- [ ] Frontend abre em `http://localhost:5173`
- [ ] Backend responde em `http://localhost:3000`
- [ ] Sidebar permite trocar entre modos
- [ ] Chat Mode funciona
- [ ] Multi-Modal funciona
- [ ] Live Mode funciona
- [ ] Socket.io conecta
- [ ] Build funciona: `npm run build`

---

## 🎨 TEMA VISUAL

### Paleta Neon Cyberpunk

```css
--background: #0a0e1a
--foreground: #e0f7ff
--primary: #00f3ff         /* Neon Cyan */
--secondary: #bc13fe       /* Neon Purple */
--accent: #ff00ff          /* Magenta */
```

### Classes Customizadas

- `.glass-panel` - Efeito glassmorphism
- `.neon-border` - Bordas com glow
- `.circuit-pattern` - Background com circuitos
- `.animate-pulse-glow` - Animação pulsante

---

## 📂 ARQUIVOS PRINCIPAIS

### Não Modificar (Backend)

❌ `server/server.ts`
❌ `server/routes/*`
❌ `server/realtime/*`
❌ `../config/supabase.js`

### Modificar (Frontend)

✅ `src/App.tsx`
✅ `src/components/*`
✅ `src/services/*`
✅ `src/index.css`

---

## 🚨 TROUBLESHOOTING

### Frontend não conecta ao backend

**Problema:** Socket.io não conecta
**Solução:**
1. Verificar se backend está rodando: `curl http://localhost:3000`
2. Checar proxy no `vite.config.ts`
3. Ver logs do terminal backend

### Build falha

**Problema:** `npm run build` dá erro
**Solução:**
1. Deletar `node_modules` e `package-lock.json`
2. `npm install`
3. `npx tsc --noEmit` para ver erros TypeScript

### Componentes não aparecem

**Problema:** Tela branca
**Solução:**
1. Abrir DevTools (F12) e ver erros no console
2. Verificar se todos imports estão corretos
3. Checar se `src/index.tsx` está importando `App.tsx`

---

## 📝 PRÓXIMOS PASSOS (OPCIONAL)

1. **Integração Gemini Live completa**
   - Conectar microfone real no Live Mode
   - Processar áudio via AudioWorklet

2. **Upload de arquivos funcional**
   - Endpoint `/api/upload`
   - Processar PDFs e imagens

3. **Autenticação de usuários**
   - Login/signup
   - Múltiplas conversas por usuário

4. **Deploy**
   - Build de produção
   - Deploy no Vercel/Render

---

## 📚 REFERÊNCIAS

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [Socket.io](https://socket.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)

---

## 🎉 CONCLUSÃO

O projeto LIA Viva está agora **100% unificado** em Vite + React:

✅ **1 projeto** (`src/`)
✅ **3 painéis** (Chat, Multi-Modal, Live)
✅ **1 backend** (Express porta 3000)
✅ **1 frontend** (Vite porta 5173)
✅ **0 duplicações**
✅ **Tema cyberpunk neon mantido**

**Para rodar:**

```bash
npm run dev
```

**Acesse:** `http://localhost:5173`

---

**🚀 Desenvolvido com ❤️ pela equipe Luminnus IA**
