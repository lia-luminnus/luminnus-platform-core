# 🏗️ ARQUITETURA FINAL - RESPONSABILIDADES DEFINIDAS

**Data:** 2025-12-04
**Versão:** 5.1.0
**Status:** ✅ **ARQUITETURA CONSOLIDADA**

---

## 🎯 PRINCÍPIO FUNDAMENTAL

```
GPT-4o/Mini = CÉREBRO (Raciocínio, Lógica, Memória, Texto)
Gemini Live = CORPO (Voz, Áudio, Imagem, Vídeo, Multimodal)
```

Esta separação é **FIXA e IMUTÁVEL**. Todas as funcionalidades do sistema devem respeitar esta divisão.

---

## 🔵 GEMINI LIVE API - CORPO DA LIA (100% Multimodal)

### Responsabilidades EXCLUSIVAS do Gemini:

#### 1. **VOZ E ÁUDIO** ✅

| Função | Gemini | GPT |
|--------|--------|-----|
| Capturar voz do usuário (Microfone) | ✅ 100% | ❌ Nunca |
| Transcrever voz (STT) | ✅ 100% | ❌ Nunca |
| Gerar voz da LIA (TTS) | ✅ 100% | ❌ Nunca |
| Reproduzir áudio no painel | ✅ 100% | ❌ Nunca |
| Sincronizar boca/microexpressões | ✅ 100% | ❌ Nunca |
| Manter mesma voz em todos os modos | ✅ 100% | ❌ Nunca |

**Fluxo de Voz:**
```
User fala
  ↓
Gemini captura via WebRTC
  ↓
Gemini transcreve (STT)
  ↓
Gemini envia transcrição para AppUnified
  ↓
AppUnified envia para GPT (texto)
  ↓
GPT responde (texto)
  ↓
Backend envia áudio (TTS) de volta
  ↓
Gemini reproduz áudio
  ↓
Avatar sincroniza
```

**Arquivos Envolvidos:**
- `services/geminiLiveService.ts` - WebRTC + STT + TTS
- `AppUnified.tsx` - Orquestração do fluxo
- `components/AvatarDisplay.tsx` - Estados visuais

---

#### 2. **IMAGEM E VÍDEO** ✅

| Função | Gemini | GPT |
|--------|--------|-----|
| Receber imagens do usuário | ✅ 100% | ❌ Nunca |
| Analisar imagens (visão computacional) | ✅ 100% | ❌ Nunca |
| Processar PDFs com imagens | ✅ 100% | ❌ Nunca |
| Analisar vídeos | ✅ 100% | ❌ Nunca |
| Capturar screenshots | ✅ 100% | ❌ Nunca |
| Gerar imagens (Imagen/Nano Banana) | ✅ 100% | ❌ Nunca |
| Gerar vídeos (Veo) | ✅ 100% | ❌ Nunca |

**Fluxo de Imagem:**
```
User envia imagem
  ↓
Gemini recebe via multimodal API
  ↓
Gemini analisa visualmente
  ↓
Gemini extrai informações (texto descritivo)
  ↓
Gemini envia descrição para AppUnified
  ↓
AppUnified pode enviar para GPT (se necessário raciocínio adicional)
  ↓
GPT raciocina sobre o texto
  ↓
GPT retorna decisão/ação
  ↓
Gemini executa (ex: gerar nova imagem)
```

**Arquivos Envolvidos:**
- `services/multimodalService.ts` - Geração de imagem/vídeo
- `services/geminiLiveService.ts` - Análise multimodal via Live API
- Tools: `generate_media`, `update_visual_interface`

---

#### 3. **MODO LIA LIVE** ✅

| Função | Gemini | GPT |
|--------|--------|-----|
| Avatar vivo em tempo real | ✅ 100% | ❌ Nunca |
| Posições e animações do avatar | ✅ 100% | ❌ Nunca |
| Resposta em áudio instantânea | ✅ 100% | ❌ Nunca |
| Sincronização de movimentos | ✅ 100% | ❌ Nunca |
| Interpretação multimodal contínua | ✅ 100% | ❌ Nunca |
| Renderização dinâmica de elementos visuais | ✅ 100% | ❌ Nunca |

