// ======================================================================
// 🎯 MULTIMODAL TYPES - SSOT para todo o pipeline de imagens/anexos
// ======================================================================

/**
 * Interface única para requests multimodais em toda a cadeia
 * (UI → router → orchestrator → socket)
 */
export interface MultimodalRequest {
    text: string;
    images: MultimodalImage[];
    conversationId: string;
    scopeId: string;
    userId: string;
    tenantId: string;
    source: 'upload' | 'clipboard' | 'url';
    traceId?: string; // Gerado automaticamente se não fornecido
}

/**
 * Interface para cada imagem no request multimodal
 */
export interface MultimodalImage {
    mimeType: string;
    dataBase64: string;
    sizeBytes?: number;
}

/**
 * Stages do pipeline multimodal para observabilidade
 */
export type MultimodalStage =
    | 'RECEIVED'
    | 'VALIDATED'
    | 'ROUTED'
    | 'VISION_START'
    | 'VISION_END'
    | 'SECOND_TURN_START'
    | 'SECOND_TURN_END'
    | 'EMIT_START'
    | 'EMIT_END'
    | 'PERSIST_WARN'
    | 'ERROR';

/**
 * Dados estruturados para logs multimodais
 */
export interface MultimodalLogData {
    traceId: string;
    conversationId: string;
    scopeId?: string;
    userId: string;
    tenantId: string;
    imagesCount?: number;
    mimeTypes?: string[];
    bytes?: number;
    provider?: string;
    model?: string;
    error?: any;
    textLength?: number;
}
