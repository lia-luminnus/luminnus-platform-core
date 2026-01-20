/**
 * Metrics Service
 * 
 * Serviço para consulta de métricas com cache
 * Consome RPCs do Supabase e implementa fallback
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

interface MetricQuery {
    tenantId: string;
    metricKey: string;
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
    dimension?: string;
    limit?: number;
}

interface MetricTimeseriesPoint {
    period: string;
    period_start: string;
    period_end: string;
    value: number;
    previous_value: number;
    change_percent: number;
}

interface MetricBreakdownItem {
    dimension_value: string;
    value: number;
    percentage: number;
    count: number;
}

interface MetricKPISummary {
    metric_key: string;
    current_value: number;
    previous_value: number;
    change_percent: number;
    trend: 'up' | 'down' | 'stable';
}

export interface MetricAlert {
    id: string;
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    timestamp: string;
    metadata?: any;
}

// ============================================
// Service
// ============================================

export class MetricsService {
    private supabase: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Query timeseries data for a metric
     */
    async queryTimeseries(query: MetricQuery): Promise<MetricTimeseriesPoint[]> {
        try {
            const { tenantId, metricKey, startDate, endDate, groupBy = 'day' } = query;

            const { data, error } = await this.supabase.rpc('rpc_metric_timeseries', {
                p_tenant_id: tenantId,
                p_metric_key: metricKey,
                p_start_date: startDate,
                p_end_date: endDate,
                p_group_by: groupBy,
            });

            if (error) {
                console.error('[MetricsService] Timeseries error:', error);
                return this.getFallbackTimeseries(startDate, endDate, groupBy);
            }

            return data || [];
        } catch (err) {
            console.error('[MetricsService] Timeseries exception:', err);
            return this.getFallbackTimeseries(query.startDate, query.endDate, query.groupBy || 'day');
        }
    }

    /**
     * Query breakdown data for a metric
     */
    async queryBreakdown(query: MetricQuery): Promise<MetricBreakdownItem[]> {
        try {
            const { tenantId, metricKey, startDate, endDate, dimension = 'category', limit = 10 } = query;

            const { data, error } = await this.supabase.rpc('rpc_metric_breakdown', {
                p_tenant_id: tenantId,
                p_metric_key: metricKey,
                p_start_date: startDate,
                p_end_date: endDate,
                p_dimension: dimension,
                p_limit: limit,
            });

            if (error) {
                console.error('[MetricsService] Breakdown error:', error);
                return this.getFallbackBreakdown();
            }

            return data || [];
        } catch (err) {
            console.error('[MetricsService] Breakdown exception:', err);
            return this.getFallbackBreakdown();
        }
    }

    /**
     * Query KPI summary for multiple metrics
     */
    async queryKPISummary(tenantId: string, startDate: string, endDate: string): Promise<MetricKPISummary[]> {
        try {
            const { data, error } = await this.supabase.rpc('rpc_kpi_summary', {
                p_tenant_id: tenantId,
                p_start_date: startDate,
                p_end_date: endDate,
            });

            if (error) {
                console.error('[MetricsService] KPI Summary error:', error);
                return this.getFallbackKPIs();
            }

            return data || [];
        } catch (err) {
            console.error('[MetricsService] KPI Summary exception:', err);
            return this.getFallbackKPIs();
        }
    }

    /**
     * Query recent records (table display)
     */
    async queryRecentRecords(
        tenantId: string,
        entityType: 'transactions' | 'invoices' | 'deals' | 'contacts',
        options?: { startDate?: string; endDate?: string; limit?: number; offset?: number }
    ) {
        try {
            const { data, error } = await this.supabase.rpc('rpc_table_recent', {
                p_tenant_id: tenantId,
                p_entity_type: entityType,
                p_start_date: options?.startDate || null,
                p_end_date: options?.endDate || null,
                p_limit: options?.limit || 20,
                p_offset: options?.offset || 0,
            });

            if (error) {
                console.error('[MetricsService] Recent records error:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('[MetricsService] Recent records exception:', err);
            return [];
        }
    }

    /**
     * Query deals funnel
     */
    async queryDealsFunnel(tenantId: string) {
        try {
            const { data, error } = await this.supabase.rpc('rpc_deals_funnel', {
                p_tenant_id: tenantId,
            });

            if (error) {
                console.error('[MetricsService] Deals funnel error:', error);
                return this.getFallbackFunnel();
            }

            return data || [];
        } catch (err) {
            console.error('[MetricsService] Deals funnel exception:', err);
            return this.getFallbackFunnel();
        }
    }

    /**
     * Query alerts and notifications
     */
    async queryAlerts(tenantId: string, limit: number = 10): Promise<MetricAlert[]> {
        try {
            const { data, error } = await this.supabase.rpc('rpc_get_unified_alerts', {
                p_tenant_id: tenantId,
                p_limit: limit,
            });

            if (error) {
                console.error('[MetricsService] Unified alerts error:', error);
                return this.getFallbackAlerts();
            }

            // Map RPC result fields to Alert interface
            return (data || []).map((item: any) => ({
                id: item.alert_id,
                type: item.alert_type,
                title: item.alert_title,
                message: item.alert_message,
                timestamp: item.alert_timestamp,
                metadata: item.alert_metadata
            }));
        } catch (err) {
            console.error('[MetricsService] Unified alerts exception:', err);
            return this.getFallbackAlerts();
        }
    }

    // ============================================
    // Fallback Data (Estado Zero / Demo)
    // ============================================

    private getFallbackTimeseries(startDate: string, endDate: string, groupBy: string): MetricTimeseriesPoint[] {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const points: MetricTimeseriesPoint[] = [];

        const current = new Date(start);
        while (current <= end) {
            points.push({
                period: current.toISOString().split('T')[0],
                period_start: current.toISOString().split('T')[0],
                period_end: current.toISOString().split('T')[0],
                value: 0,
                previous_value: 0,
                change_percent: 0,
            });

            // Increment based on groupBy
            if (groupBy === 'week') {
                current.setDate(current.getDate() + 7);
            } else if (groupBy === 'month') {
                current.setMonth(current.getMonth() + 1);
            } else {
                current.setDate(current.getDate() + 1);
            }
        }

        return points;
    }

    private getFallbackBreakdown(): MetricBreakdownItem[] {
        return [
            { dimension_value: 'Sem dados', value: 0, percentage: 100, count: 0 },
        ];
    }

    private getFallbackKPIs(): MetricKPISummary[] {
        return [
            { metric_key: 'cash_in', current_value: 0, previous_value: 0, change_percent: 0, trend: 'stable' },
            { metric_key: 'cash_out', current_value: 0, previous_value: 0, change_percent: 0, trend: 'stable' },
            { metric_key: 'net_cash', current_value: 0, previous_value: 0, change_percent: 0, trend: 'stable' },
            { metric_key: 'transaction_count', current_value: 0, previous_value: 0, change_percent: 0, trend: 'stable' },
        ];
    }

    private getFallbackFunnel() {
        return [
            { stage: 'lead', stage_order: 1, count: 0, total_value: 0, avg_probability: 20 },
            { stage: 'contacted', stage_order: 2, count: 0, total_value: 0, avg_probability: 35 },
            { stage: 'proposal', stage_order: 3, count: 0, total_value: 0, avg_probability: 55 },
            { stage: 'negotiation', stage_order: 4, count: 0, total_value: 0, avg_probability: 75 },
            { stage: 'won', stage_order: 5, count: 0, total_value: 0, avg_probability: 100 },
        ];
    }

    private getFallbackAlerts(): MetricAlert[] {
        return [
            {
                id: 'welcome',
                type: 'success',
                title: 'Bem-vindo à LIA',
                message: 'Seu dashboard está operante. Comece agendando prazos ou analisando seu financeiro.',
                timestamp: new Date().toISOString()
            }
        ];
    }
}

export default new MetricsService();
