/**
 * WhatsApp Embedded Signup Routes
 * 
 * Implements the official Meta Embedded Signup flow:
 * - POST /start - Generates the signup URL
 * - GET /callback - Handles the OAuth callback from Meta
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router: Router = Router();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Meta App Configuration
const META_APP_ID = process.env.META_APP_ID || '885283457594424';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_CONFIG_ID = process.env.META_CONFIG_ID || '';
const META_REDIRECT_URI = process.env.WHATSAPP_OAUTH_REDIRECT || process.env.META_REDIRECT_URI || 'https://luminnus-platform-core.onrender.com/api/whatsapp/embedded/callback';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://luminnus-dashboard.onrender.com';

// Graph API base URL
const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Generate a secure random state for CSRF protection
 */
function generateState(tenantId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${tenantId}_${timestamp}_${random}`;
}

/**
 * Validate state from callback
 */
function parseState(state: string): { tenantId: string; valid: boolean } {
    const parts = state.split('_');
    if (parts.length >= 3) {
        return { tenantId: parts[0], valid: true };
    }
    return { tenantId: '', valid: false };
}

/**
 * GET /api/whatsapp/embedded/debug-config
 * 
 * Diagnostic endpoint to verify env var values in production
 */
router.get('/debug-config', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        config: {
            META_APP_ID,
            META_REDIRECT_URI,
            DASHBOARD_URL,
            META_CONFIG_ID: META_CONFIG_ID ? '***set***' : '(empty)',
            META_APP_SECRET: META_APP_SECRET ? '***set***' : '(empty)',
            env_WHATSAPP_OAUTH_REDIRECT: process.env.WHATSAPP_OAUTH_REDIRECT || '(not set)',
            env_META_REDIRECT_URI: process.env.META_REDIRECT_URI || '(not set)',
            env_DASHBOARD_URL: process.env.DASHBOARD_URL || '(not set)',
        }
    });
});

/**
 * POST /api/whatsapp/embedded/start
 * 
 * Generates the Embedded Signup URL for the client to open
 */
router.post('/start', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;

        console.log(`🔧 [Embedded Signup] Config: redirect_uri=${META_REDIRECT_URI}, app_id=${META_APP_ID}, dashboard=${DASHBOARD_URL}`);

        if (!tenant_id) {
            return res.status(400).json({
                status: 'error',
                reason: 'tenant_id is required'
            });
        }

        if (!META_APP_SECRET) {
            console.error('❌ [Embedded Signup] META_APP_SECRET not configured');
            return res.status(500).json({
                status: 'error',
                reason: 'Server configuration error: META_APP_SECRET not set'
            });
        }

        // Generate state for CSRF protection
        const state = generateState(tenant_id);

        // Store state in database for validation on callback
        const { error: stateError } = await supabase
            .from('whatsapp_signup_states')
            .upsert({
                tenant_id,
                state,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
            });

        if (stateError) {
            console.error('❌ [Embedded Signup] Failed to save state to Supabase:', stateError);
        }

        // Build the Embedded Signup URL
        // Docs: https://developers.facebook.com/docs/whatsapp/embedded-signup
        const params = new URLSearchParams({
            client_id: META_APP_ID,
            redirect_uri: META_REDIRECT_URI,
            state,
            scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
            response_type: 'code',
            ...(META_CONFIG_ID ? { config_id: META_CONFIG_ID } : {})
        });

        const signupUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

        console.log(`✅ [Embedded Signup] Generated URL for tenant: ${tenant_id}`);
        console.log(`🔗 [Embedded Signup] redirect_uri used: ${META_REDIRECT_URI}`);
        console.log(`🔗 [Embedded Signup] Full signup URL: ${signupUrl}`);

        res.json({
            status: 'ok',
            data: {
                signupUrl,
                state
            }
        });
    } catch (error) {
        console.error('❌ [Embedded Signup Start] Error:', error);
        res.status(500).json({
            status: 'error',
            reason: String(error)
        });
    }
});

/**
 * GET /api/whatsapp/embedded/callback
 * 
 * Handles the OAuth callback from Meta after user authorization
 */
router.get('/callback', async (req: Request, res: Response) => {
    try {
        console.log('📱 [Embedded Callback] HIT! Full Query:', JSON.stringify(req.query, null, 2));
        console.log('📱 [Embedded Callback] HIT! Headers:', JSON.stringify(req.headers, null, 2));

        const { code, state, error, error_description } = req.query;

        // Handle error from Meta
        if (error) {
            console.error('❌ [Embedded Callback] Meta returned error:', error, error_description);
            return res.redirect(`${DASHBOARD_URL}/#/integrations/whatsapp?error=${encodeURIComponent(String(error_description || error))}`);
        }

        if (!code || !state) {
            console.error('❌ [Embedded Callback] Missing code or state. Params received:', Object.keys(req.query));
            return res.redirect(`${DASHBOARD_URL}/#/integrations/whatsapp?error=missing_params`);
        }

        // Validate state
        const { tenantId, valid } = parseState(String(state));
        if (!valid || !tenantId) {
            console.error('❌ [Embedded Callback] Invalid state');
            return res.redirect(`${DASHBOARD_URL}/#/integrations/whatsapp?error=invalid_state`);
        }

        // Verify state in database
        const { data: stateData } = await supabase
            .from('whatsapp_signup_states')
            .select('*')
            .eq('state', state)
            .eq('tenant_id', tenantId)
            .single();

        if (!stateData) {
            console.error('❌ [Embedded Callback] State not found in database');
            return res.redirect(`${DASHBOARD_URL}/#/integrations/whatsapp?error=state_expired`);
        }

        // Delete used state
        await supabase
            .from('whatsapp_signup_states')
            .delete()
            .eq('state', state);

        console.log(`📱 [Embedded Callback] Exchanging code for token, tenant: ${tenantId}`);

        // Exchange authorization code for access token
        const tokenResponse = await fetch(`${GRAPH_API_BASE}/oauth/access_token?` + new URLSearchParams({
            client_id: META_APP_ID,
            client_secret: META_APP_SECRET,
            redirect_uri: META_REDIRECT_URI,
            code: String(code)
        }));

        const tokenData = await tokenResponse.json() as { access_token?: string; error?: { message?: string }; };

        if (tokenData.error) {
            console.error('❌ [Embedded Callback] Token exchange error:', tokenData.error);
            return res.redirect(`${DASHBOARD_URL}/#/integrations/whatsapp?error=${encodeURIComponent(tokenData.error.message || 'token_error')}`);
        }

        const access_token = tokenData.access_token || '';

        console.log(`✅ [Embedded Callback] Token obtained for tenant: ${tenantId}`);

        // Fetch WABA and Phone Number info from the debug_token or business discovery
        // First, get the user's business info
        const businessResponse = await fetch(`${GRAPH_API_BASE}/me?fields=id,name&access_token=${access_token}`);
        const businessData = await businessResponse.json();

        // Get WhatsApp Business Accounts
        const wabaResponse = await fetch(`${GRAPH_API_BASE}/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}&access_token=${access_token}`);
        const wabaData = await wabaResponse.json() as { data?: Array<{ id: string; owned_whatsapp_business_accounts?: { data?: Array<{ id: string; name?: string; phone_numbers?: { data?: Array<{ id: string; display_phone_number: string }> } }> } }> };

        console.log(`📊 [Embedded Callback] WABA data:`, JSON.stringify(wabaData, null, 2));

        // Extract the first WABA and phone number
        let wabaId = '';
        let phoneNumberId = '';
        let phoneNumber = '';
        let businessId = '';
        let verifiedName = '';

        if (wabaData.data && wabaData.data.length > 0) {
            const firstBusiness = wabaData.data[0];
            businessId = firstBusiness.id;

            const wabaAccounts = firstBusiness.owned_whatsapp_business_accounts?.data;
            if (wabaAccounts && wabaAccounts.length > 0) {
                const firstWaba = wabaAccounts[0];
                wabaId = firstWaba.id;
                verifiedName = firstWaba.name || '';

                const phoneNumbers = firstWaba.phone_numbers?.data;
                if (phoneNumbers && phoneNumbers.length > 0) {
                    const firstPhone = phoneNumbers[0];
                    phoneNumberId = firstPhone.id;
                    phoneNumber = firstPhone.display_phone_number;
                }
            }
        }

        if (!wabaId) {
            const directWabaResponse = await fetch(`${GRAPH_API_BASE}/me/whatsapp_business_accounts?access_token=${access_token}`);
            const directWabaData = await directWabaResponse.json() as { data?: Array<{ id: string }> };

            if (directWabaData.data && directWabaData.data.length > 0) {
                wabaId = directWabaData.data[0].id;

                // Get phone numbers for this WABA
                const phonesResponse = await fetch(`${GRAPH_API_BASE}/${wabaId}/phone_numbers?access_token=${access_token}`);
                const phonesData = await phonesResponse.json() as { data?: Array<{ id: string; display_phone_number: string }> };

                if (phonesData.data && phonesData.data.length > 0) {
                    phoneNumberId = phonesData.data[0].id;
                    phoneNumber = phonesData.data[0].display_phone_number;
                }
            }
        }

        console.log(`📞 [Embedded Callback] Extracted: WABA=${wabaId}, Phone=${phoneNumberId}`);

        // Save connection to database
        const connectionData = {
            tenant_id: tenantId,
            waba_id: wabaId,
            phone_number_id: phoneNumberId,
            phone_number: phoneNumber?.replace(/\D/g, '') || '',
            business_id: businessId,
            provider: 'meta_embedded_signup',
            config_json: {
                access_token,
                waba_id: wabaId,
                phone_number_id: phoneNumberId,
                business_id: businessId,
                verified_name: verifiedName,
                connected_at: new Date().toISOString()
            },
            status: wabaId && phoneNumberId ? 'connected' : 'pending',
            updated_at: new Date().toISOString()
        };

        // Upsert connection
        const { data: existing } = await supabase
            .from('whatsapp_connections')
            .select('id')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (existing) {
            await supabase
                .from('whatsapp_connections')
                .update(connectionData)
                .eq('id', existing.id);
        } else {
            await supabase
                .from('whatsapp_connections')
                .insert({
                    ...connectionData,
                    created_at: new Date().toISOString()
                });
        }

        console.log(`✅ [Embedded Callback] Connection saved for tenant: ${tenantId}`);

        // Subscribe to webhooks if we have WABA ID
        if (wabaId && access_token) {
            try {
                await fetch(`${GRAPH_API_BASE}/${wabaId}/subscribed_apps`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token })
                });
                console.log(`✅ [Embedded Callback] Webhook subscribed for WABA: ${wabaId}`);
            } catch (webhookError) {
                console.error('⚠️ [Embedded Callback] Webhook subscription failed:', webhookError);
            }
        }

        // Redirect to success page
        const successUrl = wabaId && phoneNumberId
            ? `${DASHBOARD_URL}/#/integrations/whatsapp?success=true&phone=${encodeURIComponent(phoneNumber)}`
            : `${DASHBOARD_URL}/#/integrations/whatsapp?status=pending`;

        res.redirect(successUrl);

    } catch (error) {
        console.error('❌ [Embedded Callback] Error:', error);
        res.redirect(`${DASHBOARD_URL}/#/integrations/whatsapp?error=server_error`);
    }
});

/**
 * GET /api/whatsapp/embedded/status
 * 
 * Check the current connection status for a tenant
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.query;

        if (!tenantId) {
            return res.status(400).json({
                status: 'error',
                reason: 'tenantId is required'
            });
        }

        const { data: connection, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error) throw error;

        if (!connection) {
            return res.json({
                status: 'ok',
                data: {
                    connected: false,
                    status: 'not_configured',
                    tenant_id: tenantId
                }
            });
        }

        res.json({
            status: 'ok',
            data: {
                connected: connection.status === 'connected',
                status: connection.status,
                tenant_id: connection.tenant_id,
                phone_number: connection.phone_number ? `***${connection.phone_number.slice(-4)}` : null,
                waba_id: connection.waba_id,
                verified_name: connection.config_json?.verified_name,
                updated_at: connection.updated_at
            }
        });
    } catch (error) {
        console.error('❌ [Embedded Status] Error:', error);
        res.status(500).json({
            status: 'error',
            reason: String(error)
        });
    }
});

export default router;
