// ===========================================================
// GOOGLE OAUTH ROUTES (Dashboard-client Integration)
// ===========================================================

import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { supabase } from '../config/supabase.js';

const router = Router();

// Scopes disponíveis por serviço
const GOOGLE_SCOPES: Record<string, string[]> = {
    gmail: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
    ],
    calendar: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
    ],
    meet: [
        'https://www.googleapis.com/auth/calendar.events'
    ],
    drive: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
    ],
    sheets: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/spreadsheets'
    ],
    docs: [
        'https://www.googleapis.com/auth/documents.readonly',
        'https://www.googleapis.com/auth/documents'
    ],
    slides: [
        'https://www.googleapis.com/auth/presentations.readonly',
        'https://www.googleapis.com/auth/presentations'
    ],
    maps: [
        'https://www.googleapis.com/auth/userinfo.profile'
    ]
};

// ===========================================================
// GET /api/auth/google - Iniciar fluxo OAuth
// ===========================================================
router.get('/google', async (req: Request, res: Response) => {
    try {
        const { services, redirect_uri, user_id, tenant_id, redirect_to } = req.query as {
            services?: string;
            redirect_uri?: string;
            user_id?: string;
            tenant_id?: string;
            redirect_to?: string;
        };

        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.error('[OAuth Google] GOOGLE_CLIENT_ID não configurado');
            return res.status(500).json({
                error: 'Google OAuth não configurado',
                details: 'GOOGLE_CLIENT_ID não encontrado nas variáveis de ambiente'
            });
        }

        // Construir lista de scopes baseado nos serviços selecionados
        const selectedServices = services ? services.split(',') : Object.keys(GOOGLE_SCOPES);
        const scopes = new Set(['openid', 'email', 'profile']);

        selectedServices.forEach(service => {
            if (GOOGLE_SCOPES[service]) {
                GOOGLE_SCOPES[service].forEach(scope => scopes.add(scope));
            }
        });

        // State para segurança (inclui user_id e serviços)
        const state = Buffer.from(JSON.stringify({
            user_id: user_id || 'anonymous',
            tenant_id: tenant_id || user_id || null,
            services: selectedServices,
            redirect_to: redirect_to || 'http://localhost:3001/#/integrations',
            timestamp: Date.now()
        })).toString('base64');

        // Use a redirect_uri fornecida ou fallback para a porta 3000 (callback neste servidor)
        const callbackUri = redirect_uri || 'http://localhost:3000/api/auth/google/callback';

        // Construir URL de autorização do Google
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', callbackUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', Array.from(scopes).join(' '));
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', state);

        console.log(`[OAuth Google] Iniciando fluxo para serviços: ${selectedServices.join(', ')}`);
        console.log(`[OAuth Google] Scopes: ${scopes.size}`);
        console.log(`[OAuth Google] Redirect URI: ${callbackUri}`);

        res.json({
            success: true,
            authUrl: authUrl.toString(),
            services: selectedServices,
            scopeCount: scopes.size
        });
    } catch (error: any) {
        console.error('[OAuth Google] Erro ao iniciar:', error);
        res.status(500).json({ error: 'Erro ao iniciar OAuth', details: error.message });
    }
});

// ===========================================================
// POST /api/auth/google/callback - Trocar código por tokens
// ===========================================================
router.post('/google/callback', async (req: Request, res: Response) => {
    try {
        const { code, state } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Código de autorização não fornecido' });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error('[OAuth Google] Credenciais não configuradas');
            return res.status(500).json({
                error: 'Google OAuth não configurado',
                details: 'Credenciais não encontradas'
            });
        }

        // Decodificar state
        let stateData: any = {};
        if (state) {
            try {
                stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
            } catch (e) {
                console.warn('[OAuth Google] State inválido:', e);
            }
        }

        // Trocar código por tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: 'http://localhost:3000/api/auth/google/callback',
                grant_type: 'authorization_code'
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('[OAuth Google] Erro ao trocar código:', errorData);
            return res.status(400).json({
                error: 'Erro ao obter tokens',
                details: errorData
            });
        }

        const tokens: any = await tokenResponse.json();

        // Buscar informações do usuário Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        });

        const googleUser: any = userInfoResponse.ok ? await userInfoResponse.json() : null;

        console.log(`[OAuth Google] Tokens obtidos para: ${googleUser?.email || 'desconhecido'}`);
        console.log(`[OAuth Google] Serviços conectados: ${stateData.services?.join(', ') || 'todos'}`);

        // Salvar tokens no Supabase (se tiver user_id)
        if (stateData.user_id && stateData.user_id !== 'anonymous' && supabase) {
            const tenantId = stateData.tenant_id || stateData.user_id;
            const { error: userIntError } = await supabase
                .from('integrations_connections')
                .upsert({
                    tenant_id: tenantId,
                    user_id: stateData.user_id,
                    provider: 'google_workspace',
                    scopes: stateData.services || [],
                    status: 'connected',
                    provider_email: googleUser?.email,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,user_id,provider' });

            if (userIntError) {
                console.error('[OAuth Google] Erro ao salvar em integrations_connections:', userIntError);
            } else {
                console.log(`[OAuth Google] Tokens salvos com sucesso para user: ${stateData.user_id} (tenant: ${tenantId})`);
            }
        }

        res.json({
            success: true,
            email: googleUser?.email,
            services: stateData.services
        });
    } catch (error: any) {
        console.error('[OAuth Google] Erro no callback:', error);
        res.status(500).json({ error: 'Erro ao processar callback', details: error.message });
    }
});

// ===========================================================
// GET /api/auth/google/status - Verificar status da conexão
// ===========================================================
router.get('/google/status', async (req: Request, res: Response) => {
    try {
        const { user_id, tenant_id } = req.query;

        if (!user_id || !supabase) {
            return res.json({ connected: false });
        }

        const query = supabase
            .from('integrations_connections')
            .select('*')
            .eq('user_id', user_id)
            .eq('provider', 'google_workspace');

        if (tenant_id) {
            query.eq('tenant_id', tenant_id);
        }

        const { data, error } = await query.single();

        if (error || !data) {
            return res.json({ connected: false });
        }

        res.json({
            connected: data.status === 'connected',
            email: data.provider_email,
            services: data.scopes,
            connectedAt: data.created_at
        });
    } catch (error: any) {
        console.error('[OAuth Google] Erro ao verificar status:', error);
        res.json({ connected: false });
    }
});

// ===========================================================
// DELETE /api/auth/google - Desconectar
// ===========================================================
router.delete('/google', async (req: Request, res: Response) => {
    try {
        const { user_id, tenant_id } = req.query;

        if (!user_id || !supabase) {
            return res.status(400).json({ error: 'user_id obrigatório' });
        }

        const query = supabase
            .from('integrations_connections')
            .delete()
            .eq('user_id', user_id)
            .eq('provider', 'google_workspace');

        if (tenant_id) {
            query.eq('tenant_id', tenant_id);
        }

        const { error } = await query;

        if (error) {
            console.error('[OAuth Google] Erro ao desconectar:', error);
            return res.status(500).json({ error: 'Erro ao desconectar' });
        }

        console.log(`[OAuth Google] Desconectado: ${user_id}`);
        res.json({ success: true });
    } catch (error: any) {
        console.error('[OAuth Google] Erro ao desconectar:', error);
        res.status(500).json({ error: 'Erro ao desconectar', details: error.message });
    }
});

export function setupGoogleAuthRoutes(app: any) {
    app.use('/api/auth', router);
    console.log('✅ Google OAuth Routes loaded');
}
