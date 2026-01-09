# 🏗️ ARQUITETURA DEFINITIVA - LIA VIVA

**Versão:** 5.0.0 - CONSOLIDADA
**Data:** 2025-12-03
**Status:** ✅ DEFINIÇÃO OFICIAL

---

## 🎯 PRINCÍPIO FUNDAMENTAL

### GPT-4o/4o Mini = CÉREBRO 🧠
**Responsabilidades:**
- Raciocínio lógico
- Tomada de decisões
- Planejamento estratégico
- Processamento de texto
- Chat completo
- **Memória** (salvar, detectar, carregar, usar)
- Gestão de contexto longo
- Supabase (dados persistentes)
- Orquestração de ferramentas
- Análise corporativa
- Geração de relatórios
- Comandos complexos

### Gemini Live API = CORPO 👁️🎤
**Responsabilidades:**
- **Voz** (captura, STT, TTS)
- **Avatar** (central e lateral)
- **Estados visuais** (listening, speaking, thinking, idle)
- Reações visuais
- **Renderização multimodal**
- Análise de imagens/vídeos
- Criação de imagens (Imagen 3)
- Criação de vídeos (Veo 3)
- Cards, gráficos, elementos visuais
- **Busca Web + Grounding**
- Google Search + Maps
- Câmera no navegador
- PDFs, documentos, fotos

### ⚠️ REGRA DE OURO
```
SE visual/voz/áudio/imagem/vídeo/avatar → 100% GEMINI
SE raciocínio/texto/decisão/memória/dados → 100% GPT
```

---

## 📐 FLUXOS OBRIGATÓRIOS

### Fluxo 1: Usuário Fala
```
1. Gemini: Captura áudio
2. Gemini: Transcreve (STT)
3. Gemini: Envia texto → GPT
4. GPT: Pensa, decide, cria resposta
5. GPT: Envia texto final → Gemini
6. Gemini: Gera voz (TTS)
7. Gemini: Anima avatar
8. Gemini: Renderiza visual
9. Painel: Mostra tudo sincronizado
```

### Fluxo 2: Usuário Envia Imagem
```
1. Gemini: Lê e interpreta imagem
2. Gemini: Envia contexto → GPT
3. GPT: Analisa profundamente
4. GPT: Cria resposta textual
5. Gemini: Apresenta visualmente
6. Gemini: Narra em voz (se necessário)
```

### Fluxo 3: Criação de Mídia
```
1. GPT: Entende intenção do usuário
2. GPT: Decide criar mídia
3. GPT: Chama ferramenta Gemini
4. Gemini: Gera imagem/vídeo
5. Gemini: Exibe no painel
6. Gemini: Narra criação (se necessário)
```

### Fluxo 4: Busca Web
```
1. GPT: Detecta necessidade de busca
2. GPT: Chama função searchWeb
3. Gemini Grounding: Busca Google
4. Gemini: Retorna resultados
5. GPT: Analisa e sintetiza
6. Gemini: Apresenta visualmente
```

### Fluxo 5: Memória
```
1. GPT: Detecta informação importante
2. GPT: Chama função saveMemory
3. Backend: Salva no Supabase
4. GPT: Confirma salvamento
5. Gemini: Notifica usuário visualmente
```

---

## 🗂️ ESTRUTURA DE ARQUIVOS

```
lia-unified/
├── server/                          # Backend (GPT Cérebro)
│   ├── server.ts                   # Servidor principal
│   ├── routes/
│   │   ├── session.ts              # Sessão + API Key
│   │   ├── chat.ts                 # GPT Chat (função + memória)
│   │   ├── memory.ts               # CRUD memórias
│   │   └── search.ts               # Web search
│   ├── assistants/
│   │   └── gpt4-mini.js            # GPT-4o/Mini
│   ├── realtime/                   # Socket.io (não Gemini)
│   │   ├── realtime.js
│   │   └── realtime-voice-api.js
│   └── search/
│       └── web-search.js           # Google Custom Search
│
├── src/                             # Frontend (Interface)
│   ├── services/
│   │   ├── backendService.ts       # Comunicação com GPT
│   │   ├── configService.ts        # Config + API Key
│   │   └── geminiLiveService.ts    # Gemini Live API (Corpo)
│   │
│   ├── components/
│   │   ├── AvatarDisplay.tsx       # Avatar (Gemini)
│   │   ├── ChatMessages.tsx        # Chat (GPT)
│   │   ├── VoiceControls.tsx       # Controles (Gemini)
│   │   ├── MemoryPanel.tsx         # Memória (GPT)
│   │   └── VisualOutput.tsx        # Multimodal (Gemini)
│   │
│   └── AppUnified.tsx               # Orquestrador principal
│
└── package.json
```

