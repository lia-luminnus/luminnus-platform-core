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

const WEBHOOK_URL = process.env.WEBHOOK_BASE_URL
    ? `${process.env.WEBHOOK_BASE_URL}/api/whatsapp/evolution/webhook`
    : 'http://host.docker.internal:3006/api/whatsapp/evolution/webhook';

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

    try {
        const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
            headers: {
                apikey: EVOLUTION_GLOBAL_API_KEY
            }
        });

        const responseData = await response.json() as any;

        // The API returns the connection state.
        const state = responseData?.instance?.state || 'close';

        // If it's open, let's grab the profile info
        let profilePicUrl;
        let profileName;
        let owner;

        if (state === 'open') {
            try {
                // Fetch info assuming Evolution v2 behavior
                const infoResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
                    headers: { apikey: EVOLUTION_GLOBAL_API_KEY }
                });

                const infoData = await infoResponse.json() as any;
                const instanceData = infoData?.[0];
                owner = instanceData?.owner;
                profileName = instanceData?.profileName;
                profilePicUrl = instanceData?.profilePicUrl;
            } catch (e: any) {
                console.error("Erro secundário ao buscar profileInfo da Evolution:", e);
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
        // If 404, instance doesn't exist yet, which is fine, we just return null status
        if (error?.status === 404 || error?.message?.includes('not found')) {
            return res.json({ ok: true, status: null });
        }
        console.error('❌ Erro na API Evolution /status:', error.message);
        res.status(500).json({ error: 'Falha ao comunicar com Evolution API' });
    }
});

/**
 * POST /api/whatsapp/evolution/instance
 * Cria a instância (se não existir) e gera o QR Code em base64
 */
router.post('/instance', async (req: Request, res: Response) => {
    const { tenant_id } = req.body;

    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    const instanceName = getInstanceName(tenant_id);

    try {
        // 1. Tentar criar a instância (Evolution v1/v2 endpoint)
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

        const createResponseData = await createResponse.json() as any;
        if (!createResponse.ok) {
            console.log('Evolution API Error Response:', JSON.stringify(createResponseData, null, 2));

            // Extract the error message safely from Evolution v2's nested structure
            const errMsgRaw = createResponseData?.message || createResponseData?.response?.message || 'Failed to create instance';
            const finalErrMsg = Array.isArray(errMsgRaw) ? errMsgRaw.join(', ') : String(errMsgRaw);
            const msgStr = finalErrMsg.toLowerCase();

            const alreadyExists = msgStr.includes('already exists') ||
                msgStr.includes('has already been used') ||
                msgStr.includes('already in use');

            if (!alreadyExists) {
                console.error('❌ Failed to create Evolution instance:', finalErrMsg);
                throw new Error(finalErrMsg);
            }
            console.log('✅ Instance already exists in Evolution API. Falling back to connect...');
        }

        // 2. Connect to get the QR code generation started
        console.log('🔍 [QR Debug] Calling /instance/connect...');
        await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { apikey: EVOLUTION_GLOBAL_API_KEY }
        });

        // 3. Also check if create returned the QR code directly
        let qrcodeBase64 = createResponseData?.qrcode?.base64;

        // 4. Poll the pendingQrCodes cache (populated by webhook) for up to 15 seconds
        if (!qrcodeBase64) {
            console.log('🔍 [QR Debug] Polling pendingQrCodes cache (waiting for webhook)...');
            for (let i = 0; i < 15; i++) {
                await sleep(1000);
                if (pendingQrCodes[instanceName]) {
                    qrcodeBase64 = pendingQrCodes[instanceName];
                    console.log(`✅ [QR Debug] Got QR code from webhook cache after ${i + 1}s (length: ${qrcodeBase64.length})`);
                    delete pendingQrCodes[instanceName]; // Clean up after use
                    break;
                }
            }
        }

        if (!qrcodeBase64) {
            console.log('⚠️ [QR Debug] No QR code received after 15s polling. Webhook may not be reaching us.');
        } else {
            console.log('✅ [QR Debug] QR Code ready to send to frontend!');
        }

        console.log('🔍 [QR Debug] Final qrcodeBase64 present?', !!qrcodeBase64);

        // Registrar no nosso banco a existência dessa configuração
        await processSupabaseConnectionRecord(tenant_id, instanceName);

        res.json({
            ok: true,
            instanceName,
            qrcode: {
                base64: qrcodeBase64
            }
        });

    } catch (error: any) {
        console.error('❌ Erro na API Evolution /create/connect:', error.message);
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
        const qrcodeBase64 = data.qrcode?.base64 || data.qr?.base64 || data.base64 || body.qrcode?.base64 || '';

        if (isQrEvent || qrcodeBase64) {
            console.log(`✅ [Webhook] QR Code detected! Event: "${event}" | Base64 length: ${qrcodeBase64.length}`);
            if (qrcodeBase64) {
                pendingQrCodes[instanceName] = qrcodeBase64;
            }
        } else if (eventLower.includes('messages')) {
            console.log(`[Webhook] Mensagem recebida na instância ${instanceName}`);
        } else if (eventLower.includes('connection')) {
            // Log connection update data to see if QR code is hidden inside
            const dataStr = JSON.stringify(data).substring(0, 300);
            console.log(`[Webhook] Connection update: ${dataStr}`);
        }

        res.status(200).send('OK');

    } catch (error: any) {
        console.error('❌ Erro no Webhook Evolution API:', error.message);
        res.status(200).send('OK');
    }
});

export default router;
