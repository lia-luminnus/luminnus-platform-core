import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';

/**
 * GoogleService handles authentication and client initialization for Google Workspace APIs.
 */
export class GoogleService {
    /**
     * Returns an authenticated OAuth2 client for the specified user and tenant.
     */
    static async getClient(userId: string, tenantId: string) {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

        // 1. Fetch tokens from integrations_connections table
        console.log(`🔍 [GoogleService] Buscando conexão para user: ${userId} (tenant: ${tenantId})`);

        const { data, error } = await (supabase as any)
            .from('integrations_connections')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', 'google_workspace')
            .single();

        if (data) {
            console.log(`✅ [GoogleService] Conexão encontrada para ${userId}`);
        }

        if (error || !data) {
            console.error(`❌ [GoogleService] Erro ou conexão não encontrada para user ${userId}:`, error || 'Sem dados');
            throw new Error(`Google Workspace não conectado para este usuário. Por favor, conecte no Dashboard.`);
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expiry_date: data.expires_at ? new Date(data.expires_at).getTime() : undefined
        });

        // Handle token refresh automatically
        oauth2Client.on('tokens', async (tokens) => {
            console.log('[GoogleService] New tokens received, updating database...');
            const updateData: any = {
                access_token: tokens.access_token,
                updated_at: new Date().toISOString()
            };

            if (tokens.refresh_token) {
                updateData.refresh_token = tokens.refresh_token;
            }

            if (tokens.expiry_date) {
                updateData.expires_at = new Date(tokens.expiry_date).toISOString();
            }

            const { error: updateError } = await (supabase as any)
                .from('integrations_connections')
                .update(updateData)
                .eq('user_id', userId)
                .eq('provider', 'google_workspace');

            if (updateError) {
                console.error('[GoogleService] Failed to update tokens in database:', updateError);
            } else {
                console.log('[GoogleService] Database updated with new tokens.');
            }
        });

        return oauth2Client;
    }

    /**
     * Helper to get a specific API client
     */
    static async getSheetsClient(userId: string, tenantId: string) {
        const auth = await this.getClient(userId, tenantId);
        return google.sheets({ version: 'v4', auth });
    }

    static async getDocsClient(userId: string, tenantId: string) {
        const auth = await this.getClient(userId, tenantId);
        return google.docs({ version: 'v1', auth });
    }

    static async getGmailClient(userId: string, tenantId: string) {
        const auth = await this.getClient(userId, tenantId);
        return google.gmail({ version: 'v1', auth });
    }

    static async getCalendarClient(userId: string, tenantId: string) {
        const auth = await this.getClient(userId, tenantId);
        return google.calendar({ version: 'v3', auth });
    }

    static async getDriveClient(userId: string, tenantId: string) {
        const auth = await this.getClient(userId, tenantId);
        return google.drive({ version: 'v3', auth });
    }
}
