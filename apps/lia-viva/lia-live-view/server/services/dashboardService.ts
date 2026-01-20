import { supabase } from '../config/supabase.js';

export class DashboardService {

    /**
     * Get the active dashboard for a tenant
     */
    async getActiveDashboard(tenantId: string) {
        if (!supabase) return null;
        try {
            const { data, error } = await supabase
                .from('tenant_dashboards')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('is_active', true)
                .single();

            if (error) return null;
            return data;
        } catch (err) {
            return null;
        }
    }

    /**
     * Instantiate a dashboard from template
     */
    async instantiateDashboard(tenantId: string, segmentKey: string) {
        if (!supabase) throw new Error('Supabase não disponível');

        // 1. Get template
        const { data: template, error: tError } = await supabase
            .from('dashboard_templates')
            .select('*')
            .eq('segment_key', segmentKey)
            .single();

        if (tError || !template) {
            throw new Error(`Template não encontrado para o segmento: ${segmentKey}`);
        }

        // 2. Deactivate previous
        await supabase
            .from('tenant_dashboards')
            .update({ is_active: false })
            .eq('tenant_id', tenantId);

        // 3. Create new
        const { data: dashboard, error: dError } = await supabase
            .from('tenant_dashboards')
            .insert({
                tenant_id: tenantId,
                segment_key: segmentKey,
                name: 'Dashboard Principal',
                version: 1,
                config_json: template.template_json,
                is_active: true,
                created_from_template_id: template.id
            })
            .select()
            .single();

        if (dError) throw dError;

        // 4. Initial version
        await supabase.from('tenant_dashboard_versions').insert({
            tenant_dashboard_id: dashboard.id,
            version: 1,
            config_json: template.template_json,
            change_description: 'Dashboard inicial criado via Onboarding'
        });

        return dashboard;
    }

    /**
     * Save a new version
     */
    async saveVersion(tenantId: string, configJson: any, description?: string, userId?: string) {
        if (!supabase) throw new Error('Supabase não disponível');

        const dashboard = await this.getActiveDashboard(tenantId);
        if (!dashboard) throw new Error('Nenhum dashboard ativo para salvar');

        const newVersion = (dashboard.version || 0) + 1;

        const { error: uError } = await supabase
            .from('tenant_dashboards')
            .update({
                config_json: configJson,
                version: newVersion,
                updated_at: new Date().toISOString()
            })
            .eq('id', dashboard.id);

        if (uError) throw uError;

        await supabase.from('tenant_dashboard_versions').insert({
            tenant_dashboard_id: dashboard.id,
            version: newVersion,
            config_json: configJson,
            changed_by_user_id: userId,
            change_description: description || 'Atualização'
        });

        return { success: true, version: newVersion };
    }
}

export default new DashboardService();
