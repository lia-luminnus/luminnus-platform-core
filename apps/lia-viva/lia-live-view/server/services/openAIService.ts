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

        // ⚠️ CRITICAL UX FIX: Do not override system context!
        // The router/chat.ts is responsible for providing the SSOT context, playbooks, and identity.
        // We just pass it along cleanly.
        const messages = [
            ...history,
            { role: 'user', content: prompt || "Olá" }
        ];

        // v5.2: Migração para API 'tools' (functions foi deprecado em gpt-4o-mini)
        const formattedTools = tools?.length ? tools.map(t => ({ type: 'function' as const, function: t })) : undefined;

        const response = await this.openai.chat.completions.create({
            model,
            messages: messages as any,
            temperature: 0.4,
            max_tokens: 1024,
            tools: formattedTools,
            tool_choice: formattedTools ? 'auto' : undefined,
        });

        const choice = response.choices?.[0]?.message;
        const text = choice?.content || '';

        // v5.2: Extrair function_call do novo formato tool_calls
        const toolCall = choice?.tool_calls?.[0];
        const function_call = toolCall ? {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments
        } : null;

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

    /**
     * Transcrição de áudio via Whisper
     */
    static async transcribe(buffer: Buffer, fileName: string = 'audio.mp4') {
        const file = await OpenAI.toFile(buffer, fileName);
        const transcription = await this.openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
        });
        return transcription.text;
    }
}
