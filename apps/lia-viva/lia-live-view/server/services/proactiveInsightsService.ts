// ======================================================================
// 🔔 PROACTIVE INSIGHTS SERVICE v1.0
// ======================================================================
// Serviço de background que analisa dados do usuário e gera alertas
// proativos sobre finanças, CRM, e atividade geral do negócio.
// ======================================================================

// @ts-ignore
import { supabase } from '../config/supabase.js';

const supabaseClient = supabase as any;

interface InsightResult {
    type: 'alert' | 'suggestion' | 'summary';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    category: string;
    data?: any;
}

export class ProactiveInsightsService {

    /**
     * Executa todas as análises proativas para um usuário.
     * Chamado periodicamente (cron) ou sob demanda.
     */
    static async analyzeForUser(userId: string, tenantId: string): Promise<InsightResult[]> {
        const insights: InsightResult[] = [];

        try {
            // 1. Análise Financeira
            const financialInsights = await this.analyzeFinancials(userId);
            insights.push(...financialInsights);

            // 2. Análise de CRM (Leads parados, deals perto de fechar)
            const crmInsights = await this.analyzeCRM(userId, tenantId);
            insights.push(...crmInsights);

            // 3. Análise de Atividade (Arquivos recentes, memórias)
            const activityInsights = await this.analyzeActivity(userId, tenantId);
            insights.push(...activityInsights);

            console.log(`🔔 [ProactiveInsights] ${insights.length} insight(s) gerado(s) para user ${userId}`);
        } catch (error: any) {
            console.error('❌ [ProactiveInsights] Erro na análise:', error.message);
        }

        return insights;
    }

    /**
     * Análise financeira: detecta padrões de gastos, alertas de aumento, etc.
     */
    private static async analyzeFinancials(userId: string): Promise<InsightResult[]> {
        const insights: InsightResult[] = [];

        if (!supabaseClient) return insights;

        try {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            // Buscar registros financeiros deste mês
            const { data: thisMonthData } = await supabaseClient
                .from('long_term_memory')
                .select('key, value, created_at')
                .eq('user_id', userId)
                .gte('created_at', thisMonthStart.toISOString())
                .like('key', 'financial_%');

            // Buscar registros financeiros do mês passado
            const { data: lastMonthData } = await supabaseClient
                .from('long_term_memory')
                .select('key, value, created_at')
                .eq('user_id', userId)
                .gte('created_at', lastMonthStart.toISOString())
                .lte('created_at', lastMonthEnd.toISOString())
                .like('key', 'financial_%');

            const parseRecords = (records: any[]) => {
                return (records || []).map(r => {
                    try {
                        return typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
                    } catch { return null; }
                }).filter(Boolean);
            };

            const thisMonthRecords = parseRecords(thisMonthData);
            const lastMonthRecords = parseRecords(lastMonthData);

            const thisMonthTotal = thisMonthRecords.reduce((sum: number, r: any) => sum + (r.value || 0), 0);
            const lastMonthTotal = lastMonthRecords.reduce((sum: number, r: any) => sum + (r.value || 0), 0);

            // Alerta: gastos aumentaram mais de 30%
            if (lastMonthTotal > 0 && thisMonthTotal > lastMonthTotal * 1.3) {
                const increase = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(0);
                insights.push({
                    type: 'alert',
                    severity: 'warning',
                    title: '📊 Aumento nos gastos',
                    message: `Seus gastos este mês (R$ ${thisMonthTotal.toFixed(2)}) estão ${increase}% acima do mês passado (R$ ${lastMonthTotal.toFixed(2)}).`,
                    category: 'financial',
                    data: { thisMonthTotal, lastMonthTotal, increase }
                });
            }

            // Alerta: gasto alto em uma categoria específica
            const categoryTotals: Record<string, number> = {};
            for (const record of thisMonthRecords) {
                const cat = record.category || 'outros';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + (record.value || 0);
            }

            const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => (b as number) - (a as number))[0];
            if (topCategory && (topCategory[1] as number) > thisMonthTotal * 0.5 && thisMonthRecords.length > 3) {
                insights.push({
                    type: 'suggestion',
                    severity: 'info',
                    title: '💡 Concentração de gastos',
                    message: `Mais de 50% dos seus gastos este mês estão na categoria "${topCategory[0]}" (R$ ${(topCategory[1] as number).toFixed(2)}).`,
                    category: 'financial',
                    data: { category: topCategory[0], total: topCategory[1] }
                });
            }

            // Resumo mensal se houver dados
            if (thisMonthRecords.length > 0) {
                insights.push({
                    type: 'summary',
                    severity: 'info',
                    title: '📋 Resumo financeiro do mês',
                    message: `Este mês você tem ${thisMonthRecords.length} registro(s) financeiro(s) totalizando R$ ${thisMonthTotal.toFixed(2)}.`,
                    category: 'financial',
                    data: { total: thisMonthTotal, count: thisMonthRecords.length, categories: categoryTotals }
                });
            }
        } catch (error: any) {
            console.warn('⚠️ [ProactiveInsights] Erro na análise financeira:', error.message);
        }

