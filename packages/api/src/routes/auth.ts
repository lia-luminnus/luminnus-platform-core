import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router: Router = Router();

// Supabase client (Lazy loading or defensive check)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('[OAuth] Supabase credentials not found in process.env. Make sure .env is loaded.');
}

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : (null as any);

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
        const { services, user_id } = req.query as Record<string, string>;

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
            services: selectedServices,
            timestamp: Date.now()
        })).toString('base64');

        // Redirect URI obrigatório (padrão via APP_URL)
        const redirectUri = `${process.env.APP_URL}/api/auth/google/callback`;

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
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query as Record<string, string>;

        console.log(`[OAuth Google] Callback recebido: code=${!!code}, state=${!!state}`);

        if (!code) {
            return res.status(400).send("Código de autorização não fornecido");
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        if (!clientId || !clientSecret) {
            return res.status(500).send("Google OAuth não configurado no servidor");
        }

        // Decodificar state
        let stateData: any = {};
        if (state) {
            try {
                stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
            } catch (e) {
                console.warn("[OAuth Google] State inválido ou corrompido");
            }
        }

        const redirectUri = `${appUrl}/api/auth/google/callback`;

        console.log(`[OAuth Google] Trocando código por token:`);
        console.log(`  - client_id: ${clientId.substring(0, 10)}...`);
        console.log(`  - client_secret: ${clientSecret.substring(0, 10)}...${clientSecret.substring(clientSecret.length - 4)}`);
        console.log(`  - redirect_uri: ${redirectUri}`);
        console.log(`  - code: ${code.substring(0, 10)}...`);

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
            console.error("[OAuth Google] Erro ao trocar código:", errorData);
            return res.status(400).send("Erro ao obter tokens do Google");
        }

        const tokens: any = await tokenResponse.json();
        console.log(`[OAuth Google] Tokens obtidos com sucesso: access_token=${!!tokens.access_token}, refresh_token=${!!tokens.refresh_token}`);

        // Buscar informações do usuário Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        });

        const googleUser: any = userInfoResponse.ok ? await userInfoResponse.json() : null;
        console.log(`[OAuth Google] Usuário identificado: ${googleUser?.email || 'desconhecido'}`);

        // Validar user_id do state
        const userId = stateData.user_id;

        // Salvar tokens no Supabase (se tiver user_id válido)
        if (userId && userId !== 'anonymous' && userId !== 'unknown') {
            console.log(`[OAuth Google] Preparando upsert para user_id=${userId}...`);
            const upsertData = {
                id: crypto.randomUUID(),
                user_id: userId,
                provider: 'google_workspace',
                services: stateData.services || Object.keys(GOOGLE_SCOPES),
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                provider_email: googleUser?.email,
                status: 'active',
                connected_at: new Date().toISOString()
            };

            const { data: savedData, error: saveError } = await supabase
                .from('user_integrations')
                .upsert(upsertData, { onConflict: 'user_id,provider' })
                .select();

            if (saveError) {
                console.error("[OAuth Google] ERRO AO SALVAR NO BANCO:", JSON.stringify(saveError, null, 2));
            } else {
                console.log(`[OAuth Google] ✅ Resultado do salvamento:`, savedData);
                if (!savedData || savedData.length === 0) {
                    console.error("[OAuth Google] ⚠️ AVISO: O banco retornou sucesso mas NENHUMA linha foi gravada. Provavelmente bloqueado por RLS!");
                } else {
                    console.log(`[OAuth Google] ✅ Tokens salvos REALMENTE no banco para o usuário ${userId}`);
                }
            }
        } else {
            console.warn("[OAuth Google] Salvamento ignorado: userId inválido ou ausente no state", { userId });
        }

        // Redirecionar de volta para o dashboard
        const finalRedirect = `${appUrl}/#/integrations?success=true&provider=google_workspace`;
        console.log(`[OAuth Google] Redirecionando usuário para: ${finalRedirect}`);
        res.redirect(finalRedirect);
    } catch (error: any) {
        console.error("[OAuth Google] ❌ ERRO FATAL NO CALLBACK:", error);
        res.status(500).send(`Erro interno ao processar autenticação: ${error.message}`);
    }
});

// GET /api/auth/google/status - Verificar status da conexão
router.get('/google/status', async (req, res) => {
    try {
        const { user_id } = req.query as Record<string, string>;

        if (!user_id) {
            return res.status(400).json({ error: "user_id obrigatório" });
        }

        const { data: integration, error } = await supabase
            .from('user_integrations')
            .select('services, provider_email, expires_at, connected_at')
            .eq('user_id', user_id)
            .eq('provider', 'google_workspace')
            .single();

        if (error || !integration) {
            return res.json({ connected: false });
        }

        const isExpired = new Date(integration.expires_at) < new Date();

        res.json({
            connected: true,
            services: integration.services,
            googleEmail: integration.provider_email,
            connectedAt: integration.connected_at,
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
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "user_id obrigatório" });
        }

        const { error: deleteError } = await supabase
            .from('user_integrations')
            .delete()
            .eq('user_id', user_id)
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
