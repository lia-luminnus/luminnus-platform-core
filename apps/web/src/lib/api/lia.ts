/**
 * Módulo de integração com a API da LIA
 * API hospedada no Render: https://lia-chat-api.onrender.com
 *
 * Funcionalidades:
 * - Envio e recebimento de mensagens via endpoint /chat
 * - Tratamento de erros e respostas
 */

import { secureStorage } from "@/lib/secureStorage";

/**
 * URL base da API da LIA no Render (fallback padrão)
 */
const LIA_API_URL_DEFAULT = "https://lia-chat-api.onrender.com";

/**
 * FUNÇÃO: Obter URL da API da LIA configurada
 * Busca a URL configurada no secureStorage ou retorna a URL padrão
 * @returns URL da API da LIA
 */
export function obterUrlApiLIA(): string {
  const config = secureStorage.load();
  return config?.liaApiUrl || LIA_API_URL_DEFAULT;
}

/**
 * URL base da API da LIA no Render
 * @deprecated Use obterUrlApiLIA() para obter a URL configurada dinamicamente
 */
export const LIA_API_URL = LIA_API_URL_DEFAULT;

/**
 * Interface de resposta da API
 */
export interface LiaResponse {
  response?: string;
  reply?: string;
  text?: string;
  message?: string;
  error?: string;
  audioUrl?: string;
}

/**
 * Opções para envio de mensagem
 */
export interface EnviarMensagemOptions {
  liaMode?: 'NORMAL' | 'DIAGNOSTIC';
  conversationId?: string;
  userId?: string;
}

/**
 * FUNÇÃO: Enviar mensagem para a LIA
 * @param mensagem - A mensagem a ser enviada para a LIA
 * @param options - Opções adicionais (liaMode, conversationId, etc)
 * @returns Promise com a resposta da API
 */
export async function enviarMensagemLIA(mensagem: string, options?: EnviarMensagemOptions): Promise<LiaResponse> {
  const apiUrl = obterUrlApiLIA();
  const maxRetries = 2;
  let lastError: Error | null = null;

  console.log(`[LIA API] URL configurada: ${apiUrl}`);
  console.log(`[LIA API] Enviando mensagem:`, mensagem);
  console.log(`[LIA API] Modo: ${options?.liaMode || 'NORMAL'}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[LIA API] Tentativa ${attempt}/${maxRetries}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: mensagem,
          liaMode: options?.liaMode || 'NORMAL',
          conversationId: options?.conversationId,
          userId: options?.userId,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`[LIA API] Status HTTP: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LIA API] Erro HTTP ${response.status}:`, errorText);
        throw new Error(`Erro da API (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[LIA API] Resposta recebida:', data);

      return data;

    } catch (error) {
      lastError = error as Error;

      if (error.name === 'AbortError') {
        console.error(`[LIA API] Timeout na tentativa ${attempt} - A API pode estar hibernada`);
        if (attempt < maxRetries) {
          console.log('[LIA API] Tentando novamente em 2 segundos...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }

      console.error(`[LIA API] Erro na tentativa ${attempt}:`, error);

      if (attempt === maxRetries) {
        const errorMessage = lastError?.name === 'AbortError'
          ? "⏱️ A API está demorando muito para responder. Ela pode estar 'acordando' do modo hibernação. Tente novamente em alguns segundos."
          : `❌ Não foi possível conectar à API: ${lastError?.message || 'Erro desconhecido'}`;

        throw new Error(errorMessage);
      }
    }
  }

  throw lastError!;
}

/**
 * FUNÇÃO: Verificar status da API
 * @returns Promise<boolean> indicando se a API está online
 */
export async function verificarStatusAPI(): Promise<boolean> {
  try {
    const apiUrl = obterUrlApiLIA();
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
    });
    return response.ok;
  } catch (error) {
    console.error('API da LIA offline:', error);
    return false;
  }
}

/**
 * FUNÇÃO: Reproduzir áudio de voz (se disponível)
 * @param audioUrl - URL do áudio retornado pela API
 */
export async function reproduzirVoz(audioUrl: string): Promise<void> {
  try {
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error('Erro ao reproduzir voz:', error);
    // Não lançar erro para não interromper o fluxo
  }
}