---

## 🔌 ENDPOINTS E RESPONSABILIDADES

### Backend (GPT Cérebro) - Port 3000

| Endpoint | Responsável | Função |
|----------|-------------|--------|
| `GET /api/session` | GPT | Sessão + API Key |
| `GET /api/history` | GPT | Histórico mensagens |
| `POST /chat` | GPT | Chat + Function Calling |
| `GET /api/memories` | GPT | Listar memórias |
| `POST /api/memory/save` | GPT | Salvar memória |
| `DELETE /api/memories/:id` | GPT | Deletar memória |
| `POST /api/web-search` | GPT→Gemini | Orquestra busca |
| `POST /api/stt` | Gemini | Speech-to-Text |
| `POST /api/tts` | Gemini | Text-to-Speech |
| `ws://socket.io` | Realtime | WebSocket (não Gemini Live) |

### Frontend (Gemini Corpo) - Services

| Service | Responsável | Função |
|---------|-------------|--------|
| `backendService.ts` | GPT | API calls para backend |
| `configService.ts` | Config | Buscar API keys |
| `geminiLiveService.ts` | Gemini | WebRTC + Gemini Live API |
| `multimodalService.ts` | Gemini | Imagen, Veo, Cards |

---

## 🎨 INTERFACE DO PAINEL

### Modo 1: Chat (Lateral Direito)
```
┌─────────────────┐
│ 💬 Chat Mode    │
├─────────────────┤
│ [Avatar Mini]   │
│                 │
│ Messages...     │
│ Messages...     │
│                 │
│ [Input Text]    │
│ [🎤 Mic]        │
└─────────────────┘
```

**Características:**
- Avatar pequeno no topo
- Chat textual predominante
- Microfone para voz rápida
- Respostas texto + áudio
- Modo rápido e direto

### Modo 2: LIA Live (Central)
```
┌───────────────────────────────┐
│      🎭 LIA LIVE MODE         │
├───────────────────────────────┤
│                               │
│      [AVATAR GRANDE]          │
│       Animado + Reativo       │
│                               │
├───────────────────────────────┤
│   [Multimodal Render Area]    │
│   - Imagens                   │
│   - Vídeos                    │
│   - Gráficos                  │
│   - Cards                     │
└───────────────────────────────┘
```

**Características:**
- Avatar grande e expressivo
- Voz contínua (Gemini TTS)
- Animações faciais
- Mãos animadas
- Visualizações multimodais
- Cards dinâmicos
- Reações em tempo real

### Switch de Modos
```typescript
const [mode, setMode] = useState<'chat' | 'live'>('chat');

<button onClick={() => setMode('chat')}>💬 Chat</button>
<button onClick={() => setMode('live')}>🎭 LIA Live</button>
```

---

## 🔄 COMUNICAÇÃO ENTRE SERVIÇOS

### AppUnified.tsx (Orquestrador)
```typescript
// Estado unificado
const [messages, setMessages] = useState([]);
const [avatarState, setAvatarState] = useState('idle');
const [isGeminiConnected, setIsGeminiConnected] = useState(false);

// Refs para serviços
const geminiServiceRef = useRef<GeminiLiveService>();
const backendServiceRef = useRef<BackendService>();

// Fluxo: Usuário fala
const handleUserTranscription = async (transcript: string) => {
  // 1. Gemini transcreveu
  setAvatarState('thinking');

  // 2. Envia para GPT
  const response = await backendServiceRef.current.chat(transcript);

  // 3. GPT respondeu, Gemini fala
  if (response.audio) {
    // Gemini TTS
    geminiServiceRef.current.playAudio(response.audio);
    setAvatarState('speaking');
  }

  // 4. Atualiza UI
  setMessages(prev => [...prev, response]);
};
```

