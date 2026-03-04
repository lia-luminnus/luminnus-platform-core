import { GeminiService } from './geminiService.js';
import { processarRequisicaoMultimodal } from './multimodalOrchestrator.js';
import { runGemini } from '../assistants/gemini.js';
import { CostTracker } from './costTracker.js';
import { OpenRouterService } from './openRouterService.js';
import { OpenAIService } from './openAIService.js';
import { FileService } from './fileService.js';
import { OutputFormatter } from './outputFormatter.js';
import { supabase, getUserProfile } from '../config/supabase.js';
import { ToolService } from './toolService.js';
import mammoth from 'mammoth';
import crypto from 'crypto';
import {
    IntentMode,
    inferIntentMode,
    templateIncident,
    templateAction,
    extractActionRequest,
    canExecute,
    generateActionFallback,
    CAPABILITY_REGISTRY
} from '@luminnus/lia-runtime';

interface AIRequest {
    userId: string;
    tenantId: string;
    prompt: string;
    conversationId?: string; // v1.1.2: Para persistência de contexto
    files?: Array<{
        mimetype: string;
        data: string;
        name: string;
        size: number;
        // v7.3: Suporte a arquivos pré-uploadados (SSOT)
        id?: string;
        storage_url?: string;
        storage_path?: string;
        folder_id?: string;
    }>;
    history?: any[];
    tools?: any[];
    userIntent?: 'resumo' | 'tabela' | 'completo';
    userPlan?: string;
    userRole?: string;
    connections?: { gmail?: boolean; workspace?: boolean; calendar?: boolean };
}

interface AIResponse {
    text: string;
    function_call?: any;
    provider: string;
    model: string;
    usage?: any;
    detailPayload?: any;
}

/**
 * Helper: Buscar plano e conexões do banco de dados se não fornecidos
 * v1.3.0: Fallback para garantir plan awareness
 */
async function resolveUserContext(req: AIRequest): Promise<{ userPlan: string; userRole: string; connections: { gmail?: boolean; workspace?: boolean; calendar?: boolean } }> {
    // Se já temos os dados, retornar diretamente
    if (req.userPlan && req.connections && req.userRole) {
        return { userPlan: req.userPlan, userRole: req.userRole, connections: req.connections };
    }

    let userPlan = req.userPlan || 'free';
    let userRole = req.userRole || 'client';
    let connections = req.connections || {};

    // Buscar perfil do banco se necessário
    if ((!req.userPlan || !req.userRole) && req.userId && supabase) {
        try {
            const profile = await getUserProfile(req.userId);
            if (profile) {
                userPlan = profile.plan || profile.plan_level || userPlan;
                userRole = profile.role || userRole;
                console.log(`📋 [AIRouter] Contexto carregado: Plan=${userPlan}, Role=${userRole}`);
            }
        } catch (e) {
            console.warn('⚠️ [AIRouter] Erro ao carregar perfil do DB:', e);
        }
    }

    // Buscar conexões se não fornecidas
    if (!req.connections && req.userId && supabase) {
        try {
            const { data: integrations } = await supabase
                .from('integrations_connections')
                .select('provider, status')
                .eq('user_id', req.userId);

            if (integrations && integrations.length > 0) {
                connections = {
                    gmail: integrations.some(i => i.provider === 'google' && i.status === 'active'),
                    workspace: integrations.some(i => i.provider === 'google' && i.status === 'active'),
                    calendar: integrations.some(i => i.provider === 'google' && i.status === 'active')
                };
                console.log(`🔗 [AIRouter] Conexões carregadas do DB:`, connections);
            }
        } catch (e) {
            console.warn('⚠️ [AIRouter] Erro ao carregar conexões do DB:', e);
        }
    }

    return { userPlan, userRole, connections };
}

/**
 * AIRouter: Orquestrador Híbrido LIA v1.3.0
 * v1.3.0: Adicionado fallback para carregar plano/conexões do DB
 */