        return insights;
    }

    /**
     * Análise de CRM: leads sem follow-up, deals perto do prazo
     */
    private static async analyzeCRM(userId: string, tenantId: string): Promise<InsightResult[]> {
        const insights: InsightResult[] = [];

        if (!supabaseClient) return insights;

        try {
            // Leads sem atividade nos últimos 7 dias
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: staleLeads } = await supabaseClient
                .from('crm_leads')
                .select('id, name, status, updated_at')
                .eq('tenant_id', tenantId)
                .eq('status', 'new')
                .lte('updated_at', sevenDaysAgo.toISOString())
                .limit(5);

            if (staleLeads && staleLeads.length > 0) {
                insights.push({
                    type: 'suggestion',
                    severity: 'warning',
                    title: '👤 Leads aguardando atenção',
                    message: `Você tem ${staleLeads.length} lead(s) sem atividade há mais de 7 dias: ${staleLeads.map((l: any) => l.name).join(', ')}.`,
                    category: 'crm',
                    data: { leads: staleLeads }
                });
            }

            // Deals com data de fechamento próxima
            const threeDaysAhead = new Date();
            threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);

            const { data: urgentDeals } = await supabaseClient
                .from('crm_deals')
                .select('id, title, value, expected_close_date')
                .eq('tenant_id', tenantId)
                .lte('expected_close_date', threeDaysAhead.toISOString())
                .gte('expected_close_date', new Date().toISOString())
                .not('stage', 'eq', 'closed_won')
                .not('stage', 'eq', 'closed_lost')
                .limit(5);

            if (urgentDeals && urgentDeals.length > 0) {
                insights.push({
                    type: 'alert',
                    severity: 'critical',
                    title: '🎯 Deals com fechamento próximo',
                    message: `${urgentDeals.length} deal(s) com prazo de fechamento nos próximos 3 dias: ${urgentDeals.map((d: any) => `"${d.title}" (R$ ${d.value || 0})`).join(', ')}.`,
                    category: 'crm',
                    data: { deals: urgentDeals }
                });
            }
        } catch (error: any) {
            console.warn('⚠️ [ProactiveInsights] Erro na análise de CRM:', error.message);
        }

        return insights;
    }

    /**
     * Análise de atividade geral: arquivos recentes, padrões de uso
     */
    private static async analyzeActivity(userId: string, tenantId: string): Promise<InsightResult[]> {
        const insights: InsightResult[] = [];

        if (!supabaseClient) return insights;

        try {
            // Arquivos enviados na última semana
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const { data: recentFiles, count } = await supabaseClient
                .from('files')
                .select('id, file_name, file_type, created_at', { count: 'exact' })
                .eq('tenant_id', tenantId)
                .gte('created_at', oneWeekAgo.toISOString())
                .order('created_at', { ascending: false })
                .limit(10);

            if (count && count > 5) {
                insights.push({
                    type: 'summary',
                    severity: 'info',
                    title: '📁 Atividade de arquivos',
                    message: `Você enviou ${count} arquivo(s) na última semana. Posso organizar ou analisar algum deles?`,
                    category: 'activity',
                    data: { fileCount: count, recentFiles: recentFiles?.slice(0, 5) }
                });
            }
        } catch (error: any) {
            console.warn('⚠️ [ProactiveInsights] Erro na análise de atividade:', error.message);
        }

        return insights;
    }

    /**
     * Formata insights para apresentação pela LIA no chat
     */
    static formatForChat(insights: InsightResult[]): string {
        if (insights.length === 0) return '';

        const sections: string[] = [];

        const critical = insights.filter(i => i.severity === 'critical');
        const warnings = insights.filter(i => i.severity === 'warning');
        const info = insights.filter(i => i.severity === 'info');

        if (critical.length > 0) {
            sections.push('🚨 **Alertas Críticos:**');
            critical.forEach(i => sections.push(`- ${i.title}: ${i.message}`));
        }

        if (warnings.length > 0) {
            sections.push('\n⚠️ **Atenção:**');
            warnings.forEach(i => sections.push(`- ${i.title}: ${i.message}`));
        }

        if (info.length > 0) {
            sections.push('\n📊 **Informações:**');
            info.forEach(i => sections.push(`- ${i.title}: ${i.message}`));
        }

        return sections.join('\n');
    }
}