**Modo Live:**
```
┌─────────────────────────────────┬─────────────┐
│                                 │   Chat      │
│        AVATAR GRANDE            │  (compacto) │
│      (Gemini Live)              │             │
│                                 │             │
│   [ 🎤 Start Voice ]            │             │
└─────────────────────────────────┴─────────────┘
```

**Arquivos Envolvidos:**
- `AppUnified.tsx` - Modo `'live'`
- `components/AvatarDisplay.tsx` - Avatar `size="large"`
- `components/ChatMessages.tsx` - Chat `compact={true}`

---

#### 4. **BUSCA WEB REAL** ✅

| Função | Gemini | GPT |
|--------|--------|-----|
| Google Custom Search | ✅ 100% | ❌ Nunca |
| Google Maps Grounding | ✅ 100% | ❌ Nunca |
| Buscar informações atualizadas | ✅ 100% | ❌ Nunca |
| Filtrar resultados relevantes | ✅ 100% | ❌ Nunca |
| Integrar resultados na resposta | ✅ 100% | ❌ Nunca |

**Fluxo de Busca:**
```
User pergunta: "Quanto está o dólar hoje?"
  ↓
Gemini detecta necessidade de busca (grounding)
  ↓
Gemini chama tool `search_grounding`
  ↓
AppUnified intercepta tool call
  ↓
AppUnified chama backend /api/web-search
  ↓
Backend executa busca real (Google Custom Search)
  ↓
Backend retorna resultados
  ↓
AppUnified retorna para Gemini
  ↓
Gemini processa resultados
  ↓
Gemini responde com informação atualizada
```

**Arquivos Envolvidos:**
- `services/geminiLiveService.ts` - Tool declaration `search_grounding`
- `server/routes/search.js` - Endpoint `/api/web-search`
- `server/search/web-search.js` - Implementação real da busca

---

#### 5. **INTERPRETAÇÃO PROFUNDA** ✅

| Função | Gemini | GPT |
|--------|--------|-----|
| Analisar PDFs empresariais | ✅ 100% | ❌ Nunca |
| Interpretar dashboards | ✅ 100% | ❌ Nunca |
| Analisar fotos corporativas | ✅ 100% | ❌ Nunca |
| Processar vídeos longos | ✅ 100% | ❌ Nunca |
| Extrair dados de documentos visuais | ✅ 100% | ❌ Nunca |

**Fluxo de Documento:**
```
User envia PDF corporativo
  ↓
Gemini recebe via multimodal API
  ↓
Gemini analisa:
  - Texto
  - Tabelas
  - Gráficos
  - Imagens
  ↓
Gemini extrai dados estruturados
  ↓
(OPCIONAL) Gemini envia resumo textual para GPT
  ↓
GPT raciocina sobre dados
  ↓
GPT retorna insights
  ↓
Gemini renderiza resposta visual
```

**Arquivos Envolvidos:**
- `services/multimodalService.ts` - Processamento de PDFs/imagens
- `services/geminiLiveService.ts` - Live API com multimodal

---

## 🤖 GPT-4o / GPT-4o-MINI - CÉREBRO DA LIA (100% Texto/Lógica)

### Responsabilidades EXCLUSIVAS do GPT:

#### 1. **RACIOCÍNIO E LÓGICA** ✅

| Função | GPT | Gemini |
|--------|-----|--------|
| Planejamento estratégico | ✅ 100% | ❌ Nunca |
| Tomada de decisões complexas | ✅ 100% | ❌ Nunca |
| Raciocínio multi-etapas | ✅ 100% | ❌ Nunca |
| Análise de dados textuais | ✅ 100% | ❌ Nunca |
| Inferências lógicas | ✅ 100% | ❌ Nunca |

**Fluxo de Raciocínio:**
```
Gemini transcreve: "Preciso criar um relatório de vendas do trimestre"
  ↓
AppUnified envia para GPT
  ↓
GPT raciocina:
  1. Usuário precisa de relatório
  2. Precisa buscar dados de vendas
  3. Precisa estruturar informação
  4. Precisa formatar em documento
  ↓
GPT responde com plano estruturado
  ↓
AppUnified retorna para Gemini
  ↓
Gemini fala o plano em voz
```

