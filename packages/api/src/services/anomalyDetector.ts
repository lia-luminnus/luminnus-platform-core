/**
 * Anomaly Detector Service
 * 
 * Detecta anomalias em métricas usando regras simples:
 * - Threshold: valor acima/abaixo de limite fixo
 * - Percent Change: variação percentual vs período anterior
 * - Z-Score: desvio padrão estatístico
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface Anomaly {
    metric_key: string;
    current_value: number;
    threshold_value: number;
    severity: 'info' | 'warning' | 'critical';
    rule_type: 'threshold' | 'percent_change' | 'zscore';
    message: string;
}

interface AnomalyRule {
    id: string;
    tenant_id: string | null;
    metric_key: string;
    rule_type: 'threshold' | 'percent_change' | 'zscore';
    rule_config: {
        operator?: '>' | '<' | '>=' | '<=';
        value?: number;
        compare_period?: '1d' | '7d' | '30d';
        threshold?: number;
    };
    severity: 'info' | 'warning' | 'critical';
    is_active: boolean;
}

class AnomalyDetector {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );
    }

    /**
     * Detecta anomalias para um tenant usando regras do banco
     */
    async detectAnomalies(tenantId: string, date?: string): Promise<Anomaly[]> {
        const targetDate = date || new Date().toISOString().split('T')[0];

        const { data, error } = await this.supabase.rpc('rpc_detect_anomalies', {
            p_tenant_id: tenantId,
            p_date: targetDate
        });

        if (error) {
            console.error('[AnomalyDetector] Error detecting anomalies:', error);
            return [];
        }

        return (data || []).map((row: any) => ({
            metric_key: row.metric_key,
            current_value: parseFloat(row.current_value) || 0,
            threshold_value: parseFloat(row.threshold_value) || 0,
            severity: row.severity as Anomaly['severity'],
            rule_type: row.rule_type as Anomaly['rule_type'],
            message: row.message
        }));
    }

    /**
     * Detecta anomalias usando lógica inline (sem banco)
     */
    async detectAnomaliesInline(
        currentMetrics: Record<string, number>,
        previousMetrics: Record<string, number>,
        rules?: AnomalyRule[]
    ): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];

        // Regras padrão se não fornecidas
        const defaultRules: Partial<AnomalyRule>[] = rules || [
            { metric_key: '*', rule_type: 'percent_change', rule_config: { value: -15 }, severity: 'warning' },
            { metric_key: '*', rule_type: 'percent_change', rule_config: { value: -30 }, severity: 'critical' },
        ];

        for (const [metricKey, currentValue] of Object.entries(currentMetrics)) {
            const previousValue = previousMetrics[metricKey] || 0;

            for (const rule of defaultRules) {
                if (rule.metric_key !== '*' && rule.metric_key !== metricKey) continue;

                const anomaly = this.checkRule(
                    metricKey,
                    currentValue,
                    previousValue,
                    rule as AnomalyRule
                );

                if (anomaly) {
                    anomalies.push(anomaly);
                }
            }
        }

        // Ordenar por severidade
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }

    /**
     * Verifica uma regra específica
     */
    private checkRule(
        metricKey: string,
        currentValue: number,
        previousValue: number,
        rule: AnomalyRule
    ): Anomaly | null {
        const config = rule.rule_config;

        switch (rule.rule_type) {
            case 'threshold': {
                const thresholdValue = config.value || 0;
                const operator = config.operator || '>';

                let triggered = false;
                if (operator === '>' && currentValue > thresholdValue) triggered = true;
                if (operator === '<' && currentValue < thresholdValue) triggered = true;
                if (operator === '>=' && currentValue >= thresholdValue) triggered = true;
                if (operator === '<=' && currentValue <= thresholdValue) triggered = true;

                if (triggered) {
                    return {
                        metric_key: metricKey,
                        current_value: currentValue,
                        threshold_value: thresholdValue,
                        severity: rule.severity,
                        rule_type: 'threshold',
                        message: `${metricKey} está ${operator === '>' ? 'acima' : 'abaixo'} do limite (${thresholdValue})`
                    };
                }
                break;
            }

            case 'percent_change': {
                if (previousValue === 0) break;

                const changePercent = ((currentValue - previousValue) / previousValue) * 100;
                const threshold = config.value || -15;

                if (changePercent < threshold) {
                    return {
                        metric_key: metricKey,
                        current_value: currentValue,
                        threshold_value: previousValue,
                        severity: rule.severity,
                        rule_type: 'percent_change',
                        message: `${metricKey} caiu ${Math.abs(changePercent).toFixed(1)}% vs período anterior`
                    };
                }
                break;
            }

            case 'zscore': {
                // Z-Score requer série histórica, simplificado aqui
                const zThreshold = config.threshold || 2;
                if (previousValue > 0) {
                    const zScore = Math.abs(currentValue - previousValue) / previousValue;
                    if (zScore > zThreshold) {
                        return {
                            metric_key: metricKey,
                            current_value: currentValue,
                            threshold_value: previousValue,
                            severity: rule.severity,
                            rule_type: 'zscore',
                            message: `${metricKey} apresenta variação anormal (z-score: ${zScore.toFixed(2)})`
                        };
                    }
                }
                break;
            }
        }

        return null;
    }

    /**
     * Obtém regras de anomalia para um tenant
     */
    async getRules(tenantId: string): Promise<AnomalyRule[]> {
        const { data, error } = await this.supabase
            .from('anomaly_rules')
            .select('*')
            .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
            .eq('is_active', true);

        if (error) {
            console.error('[AnomalyDetector] Error fetching rules:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Cria ou atualiza regra de anomalia
     */
    async upsertRule(rule: Omit<AnomalyRule, 'id'>): Promise<boolean> {
        const { error } = await this.supabase
            .from('anomaly_rules')
            .upsert(rule);

        if (error) {
            console.error('[AnomalyDetector] Error upserting rule:', error);
            return false;
        }

        return true;
    }

    /**
     * Formata anomalias para exibição em mensagem
     */
    formatAnomaliesForMessage(anomalies: Anomaly[]): string {
        if (anomalies.length === 0) {
            return '✅ Nenhuma anomalia detectada';
        }

        const criticalIcon = '🚨';
        const warningIcon = '⚠️';
        const infoIcon = 'ℹ️';

        return anomalies.map(a => {
            const icon = a.severity === 'critical' ? criticalIcon :
                a.severity === 'warning' ? warningIcon : infoIcon;
            return `${icon} ${a.message}`;
        }).join('\n');
    }

    /**
     * Gera ações sugeridas baseadas nas anomalias
     */
    generateSuggestedActions(anomalies: Anomaly[], segment: string): string[] {
        const actions: string[] = [];

        for (const anomaly of anomalies) {
            switch (anomaly.metric_key) {
                case 'revenue':
                case 'orders':
                    if (anomaly.severity === 'critical') {
                        actions.push('🔴 Verificar campanhas de marketing imediatamente');
                        actions.push('📊 Analisar funil de conversão');
                    } else {
                        actions.push('📈 Revisar performance de campanhas');
                    }
                    break;

                case 'conversion_rate':
                    actions.push('🔍 Verificar UX do checkout');
                    actions.push('💳 Conferir métodos de pagamento');
                    break;

                case 'cart_abandonment':
                    actions.push('📧 Ativar campanha de recuperação de carrinho');
                    actions.push('💰 Considerar cupom de desconto');
                    break;

                case 'roas':
                    actions.push('⏸️ Pausar campanhas com ROAS < 1.2');
                    actions.push('🎯 Realocar budget para campanhas performando');
                    break;

                case 'churn_rate':
                    actions.push('📞 Contatar clientes em risco');
                    actions.push('🎁 Oferecer incentivo de retenção');
                    break;

                case 'no_show':
                    actions.push('📱 Implementar lembretes por WhatsApp');
                    actions.push('💵 Considerar taxa de no-show');
                    break;

                default:
                    if (anomaly.severity === 'critical') {
                        actions.push(`🚨 Investigar ${anomaly.metric_key} urgentemente`);
                    }
            }
        }

        // Remover duplicatas e limitar
        return [...new Set(actions)].slice(0, 5);
    }
}

export const anomalyDetector = new AnomalyDetector();
export default anomalyDetector;