export class AIRouter {
    /**
     * Rota a requisição para o pipeline correto
     */
    static async route(req: AIRequest): Promise<AIResponse> {
        try {
            const hasFiles = req.files && req.files.length > 0;
            const executionRouterOn = process.env.LIA_EXECUTION_ROUTER === 'true' ||
                process.env.VITE_LIA_EXECUTION_ROUTER === 'true' ||
                process.env.APP_ENV === 'development';

            // v1.3.0: Resolver contexto do usuário (plano e conexões) com fallback para DB
            const { userPlan, userRole, connections } = await resolveUserContext(req);
            req.userPlan = userPlan;
            req.userRole = userRole;
            req.connections = connections;

            console.log(`🚀 [AIRouter] Route: "${req.prompt?.substring(0, 50)}..." | Files: ${hasFiles} | RouterOn: ${executionRouterOn} | Plan: ${userPlan}`);

            // v1.2.0: EXECUTION ROUTER - Detectar ACTION antes de qualquer processamento
            if (executionRouterOn) {
                const intentMode = inferIntentMode(req.prompt, req.files?.map(f => f.mimetype) || []);
                const actionRequest = extractActionRequest(req.prompt);

                if (intentMode === IntentMode.ACTION) console.log(`🎯 [AIRouter] Intent Mode Inferido: ${intentMode}`);

                // Sincronização: se foi inferido ACTION ou se extraímos uma ação clara
                const mentionsImage = req.prompt.toLowerCase().match(/print|imagem|screenshot|foto|arquivo/);
                if ((intentMode === IntentMode.ACTION || actionRequest) && !hasFiles && !mentionsImage) {
                    console.log(`🔥 [EXECUTION-ROUTER] Ativo para: "${req.prompt}"`);

                    const effectiveRequest = actionRequest || {
                        provider: 'unknown',
                        action: 'unknown',
                        targets: [],
                        params: {},
                        capabilityId: 'unknown'
                    };

                    const result = canExecute(
                        effectiveRequest.capabilityId,
                        userPlan,
                        connections
                    );

                    // v1.2.4: Admin Bypass - CEO e admins têm acesso total
                    const adminPlans = ['admin', 'pro', 'premium', 'enterprise', 'ceo', 'owner'];
                    const hasAdminPlan = adminPlans.includes(userPlan.toLowerCase());
                    const isAdmin = hasAdminPlan || userRole === 'admin';

                    if (result.canExecute || isAdmin) {
                        const capability = result.capability || (effectiveRequest.capabilityId !== 'unknown' ? CAPABILITY_REGISTRY.find(c => c.id === effectiveRequest.capabilityId) : null);

                        // BYPASS - Ferramentas implementadas seguem para o pipeline normal
                        const implementedActions = [
                            'list_emails', 'fetch_emails', 'search_emails', 'send_email',
                            'create_event', 'list_events', 'create_sheet', 'update_sheet',
                            'listGmailMessages', 'searchGmail', 'getGmailMessage', 'sendGmail',
                            'createCalendarEvent', 'listCalendarEvents', 'createGoogleDoc', 'createGoogleSheet'
                        ];
                        const isImplemented = implementedActions.includes(effectiveRequest.action);

                        if (!isImplemented) {
                            const honestText = `⚠️ **Ação identificada: ${capability?.displayName || effectiveRequest.action}**
Detectei que você quer **${effectiveRequest.action.replace('_', ' ')}**. Esta execução automática ainda está em desenvolvimento.`;

                            return {
                                text: honestText,
                                provider: 'execution-router',
                                model: 'lia-action-v1.2.2',
                                detailPayload: { actionRequest: effectiveRequest, isFallback: true }
                            };
                        }
                    } else {
                        console.log(`❌ [EXECUTION-ROUTER] Bloqueado: ${result.reason}`);
                        const fallbackText = result.capability
                            ? generateActionFallback(result.capability, result.reason || 'Erro de plano')
                            : `⚠️ **Ação não permitida no seu plano atual.**\n\n• ${result.reason || 'Esta funcionalidade requer plano Plus ou Pro.'}`;

                        return {
                            text: fallbackText,
                            provider: 'execution-router',
                            model: 'lia-action-v1.2.1',
                            detailPayload: { actionBlocked: true, reason: result.reason, isFallback: true }
                        };
                    }
                }
            }

            // v1.1.2: Garantir contexto se tiver conversationId e não tiver history
            if (req.conversationId && (!req.history || req.history.length <= 1)) {
                try {
                    const { getContext } = await import('./memoryService.js');
                    const context = await getContext(req.conversationId, req.userId, req.prompt);
                    const systemMsg = { role: 'system', content: context.systemInstruction };
                    const historyMsgs = context.history.map((msg: any) => ({
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content
                    }));
                    req.history = [systemMsg, ...historyMsgs];
                } catch (e) {
                    console.warn('⚠️ [AIRouter] Erro ao carregar contexto mem:', e);
                }
            }

            // v3.5: Roteamento para MiniMax 2.5 (tarefas complexas sem arquivos)
            const isComplexTask = this.isComplexTask(req.prompt);
            if (isComplexTask && !hasFiles && OpenRouterService.isConfigured()) {
                console.log('🧠 [AIRouter] Roteando para MiniMax 2.5 (tarefa complexa)');
                return await this.complexTaskPipeline(req);
            }

            if (hasFiles) {
                const totalBytes = req.files!.reduce((acc, f) => acc + f.size, 0);
                CostTracker.checkSoftCaps(req.files!.length, totalBytes);
                return await this.hybridPipeline(req);
            } else {
                return await this.chatPipeline(req);
            }
        } catch (error: any) {
            console.error('❌ [AIRouter] Erro Crático:', error);
            return {
                text: "Desculpe, tive um probleminha técnico aqui. Pode repetir?",
                provider: 'error',
                model: 'fallback'
            };
        }
    }

