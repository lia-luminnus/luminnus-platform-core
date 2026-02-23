import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router: Router = Router();

// Evolution API Configuration (to be set in Render environment later)
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_GLOBAL_API_KEY = process.env.EVOLUTION_GLOBAL_API_KEY || 'luminnus_global_key';

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
                // Aqui no futuro adicionamos a URL do nosso Webhook (whatsapp-in)
                webhook: "",
                events: [
                    "MESSAGES_UPSERT",
                    "CONNECTION_UPDATE"
                ]
            }),
            headers: {
                apikey: EVOLUTION_GLOBAL_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const createResponseData = await createResponse.json() as any;

        if (!createResponse.ok) {
            if (!createResponseData?.message?.includes('already exists')) {
                throw new Error(createResponseData?.message || 'Failed to create instance');
            }
        }

        // 2. Com a instância criada, conectar para pegar a nova base64 do QR Code
        const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
            headers: {
                apikey: EVOLUTION_GLOBAL_API_KEY
            }
        });

        const connectResponseData = await connectResponse.json() as any;

        // Evolution retorna a `base64` dentro da resposta de connect caso precise ler QR
        let qrcodeBase64 = connectResponseData?.base64 || connectResponseData?.qrcode?.base64;

        if (!qrcodeBase64 && createResponseData?.qrcode?.base64) {
            qrcodeBase64 = createResponseData.qrcode.base64;
        }

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

export default router;
