/**
 * Workspace Artifact Service
 * 
 * Serviço para persistência de artefatos do Google Workspace
 * Gerencia IDs de arquivos, validação e recuperação de erros
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export type ArtifactType = 'sheet' | 'doc' | 'slide' | 'folder' | 'form';
export type ArtifactStatus = 'active' | 'lost_404' | 'permission_denied' | 'archived';

export interface WorkspaceArtifact {
    id: string;
    tenant_id: string;
    user_id?: string;
    type: ArtifactType;
    provider_resource_id: string;
    url: string;
    name: string;
    folder_id?: string;
    status: ArtifactStatus;
    context_tag?: string;
    conversation_id?: string;
    metadata_json?: Record<string, any>;
    last_synced_at?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateArtifactInput {
    tenant_id: string;
    user_id?: string;
    type: ArtifactType;
    provider_resource_id: string;
    url: string;
    name: string;
    folder_id?: string;
    context_tag?: string;
    conversation_id?: string;
    metadata_json?: Record<string, any>;
}

export interface ArtifactLookup {
    tenant_id: string;
    type?: ArtifactType;
    context_tag?: string;
    conversation_id?: string;
}

// ============================================
// Service
// ============================================

export class WorkspaceArtifactService {
    private supabase: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Create a new artifact record
     */
    async createArtifact(input: CreateArtifactInput): Promise<WorkspaceArtifact | null> {
        try {
            const { data, error } = await this.supabase
                .from('workspace_artifacts')
                .insert({
                    ...input,
                    status: 'active',
                    last_synced_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                console.error('[WorkspaceArtifactService] Create error:', error);
                return null;
            }

            console.log(`[WorkspaceArtifactService] Created artifact: ${data.id} (${input.type})`);
            return data;
        } catch (err) {
            console.error('[WorkspaceArtifactService] Create exception:', err);
            return null;
        }
    }

    /**
     * Get artifact by ID
     */
    async getArtifactById(id: string): Promise<WorkspaceArtifact | null> {
        try {
            const { data, error } = await this.supabase
                .from('workspace_artifacts')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                return null;
            }

            return data;
        } catch (err) {
            return null;
        }
    }

    /**
     * Get artifact by provider resource ID (Google Drive file ID)
     */
    async getArtifactByResourceId(providerResourceId: string): Promise<WorkspaceArtifact | null> {
        try {
            const { data, error } = await this.supabase
                .from('workspace_artifacts')
                .select('*')
                .eq('provider_resource_id', providerResourceId)
                .single();

            if (error) {
                return null;
            }

            return data;
        } catch (err) {
            return null;
        }
    }

    /**
     * Find artifact by context (tenant + type + context_tag)
     */
    async findByContext(lookup: ArtifactLookup): Promise<WorkspaceArtifact | null> {
        try {
            let query = this.supabase
                .from('workspace_artifacts')
                .select('*')
                .eq('tenant_id', lookup.tenant_id)
                .eq('status', 'active');

            if (lookup.type) {
                query = query.eq('type', lookup.type);
            }

            if (lookup.context_tag) {
                query = query.eq('context_tag', lookup.context_tag);
            }

            if (lookup.conversation_id) {
                query = query.eq('conversation_id', lookup.conversation_id);
            }

            const { data, error } = await query.order('created_at', { ascending: false }).limit(1).single();

            if (error) {
                return null;
            }

            return data;
        } catch (err) {
            return null;
        }
    }

    /**
     * Find all artifacts for a tenant and type
     */
    async findAllByTenant(tenantId: string, type?: ArtifactType): Promise<WorkspaceArtifact[]> {
        try {
            let query = this.supabase
                .from('workspace_artifacts')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('status', 'active');

            if (type) {
                query = query.eq('type', type);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                return [];
            }

            return data || [];
        } catch (err) {
            return [];
        }
    }

    /**
     * Update artifact status
     */
    async updateStatus(id: string, status: ArtifactStatus): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('workspace_artifacts')
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) {
                console.error('[WorkspaceArtifactService] Update status error:', error);
                return false;
            }

            console.log(`[WorkspaceArtifactService] Updated artifact ${id} status to ${status}`);
            return true;
        } catch (err) {
            console.error('[WorkspaceArtifactService] Update status exception:', err);
            return false;
        }
    }

    /**
     * Update artifact metadata and sync time
     */
    async updateArtifact(id: string, updates: Partial<WorkspaceArtifact>): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('workspace_artifacts')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                    last_synced_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) {
                console.error('[WorkspaceArtifactService] Update error:', error);
                return false;
            }

            return true;
        } catch (err) {
            console.error('[WorkspaceArtifactService] Update exception:', err);
            return false;
        }
    }

    /**
     * Mark artifact as lost (404)
     */
    async markAsLost(id: string): Promise<boolean> {
        return this.updateStatus(id, 'lost_404');
    }

    /**
     * Mark artifact as permission denied
     */
    async markAsPermissionDenied(id: string): Promise<boolean> {
        return this.updateStatus(id, 'permission_denied');
    }

    /**
     * Archive artifact
     */
    async archive(id: string): Promise<boolean> {
        return this.updateStatus(id, 'archived');
    }

    /**
     * Replace artifact (when 404/permission denied, create new and link)
     */
    async replaceArtifact(oldId: string, newInput: CreateArtifactInput): Promise<WorkspaceArtifact | null> {
        // Archive old artifact
        await this.archive(oldId);

        // Get old artifact for metadata
        const oldArtifact = await this.getArtifactById(oldId);

        // Create new with reference to old
        const newArtifact = await this.createArtifact({
            ...newInput,
            metadata_json: {
                ...newInput.metadata_json,
                replaced_from: oldId,
                replaced_at: new Date().toISOString(),
                original_name: oldArtifact?.name,
            },
        });

        if (newArtifact) {
            console.log(`[WorkspaceArtifactService] Replaced artifact ${oldId} with ${newArtifact.id}`);
        }

        return newArtifact;
    }

    /**
     * Get or create artifact (main entry point for tools)
     * Implements the create-or-update pattern
     */
    async getOrCreate(
        tenantId: string,
        type: ArtifactType,
        contextTag: string,
        createFn: () => Promise<{ resourceId: string; url: string; name: string } | null>
    ): Promise<WorkspaceArtifact | null> {
        // 1. Try to find existing artifact
        const existing = await this.findByContext({
            tenant_id: tenantId,
            type,
            context_tag: contextTag,
        });

        if (existing) {
            console.log(`[WorkspaceArtifactService] Found existing artifact: ${existing.id}`);
            return existing;
        }

        // 2. Create new artifact via provided function
        const created = await createFn();

        if (!created) {
            console.error('[WorkspaceArtifactService] createFn returned null');
            return null;
        }

        // 3. Persist artifact
        return this.createArtifact({
            tenant_id: tenantId,
            type,
            provider_resource_id: created.resourceId,
            url: created.url,
            name: created.name,
            context_tag: contextTag,
        });
    }

    /**
     * Validate artifact exists in provider (for use with Drive API)
     * Returns status to update
     */
    async validateAndUpdateStatus(
        artifactId: string,
        validateFn: (resourceId: string) => Promise<{ exists: boolean; permissionDenied?: boolean }>
    ): Promise<ArtifactStatus> {
        const artifact = await this.getArtifactById(artifactId);

        if (!artifact) {
            return 'lost_404';
        }

        const validation = await validateFn(artifact.provider_resource_id);

        if (!validation.exists) {
            if (validation.permissionDenied) {
                await this.markAsPermissionDenied(artifactId);
                return 'permission_denied';
            } else {
                await this.markAsLost(artifactId);
                return 'lost_404';
            }
        }

        // Touch last_synced_at
        await this.updateArtifact(artifactId, {});
        return 'active';
    }
}

export default new WorkspaceArtifactService();
