// ======================================================================
// 🔧 Helper corrigido para GPT com retry
// ======================================================================

import { LiaError, ErrorCodes } from "../utils/errors.js";

/**
 * Versão corrigida do fetch para GPT com retry
 */
export async function fetchGPTWithRetry(messages, tools, apiKey, model = 'gpt-4o', maxRetries = 2) {
    const TIMEOUT = 60000; // 60 segundos

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

            const body = {
                model,
                messages
            };

            // Apenas adicionar tools se fornecido
            if (tools && tools.length > 0) {
                body.tools = tools;
                body.tool_choice = 'auto';
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Erro OpenAI (${response.status}):`, errorText);

                // Erro 5xx - tentar novamente
                if (response.status >= 500 && attempt < maxRetries - 1) {
                    console.warn(`⚠️ Erro ${response.status}, tentando novamente em ${Math.pow(2, attempt)}s...`);
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    continue;
                }

                throw new LiaError(ErrorCodes.GPT_FAILED, {
                    status: response.status,
                    error: errorText
                });
            }

            return await response.json();

        } catch (error) {
            if (error.name === 'AbortError') {
                if (attempt < maxRetries - 1) {
                    console.warn(`⏰ Timeout na tentativa ${attempt + 1}, tentando novamente...`);
                    continue;
                }
                throw new LiaError(ErrorCodes.GPT_TIMEOUT);
            }

            if (error instanceof LiaError) {
                throw error;
            }

            // Última tentativa - lançar erro
            if (attempt === maxRetries - 1) {
                throw new LiaError(ErrorCodes.GPT_FAILED, {
                    originalError: error.message
                });
            }

            // Tentar novamente
            console.warn(`⚠️ Erro: ${error.message}, tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}
