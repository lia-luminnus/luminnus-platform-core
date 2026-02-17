// ==========================================================
// OpenRouterService — MiniMax 2.5 via OpenRouter
// Usa o SDK da OpenAI apontando para o endpoint do OpenRouter
// ==========================================================

import OpenAI from 'openai';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const openRouterClient = new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://luminnus.ai',
        'X-Title': 'LIA - Luminnus Intelligent Agent',
    }
});

export class OpenRouterService {

    /**
     * Chat com MiniMax 2.5 para tarefas complexas
     * Ideal para: análise de documentos, extração JSON, raciocínio longo
     */
    static async chat(
        prompt: string,
        history: Array<{ role: string; content: string }> = [],
        model: string = 'minimax/minimax-m2.5',
        tools?: any[]
    ): Promise<{ text: string; function_call?: any; function_calls?: any[]; usage?: any; durationMs?: number }> {

        if (!OPENROUTER_API_KEY) {
            console.warn('⚠️ [OpenRouter] API Key não configurada. Fallback para GPT-4o-mini.');
            throw new Error('OPENROUTER_API_KEY não configurada');
        }

        const startTime = Date.now();

        const messages: any[] = [
            ...history.map(msg => ({
                role: msg.role as 'system' | 'user' | 'assistant',
                content: msg.content
            })),
            { role: 'user' as const, content: prompt }
        ];

        try {
            const params: any = {
                model,
                messages,
                temperature: 0.3, // Mais determinístico para análises
                max_tokens: 4096,
            };

            // OpenRouter suporta tools no formato OpenAI
            if (tools && tools.length > 0) {
                params.tools = tools.map(t => ({
                    type: 'function',
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.parameters
                    }
                }));
            }

            const completion = await openRouterClient.chat.completions.create(params);
            const choice = completion.choices[0];
            const durationMs = Date.now() - startTime;

            // Processar tool calls se existirem
            const function_calls = choice.message?.tool_calls?.map(tc => ({
                name: tc.function.name,
                arguments: tc.function.arguments
            })) || [];

            console.log(`🧠 [OpenRouter] MiniMax concluiu em ${durationMs}ms | Tokens: ${completion.usage?.total_tokens || 'N/A'}`);

            return {
                text: choice.message?.content || '',
                function_call: function_calls.length === 1 ? function_calls[0] : undefined,
                function_calls: function_calls.length > 0 ? function_calls : undefined,
                usage: {
                    inputTokens: completion.usage?.prompt_tokens || 0,
                    outputTokens: completion.usage?.completion_tokens || 0,
                    totalTokens: completion.usage?.total_tokens || 0,
                },
                durationMs
            };
        } catch (error: any) {
            console.error(`❌ [OpenRouter] Erro MiniMax:`, error.message);
            throw error;
        }
    }

    /**
     * Verifica se o serviço está configurado
     */
    static isConfigured(): boolean {
        return !!OPENROUTER_API_KEY;
    }
}
