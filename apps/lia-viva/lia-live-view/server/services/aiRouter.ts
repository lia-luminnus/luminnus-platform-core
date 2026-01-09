import { GeminiService } from './geminiService.js';
import { runGemini } from '../assistants/gemini.js';
import { CostTracker } from './costTracker.js';
import { OpenAIService } from './openAIService.js';
import { FileService } from './fileService.js';
import { OutputFormatter } from './outputFormatter.js';

interface AIRequest {
    userId: string;
    tenantId: string;
    prompt: string;
    conversationId?: string; // v1.1.2: Para persistência de contexto
    files?: Array<{ mimetype: string; data: string; name: string; size: number }>;
    history?: any[];
    tools?: any[];
    userIntent?: 'resumo' | 'tabela' | 'completo';
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
 * AIRouter: Orquestrador Híbrido LIA v1.1.2
 */
export class AIRouter {
    /**
     * Rota a requisição para o pipeline correto
     */
    static async route(req: AIRequest): Promise<AIResponse> {
        const hasFiles = req.files && req.files.length > 0;

        try {
            // v1.1.2: Garantir contexto se tiver conversationId e não tiver history
            if (req.conversationId && (!req.history || req.history.length <= 1)) {
                console.log(`🧠 [AIRouter] Carregando contexto automático para ${req.conversationId}...`);
                const { getContext } = await import('./memoryService.js');
                const context = await getContext(req.conversationId, req.userId, req.prompt);

                // Reconstruir o history com a instrução de sistema atualizada
                const systemMsg = { role: 'system', content: context.systemInstruction };
                const historyMsgs = context.history.map((msg: any) => ({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content
                }));

                req.history = [systemMsg, ...historyMsgs];
                console.log(`✅ [AIRouter] Contexto carregado: ${req.history.length} mensagens`);
            }

            if (hasFiles) {
                // Validação de Soft Caps
                const totalBytes = req.files!.reduce((acc, f) => acc + f.size, 0);
                CostTracker.checkSoftCaps(req.files!.length, totalBytes);

                return await this.hybridPipeline(req);
            } else {
                return await this.chatPipeline(req);
            }
        } catch (error: any) {
            console.error('[AIRouter] Erro catastrófico:', error);
            throw error;
        }
    }

