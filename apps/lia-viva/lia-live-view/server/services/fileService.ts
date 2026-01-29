// @ts-ignore - supabase é exportado de arquivo .js sem tipagem
import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

// @ts-ignore - Alias com tipagem explícita para evitar erros TS
const supabaseClient = supabase as any;


interface FileMetadata {
    id?: string;
    tenant_id: string;
    user_id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    storage_path?: string;
    storage_url?: string;
    folder_id?: string | null;
    file_hash?: string;
    parse_method: string;
    status: 'uploaded' | 'processing' | 'parsed' | 'error';
    scope?: 'personal' | 'tenant_shared' | 'lia_shared';
    source?: 'user_upload' | 'lia_attachment' | 'lia_generated' | 'system';
    error_message?: string;
    processing_time_ms?: number;
    tokens_used?: number;
    extracted_metadata?: any;
    intent_mode?: string;
}

/**
 * Serviço para gestão de arquivos (v2.0 - Storage + Metadata)
 */
export class FileService {
    private static readonly BUCKET_NAME = 'tenant-files';

    /**
     * Faz upload do arquivo para Supabase Storage
     * Path: {tenant_id}/{category}/{timestamp}_{filename}
     */
    static async uploadToStorage(
        tenantId: string,
        userId: string,
        fileBuffer: Buffer,
        fileName: string,
        mimeType: string
    ): Promise<{ path: string; url: string } | null> {
        try {
            // Determinar categoria baseada no tipo
            const category = this.getCategory(mimeType);

            // Gerar nome único com timestamp
            const timestamp = Date.now();
            const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `${tenantId}/${category}/${timestamp}_${safeName}`;

            console.log(`📤 [FileService] Uploading to Storage: ${storagePath}`);

            const { data, error } = await supabaseClient.storage
                .from(this.BUCKET_NAME)
                .upload(storagePath, fileBuffer, {
                    contentType: mimeType,
                    upsert: false
                });

            if (error) {
                console.error('[FileService] Erro no upload:', error);
                return null;
            }

            // Gerar URL pública ou signed
            const { data: urlData } = supabaseClient.storage
                .from(this.BUCKET_NAME)
                .getPublicUrl(storagePath);


            console.log(`✅ [FileService] Upload concluído: ${storagePath}`);

            return {
                path: storagePath,
                url: urlData?.publicUrl || storagePath
            };
        } catch (error) {
            console.error('[FileService] Erro ao fazer upload:', error);
            return null;
        }
    }