**Arquivos Envolvidos:**
- `server/routes/chat.js` - Endpoint `/chat`
- `server/assistants/gpt4-mini.js` - Implementação do GPT

---

#### 2. **MEMÓRIAS E CONTEXTO** ✅

| Função | GPT | Gemini |
|--------|-----|--------|
| Salvar memórias (function calling) | ✅ 100% | ❌ Nunca |
| Recuperar memórias | ✅ 100% | ❌ Nunca |
| Gerenciar contexto da conversa | ✅ 100% | ❌ Nunca |
| Integração com Supabase | ✅ 100% | ❌ Nunca |
| Categorização de informações | ✅ 100% | ❌ Nunca |

**Fluxo de Memória:**
```
User fala: "Meu aniversário é dia 15 de maio"
  ↓
Gemini transcreve
  ↓
AppUnified envia para GPT
  ↓
GPT detecta informação importante
  ↓
GPT chama função `saveMemory`
  ↓
Backend salva no session.memories[]
  ↓
(Futuro: salva no Supabase)
  ↓
GPT responde: "Anotado! Seu aniversário é dia 15 de maio."
  ↓
Gemini fala a resposta
```

**Arquivos Envolvidos:**
- `server/routes/chat.js` - Function calling `saveMemory`
- `server/routes/memory.js` - CRUD de memórias
- `services/backendService.ts` - Frontend integration

---

#### 3. **ESCRITA E DOCUMENTOS** ✅

| Função | GPT | Gemini |
|--------|-----|--------|
| Escrever textos longos | ✅ 100% | ❌ Nunca |
| Criar documentos corporativos | ✅ 100% | ❌ Nunca |
| Formatar markdown/HTML | ✅ 100% | ❌ Nunca |
| Tom e estilo corporativo | ✅ 100% | ❌ Nunca |
| Revisar e editar textos | ✅ 100% | ❌ Nunca |

**Fluxo de Escrita:**
```
User: "Crie um email formal para o cliente explicando o atraso"
  ↓
Gemini transcreve
  ↓
AppUnified envia para GPT
  ↓
GPT escreve email formal estruturado
  ↓
GPT retorna texto markdown
  ↓
Frontend renderiza texto
  ↓
Gemini lê o email em voz (se solicitado)
```

**Arquivos Envolvidos:**
- `server/routes/chat.js` - Geração de texto
- `server/assistants/gpt4-mini.js` - Modelo GPT

---

#### 4. **GERAÇÃO DE CÓDIGO** ✅

| Função | GPT | Gemini |
|--------|-----|--------|
| Escrever código (Python, JS, etc) | ✅ 100% | ❌ Nunca |
| Explicar código | ✅ 100% | ❌ Nunca |
| Debugar erros | ✅ 100% | ❌ Nunca |
| Refatorar código | ✅ 100% | ❌ Nunca |
| Code review | ✅ 100% | ❌ Nunca |

**Fluxo de Código:**
```
User: "Crie uma função Python que calcula fibonacci"
  ↓
Gemini transcreve
  ↓
AppUnified envia para GPT
  ↓
GPT gera código Python comentado
  ↓
GPT retorna em markdown com ```python
  ↓
Frontend renderiza com syntax highlighting
  ↓
