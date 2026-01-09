# 🏗️ ARQUITETURA LIA VIVA - PAINEL UNIFICADO MULTIMODAL

## 📋 VISÃO GERAL

Este documento descreve a arquitetura completa do painel LIA Viva, preparado para suportar todas as capacidades multimodais da assistente inteligente Luminnus.

**Status:** ✅ Estrutura Base Implementada | 🚧 Integrações Multimodais Pendentes

---

## 🎯 CAPACIDADES SUPORTADAS

### 1. COMUNICAÇÃO HUMANA (Voz + Fala + Escuta)
- ✅ Conversação contínua via Gemini Live API
- ✅ Speech-to-Text (STT) em tempo real
- ✅ Text-to-Speech (TTS) emocional
- 🚧 Wake word detection ("LIA?")
- ✅ Estados visuais: idle, listening, thinking, responding
- 🚧 Waveform de áudio
- ✅ Feedback de microfone

### 2. VISÃO E CRIAÇÃO VISUAL
- 🚧 Geração de vídeos (Veo)
- 🚧 Geração de imagens (Imagen Pro)
- ✅ Análise de imagens
- 🚧 Avatares dinâmicos
- 🚧 Animações sobre imagem

### 3. RACIOCÍNIO AVANÇADO
- ✅ Execução de tarefas
- ✅ Resolução de problemas
- ✅ Contexto longo
- 🚧 Visualização de passos do raciocínio
- ✅ Geração de documentos

### 4. PESQUISA E DADOS REAIS
- ✅ Google Search integration
- 🚧 Google Maps integration
- 🚧 Renderização de mapas
- ✅ Resultados de pesquisa

---

## 📁 ESTRUTURA DE PASTAS

```
lia-live-view/
├── public/
│   └── lia/                          # Assets da LIA
│       ├── avatar/                   # Imagens do avatar (estados)
│       ├── emotions/                 # Expressões emocionais
│       ├── videos/                   # Vídeos gerados (Veo)
│       └── images/                   # Imagens geradas (Imagen)
│
├── components/
│   ├── panels/                       # Painéis principais
│   │   ├── HeaderLIA.tsx            # ✅ Header com status
│   │   ├── ChatMessages.tsx         # ✅ Chat multimodal
│   │   ├── LogsPanel.tsx            # ✅ System logs
│   │   ├── MemoryPanel.tsx          # ✅ Gerenciamento de memórias
│   │   └── ToolsPanel.tsx           # ✅ Ferramentas rápidas
│   │
│   ├── voice/                        # Controles de voz
│   │   ├── VoiceControls.tsx        # ✅ Controles WebRTC
│   │   ├── MicrophoneButton.tsx     # ✅ Botão de microfone
│   │   └── WaveformVisualizer.tsx   # 🚧 Visualização de ondas
│   │
│   ├── multimodal/                   # Componentes multimodais
│   │   ├── VideoPlayer.tsx          # 🚧 Player de vídeo Veo
│   │   ├── ImageViewer.tsx          # 🚧 Viewer de imagens
│   │   ├── MapRenderer.tsx          # 🚧 Renderizador de mapas
│   │   ├── ChartDisplay.tsx         # 🚧 Gráficos e visualizações
│   │   └── DocumentViewer.tsx       # 🚧 Viewer de documentos
│   │
│   ├── AvatarDisplay.tsx            # ✅ Avatar com estados
│   ├── PersonalitySelector.tsx      # ✅ Seletor de personalidade
│   ├── ConnectionPanel.tsx          # ✅ Painel de conexão
│   └── VisualOutput.tsx             # ✅ Output visual genérico
│
├── services/
│   ├── integrations/                 # Integrações externas
│   │   ├── backendBridge.ts         # 🚧 Ponte com Node 5000
│   │   ├── searchService.ts         # 🚧 Google Search
│   │   └── mapsService.ts           # 🚧 Google Maps
│   │
│   ├── media/                        # Serviços de mídia
│   │   ├── veoService.ts            # 🚧 Veo video generation
│   │   ├── imagenService.ts         # 🚧 Imagen image generation
│   │   └── audioProcessor.ts        # 🚧 Processamento de áudio
│   │
│   ├── geminiLiveService.ts         # ✅ Gemini Live API
│   ├── multimodalService.ts         # ✅ Serviço multimodal
│   ├── backendService.ts            # ✅ Backend Node 5000
│   └── configService.ts             # ✅ Configurações
│
├── types.ts                          # ✅ Tipos TypeScript
├── AppUnified.tsx                    # ✅ App principal
└── index.tsx                         # ✅ Entry point
```

---

## 🔌 PONTOS DE INTEGRAÇÃO

### Backend Node 5000 (LIA Core)

#### Endpoints Implementados:
```typescript
GET  /api/session           // ✅ Sessão atual + API Key
GET  /api/history           // ✅ Histórico de mensagens
POST /api/history/save      // ✅ Salvar mensagem
POST /api/memory/save       // ✅ Salvar memória
POST /chat                  // ✅ Chat com GPT-4
POST /api/stt               // ✅ Speech-to-Text
POST /api/tts               // ✅ Text-to-Speech
POST /api/web-search        // ✅ Busca na web
```

#### Endpoints Futuros (Preparados):
```typescript
POST /api/actions           // 🚧 Executar ações
POST /api/reasoning/steps   // 🚧 Passos do raciocínio
GET  /api/maps/search       // 🚧 Busca em mapas
POST /api/veo/generate      // 🚧 Gerar vídeo
POST /api/imagen/generate   // 🚧 Gerar imagem
```

### Gemini Live API (WebRTC)

