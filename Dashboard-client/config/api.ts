/**
 * Configuração Centralizada de API - v4.1
 * 
 * SSOT para URLs de backend em todos os ambientes
 */

const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
const isDev = !isProd;

// Detectar ambiente baseado no hostname
const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isRenderProduction = hostname.includes('onrender.com');
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

/**
 * URL base do backend unificado (Express + Socket.io)
 * 
 * Ordem de prioridade:
 * 1. VITE_API_URL (variável de ambiente) - OBRIGATÓRIO em produção
 * 2. Fallback localhost APENAS em desenvolvimento
 * 
 * ⚠️ Em produção sem VITE_API_URL: erro crítico (config inválida)
 */
export function getApiUrl(): string {
    // 1. Variável de ambiente tem prioridade (SSOT)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // 2. Fallback APENAS para desenvolvimento local
    if (isLocalhost) {
        return 'http://localhost:3000';
    }

    // 3. ERRO CRÍTICO: produção sem config
    console.error('❌ [API Config] VITE_API_URL não definido em produção!');
    console.error('📋 [API Config] Defina VITE_API_URL=https://api.luminnus.ai no Render');
    console.error('🚨 [API Config] Todas as chamadas de API falharão.');
    
    // Fallback de emergência (vai falhar, mas pelo menos não quebra o build)
    return 'https://api.luminnus.ai';
}

/**
 * URL do Socket.io
 */
export function getSocketUrl(): string {
    return import.meta.env.VITE_SOCKET_URL || getApiUrl();
}

/**
 * Configuração para debug
 */
export const API_CONFIG = {
    url: getApiUrl(),
    socketUrl: getSocketUrl(),
    isDev,
    isProd,
    isRenderProduction,
    isLocalhost
} as const;

// Log de configuração em desenvolvimento
if (isDev) {
    console.log('📡 [API Config]', API_CONFIG);
}
