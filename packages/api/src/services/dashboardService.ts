/**
 * Dashboard Service
 * 
 * Gerencia dashboards por tenant
 * Instancia templates, salva versões, aplica herança
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

interface DashboardConfig {
    globals: {
        dateRange: string;
        currency: string;
        timezone: string;
        filters?: Record<string, any>;
    };
    layout: Array<{
        id: string;
        x: number;
        y: number;
        w: number;
        h: number;
    }>;
    widgets: Record<string, any>;
    enabledWidgets?: string[];
    enabledMetrics?: string[];
}

interface TenantDashboard {
    id: string;
    tenant_id: string;
    segment_key: string;
    name: string;
    version: number;
    config_json: DashboardConfig;
    is_active: boolean;
    created_from_template_id?: string;
    created_at: string;
    updated_at: string;
}

interface DashboardTemplate {
    id: string;
    segment_key: string;
    name: string;
    is_base: boolean;
    base_template_key?: string;
    template_json: DashboardConfig & { overrides?: any };
}

// ============================================
// Service
// ============================================

export class DashboardService {
    private supabase: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Get the active dashboard for a tenant
     */
    async getActiveDashboard(tenantId: string): Promise<TenantDashboard | null> {
        try {
            const { data, error } = await this.supabase
                .from('tenant_dashboards')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('is_active', true)
                .single();

            if (error) {
                console.log('[DashboardService] No active dashboard found:', error.message);
                return null;
            }

            return data;
        } catch (err) {
            console.error('[DashboardService] Get active dashboard error:', err);
            return null;
        }
    }

    /**
     * Get merged dashboard config (with inheritance applied)
     */
    async getMergedConfig(tenantId: string): Promise<DashboardConfig | null> {
        try {
            const { data, error } = await this.supabase.rpc('rpc_get_merged_dashboard_config', {
                p_tenant_id: tenantId,
            });

            if (error) {
                console.error('[DashboardService] Merged config error:', error);
                return null;
            }

            return data as DashboardConfig;
        } catch (err) {
            console.error('[DashboardService] Merged config exception:', err);
            return null;
        }
    }

    /**
     * Instantiate a dashboard from template for a tenant
     */
    async instantiateDashboard(tenantId: string, segmentKey: string): Promise<TenantDashboard | null> {
        try {
            // 1. Get the segment template
            const { data: template, error: templateError } = await this.supabase
                .from('dashboard_templates')
                .select('*')
                .eq('segment_key', segmentKey)
                .single();

            if (templateError || !template) {
                console.error('[DashboardService] Template not found:', segmentKey);
                // Fallback to 'custom_other' template
                const { data: fallback } = await this.supabase
                    .from('dashboard_templates')
                    .select('*')
                    .eq('segment_key', 'custom_other')
                    .single();

                if (!fallback) {
                    console.error('[DashboardService] No fallback template');
                    return null;
                }

                return this.createDashboardFromTemplate(tenantId, fallback);
            }

            // 2. If template has base, merge with base
            let mergedConfig = template.template_json;

            if (template.base_template_key) {
                const { data: baseTemplate } = await this.supabase
                    .from('dashboard_templates')
                    .select('*')
                    .eq('segment_key', template.base_template_key)
                    .single();

                if (baseTemplate) {
                    mergedConfig = this.mergeTemplates(baseTemplate.template_json, template.template_json);
                }
            }

            // 3. Create tenant dashboard
            return this.createDashboardFromTemplate(tenantId, { ...template, template_json: mergedConfig });
        } catch (err) {
            console.error('[DashboardService] Instantiate error:', err);
            return null;
        }
    }

    /**
     * Create dashboard record from template
     */
    private async createDashboardFromTemplate(
        tenantId: string,
        template: DashboardTemplate
    ): Promise<TenantDashboard | null> {
        // Deactivate existing dashboards
        await this.supabase
            .from('tenant_dashboards')
            .update({ is_active: false })
            .eq('tenant_id', tenantId);

        // Create new dashboard
        const { data, error } = await this.supabase
            .from('tenant_dashboards')
            .insert({
                tenant_id: tenantId,
                segment_key: template.segment_key,
                name: 'Dashboard Principal',
                version: 1,
                config_json: template.template_json,
                is_active: true,
                created_from_template_id: template.id,
            })
            .select()
            .single();

        if (error) {
            console.error('[DashboardService] Create dashboard error:', error);
            return null;
        }

        // Create initial version
        await this.supabase.from('tenant_dashboard_versions').insert({
            tenant_dashboard_id: data.id,
            version: 1,
            config_json: template.template_json,
            change_description: 'Dashboard inicial criado a partir do template',
        });

        return data;
    }

    /**
     * Save a new version of the dashboard
     */
    async saveVersion(
        tenantId: string,
        configJson: DashboardConfig,
        changeDescription?: string,
        userId?: string
    ): Promise<{ success: boolean; version?: number }> {
        try {
            // Get current dashboard
            const dashboard = await this.getActiveDashboard(tenantId);

            if (!dashboard) {
                console.error('[DashboardService] No active dashboard to save');
                return { success: false };
            }

            const newVersion = dashboard.version + 1;

            // Update dashboard
            const { error: updateError } = await this.supabase
                .from('tenant_dashboards')
                .update({
                    config_json: configJson,
                    version: newVersion,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', dashboard.id);

            if (updateError) {
                console.error('[DashboardService] Update error:', updateError);
                return { success: false };
            }

            // Create version record
            await this.supabase.from('tenant_dashboard_versions').insert({
                tenant_dashboard_id: dashboard.id,
                version: newVersion,
                config_json: configJson,
                changed_by_user_id: userId,
                change_description: changeDescription || 'Atualização manual',
            });

            return { success: true, version: newVersion };
        } catch (err) {
            console.error('[DashboardService] Save version error:', err);
            return { success: false };
        }
    }

    /**
     * Merge base template with segment template (apply overrides)
     */
    private mergeTemplates(base: any, segment: any): DashboardConfig {
        const overrides = segment.overrides || {};

        return {
            globals: { ...base.globals, ...segment.globals },
            layout: segment.layout?.length > 0 ? segment.layout : base.layout,
            widgets: this.mergeWidgets(base.widgets, segment.widgets, overrides.widgets),
            enabledWidgets: segment.enabledWidgets || base.enabledWidgets,
            enabledMetrics: segment.enabledMetrics || base.enabledMetrics,
        };
    }

    /**
     * Merge widget configs with overrides
     */
    private mergeWidgets(
        baseWidgets: Record<string, any>,
        segmentWidgets: Record<string, any> = {},
        overrides: Record<string, any> = {}
    ): Record<string, any> {
        const merged = { ...baseWidgets };

        // Apply segment widgets
        for (const [key, widget] of Object.entries(segmentWidgets)) {
            merged[key] = { ...merged[key], ...widget };
        }

        // Apply overrides
        for (const [key, override] of Object.entries(overrides)) {
            if (merged[key]) {
                merged[key] = { ...merged[key], ...override };
            }
        }

        return merged;
    }

    /**
     * Get list of versions for a dashboard
     */
    async getVersionHistory(dashboardId: string, limit = 10) {
        const { data, error } = await this.supabase
            .from('tenant_dashboard_versions')
            .select('id, version, change_description, created_at, changed_by_user_id')
            .eq('tenant_dashboard_id', dashboardId)
            .order('version', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[DashboardService] Get versions error:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Restore a specific version
     */
    async restoreVersion(tenantId: string, versionId: string): Promise<boolean> {
        try {
            // Get version config
            const { data: versionData, error: versionError } = await this.supabase
                .from('tenant_dashboard_versions')
                .select('config_json, version')
                .eq('id', versionId)
                .single();

            if (versionError || !versionData) {
                console.error('[DashboardService] Version not found');
                return false;
            }

            // Save as new version
            await this.saveVersion(
                tenantId,
                versionData.config_json,
                `Restaurado da versão ${versionData.version}`
            );

            return true;
        } catch (err) {
            console.error('[DashboardService] Restore version error:', err);
            return false;
        }
    }
}

export default new DashboardService();
