# Arquitetura Híbrida LIA: IA Multi-Motor & Contexto Unificado

Este documento detalha o ecossistema atual da LIA, explicando as responsabilidades do **GPT-4o** e **Gemini 2.0**, as tecnologias de voz e como o sistema mantém a paridade entre Admin e Dashboard.

---

## 1. Visão Geral da Pilha Tecnológica

| Camada | Tecnologia Principal | Papel |
| :--- | :--- | :--- |
| **Backend Core** | Node.js / Express | Orquestração, Autenticação, Persistência (Supabase) |
| **Comunicação** | Socket.IO | Stream de eventos em tempo real, Chat e Voz Padrão |
| **Motor de Texto/Lógica** | **GPT-4o-mini** | Raciocínio, Execução de Ferramentas (17 tools), Chat |
| **Motor de Voz Live** | **Gemini 2.0 Flash** | Voz contínua (hands-free) de baixa latência |
| **STT (Voz para Texto)** | OpenAI Whisper | Transcrição para o fluxo de voz padrão |
| **TTS (Texto para Voz)** | OpenAI TTS (Voz: Nova) | Resposta de áudio para o fluxo de voz padrão |

---

## 2. Divisão de Funções (Quem faz o quê?)

### A. GPT-4o-mini (O "Cérebro" de Negócio)
Usado no **Chat (Texto)** e **Voz Padrão** (Botão de microfone).
- **Responsabilidades**:
  - Processar mensagens de texto.
  - Executar as **17 ferramentas de negócio** (Google Sheets, Gmail, Gerar Gráficos, Image Gen, etc.).
  - Salvar e carregar memórias profundas no Supabase.
  - Lidar com análise de arquivos e multimodalidade estruturada.
- **Conexão**: Via Socket.IO através do backend.

### B. Gemini 2.0 Flash-exp (O "Voz-Realtime")
Usado no **Live Mode** (Conversação contínua).
- **Responsabilidades**:
  - Conversação fluida e natural por voz (baixa latência).
  - Reconhecimento de interrupções (VAD nativo).
  - Execução de **ferramentas visuais rápidas** (Mapas, Busca Google, Gerar mídia rápida).
- **Conexão**: WebSocket direto do Client para a API do Google (autenticado via token efêmero do backend).

---

## 3. Fluxos de Voz e Chat

### Fluxo 1: Chat e Voz Padrão (Backend-Driven)
O usuário fala ou digita -> O Socket.IO envia para o backend -> O GPT processa (podendo chamar as 17 ferramentas) -> A resposta volta via texto e áudio (TTS).

### Fluxo 2: Live Mode (Client-Edge-Driven)
Conexão contínua com Gemini 2.0 Flash. Ideal para conversas longas e "mãos livres". Usa as 4 ferramentas visuais específicas do Gemini.

---

## 4. O Coração: Mente Única (Single Brain)

Para que a LIA não "esqueça" nada ao mudar de modalidade, o **ContextPack** é compartilhado:

1.  **Memórias (v2)**: Salvas no Supabase, carregadas tanto pelo fluxo GPT quanto injetadas no `systemInstruction` do Gemini.
2.  **Personalidade**: Definida em um arquivo centralizado (`lia-personality.js`), garantindo que o tom de voz seja o mesmo.
3.  **Auth**: O token do Supabase é o identificador único em todos os canais.

---

## 5. Diferenças Críticas no Estado Atual (O que estamos corrigindo)

A divergência que encontramos:
- **Admin**: Configurado com voz `Kore`, personalidade completa e 4 ferramentas visuais.
- **Dashboard**: Estava com configuração genérica (voz `Aoede`, sem ferramentas, personalidade simples).

**A sincronização garantirá que o Dashboard-client opere com o mesmo nível de inteligência e ferramentas do Admin.**