Gemini explica o código em voz (se solicitado)
```

**Arquivos Envolvidos:**
- `server/routes/chat.js` - Geração de código
- `components/ChatMessages.tsx` - Renderização de markdown

---

## 🔄 FLUXOS INTEGRADOS (GPT + GEMINI)

### Fluxo 1: Conversa por Voz

```
┌──────────────────────────────────────────────────────────┐
│ 1. USER FALA                                             │
│    ↓                                                      │
│ 2. GEMINI CAPTURA (WebRTC)                               │
│    ↓                                                      │
│ 3. GEMINI TRANSCREVE (STT)                               │
│    ↓                                                      │
│ 4. APPUNIFIED recebe transcription                       │
│    • setAvatarState('thinking')                          │
│    ↓                                                      │
│ 5. APPUNIFIED → BACKEND → GPT                            │
│    • POST /chat                                          │
│    • { message: transcript, personality: 'clara' }       │
│    ↓                                                      │
│ 6. GPT RACIOCINA                                         │
│    • Analisa contexto                                    │
│    • Function calling (se necessário)                    │
│    • Gera resposta                                       │
│    ↓                                                      │
│ 7. BACKEND → GPT TTS                                     │
│    • textToAudio(reply)                                  │
│    • Retorna base64                                      │
│    ↓                                                      │
│ 8. BACKEND → APPUNIFIED                                  │
│    • { reply: "texto", audio: "base64" }                 │
│    ↓                                                      │
│ 9. APPUNIFIED processa resposta                          │
│    • if (response.audio) setAvatarState('responding')    │
│    • Adiciona mensagem no chat                           │
│    • Atualiza memórias (se houver)                       │
│    ↓                                                      │
│ 10. GEMINI REPRODUZ ÁUDIO                                │
│     • Avatar sincroniza boca                             │
│     • onAssistantSpeakingEnd() → setAvatarState('idle') │
└──────────────────────────────────────────────────────────┘
```

**IMPORTANTE:**
- ✅ Gemini faz STT e TTS
- ✅ GPT faz raciocínio e function calling
- ✅ Avatar sincroniza com áudio do Gemini
- ❌ GPT NUNCA faz STT/TTS diretamente na Live API
- ❌ Gemini NUNCA faz raciocínio ou salva memórias

---

### Fluxo 2: Análise de Imagem

```
┌──────────────────────────────────────────────────────────┐
│ 1. USER ENVIA IMAGEM                                     │
│    ↓                                                      │
│ 2. GEMINI RECEBE (Multimodal API)                        │
│    ↓                                                      │
│ 3. GEMINI ANALISA VISUALMENTE                            │
│    • Identifica objetos                                  │
│    • Lê texto na imagem                                  │
│    • Interpreta gráficos                                 │
│    ↓                                                      │
│ 4. GEMINI EXTRAI DADOS                                   │
│    • Converte para texto estruturado                     │
│    ↓                                                      │
│ 5. (OPCIONAL) GEMINI → APPUNIFIED → GPT                  │
│    • Se precisa raciocínio adicional                     │
│    • GPT processa dados textuais                         │
│    • GPT retorna insights                                │
│    ↓                                                      │
│ 6. GEMINI RESPONDE                                       │
│    • Voz (TTS)                                           │
│    • Texto no chat                                       │
│    • Visual (se gerar nova imagem)                       │
└──────────────────────────────────────────────────────────┘
```

**IMPORTANTE:**
- ✅ Gemini faz análise visual
- ✅ GPT faz raciocínio sobre dados extraídos (opcional)
- ❌ GPT NUNCA recebe imagem diretamente
- ❌ GPT NUNCA faz análise visual

---

### Fluxo 3: Busca Web

```
┌──────────────────────────────────────────────────────────┐
│ 1. USER PERGUNTA: "Quanto está o dólar?"                │
│    ↓                                                      │
│ 2. GEMINI TRANSCREVE (ou recebe texto)                   │
│    ↓                                                      │
│ 3. GEMINI DETECTA necessidade de busca                   │
│    • Tool: search_grounding                              │
│    ↓                                                      │
│ 4. APPUNIFIED intercepta tool call                       │
│    • onToolCall('search_grounding', { query: 'dólar' })  │
│    ↓                                                      │
│ 5. APPUNIFIED → BACKEND                                  │
│    • POST /api/web-search                                │
│    • { query: "dólar hoje" }                             │
│    ↓                                                      │
│ 6. BACKEND → Google Custom Search                        │
│    • Busca real na web                                   │
│    • Filtra resultados                                   │
│    ↓                                                      │
│ 7. BACKEND → APPUNIFIED                                  │
│    • { results: [...] }                                  │
│    ↓                                                      │
│ 8. APPUNIFIED → GEMINI                                   │
│    • sendToolResponse()                                  │
│    ↓                                                      │
│ 9. GEMINI PROCESSA RESULTADOS                            │
│    • Integra informação na resposta                      │
│    • Responde em voz                                     │
└──────────────────────────────────────────────────────────┘
```

**IMPORTANTE:**
- ✅ Gemini detecta necessidade de busca
- ✅ Backend executa busca real (Google Custom Search)
- ✅ Gemini integra resultados na resposta
- ❌ GPT NÃO faz busca web diretamente

---

## 📊 TABELA RESUMO DE RESPONSABILIDADES

| Funcionalidade | Gemini | GPT | Backend |
|----------------|--------|-----|---------|
| **Capturar voz (microfone)** | ✅ 100% | ❌ | ❌ |
| **Transcrever voz (STT)** | ✅ 100% | ❌ | ❌ |
| **Gerar voz (TTS)** | ❌ | ❌ | ✅ OpenAI TTS |
| **Raciocínio lógico** | ❌ | ✅ 100% | ❌ |
| **Salvar memórias** | ❌ | ✅ Function calling | ✅ Armazena |
| **Analisar imagens** | ✅ 100% | ❌ | ❌ |
| **Gerar imagens** | ✅ Imagen | ❌ | ❌ |
| **Gerar vídeos** | ✅ Veo | ❌ | ❌ |
| **Busca web real** | ✅ Detecta | ❌ | ✅ Executa |
| **Escrever código** | ❌ | ✅ 100% | ❌ |
| **Escrever documentos** | ❌ | ✅ 100% | ❌ |
| **Avatar vivo** | ✅ 100% | ❌ | ❌ |
| **Sincronizar boca** | ✅ 100% | ❌ | ❌ |
| **Estados visuais** | ✅ 100% | ❌ | ❌ |
| **Orquestração de fluxos** | ❌ | ❌ | ✅ AppUnified |

---

## 🚫 ANTI-PATTERNS (O QUE NÃO FAZER)

### ❌ NUNCA fazer:

1. **Gemini fazendo raciocínio lógico:**
   ```typescript
   // ❌ ERRADO
   gemini.ask("Analise esses dados de vendas e crie estratégia");

   // ✅ CORRETO
   const dados = await gemini.analisarImagem(dashboard);
   const estrategia = await gpt.raciocinar(dados);
   ```

2. **GPT fazendo STT/TTS:**
   ```typescript
   // ❌ ERRADO
   const transcricao = await gpt.transcreverAudio(audioBlob);

   // ✅ CORRETO
   const transcricao = await gemini.transcribe(audioBlob);
   ```

3. **GPT recebendo imagens diretamente:**
   ```typescript
   // ❌ ERRADO
   const analise = await gpt.analisarImagem(imageUrl);

   // ✅ CORRETO
   const descricao = await gemini.analisarImagem(imageUrl);
   const insights = await gpt.raciocinar(descricao);
   ```

4. **Gemini salvando memórias:**
   ```typescript
   // ❌ ERRADO
   gemini.salvarMemoria("Aniversário: 15/05");

   // ✅ CORRETO
   gpt.functionCall('saveMemory', { content: "Aniversário: 15/05" });
   ```

5. **Múltiplas conexões simultâneas:**
   ```typescript
   // ❌ ERRADO
   await gemini.connect();
   await gemini.connect(); // Cria loop!

   // ✅ CORRETO
   if (!gemini.isConnected) {
     await gemini.connect();
   }
   ```

---

## 📁 ESTRUTURA DE ARQUIVOS

### Frontend (lia-live-view/):

```
src/
├── AppUnified.tsx                 ← Orquestração principal
├── components/
│   ├── AvatarDisplay.tsx         ← Estados visuais (Gemini)
│   ├── ChatMessages.tsx          ← Renderização de mensagens
│   ├── ModeSwitch.tsx            ← Switch Chat/Live
│   ├── MicrophoneButton.tsx      ← Botão de voz
│   └── ...
├── services/
│   ├── geminiLiveService.ts      ← Gemini Live API (WebRTC)
│   ├── multimodalService.ts      ← Geração de mídia (Gemini)
│   ├── backendService.ts         ← Comunicação com backend
│   └── configService.ts          ← API keys
└── types.ts                       ← TypeScript types
```

### Backend (lia-live-view/server/):

```
server/
├── server.ts                      ← Entry point unificado (porta 3000)
├── routes/
│   ├── session.js                ← GET /api/session
│   ├── chat.js                   ← POST /chat (GPT)
│   ├── memory.js                 ← CRUD memórias
│   └── search.js                 ← POST /api/web-search
├── assistants/
│   └── gpt4-mini.js              ← GPT-4 implementation
├── realtime/
│   ├── realtime.js               ← Socket.io para chat
│   └── realtime-voice-api.js     ← WebRTC Realtime (OpenAI)
├── search/
│   └── web-search.js             ← Google Custom Search
└── personality/
    └── lia-personality.js        ← System instructions
