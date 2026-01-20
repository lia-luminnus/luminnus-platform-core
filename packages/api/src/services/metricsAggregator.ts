/**
 * Metrics Aggregator Service
 * 
 * Responsável por agregar métricas de diferentes fontes
 * e calcular comparações de período.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface MetricSummary {
    metric_key: string;
    current_value: number;
    previous_value: number;
    change_percent: number;
    trend: 'up' | 'down' | 'stable';
}

interface MetricDataPoint {
    metric_key: string;
    metric_value: number;
    metric_date: string;
    source: string;
    dimensions?: Record<string, any>;
}

interface AggregationOptions {
    tenantId: string;
    metricKeys: string[];
    startDate: string;
    endDate: string;
    comparePeriod?: '1d' | '7d' | '30d';
}

class MetricsAggregator {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );
    }

    /**
     * Obtém resumo de métricas com comparação de período
     */
    async getMetricsSummary(options: AggregationOptions): Promise<MetricSummary[]> {
        const { tenantId, metricKeys, startDate, endDate } = options;

        const { data, error } = await this.supabase.rpc('rpc_get_metrics_summary', {
            p_tenant_id: tenantId,
            p_metric_keys: metricKeys,
            p_start_date: startDate,
            p_end_date: endDate
        });

        if (error) {
            console.error('[MetricsAggregator] Error fetching summary:', error);
            return [];
        }

        return (data || []).map((row: any) => ({
            metric_key: row.metric_key,
            current_value: parseFloat(row.current_value) || 0,
            previous_value: parseFloat(row.previous_value) || 0,
            change_percent: parseFloat(row.change_percent) || 0,
            trend: row.trend as 'up' | 'down' | 'stable'
        }));
    }

    /**
     * Insere ou atualiza métricas unificadas
     */
    async upsertMetrics(tenantId: string, metrics: MetricDataPoint[]): Promise<boolean> {
        const records = metrics.map(m => ({
            tenant_id: tenantId,
            metric_key: m.metric_key,
            metric_value: m.metric_value,
            metric_date: m.metric_date,
            source: m.source,
            dimensions: m.dimensions || {}
        }));

        const { error } = await this.supabase
            .from('metrics_unified')
            .upsert(records, {
                onConflict: 'tenant_id,metric_key,metric_date,source',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('[MetricsAggregator] Error upserting metrics:', error);
            return false;
        }

        return true;
    }

    /**
     * Obtém métricas por período
     */
    async getMetricsByPeriod(
        tenantId: string,
        metricKey: string,
        startDate: string,
        endDate: string
    ): Promise<MetricDataPoint[]> {
        const { data, error } = await this.supabase
            .from('metrics_unified')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('metric_key', metricKey)
            .gte('metric_date', startDate)
            .lte('metric_date', endDate)
            .order('metric_date', { ascending: true });

        if (error) {
            console.error('[MetricsAggregator] Error fetching metrics:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Calcula média móvel de 7 dias
     */
    async getMovingAverage(
        tenantId: string,
        metricKey: string,
        date: string,
        days: number = 7
    ): Promise<number> {
        const endDate = new Date(date);
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await this.supabase
            .from('metrics_unified')
            .select('metric_value')
            .eq('tenant_id', tenantId)
            .eq('metric_key', metricKey)
            .gte('metric_date', startDate.toISOString().split('T')[0])
            .lt('metric_date', date)
            .order('metric_date', { ascending: false })
            .limit(days);

        if (error || !data || data.length === 0) {
            return 0;
        }

        const sum = data.reduce((acc, row) => acc + (parseFloat(row.metric_value) || 0), 0);
        return sum / data.length;
    }

    /**
     * Obtém top N por dimensão específica
     */
    async getTopByDimension(
        tenantId: string,
        metricKey: string,
        dimension: string,
        startDate: string,
        endDate: string,
        limit: number = 5
    ): Promise<Array<{ dimension_value: string; total: number }>> {
        const { data, error } = await this.supabase
            .from('metrics_unified')
            .select('dimensions, metric_value')
            .eq('tenant_id', tenantId)
            .eq('metric_key', metricKey)
            .gte('metric_date', startDate)
            .lte('metric_date', endDate);

        if (error || !data) {
            return [];
        }

        // Agregar por dimensão
        const aggregated: Record<string, number> = {};
        for (const row of data) {
            const dimValue = row.dimensions?.[dimension] || 'Outros';
            aggregated[dimValue] = (aggregated[dimValue] || 0) + (parseFloat(row.metric_value) || 0);
        }

        // Ordenar e limitar
        return Object.entries(aggregated)
            .map(([dimension_value, total]) => ({ dimension_value, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, limit);
    }

    /**
     * Formata valor de métrica para exibição
     */
    formatMetricValue(value: number, type: string, currency: string = 'BRL'): string {
        switch (type) {
            case 'currency':
                return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency
                }).format(value);
            case 'percent':
                return `${value.toFixed(1)}%`;
            case 'count':
                return new Intl.NumberFormat('pt-BR').format(Math.round(value));
            case 'ratio':
                return value.toFixed(2);
            case 'duration':
                return `${Math.round(value)}min`;
            case 'score':
                return value.toFixed(1);
            default:
                return value.toString();
        }
    }

    /**
     * Gera texto de comparação
     */
    generateComparisonText(current: number, previous: number, metricName: string): string {
        if (previous === 0) {
            return `${metricName}: ${current} (sem dados anteriores)`;
        }

        const change = ((current - previous) / previous) * 100;
        const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        const sign = change > 0 ? '+' : '';

        return `${trend} ${metricName}: ${current} (${sign}${change.toFixed(1)}% vs anterior)`;
    }
}

export const metricsAggregator = new MetricsAggregator();
export default metricsAggregator;
