// ======================================================================
// 📊 MULTIMODAL LOGGER - Observabilidade estruturada do pipeline
// ======================================================================

import { MultimodalStage, MultimodalLogData } from '../types/multimodal.js';

/**
 * Logger estruturado para todo o pipeline multimodal
 * Formato JSON para fácil parsing e análise
 */
export function logMultimodal(stage: MultimodalStage, data: MultimodalLogData): void {
    const logEntry = {
        timestamp: new Date().toISOString(),
        component: 'MULTIMODAL',
        stage,
        traceId: data.traceId,
        conversationId: data.conversationId,
        scopeId: data.scopeId,
        userId: data.userId,
        tenantId: data.tenantId,
        imagesCount: data.imagesCount,
        mimeTypes: data.mimeTypes,
        bytes: data.bytes,
        provider: data.provider,
        model: data.model,
        textLength: data.textLength,
        error: data.error ? {
            message: data.error.message || data.error,
            stack: data.error.stack
        } : undefined
    };

    // Remove campos undefined para logs mais limpos
    Object.keys(logEntry).forEach(key => {
        if (logEntry[key as keyof typeof logEntry] === undefined) {
            delete logEntry[key as keyof typeof logEntry];
        }
    });

    console.log(JSON.stringify(logEntry));
}

/**
 * Helper para logar erros críticos
 */
export function logMultimodalError(traceId: string, conversationId: string, userId: string, tenantId: string, error: any): void {
    logMultimodal('ERROR', {
        traceId,
        conversationId,
        userId,
        tenantId,
        error
    });
}