    /**
     * Pipeline Híbrido v7.0: Gemini 2.0 Flash (Multimodal Orchestrator)
     * v7.0: Protocolo de EXECUÇÃO FORÇADA com 2-turns para links reais
     */
    private static async hybridPipeline(req: AIRequest): Promise<AIResponse> {
        console.log(`[AIRouter] Pipeline Híbrido v7.0: MultimodalOrchestrator (SSOT v7.0)`);

        // v17.0: TraceId para observabilidade end-to-end
        const traceId = crypto.randomUUID();

        // v7.1: Processar e PERSISTIR arquivos para garantir histórico (SSOT v7.1)
        // v7.1: Processar e PERSISTIR arquivos para garantir histórico (SSOT v7.1)
        const processedFiles = [];
        const filesToProcess = req.files || [];

        for (const f of filesToProcess) {
            try {
                let storageUrl = f.storage_url;
                let storagePath = f.storage_path;

                // v7.3: Se não tiver URL (fluxo antigo), fazer upload agora
                if (!storageUrl) {
                    const buffer = Buffer.from(f.data, 'base64');
                    const stored = await FileService.uploadToStorage(
                        req.tenantId,
                        req.userId,
                        buffer,
                        f.name,
                        f.mimetype
                    );

                    if (stored) {
                        console.log(`✅ [AIRouter] Arquivo persistido: ${f.name} -> ${stored.url}`);
                        storageUrl = stored.url;
                        storagePath = stored.path;
                    }
                }

                let extractedText = null;
                // Extração de texto para Docs (se necessário)
                if (f.mimetype.includes('wordprocessingml') || f.name.toLowerCase().endsWith('.docx') || f.name.toLowerCase().endsWith('.doc')) {
                    try {
                        const buffer = Buffer.from(f.data, 'base64');

                        // v7.5: Validar se o buffer é um ZIP válido (formato .docx)
                        const isValidZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B;
                        if (!isValidZip) {
                            console.error(`❌ [AIRouter] Arquivo ${f.name} não é um ZIP válido (formato .docx corrompido)`);
                            // Continuar sem extrair texto
                        } else {
                            // v7.2: Suporte a ESM/CJS interop para mammoth
                            const extractFn = (mammoth as any).extractRawText || (mammoth as any).default?.extractRawText;
                            if (extractFn) {
                                const result = await extractFn({ buffer });
                                extractedText = result.value;
                                console.log(`📄 [AIRouter] Texto extraído do Word: ${extractedText.length} caracteres`);
                            }
                        }
                    } catch (wordErr) {
                        console.error('❌ [AIRouter] Erro ao extrair texto do Word:', wordErr);
                    }
                }

                const processedFile = {
                    ...f,
                    storage_url: storageUrl,
                    storage_path: storagePath,
                    extracted_text: extractedText
                };
                processedFiles.push(processedFile);

            } catch (err) {
                console.error(`❌ [AIRouter] Erro ao processar arquivo ${f.name}:`, err);
                processedFiles.push(f);
            }
        }

        console.log(`🔍 [AIRouter] Iniciando Pipeline Híbrido | TraceID: ${traceId}`);

        const images = processedFiles.filter(f => f.mimetype.startsWith('image/')).map(f => {
            // v7.5: Sanitização de Base64 (SSOT) - Remover prefixo se existir
            const base64Clean = f.data.replace(/^data:image\/\w+;base64,/, '');
            return {
                mimeType: f.mimetype,
                base64: base64Clean
            };
        });

        // v7.5: Observabilidade e Contrato de Payload
        if (images.length > 0) {
            console.log(`👁️ [AIRouter] Payload de Visão Preparado [TraceID: ${traceId}]`, {
                event: 'VISION_PAYLOAD_READY',
                imagesCount: images.length,
                mimeTypes: images.map(i => i.mimeType),
                sampleSize: images[0].base64.length
            });
        }

        const documents = processedFiles.filter(f => !f.mimetype.startsWith('image/')).map(f => ({ mimeType: f.mimetype, base64: f.data, name: f.name }));

        // Registrar início do processamento no FileService (para o primeiro arquivo como referência principal)
        const mainFile = processedFiles[0];
        if (mainFile) {
            await FileService.saveMetadata({
                id: mainFile.id, // v7.3: Usar ID existente para update (SSOT)
                tenant_id: req.tenantId,
                user_id: req.userId,
                file_name: mainFile.name,
                file_type: mainFile.mimetype,
                file_size: mainFile.size,
                storage_url: (mainFile as any).storage_url,
                storage_path: (mainFile as any).storage_path,
                folder_id: (mainFile as any).folder_id,
                parse_method: 'multimodal_orchestrator_v7.1',
                status: 'uploaded'
            });
        }

        // v7.0: Delegar para o Orquestrador Multimodal (que já implementa o fluxo de 2 turnos e intent routing)
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            component: 'MULTIMODAL',
            stage: 'ROUTED',
            traceId,
            conversationId: req.conversationId,
            userId: req.userId,
            tenantId: req.tenantId,
            hasImages: images.length > 0,
            imagesCount: images.length,
            hasDocuments: documents.length > 0,
            documentsCount: documents.length
        }));

        const orchestratorResponse = await processarRequisicaoMultimodal({
            message: req.prompt,
            images,
            documents: documents.map(d => {
                const pf = processedFiles.find(f => f.name === d.name);
                if (pf?.extracted_text) {
                    // Se temos o texto extraído (Word), injetamos no prompt para garantir análise
                    return { ...d, content_snapshot: pf.extracted_text };
                }
                return d;
            }),
            userId: req.userId,
            tenantId: req.tenantId,
            conversationId: req.conversationId,
            personality: 'viva'
        });

        const toolResults = orchestratorResponse.toolResults || [];
        let finalResponseText = orchestratorResponse.content;

        // v17.0: LOG CRÍTICO - Verificar se resposta está vazia
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            component: 'MULTIMODAL',
            stage: 'ORCHESTRATOR_RESPONSE',
            traceId,
            conversationId: req.conversationId,
            userId: req.userId,
            tenantId: req.tenantId,
            hasContent: !!finalResponseText,
            contentLength: finalResponseText?.length || 0,
            toolResultsCount: toolResults.length
        }));

        // v17.0: CRITICAL - Nunca permitir resposta vazia silenciosa
        if (!finalResponseText || finalResponseText.trim().length === 0) {
            const errorMsg = `[CRITICAL ERROR] multimodalOrchestrator retornou conteúdo vazio. TraceId: ${traceId}`;
            console.error(JSON.stringify({
                timestamp: new Date().toISOString(),
                component: 'MULTIMODAL',
                stage: 'ERROR',
                traceId,
                conversationId: req.conversationId,
                userId: req.userId,
                tenantId: req.tenantId,
                error: errorMsg
            }));
            throw new Error(errorMsg);
        }

        // v7.0: Se houver links verificados, garantir que eles estão em destaque (Fallback extra)
        if (toolResults.length > 0) {
            toolResults.forEach(tr => {
                if (tr.result?.success && tr.result?.link && !finalResponseText.includes(tr.result.link)) {
                    finalResponseText += `\n\n✅ **Ação Executada:** ${tr.name}\n**ENTREGA:** [Abrir Arquivo](${tr.result.link})`;
                }
            });
        }

        // 4. Registrar Uso Detalhado
        const totalBytes = req.files!.reduce((acc, f) => acc + f.size, 0);
        await CostTracker.logUsage({
            userId: req.userId,
            tenantId: req.tenantId,
            provider: 'hybrid',
            model: `gemini-2.5-flash`,
            inputTokens: 0,
            outputTokens: 0,
            toolCallsCount: toolResults.length,
            fileCount: req.files!.length,
            totalBytes,
            durationMs: 0,
            status: 'success'
        });

        // 5. Finalizar metadados de TODOS os arquivos
        const allFileIds: string[] = [];
        for (const file of processedFiles) {
            const dbStatus = 'parsed'; // Fix type error: 'active' -> 'parsed'
            const fileRecord = await FileService.saveMetadata({
                id: (file as any).id,
                tenant_id: req.tenantId,
                user_id: req.userId,
                file_name: file.name,
                file_type: file.mimetype,
                file_size: file.size,
                storage_url: (file as any).storage_url,
                storage_path: (file as any).storage_path,
                folder_id: (file as any).folder_id,
                parse_method: 'multimodal_orchestrator_v7.1',
                status: dbStatus,
                scope: (file as any).scope || 'lia_shared',
                extracted_metadata: {
                    toolResults,
                    analysis: finalResponseText,
                    content_snapshot: (file as any).extracted_text
                }
            });

            if (fileRecord?.id) {
                allFileIds.push(fileRecord.id);
            }
        }

        return {
            text: finalResponseText,
            provider: 'hybrid',
            model: `lia-execution-v7.0`,
            detailPayload: {
                toolResults,
                fileIds: allFileIds,
                attachments: processedFiles.map((f, idx) => ({
                    id: allFileIds[idx] || (f as any).id,
                    name: f.name,
                    type: f.mimetype.startsWith('image/') ? 'image' : 'document',
                    url: (f as any).storage_url,
                    snapshot: (f as any).extracted_text
                }))
            },
            usage: { totalTokens: Math.ceil(finalResponseText.length / 4) }
        };
    }

    /**
     * Pipeline de Chat Puro (GPT-4o-mini) com Governança de JSON
     */
    private static async chatPipeline(req: AIRequest): Promise<AIResponse> {
        console.log('[AIRouter] Pipeline Chat: GPT-4o-mini (Híbrido v1.1.2)');

        const { OutputGovernance } = await import('./outputGovernance.js');
        const enrichedPrompt = OutputGovernance.enrichPrompt(req.prompt, [], req.userPlan);

        const response = await OpenAIService.chatWithGovernance(
            enrichedPrompt,
            req.history || [],
            'gpt-4o-mini',
            req.tools
        );

        // v1.3.0: Se tiver function_call, retornar diretamente para o orquestrador processar o loop
        if (response.function_call) {
            return {
                text: response.text,
                function_call: response.function_call,
                provider: 'openai',
                model: 'gpt-4o-mini'
            };
        }

        // v1.1.2: Aplicar governança de saída (Contrato Digital) apenas se não for ferramenta
        const governance = await OutputGovernance.forChat(response.text, req.prompt, async (retryPrompt) => {
            const retryResp = await OpenAIService.chat(retryPrompt, [], 'gpt-4o-mini');
            return retryResp.text;
        });

        await CostTracker.logUsage({
            userId: req.userId,
            tenantId: req.tenantId,
            provider: 'openai',
            model: 'gpt-4o-mini',
            inputTokens: response.usage?.inputTokens || 0,
            outputTokens: response.usage?.outputTokens || 0,
            toolCallsCount: 0,
            fileCount: 0,
            totalBytes: 0,
            durationMs: response.durationMs || 0,
            status: 'success'
        });

        return {
            text: governance.markdown,
            provider: 'openai',
            model: 'gpt-4o-mini',
            usage: response.usage
        };
    }

    /**
     * Detecta se uma tarefa é complexa o suficiente para MiniMax 2.5
     * Patterns: análise de dados, JSON, planilhas, documentos, raciocínio longo
     */
    private static isComplexTask(prompt: string): boolean {
        const lower = prompt.toLowerCase();
        const keywords = [
            'balanço', 'planilha', 'sheet', 'sheets', 'slides', 'slide',
            'google docs', 'google sheets', 'google slides', 'google drive',
            'relatório', 'spreadsheet', 'apresentação', 'documento',
            // Financial keywords for better MiniMax routing
            'gastos', 'despesas', 'receitas', 'financeiro', 'financeira',
            'gasóleo', 'gasoleo', 'combustível', 'combustivel',
            'supermercado', 'contas', 'fatura', 'quanto gastei',
            'quanto já gastei', 'total de gastos', 'controle financeiro',
            'orçamento', 'orcamento', 'extrato', 'fluxo de caixa'
        ];
        if (keywords.some(k => lower.includes(k))) return true;
        if (/(?:gerar|criar|montar|fazer|analisar|extrair|processar|organizar|estruturar|comparar|cruzar)\s/i.test(prompt)) {
            const targets = ['json', 'csv', 'xlsx', 'dados', 'tabela', 'doc'];
            if (targets.some(t => lower.includes(t))) return true;
        }
        return false;
    }

    /**
     * Pipeline MiniMax 2.5 (tarefas complexas via OpenRouter)
     * Ideal para: analise de documentos, extracao JSON, raciocinio longo
     */
    private static async complexTaskPipeline(req: AIRequest): Promise<AIResponse> {
        console.log('[AIRouter] Pipeline Complexo: MiniMax 2.5 via OpenRouter');

        try {
            const response = await OpenRouterService.chat(
                req.prompt,
                req.history || [],
                'minimax/minimax-m2.5',
                req.tools
            );

            // Se tiver function_calls, retornar para o orquestrador
            if (response.function_calls && response.function_calls.length > 0) {
                return {
                    text: response.text,
                    function_call: response.function_call,
                    provider: 'openrouter',
                    model: 'minimax/minimax-m2.5'
                };
            }

            await CostTracker.logUsage({
                userId: req.userId,
                tenantId: req.tenantId,
                provider: 'openrouter',
                model: 'minimax/minimax-m2.5',
                inputTokens: response.usage?.inputTokens || 0,
                outputTokens: response.usage?.outputTokens || 0,
                toolCallsCount: 0,
                fileCount: 0,
                totalBytes: 0,
                durationMs: response.durationMs || 0,
                status: 'success'
            });

            return {
                text: response.text,
                provider: 'openrouter',
                model: 'minimax/minimax-m2.5',
                usage: response.usage
            };
        } catch (error: any) {
            console.warn(`⚠️ [AIRouter] MiniMax falhou, fallback para GPT-4o-mini: ${error.message}`);
            return await this.chatPipeline(req);
        }
    }
}

