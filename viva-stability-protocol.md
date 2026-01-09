# Protocolo de Estabilidade LIA VIVA 🛡️

Este protocolo define as diretrizes intocáveis para o funcionamento da voz, transcrição e contexto da LIA. Alterações nestes pontos devem ser precedidas de um `implementation_plan` detalhado e aprovado.

## 1. Mente Única (SSOT)
- **ID da Conversa**: O `activeConversationIdByMode.chat` é a fonte única de verdade (SSOT).
- **Unificação**: Modos Multimodal e Live de uma mesma sessão DEVEM orbitar o ID do chat.
- **Escopo**: O `scopeKey` (usado para rotear mensagens no frontend) deve ser idêntico ao `conversationId`, sem prefixos como `chat:` ou `multimodal:`.

## 2. Motores de Transcrição (STT)
A transcrição é realizada por dois motores distintos, dependendo da tecnologia de conexão:

| Tecnologia | Modo | Motor de Transcrição | Fluxo |
| :--- | :--- | :--- | :--- |
| **OpenAI Whisper-1** | Multimodal (Socket.IO) | Whisper-1 | Áudio acumulado → Backend → Whisper → `user-transcript` |
| **Google Gemini Live** | Live Mode (WebRTC) | Gemini Native | Streaming contínuo → Google Server → Transcrição nativa |

## 3. Configuração de Socket
- A variável `VITE_SOCKET_URL` é obrigatória no `.env`.
- O código deve ter resiliência (fallback para `localhost:3000`) para evitar "tela preta", mas o log de erro no console deve ser mantido para alertar o desenvolvedor.

## 4. Governança de Logs
- Logs de chunks de áudio ou tráfego bruto não devem ser exibidos por padrão.
- Use o filtro `import.meta.env.VITE_DEBUG_LIA_LOGS === 'true'` para logs detalhados de depuração.

## 5. Casos de Teste Obrigatórios (Sanity Check)
Antes de qualquer merge ou deploy:
1.  **Voz Inicia?** (Multimodal e Live).
2.  **LIA Fala?** (Confirmar saída de áudio).
3.  **Contexto Mantido?** (Perguntar algo no chat e ver se a voz "lembra").
4.  **Transcrição Aparece?** (O texto dito deve ser injetado no log do chat).
