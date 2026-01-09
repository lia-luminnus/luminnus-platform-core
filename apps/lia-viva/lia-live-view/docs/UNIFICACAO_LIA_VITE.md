# 🔄 Unificação LIA Vite - Documentação

## Resumo

A LIA foi unificada em um único projeto **Vite + React**, sem dependência de Next.js.

## Estrutura Final

```
lia-live-view/
├── src/
│   ├── App.tsx                    # Shell principal com 3 modos
│   ├── index.tsx                  # Entry point
│   ├── index.css                  # Estilos base + Tailwind
│   ├── context/
│   │   └── LIAContext.tsx         # Estado global da LIA (MENTE ÚNICA)
│   ├── hooks/
│   │   └── useLIA.ts              # Hook para usar contexto LIA
│   ├── panels/
│   │   ├── ChatMode/
│   │   │   └── ChatMode.tsx       # Painel de chat
│   │   ├── MultiModalMode/
│   │   │   └── MultiModalMode.tsx # Painel multi-modal
│   │   └── LiveFullBodyMode/
│   │       └── LiveFullBodyMode.tsx # Painel live corpo inteiro
│   ├── components/
│   │   ├── layout/
│   │   │   ├── LiaSidebar.tsx     # Sidebar de navegação
│   │   │   └── CircuitBackground.tsx # Background animado
│   │   └── shared/                # Componentes reutilizáveis
│   └── styles/
│       └── lia-viva.css           # Tema neon cyberpunk
├── services/                       # Serviços existentes (não alterados)
│   ├── backendService.ts
│   ├── geminiLiveService.ts
│   └── ...
├── server/                         # Backend Express (não alterado)
│   ├── server.ts
│   └── routes/
└── components/                     # Componentes antigos (referência)
```

## Como a LIA Funciona

### Mente Única (LIAContext)

O `LIAContext.tsx` é o coração da LIA:

- **Conexão Socket.IO única** (singleton) para todos os painéis
- **Estado compartilhado**: mensagens, conexão, modo atual
- **Troca de modo** não recria a LIA - apenas muda a "casca"

```typescript
// Qualquer painel usa o mesmo contexto:
const { messages, sendTextMessage, currentMode } = useLIA();
```

### Fluxo de Mensagens

```
Usuário digita → ChatMode/MultiModal/Live
       ↓
LIAContext.sendTextMessage()
       ↓
Socket.IO → Backend (porta 3000)
       ↓
Backend processa (GPT-4o, memória, tools)
       ↓
Socket.IO ← 'lia-message'
       ↓
LIAContext atualiza estado
       ↓
Todos os painéis veem a resposta
```

## Como Rodar

```bash
cd D:\Projeto_Lia_Node_3_gpt\lia-live-view
npm run dev
```

Acesse: http://localhost:3000

## Componentes Migrados

| Origem (Next.js) | Destino (Vite) |
|------------------|----------------|
| `chat-mode.tsx` | `src/panels/ChatMode/ChatMode.tsx` |
| `multi-modal.tsx` | `src/panels/MultiModalMode/MultiModalMode.tsx` |
| `live-mode.tsx` | `src/panels/LiveFullBodyMode/LiveFullBodyMode.tsx` |
| `sidebar.tsx` | `src/components/layout/LiaSidebar.tsx` |
| `circuit-background.tsx` | `src/components/layout/CircuitBackground.tsx` |
| `globals.css` | `src/styles/lia-viva.css` |

## O que NÃO foi alterado

- ✅ `server/server.ts` - Backend Express
- ✅ `server/routes/*` - Rotas da API
- ✅ `services/geminiLiveService.ts` - Gemini Live
- ✅ `services/backendService.ts` - Cliente HTTP
- ✅ `config/supabase.js` - Memória

## Próximos Passos

1. **Integrar Gemini Live** no Live Mode (startVoice/stopVoice)
2. **Adicionar TTS** para respostas de áudio
3. **Sincronizar avatar** com estado da LIA
4. **Upload de arquivos** funcional nos painéis