    /**
     * Pipeline Híbrido: Gemini (Data Plane) -> OutputFormatter (Structured Output)
     */
    private static async hybridPipeline(req: AIRequest): Promise<AIResponse> {
        console.log(`[AIRouter] Pipeline Híbrido v1.1.1: Gemini p/ Extração -> Formatter p/ Resposta`);

        const file = req.files![0];

        // 1. Gemini Extrai Dados (Data Plane) - PROTOCOLO LIA FILE READING SSOT v1.0
        const extractionPrompt = `Você é a LIA operando em MODO INVESTIGATIVO para análise de arquivos.

=== REGRA DE OURO ===
Se o usuário enviou um arquivo, ele quer um RESULTADO ACIONÁVEL.
PROIBIDO: descrever o que está na imagem/PDF de forma genérica.
OBRIGATÓRIO: diagnóstico + causa raiz + correção + validação.

=== ARQUIVO: "${file.name}" (${file.mimetype}) ===

=== CLASSIFICAÇÃO AUTOMÁTICA DE INTENÇÃO ===
${file.mimetype.includes('image') ? `
TIPO: PRINT/SCREENSHOT
INTENÇÃO PROVÁVEL: erro, bug visual, log no console/terminal, configuração, fluxo travado.
MODO: Diagnóstico técnico e correção.
` : file.mimetype.includes('pdf') ? `
TIPO: PDF/DOCUMENTO
INTENÇÃO PROVÁVEL: revisão, extração de regras, resumo executivo, checagem de inconsistência.
MODO: Síntese + respostas diretas com referência a seções/páginas.
` : file.mimetype.includes('text') || file.mimetype.includes('json') ? `
TIPO: LOG/CONFIG/JSON
INTENÇÃO PROVÁVEL: encontrar falha, inconsistência, regressão, credenciais/ENV, rotas quebradas.
MODO: Análise de falha + ações de correção com risco/impacto.
` : `
TIPO: ARQUIVO GENÉRICO
MODO: Análise contextual baseada no conteúdo.
`}

=== PROCEDIMENTO OBRIGATÓRIO ===
1. EXTRAIR SINAIS (não descrição):
   - Mensagens de erro (texto exato)
   - Códigos/IDs (HTTP status, stack trace, evento Socket, rota, arquivo/linha)
   - Sintomas (o que falha / quando falha)
   - Evidências (o trecho do arquivo que sustenta a conclusão)

2. PRODUZIR DIAGNÓSTICO:
   - Causa raiz provável (Top 1)
   - Causas alternativas (Top 2-3) se aplicável
   - Impacto (escopo, risco, regressão)

3. PLANO DE CORREÇÃO MÍNIMO:
   - Correção mínima para restaurar funcionalidade
   - Validação objetiva (como confirmar que funcionou)

=== REGRAS DE SEGURANÇA ===
⚠️ NUNCA expor tokens, chaves, credenciais ou secrets que aparecerem no arquivo.
Se identificar vazamento (ex: API key visível), sinalizar como PRIORIDADE MÁXIMA.

=== TEMPLATE DE RESPOSTA OBRIGATÓRIO ===
Use EXATAMENTE este formato:

1) **ACHADO PRINCIPAL** (1-2 linhas)
[O que está errado de forma clara e direta]

2) **EVIDÊNCIA**
[O que no arquivo comprova - trecho exato, linha, código]

3) **CAUSA RAIZ PROVÁVEL**
[Análise técnica do que pode estar causando]

4) **CORREÇÃO MÍNIMA RECOMENDADA**
[Passos ou código para resolver]

5) **VALIDAÇÃO**
[Como confirmar que a correção funcionou - checklist curto]

6) **RISCOS/REGRESSÕES** (se houver)
[Efeitos colaterais possíveis da correção]

=== ANTI-PADRÃO ===
❌ NUNCA responda apenas com "na imagem há..." sem propor correção.
❌ NUNCA faça descrição genérica do conteúdo visual.
✅ SEMPRE forneça diagnóstico + ação + validação.

IMPORTANTE: Se houver marcações visuais (setas, círculos, destaques) feitas pelo usuário, elas indicam EXATAMENTE o que ele quer que você analise.`;



        // Registrar início do processamento no FileService
        await FileService.saveMetadata({
            tenant_id: req.tenantId,
            user_id: req.userId,
            file_name: file.name,
            file_type: file.mimetype,
            file_size: file.size,
            parse_method: 'hybrid_v1.1.1',
            status: 'processing'
        });

        let extraction = await GeminiService.analyzeFile(file, extractionPrompt, 'gemini-2.0-flash-exp');

        if (extraction.text.length < 50 && req.files![0].size > 500000) {
            console.log('[AIRouter] Baixa confiança (Gemini 2.0). Escalando para 2.5 Flash...');
            extraction = await GeminiService.analyzeFile(file, extractionPrompt, 'gemini-2.5-flash');
        }

        // 2. OutputFormatter Profissional (v1.1.1)
        const formatted = await OutputFormatter.format({
            text: extraction.text,
            prompt: req.prompt,
            userIntent: req.userIntent
        });

        // 3. Registrar Uso Detalhado
        const totalDuration = extraction.durationMs;
        await CostTracker.logUsage({
            userId: req.userId,
            tenantId: req.tenantId,
            provider: 'hybrid',
            model: `gemini-plus-gpt4o-formatter`,
            inputTokens: 0,
            outputTokens: 0,
            toolCallsCount: 0,
            fileCount: req.files!.length,
            totalBytes: file.size,
            durationMs: totalDuration,
            status: 'success'
        });

        // 4. Finalizar metadados do arquivo
        await FileService.saveMetadata({
            tenant_id: req.tenantId,
            user_id: req.userId,
            file_name: file.name,
            file_type: file.mimetype,
            file_size: file.size,
            parse_method: 'hybrid_v1.1.1',
            status: 'parsed',
            processing_time_ms: totalDuration,
            tokens_used: Math.ceil(formatted.summary.length / 4),
            extracted_metadata: formatted.detailPayload
        });

        return {
            text: formatted.summary,
            provider: 'hybrid',
            model: `lia-formatter-v1.1.1`,
            detailPayload: formatted.detailPayload,
            usage: { totalTokens: Math.ceil(formatted.summary.length / 4) }
        };
    }

    /**
     * Pipeline de Chat Puro (GPT-4o-mini) com Governança de JSON
     */
    private static async chatPipeline(req: AIRequest): Promise<AIResponse> {
        console.log('[AIRouter] Pipeline Chat: GPT-4o-mini (Híbrido v1.1.2)');

        const response = await OpenAIService.chatWithGovernance(
            req.prompt,
            req.history || [],
            'gpt-4o-mini',
            req.tools
        );

        await CostTracker.logUsage({
            userId: req.userId,
            tenantId: req.tenantId,
            provider: 'openai',
            model: 'gpt-4o-mini',
            inputTokens: response.usage?.inputTokens || 0,
            outputTokens: response.usage?.outputTokens || 0,
            toolCallsCount: response.function_call ? 1 : 0,
            fileCount: 0,
            totalBytes: 0,
            durationMs: 0,
            status: 'success'
        });

        return {
            text: response.text,
            function_call: response.function_call,
            provider: 'openai',
            model: 'gpt-4o-mini',
            usage: response.usage
        };
    }
}
