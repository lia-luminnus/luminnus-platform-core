import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router: Router = Router();

// Evolution API Configuration (to be set in Render environment later)
// Docker maps 8081->8080 inside the container, so from the host we hit port 8081
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8081';
const EVOLUTION_GLOBAL_API_KEY = process.env.EVOLUTION_GLOBAL_API_KEY || '4211a768-bdf3-4eb0-8a1a-3e5f22e8db12';

// Cache temporário em memória para armazenar Base64 QR Codes recebidos via Webhook
// Necessário pois a Evolution API v2 muitas vezes retorna `{count: 0}` nas chamadas síncronas de /connect
const pendingQrCodes: Record<string, string> = {};

const WEBHOOK_URL = (() => {
    if (process.env.WEBHOOK_BASE_URL) {
        return `${process.env.WEBHOOK_BASE_URL}/api/whatsapp/evolution/webhook`;
    }
    // Auto-detect production on Render: use the public API URL
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        return 'https://api.luminnus.ai/api/whatsapp/evolution/webhook';
    }
    return 'http://host.docker.internal:3006/api/whatsapp/evolution/webhook';
})();

console.log(`✅ [Evolution] Webhook URL: ${WEBHOOK_URL}`);
console.log(`✅ [Evolution] API URL: ${EVOLUTION_API_URL}`);

// Helper: sleep function for polling
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to construct Evolution instance name from tenant_id safely
 */
function getInstanceName(tenantId: string): string {
    return `lia_${tenantId.replace(/-/g, '')}`;
}

/**
 * GET /api/whatsapp/evolution/status?tenant_id=XYZ
 * Verifica se a instância existe e qual o estado atual (Conectado, QR Code, Desconectado)
 */
router.get('/status', async (req: Request, res: Response) => {
    const tenantId = req.query.tenant_id as string;

    if (!tenantId) {
        return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const instanceName = getInstanceName(tenantId);
    console.log(`[Status] Checking instance: ${instanceName}`);

    try {
        // Use AbortController for timeout (8 seconds max)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
            headers: {
                apikey: EVOLUTION_GLOBAL_API_KEY
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        // Handle non-OK responses (404, 400, 500, etc.)
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'unknown');
            console.log(`[Status] Evolution API returned ${response.status}: ${errorText.substring(0, 200)}`);

            // Instance doesn't exist — return null status (not an error)
            if (response.status === 404 || response.status === 400) {
                return res.json({ ok: true, status: null });
            }

            // For other errors, try Supabase fallback
            throw new Error(`Evolution API error ${response.status}`);
        }

        const responseData = await response.json() as any;

        // The API returns the connection state.
        const state = responseData?.instance?.state || 'close';
        console.log(`[Status] Instance ${instanceName}: state=${state}`);

        // If it's open, let's grab the profile info
        let profilePicUrl;
        let profileName;
        let owner;

        if (state === 'open') {
            try {
                const infoResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
                    headers: { apikey: EVOLUTION_GLOBAL_API_KEY }
                });

                const infoData = await infoResponse.json() as any;
                const instanceData = infoData?.[0];
                owner = instanceData?.owner;
                profileName = instanceData?.profileName;
                profilePicUrl = instanceData?.profilePicUrl;
            } catch (e: any) {
                console.error("[Status] Error fetching profile info:", e.message);
            }
        }

        return res.json({
            ok: true,
            status: {
                instanceName,
                state: state, // open, connecting, close, refused
                owner,
                profileName,
                profilePicUrl
            }
        });

    } catch (error: any) {
        // Handle abort (timeout)
        if (error.name === 'AbortError') {
            console.log(`[Status] Evolution API timed out for ${instanceName}`);
        } else {
            console.log(`[Status] Error checking ${instanceName}: ${error.message}`);
        }

        // Fallback: Try to get last known status from Supabase
        try {
            const { data: conn } = await supabase
                .from('whatsapp_connections')
                .select('status, phone_number, config_json')
                .eq('tenant_id', tenantId)
                .eq('provider', 'evolution')
                .maybeSingle();

            if (conn) {
                console.log(`[Status] Using Supabase fallback for ${instanceName}: ${conn.status}`);
                return res.json({
                    ok: true,
                    status: {
                        instanceName,
                        state: conn.status === 'active' ? 'open' : 'close',
                        owner: conn.phone_number || undefined,
                        profileName: conn.config_json?.profileName || undefined,
                    },
                    source: 'supabase_fallback'
                });
            }
        } catch (dbErr: any) {
            console.error('[Status] Supabase fallback failed:', dbErr.message);
        }

        // If both fail, return graceful "not connected" state
        res.json({ ok: true, status: null, source: 'offline' });
    }
});

/**
 * POST /api/whatsapp/evolution/instance
 * Limpa instância existente (se houver), cria nova e gera QR Code em base64
 */
