import { Express } from 'express';
import type OpenAI from 'openai';
import { runGemini } from '../assistants/gemini.js';
import { textToAudio } from '../assistants/gpt4-mini.js';
import { SecurityService } from '../services/securityService.js';
import { ToolService } from '../services/toolService.js';
import { OutputContracts } from '../services/outputContracts.js';
import { getOpenAIVoice } from '../config/openai-voices.js';
import { ensureSession } from '../server.js';

export function setupChatRoutes(app: Express, openai: OpenAI) {
  const functions = ToolService.getTools();

  app.post('/chat', async (req: any, res: any) => {
    try {
      const { message, conversationId, mode, personality, userId, tenantId, liaMode } = req.body;

      console.log('\n========== 💬 NOVA REQUISIÇÃO CHAT ==========');
      console.log(`📝 Mensagem: ${message?.substring(0, 100)}`);
      console.log(`🆔 Conversa: ${conversationId || 'N/A'}`);
      console.log(`🔧 LIA Mode: ${liaMode || 'NORMAL'}`);
      console.log('============================================\n');

      const finalUserId = userId || '00000000-0000-0000-0000-000000000001';
      const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

      // 1. Carregar sessão (SSOT: Mente Única)
      const session = await ensureSession(finalUserId, conversationId);

      // 1.1 Carregar contexto completo
      const { getContext, updateSummaryIfNeeded } = await import('../services/memoryService.js');
      const context = await getContext(conversationId, finalUserId, message, session?.userLocation);

      // 1.1 DIAGNOSTIC MODE: Injetar contexto de diagnóstico para Admin Root
      let diagnosticContext = '';
      if (liaMode === 'DIAGNOSTIC') {
        console.log('🔧 [DIAGNOSTIC MODE] Injetando contexto de diagnóstico...');
        diagnosticContext = `

## 🔧 MODO DIAGNÓSTICO E SRE ATIVO (ROOT ACCESS)

Você é a **Engenheira Principal de SRE (Site Reliability Engineering)** da Luminnus.
Sua missão é diagnosticar falhas, analisar logs e propor correções técnicas imediatas.

### 📜 DIRETRIZES CRÍTICAS:
1. **NUNCA peça chaves de API**, tokens ou configurações ao usuário. Você JÁ TEM acesso total via backend.
2. Você está perfeitamente integrada ao sistema. Se algo não funcionar, verifique os logs e a saúde via ferramentas.
3. Não seja genérica. Forneça dados técnicos, caminhos de arquivos e linhas de código.
4. Sua persona é direta, técnica e resolutiva (estilo DevOps Senior).

### 🛠️ Ferramentas de Análise (Acessíveis via APIs internas):
- Saúde: GET /api/admin/system/health
- Logs: GET /api/admin/system/logs
- Código: POST /api/admin/system/read-code
- Estrutura: GET /api/admin/system/map

### ⚖️ REGRA DE OURO:
**NUNCA dê um diagnóstico baseado em suposições.** Se o usuário reportar uma falha, seu PRIMEIRO passo deve ser usar as ferramentas acima para investigar a causa real (ex: listar arquivos com \`map\`, ler logs com \`logs\`, ou ler o código fonte com \`read-code\`). Diagnósticos sem evidências técnicas coletadas via ferramentas serão rejeitados.

### 📋 Formato de Resposta MANDATÓRIO:
## 🚨 INCIDENTE [SEV-1/2/3] - [Título Curto]

### 🔍 DIAGNÓSTICO TÉCNICO
[O que você descobriu analisando os dados do sistema]

### 🧪 EVIDÊNCIAS
- Logs/Saúde: [Citar dados reais se disponíveis]

### 🛠️ PLANO DE RESOLUÇÃO (ACTION ITEMS)
- [ ] Passo 1...
- [ ] Passo 2...

### 💻 TRECHO DE CÓDIGO (FIX SUGGESTION)
\`\`\`[linguagem]
// Sugestão de correção se aplicável
\`\`\`
`;
      }

      // 2. Auto-memória (opcional/automático)
      let autoSavedMemories: any[] = [];
      try {
        const { detectAndSaveMemory } = await import('../config/supabase.js');
        autoSavedMemories = await detectAndSaveMemory(message, finalUserId);
      } catch (err) {
        console.warn('⚠️ Erro no detectAndSaveMemory:', err);
      }

      // 3. Prompt do sistema + histórico + mensagem atual
      const historyMessages = context.history.map((msg: any) => ({
        role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: msg.content
      }));

      // Injetar contexto diagnóstico no system instruction se ativo
      const finalSystemInstruction = (context.systemInstruction || '') + diagnosticContext;

      const messages = [
        { role: "system" as const, content: finalSystemInstruction },
        ...historyMessages,
        { role: "user" as const, content: message }
      ];

      // 3.1 Filtrar ferramentas baseadas no modo
      const availableTools = functions.filter(tool => {
        const isDiagnosticTool = ['getSystemHealth', 'getSystemLogs', 'readProjectFile', 'getProjectMap'].includes(tool.name);
        if (liaMode === 'DIAGNOSTIC') return true; // No modo diagnóstico tem acesso a TUDO
        return !isDiagnosticTool; // No modo normal esconde ferramentas de admin
      });

      // 4. Executar AIRouter
      const { AIRouter } = await import('../services/aiRouter.js');
      const aiResponse: any = await AIRouter.route({
        userId: finalUserId,
        tenantId: finalTenantId,
        prompt: message,
        conversationId: conversationId,
        history: messages,
        tools: availableTools
      });

      let replyText = aiResponse.text;
      let function_call = aiResponse.function_call;

      // 5. Executar ferramentas se solicitado
      if (function_call) {
        console.log(`🔧 [Chat] Chamando ferramenta: ${function_call.name}`);
        const args = JSON.parse(function_call.arguments || '{}');

        const function_result: any = await ToolService.execute(function_call.name, args, {
          userId: finalUserId,
          tenantId: finalTenantId,
          userLocation: session?.userLocation
        });

        // =====================================================
        // TRATAMENTO ESPECIAL PARA IMAGENS (v1.4)
        // Retorna payload estruturado para exibição na lousa
        // =====================================================
        if (function_call.name === 'generateImage' && function_result?.url) {
          console.log(`🖼️ [Chat] Imagem gerada com sucesso: ${function_result.url}`);

          const imagePayload = {
            type: 'image',
            title: 'Imagem gerada',
            data: {
              url: function_result.url,
              prompt: function_result.prompt || args.prompt,
              alt: function_result.prompt || args.prompt,
              caption: function_result.prompt || args.prompt
            },
            timestamp: Date.now()
          };

          // Persistir mensagens
          try {
            const { saveMessage } = await import('../config/supabase.js');
            await saveMessage(conversationId, 'user', message, 'text');
            await saveMessage(conversationId, 'assistant', `🖼️ Imagem gerada: ${function_result.prompt || args.prompt}`, 'text');
          } catch (dbErr) {
            console.error('⚠️ Falha ao persistir:', dbErr);
          }

          return res.json({
            ok: true,
            reply: JSON.stringify(imagePayload),
            dynamicContent: imagePayload,
            isStructured: true,
            function_call,
            savedMemories: autoSavedMemories
          });
        }

        // =====================================================
        // TRATAMENTO ESPECIAL PARA DASHBOARD ACTIONS (v3.0)
        // Retorna ação para o frontend executar no DashboardContext
        // =====================================================
        if (function_call.name.startsWith('dashboard') && function_result?.action) {
          console.log(`🎯 [Chat] Ação de dashboard: ${function_result.action}`);

          // Persistir mensagens
          try {
            const { saveMessage } = await import('../config/supabase.js');
            await saveMessage(conversationId, 'user', message, 'text');
            await saveMessage(conversationId, 'assistant', function_result.message || `Dashboard atualizado com ${function_result.action}`, 'text');
          } catch (dbErr) {
            console.error('⚠️ Falha ao persistir:', dbErr);
          }

          return res.json({
            ok: true,
            reply: function_result.message || 'Dashboard atualizado!',
            // CRÍTICO: Enviar action para o frontend processar 
            action: {
              name: function_result.action,
              arguments: JSON.stringify(function_result.params || {})
            },
            function_call: {
              name: function_result.action,
              arguments: JSON.stringify(function_result.params || {})
            },
            savedMemories: autoSavedMemories
          });
        }

        // Loop de segunda chamada para responder ao resultado de OUTRAS ferramentas
        if (!replyText || replyText === '...') {
          const isJsonExplicit = OutputContracts.isJsonRequested(message);
          const humanizedPrompt = isJsonExplicit
            ? `O usuário perguntou: "${message}"\nResultado da ferramenta ${function_call.name}: ${JSON.stringify(function_result)}\nRetorne o JSON conforme solicitado.`
            : OutputContracts.buildHumanizedPrompt(message, function_call.name, function_result);

          console.log(`🧠 [Chat] Gerando resposta humanizada (JSON Explícito: ${isJsonExplicit})`);

          const secondCall: any = await runGemini(
            humanizedPrompt,
            {
              conversationId,
              messages: [
                ...messages,
                { role: 'assistant', content: null, function_call },
                { role: 'function', name: function_call.name, content: JSON.stringify(function_result) }
              ]
            }
          );
          replyText = secondCall.text || replyText;
        }
      }


      // 6. Governança de Saída (Filtros de privacidade / Formatação)
      const { OutputGovernance } = await import('../services/outputGovernance.js');
      const governed = await OutputGovernance.forChat(replyText, message, async (retryPrompt) => {
        const response = await runGemini(retryPrompt, { temperature: 0.3 });
        return response.text;
      });
      replyText = governed.markdown;

      // 7. Persistência
      try {
        const { saveMessage } = await import('../config/supabase.js');
        await saveMessage(conversationId, 'user', message, 'text');
        await saveMessage(conversationId, 'assistant', replyText, 'text');

        if (typeof updateSummaryIfNeeded === 'function') {
          updateSummaryIfNeeded(conversationId, (context.history?.length || 0) + 2);
        }
      } catch (dbErr) {
        console.error('⚠️ Falha ao persistir:', dbErr);
      }

      // 8. TTS (opcional)
      let audioBase64 = null;
      try {
        const voice = getOpenAIVoice('viva'); // Garante Shimmer
        const audioBuffer = await textToAudio(replyText, voice);
        if (audioBuffer) audioBase64 = audioBuffer.toString('base64');
      } catch (ttsErr) {
        console.warn('⚠️ TTS indisponível');
      }

      // 9. Resposta final
      res.json({
        ok: true,
        reply: SecurityService.maskSensitiveData(replyText),
        audio: audioBase64,
        function_call,
        savedMemories: autoSavedMemories
      });

    } catch (error) {
      console.error('❌ Erro /chat:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Endpoints auxiliares
  app.post('/api/stt', async (req: any, res: any) => {
    try {
      const { audio } = req.body;
      const buffer = Buffer.from(audio, 'base64');
      const response = await (openai as any).audio.transcriptions.create({
        file: buffer as any,
        model: 'whisper-1',
        language: 'pt'
      });
      res.json({ text: response.text });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/tts', async (req: any, res: any) => {
    try {
      const { text } = req.body;
      const voice = getOpenAIVoice('viva');
      const audioBuffer = await textToAudio(text, voice);
      res.json({ audio: audioBuffer?.toString('base64') });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });
}
