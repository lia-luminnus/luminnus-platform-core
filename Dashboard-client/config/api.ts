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
 * 1. VITE_API_URL (variável de ambiente)
 * 2. Detecção automática por hostname
 * 3. Fallback localhost
 */
export function getApiUrl(): string {
    // 1. Variável de ambiente tem prioridade
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // 2. Detecção automática
    if (isRenderProduction) {
        // Em produção no Render, usar o backend unificado
        return 'https://luminnus-platform-core.onrender.com';
    }

    // 3. Fallback desenvolvimento
    return 'http://localhost:3000';
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