router.post('/instance', async (req: Request, res: Response) => {
    const { tenant_id } = req.body;

    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const instanceName = getInstanceName(tenant_id);
    console.log(`\n🚀 [QR] ===== Starting QR Code Generation =====`);
    console.log(`🚀 [QR] Instance: ${instanceName} | Tenant: ${tenant_id}`);
    console.log(`🚀 [QR] Webhook URL: ${WEBHOOK_URL}`);
    console.log(`🚀 [QR] Evolution API: ${EVOLUTION_API_URL}`);

    try {
        let qrcodeBase64: string | undefined;

        // ── Step 1: Clean up any stale instance ──
        // Evolution API only generates QR codes for NEW instances.
        // A stale instance stuck in "connecting" state blocks QR generation.
        console.log('🧹 [QR] Step 1: Cleaning up stale instance (if exists)...');
        try {
            // First logout (disconnects WhatsApp session)
            await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
                method: 'DELETE',
                headers: { apikey: EVOLUTION_GLOBAL_API_KEY }
            });
            console.log('🧹 [QR] Logout sent.');
        } catch (e: any) {
            console.log(`🧹 [QR] Logout skipped (instance may not exist): ${e.message}`);
        }

        try {
            // Then delete the instance completely
            const delRes = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: { apikey: EVOLUTION_GLOBAL_API_KEY }
            });
            const delData = await delRes.text();
            console.log(`🧹 [QR] Delete response (${delRes.status}): ${delData.substring(0, 200)}`);
        } catch (e: any) {
            console.log(`🧹 [QR] Delete skipped: ${e.message}`);
        }

        // Small delay to let Evolution API clean up
        await sleep(1500);

        // ── Step 2: Create FRESH instance with qrcode:true ──
        console.log('📱 [QR] Step 2: Creating fresh instance with qrcode:true...');

        const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
            method: 'POST',
            body: JSON.stringify({
                instanceName: instanceName,
                description: `WhatsApp LIA para tenant ${tenant_id}`,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                webhook: {
                    url: WEBHOOK_URL,
                    byEvents: false,
                    base64: true,
                    events: [
                        "QRCODE_UPDATED",
                        "MESSAGES_UPSERT",
                        "CONNECTION_UPDATE"
                    ]
                }
            }),
            headers: {
                apikey: EVOLUTION_GLOBAL_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const createData = await createResponse.json() as any;
        console.log(`📱 [QR] Create response (${createResponse.status}):`, JSON.stringify(createData).substring(0, 800));

        if (!createResponse.ok) {
            const errMsgRaw = createData?.message || createData?.response?.message || 'Failed to create instance';
            const finalErrMsg = Array.isArray(errMsgRaw) ? errMsgRaw.join(', ') : String(errMsgRaw);
            console.error('❌ [QR] Failed to create instance:', finalErrMsg);
            throw new Error(finalErrMsg);
        }

        // Check if create response contains QR code directly
        qrcodeBase64 = createData?.qrcode?.base64
            || createData?.base64
            || createData?.qr?.base64
            || createData?.instance?.qrcode?.base64;

        if (qrcodeBase64) {
            console.log('✅ [QR] Got QR code directly from /create response!');
        }

        // ── Step 3: If no QR from create, poll webhook cache + /connect ──
        if (!qrcodeBase64) {
            console.log('🔍 [QR] Step 3: QR not in create response, polling webhook cache + /connect...');

            for (let attempt = 0; attempt < 30; attempt++) {
                // Check webhook cache first (fastest path when webhook works)
                if (pendingQrCodes[instanceName]) {
                    qrcodeBase64 = pendingQrCodes[instanceName];
                    console.log(`✅ [QR] Got QR from webhook cache (attempt ${attempt + 1})`);
                    delete pendingQrCodes[instanceName];
                    break;
                }

                // Try /instance/connect directly
                try {
                    const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
                        method: 'GET',
                        headers: { apikey: EVOLUTION_GLOBAL_API_KEY }
                    });
                    const connectData = await connectRes.json() as any;

                    // Log raw response for first 5 attempts for debugging
                    if (attempt < 5) {
                        console.log(`🔍 [QR] /connect attempt ${attempt + 1}:`, JSON.stringify(connectData).substring(0, 500));
                    }

                    // Check all possible QR code fields
                    const base64FromConnect = connectData?.base64
                        || connectData?.qrcode?.base64
                        || connectData?.instance?.qrcode?.base64
                        || connectData?.qr?.base64;
                    if (base64FromConnect) {
                        qrcodeBase64 = base64FromConnect;
                        console.log(`✅ [QR] Got QR from /connect (attempt ${attempt + 1})`);
                        break;
                    }

                    // Check for raw QR code string (some versions)
                    if (connectData?.code && typeof connectData.code === 'string' && connectData.code.length > 50) {
                        qrcodeBase64 = connectData.code;
                        console.log(`✅ [QR] Got QR code string from /connect (attempt ${attempt + 1})`);
                        break;
                    }
                } catch (connectErr: any) {
                    if (attempt < 5) {
                        console.log(`⚠️ [QR] /connect attempt ${attempt + 1} error:`, connectErr.message);
                    }
                }

                await sleep(1000);
            }
        }

        // ── Final: return result ──
        if (!qrcodeBase64) {
            console.log('❌ [QR] No QR code obtained after 30 seconds of polling.');
            console.log('❌ [QR] Possible causes: Evolution API not generating QR, webhook not receiving events, or API version incompatibility.');
        } else {
            console.log(`✅ [QR] QR Code ready! Base64 length: ${qrcodeBase64.length}`);
        }

        // Register in Supabase
        await processSupabaseConnectionRecord(tenant_id, instanceName);

        res.json({
            ok: true,
            instanceName,
            qrcode: {
                base64: qrcodeBase64
            }
        });

    } catch (error: any) {
        console.error('❌ [QR] Error in QR generation flow:', error.message);
        res.status(500).json({ error: error.message || 'Falha ao criar instância Evolution' });
    }
});

