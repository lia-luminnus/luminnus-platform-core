import { supabase } from '../config/supabase.js';

interface ResourceContext {
    conversationId: string;
    userId: string;
    tenantId?: string;
    // Google Sheets
    activeSpreadsheetId?: string;
    activeSpreadsheetUrl?: string;
    activeSpreadsheetTitle?: string;
    templateVersion?: string;
    // Google Docs
    activeDocId?: string;
    activeDocUrl?: string;
    // Metadata
    lastOperation?: {
        type: string;
        timestamp: string;
        status: 'success' | 'error';
        resourceId?: string;
    };
    updatedAt: string;
}

// Cache em memória (por conversationId) para performance, mas espelhado no DB
const contextCache: Map<string, ResourceContext> = new Map();

export class ResourceContextStore {

    /**
     * Salva uma planilha como ativa para a conversa (Persiste no Supabase)
     */
    static async setActiveSpreadsheet(
        conversationId: string,
        userId: string,
        spreadsheetId: string,
        spreadsheetUrl: string,
        title?: string,
        templateVersion: string = '1.0'
    ): Promise<void> {
        // 1. Atualizar Cache
        const existing = await this.getContext(conversationId) || {
            conversationId,
            userId,
            updatedAt: new Date().toISOString()
        };

        existing.activeSpreadsheetId = spreadsheetId;
        existing.activeSpreadsheetUrl = spreadsheetUrl;
        existing.activeSpreadsheetTitle = title;
        existing.templateVersion = templateVersion;
        existing.lastOperation = {
            type: 'create_sheet',
            timestamp: new Date().toISOString(),
            status: 'success',
            resourceId: spreadsheetId
        };
        existing.updatedAt = new Date().toISOString();

        contextCache.set(conversationId, existing);

        // 2. Persistir no Supabase (coluna metadata da tabela conversations)
        if (supabase) {
            try {
                const { error } = await (supabase as any)
                    .from('conversations')
                    .update({
                        metadata: existing,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', conversationId);

                if (error) {
                    console.error(`❌ [ResourceContext] Erro ao persistir no DB:`, error);
                } else {
                    console.log(`📋 [ResourceContext] Planilha ativa persistida no DB para conv=${conversationId}`);
                }
            } catch (err) {
                console.error(`❌ [ResourceContext] Exceção ao persistir:`, err);
            }
        }
    }

    /**
     * Obtém a planilha ativa da conversa
     */
    static async getActiveSpreadsheet(conversationId: string): Promise<{ id: string; url: string; title?: string } | null> {
        const context = await this.getContext(conversationId);

        if (context?.activeSpreadsheetId) {
            console.log(`📋 [ResourceContext] Planilha ativa encontrada para conv=${conversationId}: ${context.activeSpreadsheetId}`);
            return {
                id: context.activeSpreadsheetId,
                url: context.activeSpreadsheetUrl || `https://docs.google.com/spreadsheets/d/${context.activeSpreadsheetId}`,
                title: context.activeSpreadsheetTitle
            };
        }

        console.log(`📋 [ResourceContext] Nenhuma planilha ativa para conv=${conversationId}`);
        return null;
    }

    /**
     * Salva um documento como ativo para a conversa (Persiste no Supabase)
     */
    static async setActiveDocument(
        conversationId: string,
        userId: string,
        docId: string,
        docUrl: string
    ): Promise<void> {
        const existing = await this.getContext(conversationId) || {
            conversationId,
            userId,
            updatedAt: new Date().toISOString()
        };

        existing.activeDocId = docId;
        existing.activeDocUrl = docUrl;
        existing.lastOperation = {
            type: 'create_doc',
            timestamp: new Date().toISOString(),
            status: 'success',
            resourceId: docId
        };
        existing.updatedAt = new Date().toISOString();

        contextCache.set(conversationId, (existing as ResourceContext));

        if (supabase) {
            await (supabase as any)
                .from('conversations')
                .update({ metadata: existing })
                .eq('id', conversationId);
        }
    }

    /**
     * Obtém o documento ativo da conversa
     */
    static async getActiveDocument(conversationId: string): Promise<{ id: string; url: string } | null> {
        const context = await this.getContext(conversationId);

        if (context?.activeDocId) {
            return {
                id: context.activeDocId,
                url: context.activeDocUrl || `https://docs.google.com/document/d/${context.activeDocId}`
            };
        }

        return null;
    }

    /**
     * Obtém o contexto completo da conversa (Cache + DB)
     */
    static async getContext(conversationId: string): Promise<ResourceContext | null> {
        // 1. Verificar Cache
        if (contextCache.has(conversationId)) {
            return contextCache.get(conversationId) || null;
        }

        // 2. Verificar Supabase
        if (supabase) {
            try {
                const { data, error } = await (supabase as any)
                    .from('conversations')
                    .select('metadata')
                    .eq('id', conversationId)
                    .single();

                if (data?.metadata) {
                    const context = data.metadata as ResourceContext;
                    contextCache.set(conversationId, context);
                    return context;
                }
            } catch (err) {
                console.error(`❌ [ResourceContext] Erro ao buscar no DB:`, err);
            }
        }

        return null;
    }

    /**
     * Limpa o contexto de uma conversa
     */
    static clearContext(conversationId: string): void {
        contextCache.delete(conversationId);
        console.log(`🗑️ [ResourceContext] Cache limpo para conv=${conversationId}`);
    }

    /**
     * Busca spreadsheetId do histórico de mensagens (fallback)
     */
    static extractSpreadsheetIdFromHistory(messages: any[]): string | null {
        for (let i = messages.length - 1; i >= 0; i--) {
            const content = messages[i].content || messages[i].text || '';
            const match = content.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                console.log(`📋 [ResourceContext] SpreadsheetId extraído do histórico: ${match[1]}`);
                return match[1];
            }
        }
        return null;
    }
}