```typescript
// ✅ Implementado
- Audio streaming bidirecional
- Transcrição em tempo real
- Tool calling (search, maps, media generation)
- Estados de conexão

// 🚧 Preparado para
- Wake word detection
- Emotion detection
- Multi-turn reasoning
- Vision input
```

---

## 🎨 LAYOUT DO PAINEL

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Status | Sessão | Ações                                  │
├──────────────┬─────────────────────────────────┬─────────────────┤
│              │                                 │                 │
│  LEFT PANEL  │        CENTER PANEL            │   RIGHT PANEL   │
│              │                                 │                 │
│  - Voice     │  - Chat multimodal              │  - Avatar       │
│  - Controls  │  - Imagens                      │  - Vídeos       │
│  - Status    │  - Vídeos                       │  - Emoções      │
│  - Tools     │  - Mapas                        │  - Estados      │
│  - Memories  │  - Gráficos                     │                 │
│  - Logs      │  - Documentos                   │                 │
│              │                                 │                 │
│  280px       │         Flex-1                  │     384px       │
│              │                                 │                 │
└──────────────┴─────────────────────────────────┴─────────────────┘
```

### Responsividades Futuras:
- Mobile: Stack vertical
- Tablet: 2 colunas
- Desktop: 3 colunas (atual)

---

## 🔄 FLUXO DE DADOS

### 1. Conversação de Voz (WebRTC)
```
User → Microphone → GeminiLiveService → Gemini API
                                      ↓
                          User Transcription Callback
                                      ↓
                          AppUnified → BackendService
                                      ↓
                          POST /chat (GPT-4 reasoning)
                                      ↓
                          Response → TTS → Audio Output
```

### 2. Chat de Texto
```
User Input → handleSendMessage → BackendService
                              ↓
                          POST /chat
                              ↓
                          Response → ChatMessages
                              ↓
                          History saved
```

### 3. Tool Calling (Multimodal)
```
Gemini Live → Tool Call (generate_media, search_grounding)
                    ↓
          handleToolCall → MultimodalService
                    ↓
          Execute (Veo/Imagen/Search/Maps)
                    ↓
          Visual Event → Render Component
```

---

## 📦 SERVIÇOS PRINCIPAIS

### GeminiLiveService
**Responsabilidade:** Gerenciar conexão WebRTC com Gemini Live API

**Funcionalidades:**
- ✅ Conexão/desconexão WebRTC
- ✅ Stream de áudio bidirecional
- ✅ Transcrição em tempo real
- ✅ Tool calling
- ✅ Estados de conexão
- 🚧 Wake word detection

### MultimodalService
**Responsabilidade:** Gerar conteúdo multimodal

**Funcionalidades:**
- 🚧 Veo video generation
- 🚧 Imagen image generation
- ✅ Web search
- 🚧 Maps search

### BackendService
**Responsabilidade:** Comunicação com Node 5000

**Funcionalidades:**
- ✅ Sessão management
- ✅ História de chat
- ✅ Memórias
- ✅ GPT-4 reasoning
- 🚧 Ações corporativas
- 🚧 Documentos

---

## 🎯 PRÓXIMOS PASSOS DE IMPLEMENTAÇÃO

### Fase 1: Multimodal Básico
1. 🚧 VideoPlayer component (Veo)
2. 🚧 ImageViewer component (Imagen)
3. 🚧 veoService.ts
4. 🚧 imagenService.ts
5. 🚧 Integração com backend

### Fase 2: Pesquisa Avançada
1. 🚧 MapRenderer component
2. 🚧 mapsService.ts
3. 🚧 searchService.ts aprimorado
4. 🚧 Resultados estruturados

### Fase 3: Raciocínio Visual
1. 🚧 ChartDisplay component
2. 🚧 Reasoning steps visualization
3. 🚧 DocumentViewer component
4. 🚧 Fluxos de trabalho

### Fase 4: Avatar Avançado
1. 🚧 Expressões emocionais dinâmicas
2. 🚧 Sincronização com fala
3. 🚧 Microexpressões
4. 🚧 Vídeos Veo como avatar

---

## 🔒 SEGURANÇA E PERFORMANCE

### API Keys
- ✅ Gemini API Key via backend
- ✅ OpenAI API Key no backend
- ✅ Sem exposição no frontend

### Performance
- ✅ Lazy loading de componentes
- 🚧 Streaming de vídeos
- 🚧 Cache de imagens
- 🚧 WebWorkers para processamento pesado

### Error Handling
- ✅ Graceful degradation
- ✅ Offline support
- ✅ Error boundaries
- 🚧 Retry logic

---

## 📝 CONVENÇÕES DE CÓDIGO

### Naming
- Services: `*Service.ts` (camelCase)
- Components: `PascalCase.tsx`
- Hooks: `use*` prefix
- Types: `PascalCase` interfaces

### Imports
```typescript
// 1. External libraries
import React from 'react';

// 2. Services
import { GeminiLiveService } from './services/geminiLiveService';

// 3. Components
import AvatarDisplay from './components/AvatarDisplay';

// 4. Types
import { ChatMessage } from './types';
```

### File Organization
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Constants
// 4. Component/Service
// 5. Exports
```

---

## 🧪 TESTING (Futuro)

### Unit Tests
- Services: 80% coverage
- Components: 70% coverage
- Utils: 90% coverage

### Integration Tests
- WebRTC flow
- Backend communication
- Multimodal generation

### E2E Tests
- Complete conversation flow
- Tool calling scenarios
- Error recovery

---

**Última atualização:** 2025-12-03
**Versão:** 2.0.0
**Status:** Estrutura Base Completa
