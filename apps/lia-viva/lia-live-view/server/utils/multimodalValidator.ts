// ======================================================================
// ✅ MULTIMODAL VALIDATOR - Validação SSOT de requests multimodais
// ======================================================================

import crypto from 'crypto';
import { MultimodalRequest } from '../types/multimodal.js';

/**
 * Valida e normaliza um request multimodal
 * Lança erro se validação falhar
 * 
 * @throws Error se validação falhar
 */
export function validateMultimodalRequest(req: any): MultimodalRequest {
    // Gerar traceId se não fornecido
    const traceId = req.traceId || crypto.randomUUID();

    // Validar campos obrigatórios
    if (!req.conversationId) {
        throw new Error('conversationId é obrigatório');
    }

    if (!req.userId) {
        throw new Error('userId é obrigatório');
    }

    if (!req.tenantId) {
        throw new Error('tenantId é obrigatório');
    }

    // Validar array de imagens
    if (!Array.isArray(req.images)) {
        throw new Error('images deve ser um array');
    }

    // Se tem imagens, validar cada uma
    if (req.images.length > 0) {
        for (let i = 0; i < req.images.length; i++) {
            const img = req.images[i];

            // Validar mimeType
            if (!img.mimeType) {
                throw new Error(`Imagem ${i}: mimeType é obrigatório`);
            }

            if (!img.mimeType.startsWith('image/')) {
                throw new Error(`Imagem ${i}: mimeType inválido: ${img.mimeType}. Apenas imagens são suportadas (image/*)`);
            }

            // Validar dataBase64
            if (!img.dataBase64) {
                throw new Error(`Imagem ${i}: dataBase64 é obrigatório`);
            }

            // Remover prefixo base64 se existir (data:image/...;base64,)
            const base64Prefix = /^data:image\/[^;]+;base64,/;
            if (base64Prefix.test(img.dataBase64)) {
                img.dataBase64 = img.dataBase64.replace(base64Prefix, '');
            }

            // Validar formato base64
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(img.dataBase64)) {
                throw new Error(`Imagem ${i}: dataBase64 inválido (não é base64 válido)`);
            }

            // Calcular tamanho se não fornecido
            if (!img.sizeBytes) {
                // Base64 size = (4 * n / 3) onde n = bytes originais
                // Inverso: bytes originais ≈ (3 * base64Length / 4)
                img.sizeBytes = Math.floor((img.dataBase64.length * 3) / 4);
            }
        }
    }

    return {
        text: req.text || '',
        images: req.images,
        conversationId: req.conversationId,
        scopeId: req.scopeId || req.conversationId, // Default scopeId = conversationId
        userId: req.userId,
        tenantId: req.tenantId,
        source: req.source || 'upload',
        traceId
    };
}