/**
 * DELETE /api/whatsapp/evolution/instance
 * Logout/Desconectar o aparelho do WhatsApp
 */
router.delete('/instance', async (req: Request, res: Response) => {
    const { tenant_id } = req.body;

    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const instanceName = getInstanceName(tenant_id);

    try {
        await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { apikey: EVOLUTION_GLOBAL_API_KEY }
        });

        // Atualiza banco LIA
        await supabase
            .from('whatsapp_connections')
            .update({ status: 'disconnected', updated_at: new Date().toISOString() })
            .eq('tenant_id', tenant_id);

        res.json({ ok: true, message: 'Instância desconectada com sucesso.' });
    } catch (error: any) {
        console.error('❌ Erro Evolution /logout:', error.message);
        res.status(500).json({ error: 'Erro ao tentar deslogar o WhatsApp.' });
    }
});

/**
 * Helpers para manter espelho no banco da Luminnus
 */
async function processSupabaseConnectionRecord(tenantId: string, instanceName: string) {
    // Verificar se já existe
    const { data: existing } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

    if (existing?.id) {
        await supabase
            .from('whatsapp_connections')
            .update({
                provider: 'evolution',
                config_json: { instanceName },
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('whatsapp_connections')
            .insert({
                tenant_id: tenantId,
                provider: 'evolution',
                phone_number: 'awaiting_scan',
                config_json: { instanceName },
                status: 'provisioning',
                updated_at: new Date().toISOString()
            });
    }
}

/**
 * POST /api/whatsapp/evolution/webhook
 * Recebe webhooks da Evolution API (QR Code, Mensagens, etc)
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const body = req.body;

        const event = body.event;
        const data = body.data || body;
        const instanceName = data.instance || body.instance;

        // Log ALL incoming webhook events for debugging
        const eventLower = (event || '').toLowerCase();
        console.log(`📨 [Webhook] Event: "${event}" | Instance: "${instanceName}" | Data keys: ${JSON.stringify(Object.keys(data))}`);

        if (!instanceName) {
            return res.status(200).send('OK');
        }

        // Check for QR Code in multiple possible event names
        const isQrEvent = eventLower.includes('qrcode') || eventLower.includes('qr_code') || eventLower.includes('qr.code');

        // Also check if ANY event contains a base64 QR code (some Evolution versions embed it in connection.update)
        const qrcodeBase64 = data.qrcode?.base64 || data.qr?.base64 || data.base64 || body.qrcode?.base64
            || data.qrcode?.pairingCode || '';

        if (isQrEvent || qrcodeBase64) {
            console.log(`✅ [Webhook] QR Code detected! Event: "${event}" | Instance: "${instanceName}" | Base64 length: ${qrcodeBase64.length}`);
            if (qrcodeBase64) {
                pendingQrCodes[instanceName] = qrcodeBase64;
                console.log(`✅ [Webhook] QR Code cached for instance: ${instanceName}`);
            }
        } else if (eventLower.includes('messages')) {
            console.log(`[Webhook] Mensagem recebida na instância ${instanceName}`);
        } else if (eventLower.includes('connection')) {
            // Log full connection update data to diagnose QR code issues
            const dataStr = JSON.stringify(data).substring(0, 500);
            console.log(`[Webhook] Connection update for ${instanceName}: ${dataStr}`);
        }

        res.status(200).send('OK');

    } catch (error: any) {
        console.error('❌ Erro no Webhook Evolution API:', error.message);
        res.status(200).send('OK');
    }
});

export default router;
