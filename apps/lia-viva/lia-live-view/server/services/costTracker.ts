import { supabase } from '../config/supabase.js';
import { AuditService } from './auditService.js';

interface UsageLog {
    userId: string;
    tenantId: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    toolCallsCount: number;
    fileCount: number;
    totalBytes: number;
    durationMs: number;
    status: 'success' | 'error';
    errorMessage?: string;
}

/**
 * Serviço para rastreamento de custos e métricas de uso de IA
 */
export class CostTracker {
    /**
     * Registra o uso de IA na tabela de auditoria/métricas
     */
    static async logUsage(usage: UsageLog) {
        try {
            // 1. Log no console para debug (Governace Técnica)
            console.log(`[CostTracker] AI Usage Logged: ${usage.model} - ${usage.inputTokens + usage.outputTokens} tokens`);

            // 2. Persistir no Supabase
            // Usamos a tabela integration_activity_log com metadados detalhados
            await AuditService.log(
                usage.userId,
                usage.tenantId,
                usage.provider,
                'file_parsed', // Podemos usar mapeamento ou ação genérica
                usage.status === 'success' ? 'success' : 'error',
                `AI Model: ${usage.model} | Tokens: ${usage.inputTokens + usage.outputTokens}`,
                {
                    model: usage.model,
                    input_tokens: usage.inputTokens,
                    output_tokens: usage.outputTokens,
                    tool_calls_count: usage.toolCallsCount,
                    file_count: usage.fileCount,
                    total_bytes: usage.totalBytes,
                    duration_ms: usage.durationMs,
                    error_message: usage.errorMessage
                }
            );

            // TODO: No futuro, criar tabela específica ai_usage_log para agregação de custos
        } catch (error) {
            console.error('[CostTracker] Erro ao registrar uso:', error);
        }
    }

    /**
     * Aplica Soft Caps técnicos (Rate Limiting e limites por request)
     */
    static checkSoftCaps(fileCount: number, totalBytes: number) {
        const MAX_FILES = 5;
        const MAX_BYTES = 50 * 1024 * 1024; // 50MB

        if (fileCount > MAX_FILES) {
            throw new Error(`Limite de arquivos excedido (${MAX_FILES})`);
        }

        if (totalBytes > MAX_BYTES) {
            throw new Error(`Tamanho total excedido (${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB)`);
        }

        return true;
    }
}
