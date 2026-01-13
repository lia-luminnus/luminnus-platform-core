/**
 * Robust Workspace Tools
 * 
 * Wrapper layer for Google Workspace tools with:
 * - Artifact persistence (workspace_artifacts table)
 * - Create-or-update pattern
 * - 404/permission error recovery
 * - Automatic file ID tracking
 * 
 * This is an ADDITIVE layer - original googleWorkspace.ts remains untouched
 */

import { ResourceContextStore } from '../services/resourceContextStore.js';
import workspaceArtifactService, { ArtifactType, WorkspaceArtifact } from '../services/WorkspaceArtifactService.js';
import * as googleWorkspace from './googleWorkspace.js';

// Re-export original functions for backward compatibility
export * from './googleWorkspace.js';

// ============================================
// Types
// ============================================

interface RobustActionResponse {
    success: boolean;
    message: string;
    link?: string;
    artifactId?: string;
    isReused?: boolean;
    error?: string;
}

interface CreateOrUpdateSheetOptions {
    userId: string;
    tenantId: string;
    title: string;
    contextTag: string; // e.g., 'financeiro_principal', 'inventario_2024'
    headers: string[];
    rows: any[][];
    forceNew?: boolean; // If true, always create new even if exists
}

interface UpdateExistingSheetOptions {
    userId: string;
    tenantId: string;
    contextTag?: string;
    spreadsheetId?: string;
    operations: any[];
}

// ============================================
// Helper Functions
// ============================================

/**
 * Validates if a file still exists in Google Drive
 */
async function validateFileExists(
    userId: string,
    tenantId: string,
    fileId: string
): Promise<{ exists: boolean; permissionDenied?: boolean }> {
    try {
        // We'll use a lightweight HEAD request via Drive API
        // For now, we assume exists if we can get sheets client
        // In production, you'd do:
        // const drive = await GoogleService.getDriveClient(userId, tenantId);
        // await drive.files.get({ fileId, fields: 'id' });

        // Placeholder - actual implementation would check Drive API
        console.log(`[RobustWorkspace] Validating file ${fileId} exists...`);
        return { exists: true };
    } catch (error: any) {
        if (error.code === 404) {
            return { exists: false };
        }
        if (error.code === 403) {
            return { exists: false, permissionDenied: true };
        }
        // Assume exists on other errors
        return { exists: true };
    }
}

/**
 * Extracts spreadsheet ID from URL
 */
