import OpenAI from 'openai';
import { LIA_PERSONALITY_SHORT } from '../personality/lia-personality.js';
import { JsonGovernance } from './jsonGovernance.js';

/**
 * Serviço especializado para interações com OpenAI (GPT-4o-mini e GPT-4o)
 */
export class OpenAIService {
    private static openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    /**
     * Chat conversacional focado em orquestração e resposta final
     */
    static async chat(prompt: string, history: any[] = [], model: 'gpt-4o-mini' | 'gpt-4o' = 'gpt-4o-mini', tools?: any[]) {
        const startTime = Date.now();

        // Limpar histórico de mensagens do sistema duplicadas e garantir a personalidade na raiz
        let systemContent = LIA_PERSONALITY_SHORT;
        const cleanHistory = history.filter(msg => {
            if (msg.role === 'system') {
                systemContent += "\n\n" + msg.content;
                return false;
            }
            return true;
        });

        const messages = [
            { role: 'system', content: systemContent },
            ...cleanHistory,
            { role: 'user', content: prompt || "Olá" }
        ];

        const response = await this.openai.chat.completions.create({
            model,
            messages: messages as any,
            temperature: 0.7,
            max_tokens: 1024,
            functions: tools,
        });

        const choice = response.choices?.[0]?.message;
        const text = choice?.content || '';
        const function_call = choice?.function_call || null;

        const usage = {
            inputTokens: response.usage?.prompt_tokens || 0,
            outputTokens: response.usage?.completion_tokens || 0
        };

        return {
            text,
            function_call,
            model,
            usage,
            provider: 'openai',
            durationMs: Date.now() - startTime
        };
    }

    /**
     * Chat com Governança de JSON - Valida e repara automaticamente
     */
    static async chatWithGovernance(
        prompt: string,
        history: any[] = [],
        model: 'gpt-4o-mini' | 'gpt-4o' = 'gpt-4o-mini',
        tools?: any[],
        options?: { maxRetries?: number }
    ) {
        const maxRetries = options?.maxRetries ?? 2;

        // Primeira chamada
        let response = await this.chat(prompt, history, model, tools);

        // Se tiver function_call, retornar sem validação de JSON
        if (response.function_call) {
            return response;
        }

        // Validar e reparar JSON se necessário
        const repaired = await JsonGovernance.autoRepair(
            response.text,
            async (repairPrompt) => {
                const repairResponse = await this.chat(repairPrompt, [], model);
                return repairResponse.text;
            },
            maxRetries
        );

        if (repaired.repaired) {
            console.log(`✅ [OpenAIService] JSON reparado em ${repaired.attempts} tentativa(s)`);
        }

        return {
            ...response,
            text: repaired.text,
            jsonRepaired: repaired.repaired,
            repairAttempts: repaired.attempts
        };
    }
}
