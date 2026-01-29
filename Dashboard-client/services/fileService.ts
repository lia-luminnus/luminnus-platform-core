import { supabase } from '../lib/supabase';

export type FileScope = 'personal' | 'tenant_shared' | 'lia_shared';
export type FileSource = 'user_upload' | 'lia_attachment' | 'lia_generated' | 'system';
export type FileStatus = 'active' | 'archived' | 'deleted';

export interface FileFolder {
    id: string;
    tenant_id: string;
    owner_user_id: string | null;
    scope: FileScope;
    parent_id: string | null;
    name: string;
    path: string;
    created_at: string;
    updated_at: string;
}

export interface FileEntry {
    id: string;
    tenant_id: string;
    owner_user_id: string | null;
    scope: FileScope;
    folder_id: string | null;
    name: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    storage_bucket: string;
    storage_path: string;
    tags: string[];
    source: FileSource;
    source_ref: string | null;
    status: FileStatus;
    version: number;
    created_at: string;
    updated_at: string;
}

export const fileService = {
    /**
     * List folders and files for a specific location
     */
    async listItems(tenantId: string, folderId: string | null = null, scope: FileScope = 'personal') {
        if (!supabase) return { folders: [], files: [] };

        console.log(`[fileService] listItems called: tenant=${tenantId} folder=${folderId} scope=${scope}`);

        try {
            // Fetch Folders
            let foldersQuery = supabase
                .from('file_folders')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('scope', scope);

            if (folderId) {
                foldersQuery = foldersQuery.eq('parent_id', folderId);
            } else {
                foldersQuery = foldersQuery.is('parent_id', null);
            }

            const { data: folders, error: foldersError } = await foldersQuery.order('name');
            if (foldersError) {
                console.error('[fileService] Error fetching folders:', foldersError);
                // Não lançar erro para não bloquear arquivos se pastas falharem (opcional)
            }

            // Fetch Files
            // Garantindo que a query esteja limpa e sem filtros fantasmas
            let filesQuery = supabase
                .from('files')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('scope', scope)
                .neq('status', 'deleted'); // Usar neq deleted em vez de eq active para ser mais permissivo

            if (folderId) {
                filesQuery = filesQuery.eq('folder_id', folderId);
            } else {
                filesQuery = filesQuery.is('folder_id', null);
            }

            // Remover qualquer filtro de chat_id se existir no código legado (embora não visível aqui, a reescrita garante)

            const { data: files, error: filesError } = await filesQuery.order('created_at', { ascending: false }); // Ordenar por mais recente

            if (filesError) {
                console.error('[fileService] Error fetching files:', filesError);
                throw filesError;
            }

            return {
                folders: (folders || []) as FileFolder[],
                files: (files || []) as FileEntry[]
            };
        } catch (err) {
            console.error('Error listing file items:', err);
            return { folders: [], files: [] };
        }
    },

    /**
     * Create a new folder
     */
    async createFolder(params: {
        name: string;
        tenantId: string;
        userId: string;
        parentId?: string | null;
        scope?: FileScope;
        path?: string;
    }) {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('file_folders')
            .insert({
                name: params.name,
                tenant_id: params.tenantId,
                owner_user_id: params.userId,
                parent_id: params.parentId || null,
                scope: params.scope || 'personal',
                path: params.path || `/${params.name}`
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating folder:', error);
            return null;
        }

        return data as FileFolder;
    },

    /**
     * Upload a file and create database record
     */
    async uploadFile(params: {
        file: File;
        tenantId: string;
        userId: string;
        folderId?: string | null;
        scope?: FileScope;
        source?: FileSource;
    }) {
        if (!supabase) return null;

        const folderId = params.folderId || null;
        const scope = params.scope || 'personal';
        const source = params.source || 'user_upload';

        // 1. Generate Storage Path
        // Format: tenant/{tenant_id}/user/{user_id}/files/{file_id}/{sanitized_filename}
        const fileId = crypto.randomUUID();
        const sanitizedName = params.file.name.replace(/[^\w.-]/g, '_');
        const storagePath = `tenant/${params.tenantId}/user/${params.userId}/files/${fileId}/${sanitizedName}`;

        console.log(`[fileService] Attempting upload to bucket 'tenant-files' at path: ${storagePath}`);

        try {
            // 2. Upload to Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('tenant-files')
                .upload(storagePath, params.file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('[fileService] Storage Upload Error:', uploadError);
                throw uploadError;
            }

            console.log('[fileService] Storage Upload Success:', uploadData);

            // 3. Create Database Record
            const { data, error: dbError } = await supabase
                .from('files')
                .insert({
                    id: fileId,
                    tenant_id: params.tenantId,
                    user_id: params.userId,        // REDUNDANT (Bridge)
                    owner_user_id: params.userId,
                    folder_id: folderId,
                    scope: scope,
                    name: params.file.name,
                    file_name: params.file.name,    // REDUNDANT (Bridge)
                    original_name: params.file.name,
                    mime_type: params.file.type,
                    file_type: params.file.type,    // REDUNDANT (Bridge)
                    size_bytes: params.file.size,
                    file_size: params.file.size,    // REDUNDANT (Bridge)
                    storage_bucket: 'tenant-files',
                    storage_path: storagePath,
                    source: source,
                    status: 'active'
                })
                .select()
                .single();

            if (dbError) {
                console.error('[fileService] DB Insert Error:', dbError);
                throw dbError;
            }

            // 4. Log Event
            await this.logEvent({
                tenant_id: params.tenantId,
                file_id: fileId,
                actor_user_id: params.userId,
                action: 'uploaded'
            });

            return data as FileEntry;
        } catch (err) {
            console.error('Error uploading file:', err);
            return null;
        }
    },

    /**
     * Get a signed URL for download or preview
     */
    async getSignedUrl(storagePath: string, expiresIn: number = 3600) {
        if (!supabase) return null;

        const { data, error } = await supabase.storage
            .from('tenant-files')
            .createSignedUrl(storagePath, expiresIn);

        if (error) {
            console.error('Error generating signed URL:', error);
            return null;
        }

        return data.signedUrl;
    },

    /**
     * Soft delete a file
     */
    async deleteFile(fileId: string, tenantId: string, userId: string) {
        if (!supabase) return false;

        const { error } = await supabase
            .from('files')
            .update({ status: 'deleted', updated_at: new Date().toISOString() })
            .eq('id', fileId);

        if (error) {
            console.error('Error deleting file:', error);
            return false;
        }

        await this.logEvent({
            tenant_id: tenantId,
            file_id: fileId,
            actor_user_id: userId,
            action: 'deleted'
        });

        return true;
    },

    /**
     * Soft delete multiple files
     */
    async deleteFiles(fileIds: string[], tenantId: string, userId: string) {
        if (!supabase || fileIds.length === 0) return false;

        const { error } = await supabase
            .from('files')
            .update({ status: 'deleted', updated_at: new Date().toISOString() })
            .in('id', fileIds);

        if (error) {
            console.error('[fileService] Error deleting batch of files:', error);
            return false;
        }

        // Log events for each file
        const logPromises = fileIds.map(id => this.logEvent({
            tenant_id: tenantId,
            file_id: id,
            actor_user_id: userId,
            action: 'deleted'
        }));

        await Promise.all(logPromises).catch(e => console.warn('Failed to log deletion events:', e));

        return true;
    },

    /**
     * Rename a file or folder
     */
    async rename(type: 'file' | 'folder', id: string, newName: string) {
        if (!supabase) return false;

        const table = type === 'file' ? 'files' : 'file_folders';
        const { error } = await supabase
            .from(table)
            .update({ name: newName, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error(`Error renaming ${type}:`, error);
            return false;
        }

        return true;
    },

    /**
     * Log file events for audit
     */
    async logEvent(event: {
        tenant_id: string;
        file_id: string;
        actor_user_id: string | null;
        action: string;
        meta?: any;
    }) {
        if (!supabase) return;
        await supabase.from('file_events').insert(event);
    }
};

export default fileService;