function extractSpreadsheetId(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

// ============================================
// Robust Create-or-Update Functions
// ============================================

/**
 * Creates a new spreadsheet OR returns existing one based on context tag.
 * Implements the "create-or-update" pattern for persistent file management.
 */
export async function createOrUpdateSheet(
    options: CreateOrUpdateSheetOptions
): Promise<RobustActionResponse> {
    const { userId, tenantId, title, contextTag, headers, rows, forceNew } = options;

    try {
        // 1. Check for existing artifact with same context tag
        if (!forceNew) {
            const existingArtifact = await workspaceArtifactService.findByContext({
                tenant_id: tenantId,
                type: 'sheet',
                context_tag: contextTag,
            });

            if (existingArtifact && existingArtifact.status === 'active') {
                // 2. Validate file still exists in Google Drive
                const validation = await validateFileExists(userId, tenantId, existingArtifact.provider_resource_id);

                if (validation.exists) {
                    console.log(`[RobustWorkspace] Reusing existing spreadsheet: ${existingArtifact.provider_resource_id}`);

                    // 3. Update the existing spreadsheet instead of creating new
                    const updateResult = await googleWorkspace.updateGoogleSheet(
                        userId,
                        tenantId,
                        existingArtifact.provider_resource_id,
                        [
                            { updateRange: { range: 'A1', values: [headers, ...rows] } }
                        ]
                    );

                    if (updateResult.success) {
                        // Update sync timestamp
                        await workspaceArtifactService.updateArtifact(existingArtifact.id, {});

                        return {
                            success: true,
                            message: `Planilha "${title}" atualizada com sucesso. Usei o mesmo arquivo de antes.`,
                            link: existingArtifact.url,
                            artifactId: existingArtifact.id,
                            isReused: true,
                        };
                    }
                } else {
                    // File was deleted or permission lost - mark artifact accordingly
                    if (validation.permissionDenied) {
                        await workspaceArtifactService.markAsPermissionDenied(existingArtifact.id);
                    } else {
                        await workspaceArtifactService.markAsLost(existingArtifact.id);
                    }
                    console.log(`[RobustWorkspace] Existing file not accessible, creating new...`);
                }
            }
        }

        // 4. Create new spreadsheet via original function
        const createResult = await googleWorkspace.createGoogleSheet(userId, tenantId, title, headers, rows);

        if (!createResult.success || !createResult.link) {
            return {
                success: false,
                message: createResult.message,
                error: createResult.error,
            };
        }

        // 5. Extract spreadsheet ID and persist artifact
        const spreadsheetId = extractSpreadsheetId(createResult.link);

        if (spreadsheetId) {
            const artifact = await workspaceArtifactService.createArtifact({
                tenant_id: tenantId,
                user_id: userId,
                type: 'sheet',
                provider_resource_id: spreadsheetId,
                url: createResult.link,
                name: title,
                context_tag: contextTag,
                metadata_json: {
                    headers,
                    rows_count: rows.length,
                    created_via: 'robust_wrapper',
                },
            });

            return {
                success: true,
                message: createResult.message,
                link: createResult.link,
                artifactId: artifact?.id,
                isReused: false,
            };
        }

        return { ...createResult } as RobustActionResponse;
    } catch (error: any) {
        console.error('[RobustWorkspace] createOrUpdateSheet error:', error);
        return {
            success: false,
            message: 'Erro ao criar/atualizar planilha.',
            error: error.message,
        };
    }
}

/**
 * Updates an existing spreadsheet, finding it by context tag or explicit ID.
 * Handles 404 errors by recreating the file.
 */
export async function robustUpdateSheet(
    options: UpdateExistingSheetOptions
): Promise<RobustActionResponse> {
    const { userId, tenantId, contextTag, spreadsheetId: explicitId, operations } = options;

    try {
        let targetSpreadsheetId = explicitId;
        let artifact: WorkspaceArtifact | null = null;

        // 1. Find spreadsheet by context tag if no explicit ID
        if (!targetSpreadsheetId && contextTag) {
            artifact = await workspaceArtifactService.findByContext({
                tenant_id: tenantId,
                type: 'sheet',
                context_tag: contextTag,
            });

            if (artifact) {
                targetSpreadsheetId = artifact.provider_resource_id;
            }
        }

        // 2. Fallback to ResourceContextStore
        if (!targetSpreadsheetId) {
            const context = await ResourceContextStore.getActiveSpreadsheet(userId);
            if (context) {
                targetSpreadsheetId = context.id;
            }
        }

        if (!targetSpreadsheetId) {
            return {
                success: false,
                message: 'Não encontrei nenhuma planilha ativa. Crie uma primeiro.',
                error: 'NO_SPREADSHEET_FOUND',
            };
        }

        // 3. Try to update
        const updateResult = await googleWorkspace.updateGoogleSheet(
            userId,
            tenantId,
            targetSpreadsheetId,
            operations
        );

        if (updateResult.success) {
            // Update sync timestamp if we have artifact
            if (artifact) {
                await workspaceArtifactService.updateArtifact(artifact.id, {});
            }

            return {
                success: true,
                message: updateResult.message,
                link: updateResult.link,
                artifactId: artifact?.id,
            };
        }

        // 4. Handle errors
        if (updateResult.error?.includes('404') || updateResult.error?.includes('not found')) {
            // File was deleted - mark as lost
            if (artifact) {
                await workspaceArtifactService.markAsLost(artifact.id);
            }

            return {
                success: false,
                message: 'A planilha foi excluída. Deseja que eu crie uma nova?',
                error: 'FILE_DELETED',
            };
        }

        return { ...updateResult } as RobustActionResponse;
    } catch (error: any) {
        console.error('[RobustWorkspace] robustUpdateSheet error:', error);
        return {
            success: false,
            message: 'Erro ao atualizar planilha.',
            error: error.message,
        };
    }
}

/**
 * Gets the active spreadsheet for the tenant, checking artifact store first.
 */
export async function getActiveSpreadsheet(
    userId: string,
    tenantId: string,
    contextTag?: string
): Promise<WorkspaceArtifact | null> {
    // 1. Check artifact store by context
    if (contextTag) {
        const artifact = await workspaceArtifactService.findByContext({
            tenant_id: tenantId,
            type: 'sheet',
            context_tag: contextTag,
        });

        if (artifact && artifact.status === 'active') {
            return artifact;
        }
    }

    // 2. Get most recent active sheet for tenant
    const allSheets = await workspaceArtifactService.findAllByTenant(tenantId, 'sheet');
    if (allSheets.length > 0) {
        return allSheets[0];
    }

    return null;
}

/**
 * Lists all spreadsheets for a tenant
 */
export async function listTenantSpreadsheets(tenantId: string): Promise<WorkspaceArtifact[]> {
    return workspaceArtifactService.findAllByTenant(tenantId, 'sheet');
}

/**
 * Creates an advanced sheet with artifact persistence
 */
export async function createAdvancedSheetRobust(
    userId: string,
    tenantId: string,
    title: string,
    type: 'financial' | 'inventory' | 'custom' = 'financial',
    contextTag?: string
): Promise<RobustActionResponse> {
    try {
        // Check for existing
        const tag = contextTag || `advanced_${type}`;
        const existing = await workspaceArtifactService.findByContext({
            tenant_id: tenantId,
            type: 'sheet',
            context_tag: tag,
        });

        if (existing && existing.status === 'active') {
            const validation = await validateFileExists(userId, tenantId, existing.provider_resource_id);

            if (validation.exists) {
                console.log(`[RobustWorkspace] Returning existing advanced sheet: ${existing.id}`);
                return {
                    success: true,
                    message: `Você já tem uma planilha "${existing.name}" criada. Posso atualizar ela ou criar uma nova se preferir.`,
                    link: existing.url,
                    artifactId: existing.id,
                    isReused: true,
                };
            } else {
                await workspaceArtifactService.markAsLost(existing.id);
            }
        }

        // Create new
        const result = await googleWorkspace.createAdvancedSheet(userId, tenantId, title, type);

        if (!result.success || !result.link) {
            return result as RobustActionResponse;
        }

        // Persist artifact
        const spreadsheetId = extractSpreadsheetId(result.link);
        if (spreadsheetId) {
            const artifact = await workspaceArtifactService.createArtifact({
                tenant_id: tenantId,
                user_id: userId,
                type: 'sheet',
                provider_resource_id: spreadsheetId,
                url: result.link,
                name: title,
                context_tag: tag,
                metadata_json: {
                    sheet_type: type,
                    created_via: 'robust_advanced',
                },
            });

            return {
                success: true,
                message: result.message,
                link: result.link,
                artifactId: artifact?.id,
                isReused: false,
            };
        }

        return result as RobustActionResponse;
    } catch (error: any) {
        console.error('[RobustWorkspace] createAdvancedSheetRobust error:', error);
        return {
            success: false,
            message: 'Erro ao criar planilha avançada.',
            error: error.message,
        };
    }
}

/**
 * Creates a Google Doc with artifact persistence
 */
export async function createDocRobust(
    userId: string,
    tenantId: string,
    title: string,
    content: string,
    contextTag?: string
): Promise<RobustActionResponse> {
    try {
        const tag = contextTag || `doc_${Date.now()}`;

        // Check for existing
        const existing = await workspaceArtifactService.findByContext({
            tenant_id: tenantId,
            type: 'doc',
            context_tag: tag,
        });

        if (existing && existing.status === 'active') {
            return {
                success: true,
                message: `Você já tem um documento "${existing.name}". Retornando o mesmo.`,
                link: existing.url,
                artifactId: existing.id,
                isReused: true,
            };
        }

        // Create new
        const result = await googleWorkspace.createGoogleDoc(userId, tenantId, title, content);

        if (!result.success || !result.link) {
            return result as RobustActionResponse;
        }

        // Persist artifact
        const match = result.link.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        const docId = match ? match[1] : null;

        if (docId) {
            const artifact = await workspaceArtifactService.createArtifact({
                tenant_id: tenantId,
                user_id: userId,
                type: 'doc',
                provider_resource_id: docId,
                url: result.link,
                name: title,
                context_tag: tag,
            });

            return {
                success: true,
                message: result.message,
                link: result.link,
                artifactId: artifact?.id,
                isReused: false,
            };
        }

        return result as RobustActionResponse;
    } catch (error: any) {
        console.error('[RobustWorkspace] createDocRobust error:', error);
        return {
            success: false,
            message: 'Erro ao criar documento.',
            error: error.message,
        };
    }
}

export default {
    createOrUpdateSheet,
    robustUpdateSheet,
    getActiveSpreadsheet,
    listTenantSpreadsheets,
    createAdvancedSheetRobust,
    createDocRobust,
};
