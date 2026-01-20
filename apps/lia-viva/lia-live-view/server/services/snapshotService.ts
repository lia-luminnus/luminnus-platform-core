import { supabase } from '../config/supabase.js';
import systemManifest from '../../../../../packages/lia-runtime/system/systemManifest.ts';

/**
 * 🛰️ SNAPSHOT SERVICE v5.0
 * 
 * Este serviço é responsável por tirar uma "foto" do estado atual do tenant.
 * É a base da consciência operacional da LIA.
 */

export const SnapshotService = {
    /**
     * Obtém o estado completo do tenant (Consciência de Sistema)
     */
    async getTenantSnapshot(tenantId: string) {
        try {
            console.log(`🛰️ [SnapshotService] Gerando snapshot para tenant: ${tenantId}`);

            // 1. Buscar perfil e plano do tenant
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*, tenant_id')
                .eq('id', tenantId) // Assumindo userId = tenantId para simplificar no momento
                .single();

            if (profileError) throw profileError;

            // 2. Buscar integrações conectadas
            const { data: integrations, error: intError } = await supabase
                .from('integrations')
                .select('*')
                .eq('tenant_id', profile.tenant_id);

            // 3. Buscar estado do WhatsApp (se houver)
            const { data: whatsapp, error: waError } = await supabase
                .from('whatsapp_settings')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .single();

            // 4. Montar o snapshot baseado no Product Catalog Manifest
            const planId = profile.plan_level || 'start';
            const planLimits = systemManifest.PLANS[planId];

            const snapshot = {
                timestamp: new Date().toISOString(),
                tenant_id: profile.tenant_id,
                plan: planId,
                limits: planLimits,
                modulesEnabled: planLimits.features,
                integrations: (integrations || []).map(i => ({
                    id: i.provider,
                    status: i.status,
                    lastSync: i.last_sync_at
                })),
                whatsappState: whatsapp ? {
                    connected: whatsapp.status === 'connected',
                    phoneNumber: whatsapp.phone_number,
                    lastWebhook: whatsapp.last_webhook_at
                } : { connected: false },
                hash: Buffer.from(JSON.stringify(integrations || [])).toString('base64').substring(0, 10)
            };

            return snapshot;
        } catch (error) {
            console.error(`❌ [SnapshotService] Erro ao gerar snapshot:`, error.message);
            return { error: 'SNAPSHOT_FAILED', reason: error.message };
        }
    },

    /**
     * Retorna o catálogo do produto (Manifest)
     */
    getProductManifest() {
        return systemManifest;
    }
};
