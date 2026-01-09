// ======================================================================
// 🔄 Fetch Helpers - Timeout e Retry Automático
// ======================================================================

import { LiaError, ErrorCodes } from './errors.js';

/**
 * Timeouts configuráveis
 */
export const TIMEOUTS = {
    WHISPER: 30000,  // 30 segundos
    TTS: 20000,      // 20 segundos
    GPT: 60000,      // 60 segundos
    WEB_SEARCH: 10000 // 10 segundos
};

/**
 * Aguardar X milissegundos
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch com timeout usando AbortController
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new LiaError(ErrorCodes.NETWORK_ERROR, {
                reason: 'timeout',
                timeoutMs,
                url
            });
        }

        throw error;
    }
}

/**
 * Fetch com retry exponencial
 * 
 * @param {string} url - URL para fazer o fetch
 * @param {object} options - Opções do fetch
 * @param {number} maxRetries - Número máximo de tentativas
 * @param {number} timeoutMs - Timeout por tentativa
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3, timeoutMs = 30000) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options, timeoutMs);

            // Se resposta OK, retornar
            if (response.ok) {
                return response;
            }

            // Erro 4xx (cliente) - não retente
            if (response.status >= 400 && response.status < 500) {
                return response;
            }

            // Erro 5xx (servidor) - tentar novamente
            if (response.status >= 500) {
                console.warn(`⚠️ Erro ${response.status} na tentativa ${attempt + 1}/${maxRetries}`);
                lastError = new Error(`HTTP ${response.status}`);

                // Não esperar na última tentativa
                if (attempt < maxRetries - 1) {
                    const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                    console.log(`⏳ Aguardando ${backoffMs}ms antes de tentar novamente...`);
                    await wait(backoffMs);
                    continue;
                }
            }

            return response;

        } catch (error) {
            console.error(`❌ Erro na tentativa ${attempt + 1}/${maxRetries}:`, error.message);
            lastError = error;

            // Não esperar na última tentativa
            if (attempt < maxRetries - 1) {
                const backoffMs = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Aguardando ${backoffMs}ms antes de tentar novamente...`);
                await wait(backoffMs);
            }
        }
    }

    // Todas as tentativas falharam
    throw lastError || new Error('Todas as tentativas falharam');
}

/**
 * Wrapper específico para Whisper API (STT)
 */
export async function fetchWhisperWithRetry(formData, apiKey, maxRetries = 2) {
    try {
        const response = await fetchWithRetry(
            'https://api.openai.com/v1/audio/transcriptions',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    ...formData.getHeaders()
                },
                body: formData
            },
            maxRetries,
            TIMEOUTS.WHISPER
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new LiaError(ErrorCodes.WHISPER_FAILED, {
                status: response.status,
                error: errorText
            });
        }

        return await response.json();
    } catch (error) {
        if (error instanceof LiaError) {
            throw error;
        }

        // Determinar tipo de erro
        if (error.message?.includes('timeout')) {
            throw new LiaError(ErrorCodes.WHISPER_TIMEOUT);
        }

        throw new LiaError(ErrorCodes.WHISPER_FAILED, {
            originalError: error.message
        });
    }
}

/**
 * Wrapper específico para GPT API
 */
export async function fetchGPTWithRetry(messages, tools, apiKey, model = 'gpt-4o', maxRetries = 2) {
    try {
        const response = await fetchWithRetry(
            'https://api.openai.com/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' } : {})
                })
            },
            maxRetries,
            TIMEOUTS.GPT
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new LiaError(ErrorCodes.GPT_FAILED, {
                status: response.status,
                error: errorText
            });
        }

        return await response.json();
    } catch (error) {
        if (error instanceof LiaError) {
            throw error;
        }

        if (error.message?.includes('timeout')) {
            throw new LiaError(ErrorCodes.GPT_TIMEOUT);
        }

        throw new LiaError(ErrorCodes.GPT_FAILED, {
            originalError: error.message
        });
    }
}

export default {
    TIMEOUTS,
    fetchWithTimeout,
    fetchWithRetry,
    fetchWhisperWithRetry,
    fetchGPTWithRetry
};
