import { Router } from 'express';
import crypto from 'crypto';

const router: Router = Router();

import { supabase } from '../config/supabase.js';

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

// GET /api/auth/google - Iniciar fluxo OAuth
router.get('/google', async (req, res) => {
    try {
        const { services, user_id, tenant_id, redirect_to } = req.query as Record<string, string>;

        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            return res.status(500).json({
                error: "Google OAuth não configurado",
                details: "GOOGLE_CLIENT_ID não encontrado nas variáveis de ambiente"
            });
        }

        console.log(`[OAuth Google] ClientID check: ${clientId.substring(0, 5)}...${clientId.substring(clientId.length - 5)} (length: ${clientId.length})`);
        console.log(`[OAuth Google] UserID check: ${user_id}`);

        if (user_id === 'unknown') {
            return res.status(400).json({
                error: "Usuário não identificado",
                details: "O Dashboard não conseguiu identificar seu perfil Supabase. Por favor, recarregue a página e tente novamente."
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

        // State para segurança
        const state = Buffer.from(JSON.stringify({
            user_id: user_id || 'anonymous',
            tenant_id: tenant_id || null,
            services: selectedServices,
            redirect_to: redirect_to || null,
            timestamp: Date.now()
        })).toString('base64');

        // Determinar base URL para o callback
        // CRITICAL: Para o Google Cloud de produção/homologação deste projeto, a URI autorizada é localhost:3000.
        // O backend (5000) deve usar a 3000 como redirect_uri para bater com o cadastro no Google Console.
        const host = req.get('host');
        const protocol = req.protocol;

        let redirectBase = process.env.APP_URL || `${protocol}://${host}`;
        if (redirectBase.includes('localhost:5000') || redirectBase.includes('127.0.0.1:5000')) {
            console.log('[OAuth Google] Ambiente local detectado, forçando redirect para porta 3000 (autorizada no console)');
            redirectBase = 'http://localhost:3000';
        }

        const redirectUri = `${redirectBase}/api/auth/google/callback`;

        // Construir URL de autorização do Google
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', Array.from(scopes).join(' '));
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', state);

        console.log(`[OAuth Google] Iniciando: serviços=${selectedServices.join(', ')}, redirect=${redirectUri}`);

        res.json({
            success: true,
            authUrl: authUrl.toString(),
            services: selectedServices
        });
    } catch (error: any) {
        console.error("[OAuth Google] Erro ao iniciar:", error);
        res.status(500).json({ error: "Erro ao iniciar OAuth", details: error.message });
    }
});

// GET /api/auth/google/callback - Receber código e trocar por tokens
// POST /api/auth/google/callback - Trocar código por tokens (SPA)
router.post('/google/callback', async (req, res) => {
    try {
        const rid = Math.random().toString(36).substring(7);
        const { code, state, redirect_uri: clientRedirectUri } = req.body;
        console.log(`[OAuth Google][${rid}] 📥 POST Callback recebido: code=${!!code}, state=${!!state}`);

        if (!code) {
            return res.status(400).json({ error: "Código de autorização não fornecido" });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error(`[OAuth Google][${rid}] ❌ CLIENT_ID ou SECRET ausentes`);
            return res.status(500).json({ error: "Google OAuth não configurado no servidor" });
        }

        // Decodificar state
        let stateData: any = {};
        if (state) {
            try {
                const decoded = Buffer.from(state, 'base64').toString('utf-8');
                stateData = JSON.parse(decoded);
                console.log(`[OAuth Google][${rid}] 🔍 State decodificado para user: ${stateData.user_id}`);
            } catch (e) {
                console.warn(`[OAuth Google][${rid}] ⚠️ State inválido ou corrompido`);
            }
        }

        const redirectUri = clientRedirectUri || 'http://localhost:3000/api/auth/google/callback';
        console.log(`[OAuth Google][${rid}] 🔌 Trocando código por token. RedirectUri: ${redirectUri}`);

        // Trocar código por tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error(`[OAuth Google][${rid}] ❌ Erro Google Token API:`, errorData);
            return res.status(400).json({ error: "Erro ao obter tokens do Google", details: errorData });
        }

        const tokens: any = await tokenResponse.json();
        console.log(`[OAuth Google][${rid}] ✅ Tokens obtidos com sucesso. Acessando userinfo...`);

        // Buscar informações do usuário Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        });

        const googleUser: any = userInfoResponse.ok ? await userInfoResponse.json() : null;
        console.log(`[OAuth Google][${rid}] 👤 Google User: ${googleUser?.email || 'unknown'}`);

        // Salvar tokens no Supabase
        const userId = stateData.user_id;
        if (userId && userId !== 'anonymous' && userId !== 'unknown') {
            const tenantId = stateData.tenant_id || userId;
            // Log de diagnóstico crítico
            console.log(`[OAuth-Save-Check] 🆔 UserID from OAuth State: ${userId}`);
            console.log(`[OAuth-Save-Check] 🆔 TenantID: ${tenantId}`);

            const upsertData = {
                tenant_id: tenantId,
                user_id: userId,
                provider: 'google_workspace',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                provider_email: googleUser?.email,
                scopes: stateData.services || Object.keys(GOOGLE_SCOPES),
                status: 'connected',
                updated_at: new Date().toISOString()
            };

            const { error: upsertError } = await supabase
                .from('integrations_connections')
                .upsert(upsertData, { onConflict: 'tenant_id,user_id,provider' });

            if (upsertError) {
                console.error(`[OAuth Google][${rid}] ❌ Erro no Upsert:`, upsertError);
                return res.status(500).json({
                    error: "Erro ao salvar integração no banco de dados",
                    details: upsertError.message,
                    code: upsertError.code
                });
            } else {
                console.log(`[OAuth Google][${rid}] 🏆 Conexão salva com sucesso em integrations_connections`);
                console.log(`[OAuth Google][${rid}] 📦 Objeto salvo:`, JSON.stringify(upsertData, null, 2));

                // Registrar log de atividade (não bloqueante)
                supabase.from('integration_activity_log').insert({
                    tenant_id: tenantId,
                    user_id: userId,
                    provider: 'google_workspace',
                    action: 'connect',
                    status: 'success',
                    message: `Conectado como ${googleUser?.email}`,
                    metadata: { services: stateData.services }
                }).then(({ error }) => {
                    if (error) console.error(`[OAuth Google][${rid}] ⚠️ Erro ao salvar log de atividade:`, error);
                });
            }
        } else {
            console.warn(`[OAuth Google][${rid}] ⚠️ UserID inválido, pulando salvamento:`, userId);
        }

        console.log(`[OAuth Google][${rid}] 🏁 Finalizando request com sucesso`);
        res.json({
            success: true,
            googleEmail: googleUser?.email,
            services: stateData.services || []
        });

    } catch (error: any) {
        console.error("[OAuth Google] ❌ ERRO NO POST CALLBACK:", error);
        res.status(500).json({ error: "Erro interno", details: error.message });
    }
});

// GET /api/auth/google/callback - Receber código e trocar por tokens (Legacy/Redirect)
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query as Record<string, string>;

        console.log(`[OAuth Google] GET Callback recebido: code=${!!code}, state=${!!state}`);

        if (!code) {
            return res.status(400).send("Código de autorização não fornecido");
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        if (!clientId || !clientSecret) {
            return res.status(500).send("Google OAuth não configurado no servidor");
        }

        // Determinar redirectUri
        const host = req.get('host');
        const protocol = req.protocol;
        let redirectBase = process.env.APP_URL || `${protocol}://${host}`;
        if (redirectBase.includes('localhost:5000') || redirectBase.includes('127.0.0.1:5000')) {
            redirectBase = 'http://localhost:3000';
        }
        const redirectUri = `${redirectBase}/api/auth/google/callback`;

        // Decodificar state
        let stateData: any = {};
        if (state) {
            try {
                const decoded = Buffer.from(state, 'base64').toString('utf-8');
                stateData = JSON.parse(decoded);
            } catch (e) {
                console.warn("[OAuth Google] State inválido ou corrompido");
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
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error("[OAuth Google] Erro ao trocar código (GET):", errorData);
            return res.status(400).send("Erro ao obter tokens do Google");
        }

        const tokens: any = await tokenResponse.json();

        // Buscar informações do usuário Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        });
        const googleUser: any = userInfoResponse.ok ? await userInfoResponse.json() : null;

        // Salvar tokens no Supabase
        const userId = stateData.user_id;
        if (userId && userId !== 'anonymous' && userId !== 'unknown') {
            const tenantId = stateData.tenant_id || userId;
            const upsertData = {
                tenant_id: tenantId,
                user_id: userId,
                provider: 'google_workspace',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                provider_email: googleUser?.email,
                scopes: stateData.services || Object.keys(GOOGLE_SCOPES),
                status: 'connected',
                updated_at: new Date().toISOString()
            };

            await supabase
                .from('integrations_connections')
                .upsert(upsertData, { onConflict: 'tenant_id,user_id,provider' });

            console.log("[OAuth Google] ✅ Conexão salva (GET Handle)");
        }

        // Redirecionar usuário
        let frontendUrl = stateData.redirect_to || process.env.FRONTEND_URL;
        if (!frontendUrl) {
            frontendUrl = appUrl.includes('5000') ? appUrl.replace('5000', '8080') : appUrl;
        }
        frontendUrl = frontendUrl.replace(/\/$/, "");
        const targetPage = stateData.redirect_to ? "" : "/admin-dashboard?integrations=true&success=true&provider=google";
        const finalRedirect = `${frontendUrl}${targetPage}`;

        console.log(`[OAuth Google] Redirecionando usuário para: ${finalRedirect}`);
        res.redirect(finalRedirect);
    } catch (error: any) {
        console.error("[OAuth Google] ❌ ERRO NO GET CALLBACK:", error);
        res.status(500).send(`Erro interno: ${error.message}`);
    }
});