### Separação Clara
```typescript
// ❌ ERRADO - GPT tentando fazer voz
const gptResponse = await openai.audio.speech.create(...);

// ✅ CORRETO - Gemini faz voz
const geminiService.speak(gptResponseText);
```

```typescript
// ❌ ERRADO - Gemini tentando salvar memória
geminiLive.saveMemory(...);

// ✅ CORRETO - GPT salva memória
backendService.saveMemory(...);
```

---

## 🚫 ANTI-PADRÕES (NÃO FAZER)

### 1. Duplicação de Sessão
```typescript
// ❌ ERRADO
let sessionGPT = createSession();
let sessionGemini = createSession();

// ✅ CORRETO
let session = createSession(); // Única sessão no backend
```

### 2. GPT Fazendo Voz
```typescript
// ❌ ERRADO
async function gptSpeak(text) {
  const audio = await openai.audio.speech.create({...});
  playAudio(audio);
}

// ✅ CORRETO
async function gptToGeminiSpeak(text) {
  const response = await gptChat(text);
  geminiService.speak(response.text);
}
```

### 3. Gemini Salvando Memória
```typescript
// ❌ ERRADO
geminiLive.on('important', (data) => {
  saveMemory(data);
});

// ✅ CORRETO
geminiLive.on('transcription', (text) => {
  gptBackend.processAndSaveIfImportant(text);
});
```

### 4. WebSocket Loop
```typescript
// ❌ ERRADO
audioProcessor.onaudioprocess = () => {
  session.sendAudio(data); // Sem verificar estado
};

// ✅ CORRETO
audioProcessor.onaudioprocess = () => {
  if (isConnected && !isClosing) {
    session.sendAudio(data);
  }
};
```

---

## 📊 ESTADO DO AVATAR (Gemini)

```typescript
type AvatarState =
  | 'idle'       // Parado, aguardando
  | 'listening'  // Ouvindo usuário (Gemini capturando)
  | 'thinking'   // Processando (GPT pensando)
  | 'speaking'   // Falando (Gemini TTS)
  | 'analyzing'  // Analisando mídia (Gemini)
  | 'creating';  // Gerando mídia (Gemini)

// Mudanças de estado
Gemini STT inicia → 'listening'
GPT recebe texto → 'thinking'
Gemini TTS inicia → 'speaking'
Gemini TTS termina → 'idle'
```

---

## 🎯 CHECKLIST DE CONFORMIDADE

### GPT (Cérebro) ✅
- [ ] Chat usa GPT-4o/Mini
- [ ] Memória salva via GPT
- [ ] Busca web orquestrada por GPT
- [ ] Function calling ativo
- [ ] Supabase gerenciado por GPT
- [ ] Contexto longo mantido
- [ ] Decisões lógicas por GPT

### Gemini (Corpo) ✅
- [ ] Voz capturada por Gemini
- [ ] STT feito por Gemini
- [ ] TTS feito por Gemini
- [ ] Avatar controlado por Gemini
- [ ] Multimodal renderizado por Gemini
- [ ] Imagens analisadas por Gemini
- [ ] Busca visual por Gemini
- [ ] Cards criados por Gemini

### Integração ✅
- [ ] Fluxo GPT→Gemini funcionando
- [ ] Fluxo Gemini→GPT funcionando
- [ ] Sem duplicação de sessão
- [ ] Sem conflito de responsabilidades
- [ ] WebSocket estável
- [ ] Avatar reage a estados
- [ ] UI sincronizada

---

**Status:** ✅ ARQUITETURA OFICIAL DEFINIDA
**Próximo:** Implementação e correções

**Data:** 2025-12-03
**Versão:** 5.0.0