```

### Backend Raiz (adoring-ardinghelli/):

```
⚠️ DEPRECADO - Migrar para lia-live-view/server/
```

---

## 🚀 EXECUTANDO O SISTEMA

### Desenvolvimento (Porta 3000):

```bash
cd D:\Projeto_Lia_Node_3_gpt\lia-live-view
npm run dev
```

**O que acontece:**
- ✅ Backend Express inicia (porta 3000)
- ✅ Vite middleware integrado (HMR)
- ✅ Socket.io ativo
- ✅ WebRTC Realtime ativo
- ✅ Frontend React carrega automaticamente

**Acessar:**
```
http://localhost:3000
```

### Produção:

```bash
cd D:\Projeto_Lia_Node_3_gpt\lia-live-view
npm run build
npm start
```

**O que acontece:**
- ✅ Vite build (otimizado)
- ✅ Backend serve arquivos estáticos da pasta `dist/`
- ✅ SPA routing configurado

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Para cada nova funcionalidade, perguntar:

1. **É relacionado a voz/áudio?**
   - ✅ SIM → Gemini Live API
   - ❌ NÃO → Próxima pergunta

2. **É relacionado a imagem/vídeo?**
   - ✅ SIM → Gemini Multimodal API
   - ❌ NÃO → Próxima pergunta

3. **Requer raciocínio lógico/escrita?**
   - ✅ SIM → GPT-4o/Mini
   - ❌ NÃO → Próxima pergunta

4. **Envolve dados/memória/contexto?**
   - ✅ SIM → GPT com function calling
   - ❌ NÃO → Revisar requisito

5. **Precisa de busca na web?**
   - ✅ SIM → Gemini grounding + Backend execution
   - ❌ NÃO → OK

---

## 📌 OBSERVAÇÕES FINAIS

### ⚠️ Gemini vs OpenAI Realtime

- **Gemini Live:** Multimodal (voz + imagem + vídeo)
- **OpenAI Realtime:** Voz apenas (sem imagem/vídeo)

Atualmente usando **Gemini Live** para voz porque:
- ✅ Suporta imagem e vídeo
- ✅ Grounding integrado (busca web)
- ✅ Function calling mais flexível
- ✅ Mesma API para STT + TTS + multimodal

### ⚠️ TTS Atual

Backend usa **OpenAI TTS** (não Gemini TTS) para resposta.

**Futuro:** Migrar para Gemini TTS para manter consistência.

### ⚠️ Port 5000 (Backend Raiz)

O backend raiz em `adoring-ardinghelli/` (porta 5000) está **DEPRECADO**.

**Ação necessária:**
- ✅ Usar apenas `lia-live-view/server/` (porta 3000)
- ⚠️ Migrar qualquer funcionalidade faltante
- ❌ NÃO usar server.js do backend raiz

---

**Status:** ✅ **ARQUITETURA CONSOLIDADA E DOCUMENTADA**

**Próxima Etapa:** Teste manual completo do fluxo de voz

**Data:** 2025-12-04
**Versão:** 5.1.0
**Desenvolvido por:** Claude (Sonnet 4.5) + Luminnus Intelligence

---