// GET /api/auth/google/status - Verificar status da conexão
router.get('/google/status', async (req, res) => {
    try {
        const { user_id, tenant_id } = req.query as Record<string, string>;

        if (!user_id || !tenant_id) {
            return res.status(400).json({ error: "user_id e tenant_id obrigatórios" });
        }

        const { data: integration, error } = await supabase
            .from('integrations_connections')
            .select('scopes, provider_email, expires_at, created_at')
            .eq('user_id', user_id)
            .eq('tenant_id', tenant_id)
            .eq('provider', 'google_workspace')
            .single();

        if (error || !integration) {
            return res.json({ connected: false });
        }


        const isExpired = new Date(integration.expires_at) < new Date();

        res.json({
            connected: true,
            services: integration.scopes,
            googleEmail: integration.provider_email,
            connectedAt: integration.created_at,
            isExpired,
            needsRefresh: isExpired
        });
    } catch (error: any) {
        console.error("[OAuth Google] Erro ao verificar status:", error);
        res.status(500).json({ error: "Erro ao verificar status", details: error.message });
    }
});

// DELETE /api/auth/google - Desconectar
router.delete('/google', async (req, res) => {
    try {
        const { user_id, tenant_id } = req.body;

        if (!user_id || !tenant_id) {
            return res.status(400).json({ error: "user_id e tenant_id obrigatórios" });
        }

        const { error: deleteError } = await supabase
            .from('integrations_connections')
            .delete()
            .eq('user_id', user_id)
            .eq('tenant_id', tenant_id)
            .eq('provider', 'google_workspace');


        if (deleteError) {
            console.error("[OAuth Google] Erro ao desconectar:", deleteError);
            return res.status(500).json({ error: "Erro ao desconectar" });
        }

        console.log(`[OAuth Google] Desconectado para user: ${user_id}`);
        res.json({ success: true, message: "Google Workspace desconectado" });
    } catch (error: any) {
        console.error("[OAuth Google] Erro ao desconectar:", error);
        res.status(500).json({ error: "Erro ao desconectar", details: error.message });
    }
});

export { router as authRouter };