    /**
     * Determina a categoria do arquivo para organização
     */
    private static getCategory(mimeType: string): string {
        if (mimeType.startsWith('image/')) return 'images';
        if (mimeType.includes('pdf')) return 'documents';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'documents';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheets';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentations';
        if (mimeType.startsWith('text/') || mimeType.includes('json')) return 'text';
        if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) return 'archives';
        return 'other';
    }

    /**
     * Busca ou cria uma pasta por nome e escopo
     */
    static async getOrCreateFolder(tenantId: string, userId: string, name: string, scope: string): Promise<string | null> {
        try {
            // 1. Tentar buscar pasta existente
            const { data: existing, error: fetchError } = await supabaseClient
                .from('file_folders')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('name', name)
                .eq('scope', scope)
                .maybeSingle();

            if (existing) return existing.id;

            // 2. Criar se não existir
            const { data: created, error: createError } = await supabaseClient
                .from('file_folders')
                .insert({
                    tenant_id: tenantId,
                    owner_user_id: userId,
                    name: name,
                    scope: scope,
                    path: `/${name}`
                })
                .select('id')
                .single();

            if (createError) {
                console.error('[FileService] Erro ao criar pasta:', createError);
                return null;
            }

            return created.id;
        } catch (error) {
            console.error('[FileService] Exceção em getOrCreateFolder:', error);
            return null;
        }
    }

    /**
     * Registra ou atualiza metadados de um arquivo no Supabase
     */
    static async saveMetadata(meta: FileMetadata) {
        try {
            let existingScope: string | undefined;
            let existingId: string | undefined;
            let existingFolderId: string | null | undefined;
            
            if (meta.id) {
                const { data: existing } = await supabaseClient
                    .from('files')
                    .select('id, scope, folder_id')
                    .eq('id', meta.id)
                    .single();
                
                if (existing) {
                    existingScope = existing.scope;
                    existingId = existing.id;
                    existingFolderId = existing.folder_id;
                }
            }
            
            if (!existingId && meta.storage_path) {
                const { data: existingByPath } = await supabaseClient
                    .from('files')
                    .select('id, scope, folder_id')
                    .eq('storage_path', meta.storage_path)
                    .eq('tenant_id', meta.tenant_id)
                    .single();
                
                if (existingByPath) {
                    existingScope = existingByPath.scope;
                    existingId = existingByPath.id;
                    existingFolderId = existingByPath.folder_id;
                    console.log(`🔄 [FileService] Arquivo existente encontrado por storage_path: ${existingId}`);
                }
            }

            const payload: any = {
                id: existingId || meta.id || crypto.randomUUID(),
                tenant_id: meta.tenant_id,
                user_id: meta.user_id,             // REDUNDANT (Bridge)
                owner_user_id: meta.user_id,
                name: meta.file_name,
                file_name: meta.file_name,         // REDUNDANT (Bridge)
                original_name: meta.file_name,
                mime_type: meta.file_type,
                file_type: meta.file_type,         // REDUNDANT (Bridge)
                folder_id: meta.folder_id !== undefined ? meta.folder_id : (existingFolderId !== undefined ? existingFolderId : null),
                size_bytes: meta.file_size,
                file_size: meta.file_size,         // REDUNDANT (Bridge)
                storage_path: meta.storage_path,
                storage_url: meta.storage_url,
                storage_bucket: this.BUCKET_NAME,
                file_hash: meta.file_hash || this.calculateHash(meta.file_name),
                parse_method: meta.parse_method,
                status: meta.status === 'uploaded' ? 'active' : meta.status,
                scope: meta.scope || existingScope || 'personal',
                source: meta.source || 'user_upload',
                error_message: meta.error_message,
                processing_time_ms: meta.processing_time_ms,
                tokens_used: meta.tokens_used,
                extracted_metadata: meta.extracted_metadata || {},
                intent_mode: meta.intent_mode,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabaseClient
                .from('files')
                .upsert(payload)
                .select()
                .single();

            if (error) {
                // Se o erro for "coluna não encontrada" (PGRST204), tenta salvar sem intent_mode
                // Isso acontece quando o cache do PostgREST está desatualizado após uma migração
                if (error.code === 'PGRST204' || error.message?.includes('intent_mode')) {
                    console.warn('⚠️ [FileService] Coluna intent_mode não encontrada no cache do DB. Salvando sem ela.');
                    delete payload.intent_mode;
                    const retry = await supabaseClient
                        .from('files')
                        .upsert(payload)
                        .select()
                        .single();
                    if (retry.error) throw retry.error;
                    return retry.data;
                }
                throw error;
            }
            return data;
        } catch (error) {
            console.error('[FileService] Erro ao salvar metadados:', error);
            return null;
        }
    }

    /**
     * Busca arquivos de um tenant específico
     */
    static async getFilesByTenant(tenantId: string, category?: string) {
        try {
            let query = supabaseClient
                .from('files')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (category && category !== 'all') {
                // Filtrar por tipo baseado na categoria
                const mimePatterns: Record<string, string[]> = {
                    documents: ['pdf', 'word', 'document'],
                    images: ['image/'],
                    spreadsheets: ['excel', 'spreadsheet'],
                    presentations: ['powerpoint', 'presentation'],
                };

                const patterns = mimePatterns[category];
                if (patterns) {
                    query = query.or(patterns.map(p => `file_type.ilike.%${p}%`).join(','));
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[FileService] Erro ao buscar arquivos:', error);
            return [];
        }
    }

    /**
     * Gera uma URL assinada para download
     */
    static async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string | null> {
        try {
            const { data, error } = await supabaseClient.storage
                .from(this.BUCKET_NAME)
                .createSignedUrl(storagePath, expiresIn);

            if (error) throw error;
            return data?.signedUrl || null;
        } catch (error) {
            console.error('[FileService] Erro ao gerar URL assinada:', error);
            return null;
        }
    }

    /**
     * Deleta um arquivo do Storage e seus metadados
     */
    static async deleteFile(fileId: string, tenantId: string): Promise<boolean> {
        try {
            // Buscar metadados primeiro
            const { data: file } = await supabaseClient
                .from('files')
                .select('storage_path')
                .eq('id', fileId)
                .eq('tenant_id', tenantId)
                .single();

            if (file?.storage_path) {
                // Deletar do Storage
                await supabaseClient.storage
                    .from(this.BUCKET_NAME)
                    .remove([file.storage_path]);
            }

            // Deletar metadados
            const { error } = await supabaseClient
                .from('files')
                .delete()
                .eq('id', fileId)
                .eq('tenant_id', tenantId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[FileService] Erro ao deletar arquivo:', error);
            return false;
        }
    }

    /**
     * Recupera a análise de um arquivo (simulado ou do banco)
     */
    static async getFileAnalysis(fileId: string) {
        try {
            const { data: file } = await supabaseClient
                .from('files')
                .select('*')
                .eq('id', fileId)
                .single();

            if (!file) throw new Error('Arquivo não encontrado.');

            return {
                success: true,
                file_name: file.file_name,
                analysis: file.extracted_metadata?.analysis || 'Análise automática indisponível no momento.',
                content_sample: file.extracted_metadata?.content_snapshot ? file.extracted_metadata.content_snapshot.substring(0, 5000) : null,
                metadata: file.extracted_metadata || {}
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Gera um hash simples para o arquivo (SHA256)
     */
    private static calculateHash(content: string): string {
        return crypto.createHash('sha256').update(content + Date.now()).digest('hex');
    }
}

export const fileService = FileService;
