import { Express } from 'express';
import type OpenAI from 'openai';
import { runGemini } from '../assistants/gemini.js';
import { textToAudio } from '../assistants/gpt4-mini.js';
import { SecurityService } from '../services/securityService.js';
import { ToolService } from '../services/toolService.js';
import { OutputContracts } from '../services/outputContracts.js';
import { getOpenAIVoice } from '../config/openai-voices.js';
import { ensureSession } from '../server.js';
import { getLiaGreeting } from '@luminnus/lia-runtime';
import { LIA_FULL_PERSONALITY, DASHBOARD_CONTROL_PROMPT } from '@luminnus/shared';
import { CreditService } from '../services/creditService.js';
import { emitEvent } from '../services/eventBusService.js';

export function setupChatRoutes(app: Express, openai: OpenAI) {
  const functions = ToolService.getTools();

  // Handler principal de chat (reutilizável para /chat e /api/chat)
  const chatHandler = async (req: any, res: any) => {
    try {
      const { message, conversationId, mode, personality, userId, tenantId, channel, liaMode, messageId, files, playbookRules: clientPlaybookRules } = req.body;

      console.log('\n========== 💬 NOVA REQUISIÇÃO CHAT ==========');
      console.log(`📝 Mensagem: ${message?.substring(0, 100)}`);
      console.log(`🆔 Conversa: ${conversationId || 'N/A'}`);
      console.log(`🔧 LIA Mode: ${liaMode || 'NORMAL'}`);
      console.log(`📎 Arquivos: ${files ? files.length : 0}`);
      console.log(`📋 Playbook Rules (do cliente): ${clientPlaybookRules ? 'SIM (' + clientPlaybookRules.length + ' chars)' : 'NÃO'}`);
      console.log('============================================\n');

      const finalUserId = userId || '00000000-0000-0000-0000-000000000001';
      const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

      // 1. Carregar sessão (SSOT: Mente Única)
      const session = await ensureSession(finalUserId, conversationId);

      // 1.1 Carregar contexto completo
      const { getContext, updateSummaryIfNeeded } = await import('../services/memoryService.js');
      const context = await getContext(conversationId, finalUserId, message, session?.userLocation);

      // 1.2 Buscar role do usuário
      const { getUserProfile } = await import('../config/supabase.js');
      const profile = await getUserProfile(finalUserId);
      const userRole = profile?.role || 'client';


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

      // Personalidade v4.0 Centralizada (SSOT)
      const admin_diagnostic_mode = req.body.admin_diagnostic_mode === true || liaMode === 'DIAGNOSTIC';
      const basePersona = getLiaGreeting(admin_diagnostic_mode);

      const finalChannel = (channel || 'web_widget').toString();
      const toArray = (value: any): any[] => Array.isArray(value) ? value : [];
      const toText = (value: any): string => typeof value === 'string' ? value.trim() : '';
      const safeField = (value: any, fallback = 'não informado') => {
        const txt = toText(value);
        return txt || fallback;
      };

      let hasTenantContext = false;
      let tenantMasterPrompt = '';
      let playbooksBlock = '';
      let faqDocsProductsBlock = '';
      let tenantStructuredBlock = '';

      if (clientPlaybookRules && clientPlaybookRules.trim()) {
        hasTenantContext = true;
        playbooksBlock = `Playbooks recebidos do frontend (${finalChannel}):\n${clientPlaybookRules.trim()}`;
        console.log(`[Chat] 📋 Playbook recebido do frontend (${clientPlaybookRules.length} chars)`);
      }

      try {
        const { supabase: supabaseClient } = await import('../config/supabase.js');

        let agentSettings: any = null;
        const byChannel = await supabaseClient
          .from('whatsapp_agent_settings')
          .select('agent_name, profile_json, playbooks_json, knowledge_items_json, segment_key')
          .eq('tenant_id', finalTenantId)
          .eq('channel', finalChannel)
          .maybeSingle();

        if (byChannel.error) {
          console.warn(`[Chat] ⚠️ Erro ao buscar settings por canal (${finalChannel}):`, byChannel.error.message);
        } else {
          agentSettings = byChannel.data;
        }

        if (!agentSettings) {
          const fallbackSettings = await supabaseClient
            .from('whatsapp_agent_settings')
            .select('agent_name, profile_json, playbooks_json, knowledge_items_json, segment_key')
            .eq('tenant_id', finalTenantId)
            .maybeSingle();
          if (fallbackSettings.error) {
            console.warn('[Chat] ⚠️ Erro no fallback de settings do tenant:', fallbackSettings.error.message);
          } else {
            agentSettings = fallbackSettings.data;
          }
        }

        const tenantProfileResult = await supabaseClient
          .from('profiles')
          .select('id, name, full_name, company_name, segment, email')
          .eq('id', finalTenantId)
          .maybeSingle();

        if (tenantProfileResult.error) {
          console.warn('[Chat] ⚠️ Erro ao buscar perfil do tenant:', tenantProfileResult.error.message);
        }

        const tenantProfile = tenantProfileResult.data || {};
        const agentProfile = agentSettings?.profile_json || {};
        const activePlaybooks = toArray(agentSettings?.playbooks_json)
          .filter((p: any) => !!toText(p?.content) && (p?.active !== false) && (p?.enabled !== false));
        const knowledgeItems = toArray(agentSettings?.knowledge_items_json)
          .filter((k: any) => !!toText(k?.content || k?.text || k?.value));

        const agentName = toText(agentSettings?.agent_name) || toText(agentProfile.agent_name) || 'Atendimento';
        const companyName = toText(agentProfile.company_name) || toText(tenantProfile.company_name) || toText(tenantProfile.name);
        const businessSegment = toText(agentProfile.business_segment) || toText(agentProfile.segment) || toText(tenantProfile.segment) || toText(agentSettings?.segment_key);
        const language = toText(agentProfile.language) || 'pt-BR';
        const tone = toText(agentProfile.tone) || toText(agentProfile.tone_of_voice) || 'profissional';
        const primaryGoal = toText(agentProfile.primary_goal) || toText(agentProfile.objective);
        const companyLocation = toText(agentProfile.company_location) || toText(agentProfile.location);
        const companyPhone = toText(agentProfile.company_phone) || toText(agentProfile.phone);
        const companyEmail = toText(agentProfile.company_email) || toText(tenantProfile.email);
        const companyWebsite = toText(agentProfile.company_website) || toText(agentProfile.website);
        const businessHours = toText(agentProfile.business_hours) || toText(agentProfile.working_hours);
        const activeChannels = toText(agentProfile.active_channels) || finalChannel;

        const kbText = toText(agentProfile.knowledge_base_content);
        const faqText = toText(agentProfile.faq_content);
        const productsText = toText(agentProfile.products_services_content);
        const salesPolicyText = toText(agentProfile.sales_policy_content);
        const supportPolicyText = toText(agentProfile.support_policy_content);

        const autoPlaybooksBlock = activePlaybooks
          .map((p: any, idx: number) => `Playbook ${idx + 1} - ${safeField(p?.name, `Sem nome ${idx + 1}`)}:\n${toText(p?.content)}`)
          .join('\n\n');
        if (autoPlaybooksBlock && !playbooksBlock) {
          playbooksBlock = autoPlaybooksBlock;
        }

        const knowledgeBlock = knowledgeItems
          .map((k: any, idx: number) => {
            const label = safeField(k?.name || k?.title || k?.type, `Item ${idx + 1}`);
            const content = toText(k?.content || k?.text || k?.value);
            return `${label}: ${content}`;
          })
          .join('\n');

        faqDocsProductsBlock = [
          kbText ? `Base de conhecimento:\n${kbText}` : '',
          knowledgeBlock ? `Conhecimento estruturado:\n${knowledgeBlock}` : '',
          faqText ? `FAQ:\n${faqText}` : '',
          productsText ? `Produtos e serviços:\n${productsText}` : '',
          salesPolicyText ? `Políticas comerciais:\n${salesPolicyText}` : '',
          supportPolicyText ? `Políticas de suporte:\n${supportPolicyText}` : ''
        ].filter(Boolean).join('\n\n');

        tenantMasterPrompt =
          toText(agentProfile.master_prompt) ||
          toText(agentProfile.prompt_mestre) ||
          toText(agentProfile.tenant_master_prompt) ||
          toText(agentProfile.system_prompt);

        tenantStructuredBlock = [
          `Nome do agente: ${safeField(agentName)}`,
          `Nome da empresa: ${safeField(companyName)}`,
          `Segmento: ${safeField(businessSegment)}`,
          `Cidade/Região: ${safeField(companyLocation)}`,
          `Telefone: ${safeField(companyPhone)}`,
          `Email: ${safeField(companyEmail)}`,
          `Site: ${safeField(companyWebsite)}`,
          `Horário de funcionamento: ${safeField(businessHours)}`,
          `Idioma principal: ${safeField(language)}`,
          `Tom configurado: ${safeField(tone)}`,
          `Objetivo principal: ${safeField(primaryGoal)}`,
          `Canais ativos: ${safeField(activeChannels)}`
        ].join('\n');

        if (companyName || toText(agentSettings?.agent_name) || activePlaybooks.length > 0 || !!tenantMasterPrompt || !!faqDocsProductsBlock || !!playbooksBlock) {
          hasTenantContext = true;
          console.log(`[Chat] ✅ Contexto tenant carregado para ${finalTenantId} | channel=${finalChannel} | playbooks=${activePlaybooks.length}`);
        } else {
          console.log(`[Chat] ℹ️ Sem contexto de tenant suficiente para ${finalTenantId} (fallback base persona)`);
        }
      } catch (err: any) {
        console.warn('[Chat] ⚠️ Erro ao carregar contexto completo do tenant:', err.message);
      }

      const globalTenantPolicy = `[POLÍTICA GLOBAL - MODO WIDGET TENANT]
Quando houver contexto de tenant carregado, você atua EXCLUSIVAMENTE como agente oficial da empresa.
Nunca se apresente como Luminnus.
Nunca diga "nós da Luminnus" para o visitante final.
Prioridade de fontes:
1) Configuração da empresa atual.
2) Playbooks ativos do tenant.
3) Base de conhecimento do tenant.
4) Produtos/serviços/regras comerciais do tenant.
5) FAQ/documentos do tenant.
Se faltar dado específico, não invente: peça apenas o mínimo necessário para avançar.`;

      let operationalContext = context.systemInstruction || '';
      if (hasTenantContext) {
        operationalContext = operationalContext
          .replace(LIA_FULL_PERSONALITY, '')
          .replace(DASHBOARD_CONTROL_PROMPT, '')
          .replace(basePersona, '')
          .replace(/Você é LIA[, ]+assistente[^.\n]*Luminnus[^\n]*\n?/gi, '')
          .trim();
      }

      const now = new Date();
      const systemBlocks: string[] = [];
      if (hasTenantContext) {
        systemBlocks.push(globalTenantPolicy);
        if (tenantMasterPrompt) systemBlocks.push(`[PROMPT MESTRE DO TENANT]\n${tenantMasterPrompt}`);
        if (tenantStructuredBlock) systemBlocks.push(`[DADOS ESTRUTURADOS DA EMPRESA]\n${tenantStructuredBlock}`);
        if (playbooksBlock) systemBlocks.push(`[PLAYBOOKS ATIVOS]\n${playbooksBlock}`);
        if (faqDocsProductsBlock) systemBlocks.push(`[FAQ / DOCUMENTOS / PRODUTOS]\n${faqDocsProductsBlock}`);
        if (operationalContext) systemBlocks.push(`[CONTEXTO OPERACIONAL (MEMÓRIA/HISTÓRICO)]\n${operationalContext}`);
      } else {
        systemBlocks.push(basePersona);
        if (operationalContext) systemBlocks.push(operationalContext);
      }
      systemBlocks.push(`[Data atual do sistema: ${now.toISOString()}]`);
      if (session.userLocation) {
        systemBlocks.push(`[Localização Atual: ${session.userLocation}]`);
      }
      const finalSystemInstruction = systemBlocks.filter(Boolean).join('\n\n');
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
        tools: availableTools,
        files: files // Passar arquivos para ativar hybridPipeline
      });

      let replyText = aiResponse.text;
      let function_calls = aiResponse.function_calls || (aiResponse.function_call ? [aiResponse.function_call] : []);
      let finalDashboardAction = null;
      let finalImagePayload = null;
      let forceFinalReplyFromTools: string | null = null;

      // 4.1 Debitar crédito por mensagem (Lógica de Justiça + Multiplicador de Modelo)
      const toolCallsCount = function_calls.length;
      const shouldChargeCredit = CreditService.shouldCharge(message || '', toolCallsCount, false);

      if (shouldChargeCredit) {
        try {
          await CreditService.debit(finalTenantId, finalUserId, 'message', 'Mensagem de chat', {
            conversation_id: conversationId,
            model: aiResponse.model || 'gpt-4o-mini'
          });
        } catch (creditErr) {
          console.warn('⚠️ [Chat] Erro ao debitar crédito (non-blocking):', creditErr);
        }
      } else {
        console.log(`⚖️ [Chat] Justiça: mensagem não cobrada ("${(message || '').substring(0, 30)}")`);
      }

      // 5. Ciclo Agêntico v4.0 - Loop de Ferramentas
      let turnCount = 0;
      const MAX_TURNS = 3;

      while (function_calls.length > 0 && turnCount < MAX_TURNS) {
        turnCount++;
        console.log(`🔄 [Chat] Turno Agêntico ${turnCount}: Processando ${function_calls.length} ferramentas`);

        const turnResults = [];
        let criticalActionHandled = false;

        for (const call of function_calls) {
          console.log(`🔧 [Chat] Executando: ${call.name}`);
          const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments || '{}') : call.arguments;

          // 📢 Emitir evento SOCKET de Início de Ferramenta para o UI
          try {
            emitEvent({
              type: 'tool_execution_start' as any,
              tenantId: finalTenantId,
              conversationId: conversationId,
              payload: { toolName: call.name, args: Object.keys(args) }
            }, { persistEvents: false, broadcastEvents: true });
          } catch (e) {
            console.warn('⚠️ Falha ao avisar frontend do início da ferramenta', e);
          }

          let function_result: any;
          try {
            function_result = await ToolService.execute(call.name, args, {
              userId: finalUserId,
              tenantId: finalTenantId,
              userRole: userRole,
              userLocation: session?.userLocation,
              userPrompt: message
            });

            if (!function_result || function_result.error) {
              throw new Error(function_result?.error || 'Retorno vazio da ferramenta');
            }

            // 📢 Emitir evento SOCKET de Fim de Ferramenta
            try {
              emitEvent({
                type: 'tool_execution_end' as any,
                tenantId: finalTenantId,
                conversationId: conversationId,
                payload: { toolName: call.name, success: true }
              }, { persistEvents: false, broadcastEvents: true });
            } catch (e) { }

          } catch (toolError: any) {
            console.error(`❌ Erro na ferramenta ${call.name}:`, toolError.message);

            // 📢 Emitir evento SOCKET de Fim de Ferramenta (ERRO)
            try {
              emitEvent({
                type: 'tool_execution_end' as any,
                tenantId: finalTenantId,
                conversationId: conversationId,
                payload: { toolName: call.name, success: false, error: toolError.message }
              }, { persistEvents: false, broadcastEvents: true });
            } catch (e) { }

            // ANTI-LOOP GUARDRAIL: falha direta sem travar em A/B
            let userFriendlyMsg = toolError.message;
            if (String(userFriendlyMsg).includes('invalid_grant')) {
              userFriendlyMsg = 'Sua conexão com o Google expirou ou é inválida. Por favor, vá nas configurações da LIA, desconecte e conecte o Google Workspace novamente.';
            }

            // Preservar o texto parcial da IA e adicionar o erro
            replyText = (replyText ? replyText + '\n\n' : '') + `⚠️ **Erro ao executar ${call.name}**: ${userFriendlyMsg}`;

            forceFinalReplyFromTools = replyText;
            criticalActionHandled = true;
            function_calls = []; // Abortar loop agêntico
            break;
          }

          // TRATAMENTO CRÍTICO: Ferramentas de execução devem responder com verdade factual
          // v18.0: NÃO interromper o loop imediatamente — coletar resultado e continuar para outras ferramentas do batch
          if (['sendGmail', 'createCalendarEvent', 'updateCalendarEvent', 'deleteCalendarEvent'].includes(call.name)) {
            const toolSuccess = !!function_result?.success;
            const toolMessage = function_result?.message || '';
            const calendarLink = function_result?.link || function_result?.event?.link || '';
            const meetLink = function_result?.meetLink || '';

            if (toolSuccess) {
              const confirmations: string[] = [forceFinalReplyFromTools || replyText, toolMessage];
              if (calendarLink) confirmations.push(`Link do evento: ${calendarLink}`);
              if (meetLink) confirmations.push(`Link do Meet: ${meetLink}`);
              forceFinalReplyFromTools = confirmations.filter(Boolean).join('\n\n');
            } else {
              forceFinalReplyFromTools = (forceFinalReplyFromTools || replyText ? (forceFinalReplyFromTools || replyText) + '\n\n' : '') + (toolMessage || `⚠️ Não consegui concluir a ação ${call.name}.`);
            }

            messages.push({ role: 'assistant', content: replyText, function_call: call });
            messages.push({ role: 'function', name: call.name, content: JSON.stringify(function_result) });
            criticalActionHandled = true;
            // v18.0: NÃO break aqui — continuar para executar as demais ferramentas do batch (ex: sendGmail após createCalendarEvent)
            continue;
          }

          // TRATAMENTO: generateImage (Retorno Imediato)
          if (call.name === 'generateImage' && function_result?.url) {
            finalImagePayload = {
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
            break; // Sai do for e o while vai encerrar
          }

          // TRATAMENTO: Dashboard Actions que exigem Frontend (Add/Replace/Reorganize)
          // v4.1: dashboardGetSnapshot NÃO causa interrupção, pois agora retorna dados reais
          if (call.name.startsWith('dashboard') && call.name !== 'dashboardGetSnapshot' && function_result?.action) {
            finalDashboardAction = {
              name: function_result.action,
              arguments: JSON.stringify(function_result.params || {}),
              message: function_result.message
            };
            // Adicionar ao histórico para a IA saber que solicitou a ação
            messages.push({ role: 'assistant', content: replyText, function_call: call });
            messages.push({ role: 'function', name: call.name, content: JSON.stringify(function_result) });
            break;
          }

          // TRATAMENTO ESPECIAL: Gmail Tools (Preservar links formatados)
          // v4.9 - Previne que o segundo call da IA reformate e perca os URLs
          if ((call.name === 'listGmailMessages' || call.name === 'searchGmail') && function_result?.message) {
            console.log(`📧 [Chat] Gmail tool detectado - usando resposta pré-formatada`);
            replyText = (replyText ? replyText + '\n\n' : '') + function_result.message; // Usar a mensagem já formatada com links
            function_calls = []; // Encerrar o loop agêntico - não precisa de segundo call
            messages.push({ role: 'assistant', content: replyText, function_call: call });
            messages.push({ role: 'function', name: call.name, content: JSON.stringify(function_result) });
            break;
          }

          // TRATAMENTO: Google Workspace Tools (Sheets, Docs, Slides)
          // v9.0 - Preservar mensagem e link das ferramentas de criação/edição do Google
          const isGoogleWorkspaceTool = [
            'createProFinancialSheet', 'createGoogleDoc', 'createGoogleSheet',
            'createGoogleSlide', 'updateGoogleSheet', 'createGooglePresentation'
          ].includes(call.name);

          if (isGoogleWorkspaceTool && function_result?.message) {
            console.log(`📊 [Chat] Google Workspace tool detectado: ${call.name} - usando resposta da ferramenta`);
            const toolSuccess = !!function_result.success;
            const toolMessage = function_result.message || '';
            const toolLink = function_result.link || '';

            if (toolSuccess) {
              const parts: string[] = [replyText, toolMessage];
              if (toolLink) parts.push(`📎 [Abrir no Google](${toolLink})`);
              forceFinalReplyFromTools = parts.filter(Boolean).join('\n\n');
            } else {
              forceFinalReplyFromTools = (replyText ? replyText + '\n\n' : '') + (toolMessage || `⚠️ Não consegui concluir a ação ${call.name}.`);
            }

            messages.push({ role: 'assistant', content: replyText, function_call: call });
            messages.push({ role: 'function', name: call.name, content: JSON.stringify(function_result) });
            function_calls = [];
            criticalActionHandled = true;
            break;
          }

          // Adicionar resultado ao histórico para o próximo turno
          messages.push({ role: 'assistant', content: replyText, function_call: call });
          messages.push({ role: 'function', name: call.name, content: JSON.stringify(function_result) });
          turnResults.push(function_result);
        }

        if (criticalActionHandled) {
          if (forceFinalReplyFromTools) replyText = forceFinalReplyFromTools;
          break;
        }

        // Se gerou imagem ou ação de dashboard, encerramos o loop para o frontend agir
        if (finalImagePayload || finalDashboardAction) break;

        // Chamar AI novamente com os resultados das ferramentas
        const isJsonExplicit = OutputContracts.isJsonRequested(message);
        const nextPrompt = isJsonExplicit
          ? `Continue com base nos resultados das ferramentas acima. Garanta o formato JSON se solicitado.`
          : `Continue a conversa.`;

        console.log(`🧠 [Chat] Turno ${turnCount}: Solicitando continuação para a IA...`);
        const nextResponse: any = await runGemini(nextPrompt, {
          conversationId,
          messages,
          temperature: 0.7
        });

        replyText = nextResponse.text || replyText;
        function_calls = nextResponse.function_calls || (nextResponse.function_call ? [nextResponse.function_call] : []);
      }

      if (forceFinalReplyFromTools) {
        replyText = forceFinalReplyFromTools;
      }

      // 5.1 Retornos Especiais (Imagem)
      if (finalImagePayload) {
        try {
          const { saveMessage } = await import('../config/supabase.js');
          const responseId = messageId ? `resp_${messageId}` : `img_${Date.now()}`;
          await saveMessage(conversationId, 'user', message, 'text', [], messageId);
          await saveMessage(conversationId, 'assistant', `🖼️ Imagem gerada: ${finalImagePayload.data.prompt}`, 'text', [], responseId);
        } catch (dbErr) { console.error('⚠️ persistence err:', dbErr); }

        return res.json({
          ok: true,
          reply: JSON.stringify(finalImagePayload),
          dynamicContent: finalImagePayload,
          isStructured: true,
          savedMemories: autoSavedMemories
        });
      }

      // 5.2 Retornos Especiais (Dashboard Action)
      if (finalDashboardAction) {
        try {
          const { saveMessage } = await import('../config/supabase.js');
          const responseId = messageId ? `resp_${messageId}` : `dash_${Date.now()}`;
          await saveMessage(conversationId, 'user', message, 'text', [], messageId);
          await saveMessage(conversationId, 'assistant', finalDashboardAction.message || 'Dashboard atualizado', 'text', [], responseId);
        } catch (dbErr) { console.error('⚠️ persistence err:', dbErr); }

        return res.json({
          ok: true,
          reply: finalDashboardAction.message || 'Dashboard atualizado!',
          action: { name: finalDashboardAction.name, arguments: finalDashboardAction.arguments },
          savedMemories: autoSavedMemories
        });
      }



      // 6. Governança de Saída (Filtros de privacidade / Formatação)
      const { OutputGovernance } = await import('../services/outputGovernance.js');
      const governed = await OutputGovernance.forChat(replyText, message, async (retryPrompt) => {
        // v4.9: Garantir que o retry tenha acesso à personalidade e contexto para não alucinar incapacidade
        const response = await runGemini(retryPrompt, {
          conversationId,
          messages: [
            { role: 'system', content: finalSystemInstruction },
            ...historyMessages.slice(-5) // Últimas 5 mensagens de histórico para contexto
          ],
          temperature: 0.3
        });
        return response.text;
      });
      replyText = governed.markdown;

      // 7. Persistência
      let responseMessageId = messageId ? `resp_${messageId}` : `chat_${Date.now()}`; // Fallback default
      try {
        const { saveMessage } = await import('../config/supabase.js');
        // const responseMessageId = ... (Removed redeclaration)

        const attachments = aiResponse.detailPayload?.attachments || [];
        await saveMessage(conversationId, 'user', message, 'multimodal', attachments, messageId);
        await saveMessage(conversationId, 'assistant', replyText, 'multimodal', attachments, responseMessageId);

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
        id: responseMessageId, // v6.0: ID consistente para o frontend
        reply: SecurityService.maskSensitiveData(replyText),
        audio: audioBase64,
        function_call: function_calls.length > 0 ? function_calls[0] : null,
        savedMemories: autoSavedMemories
      });

    } catch (error) {
      console.error('❌ Erro /chat:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  };

  // Registrar handler para ambos os endpoints (/chat para compatibilidade, /api/chat para padronização)
  app.post('/chat', chatHandler);
  app.post('/api/chat', chatHandler);

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

      // Debitar crédito por transcrição (non-blocking)
      try {
        const userId = req.body.userId || '00000000-0000-0000-0000-000000000001';
        const tenantId = req.body.tenantId || userId;
        await CreditService.debit(tenantId, userId, 'stt', 'Transcrição de áudio');
      } catch (e) { /* non-blocking */ }

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

  // ===== GOOGLE CALENDAR SYNC FOR DASHBOARD =====
  app.get('/api/google/calendar/events', async (req: any, res: any) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      const tenantId = req.query.tenantId || req.headers['x-tenant-id'];

      if (!userId || !tenantId) {
        return res.status(400).json({ success: false, error: 'userId e tenantId são obrigatórios' });
      }

      // Get events for the current month (expandable via query params)
      const now = new Date();
      const timeMin = req.query.timeMin || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const timeMax = req.query.timeMax || new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();

      const { listCalendarEvents } = await import('../tools/googleWorkspace.js');
      const result = await listCalendarEvents(userId, tenantId, timeMin, timeMax);

      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error || result.message });
      }

      // Transform events to match the frontend CalendarEvent format
      const calendarEvents = (result.events || []).map((ev: any, idx: number) => {
        const startDate = new Date(ev.start);
        const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: true });

        return {
          id: ev.id || `google-${idx}`,
          title: ev.title || 'Sem título',
          date: dateStr,
          time: timeStr,
          type: 'meeting',
          description: ev.description || '',
          link: ev.link,
          source: 'google'
        };
      });

      res.json({ success: true, events: calendarEvents, count: calendarEvents.length });
    } catch (error: any) {
      console.error('[CalendarSync] Erro:', error.message);
      // If Google auth not connected, return empty with a helpful message
      if (error.message?.includes('token') || error.message?.includes('auth') || error.message?.includes('credentials')) {
        return res.json({
          success: true,
          events: [],
          count: 0,
          warning: 'Google Calendar não conectado. Conecte sua conta Google pelo chat da LIA.'
        });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

