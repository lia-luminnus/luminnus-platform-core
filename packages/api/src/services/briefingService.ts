/**
 * Briefing Service
 * 
 * Gera briefings executivos diários/semanais usando:
 * - Métricas agregadas
 * - Detecção de anomalias
 * - IA para insights contextualizados
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { metricsAggregator } from './metricsAggregator.js';
import { anomalyDetector } from './anomalyDetector.js';
import { UsageService } from './usageService.js';

interface BriefTemplate {
    id: string;
    segment_key: string;
    name: string;
    metrics: Array<{
        key: string;
        name: string;
        type: string;
        priority: number;
    }>;
    prompt_template: string;
    message_template: string;
}

interface BriefContent {
    date: string;
    summary: string;
    metrics: Array<{
        key: string;
        name: string;
        value: string;
        change: string;
        trend: 'up' | 'down' | 'stable';
    }>;
    alerts: string[];
    causes: string[];
    actions: string[];
    sources: string[];
    confidence: 'high' | 'medium' | 'low';
}

interface GenerateBriefOptions {
    tenantId: string;
    templateId?: string;
    segmentKey?: string;
    briefType: 'daily' | 'weekly';
    date?: string;
}

class BriefingService {
    private supabase: SupabaseClient;
    private openai: OpenAI;

    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Gera um briefing completo
     */
    async generateBrief(options: GenerateBriefOptions): Promise<BriefContent> {
        const { tenantId, segmentKey = 'services', briefType, date } = options;

        // 0. Verificar e resetar quotas se necessário, depois validar limite de relatórios
        await UsageService.checkResetNeeded(tenantId);
        await UsageService.incrementReports(tenantId); // Já lança erro se exceder

        // 1. Obter template
        const template = await this.getTemplate(options.templateId, segmentKey);
        if (!template) {
            throw new Error(`Template não encontrado para segmento: ${segmentKey}`);
        }

        // 2. Calcular datas
        const endDate = date || new Date().toISOString().split('T')[0];
        const startDate = this.calculateStartDate(endDate, briefType);

        // 3. Obter métricas
        const metricKeys = template.metrics.map(m => m.key);
        const metrics = await metricsAggregator.getMetricsSummary({
            tenantId,
            metricKeys,
            startDate,
            endDate
        });

        // 4. Detectar anomalias
        const anomalies = await anomalyDetector.detectAnomalies(tenantId, endDate);

        // 5. Gerar insights com IA
        const aiInsights = await this.generateAIInsights(
            template,
            metrics,
            anomalies,
            briefType
        );

        // 6. Montar conteúdo do briefing
        const briefContent: BriefContent = {
            date: endDate,
            summary: aiInsights.summary,
            metrics: metrics.map(m => {
                const templateMetric = template.metrics.find(tm => tm.key === m.metric_key);
                return {
                    key: m.metric_key,
                    name: templateMetric?.name || m.metric_key,
                    value: metricsAggregator.formatMetricValue(
                        m.current_value,
                        templateMetric?.type || 'count'
                    ),
                    change: `${m.change_percent > 0 ? '+' : ''}${m.change_percent.toFixed(1)}%`,
                    trend: m.trend
                };
            }),
            alerts: anomalies.map(a => a.message),
            causes: aiInsights.causes,
            actions: aiInsights.actions,
            sources: ['Supabase'],
            confidence: this.calculateConfidence(metrics, anomalies)
        };

        // 7. Salvar no histórico
        await this.saveBriefHistory(tenantId, template.id, briefType, briefContent);

        return briefContent;
    }

    /**
     * Obtém template por ID ou segmento
     */
    private async getTemplate(templateId?: string, segmentKey?: string): Promise<BriefTemplate | null> {
        let query = this.supabase.from('brief_templates').select('*');

        if (templateId) {
            query = query.eq('id', templateId);
        } else if (segmentKey) {
            query = query.eq('segment_key', segmentKey);
        }

        const { data, error } = await query.single();

        if (error || !data) {
            console.error('[BriefingService] Template not found:', error);
            return null;
        }

        return data as BriefTemplate;
    }

    /**
     * Calcula data de início baseado no tipo de briefing
     */
    private calculateStartDate(endDate: string, briefType: 'daily' | 'weekly'): string {
        const end = new Date(endDate);
        const days = briefType === 'weekly' ? 7 : 1;
        const start = new Date(end);
        start.setDate(start.getDate() - days);
        return start.toISOString().split('T')[0];
    }

    /**
     * Gera insights usando IA (GPT)
     */
    private async generateAIInsights(
        template: BriefTemplate,
        metrics: any[],
        anomalies: any[],
        briefType: string
    ): Promise<{ summary: string; causes: string[]; actions: string[] }> {
        try {
            const prompt = this.buildInsightPrompt(template, metrics, anomalies, briefType);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: template.prompt_template || 'Você é um analista de negócios experiente.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
                max_tokens: 500
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                return this.getFallbackInsights(anomalies);
            }

            const parsed = JSON.parse(content);
            return {
                summary: parsed.summary || 'Resumo não disponível',
                causes: parsed.causes || [],
                actions: parsed.actions || []
            };
        } catch (error) {
            console.error('[BriefingService] AI error:', error);
            return this.getFallbackInsights(anomalies);
        }
    }

    /**
     * Constrói prompt para IA
     */
    private buildInsightPrompt(
        template: BriefTemplate,
        metrics: any[],
        anomalies: any[],
        briefType: string
    ): string {
        const metricsText = metrics.map(m => {
            const tmpl = template.metrics.find(t => t.key === m.metric_key);
            return `- ${tmpl?.name || m.metric_key}: ${m.current_value} (${m.change_percent > 0 ? '+' : ''}${m.change_percent.toFixed(1)}%)`;
        }).join('\n');

        const anomaliesText = anomalies.length > 0
            ? anomalies.map(a => `- ${a.message}`).join('\n')
            : 'Nenhuma anomalia detectada';

        return `
Analise os seguintes dados de ${briefType === 'daily' ? 'ontem' : 'última semana'} e gere um briefing executivo.

MÉTRICAS:
${metricsText}

ANOMALIAS DETECTADAS:
${anomaliesText}

Responda em JSON com:
{
  "summary": "Resumo executivo em 1-2 linhas",
  "causes": ["Causa provável 1", "Causa provável 2"],
  "actions": ["Ação recomendada 1", "Ação recomendada 2", "Ação recomendada 3"]
}

Seja direto, objetivo e acionável.
`;
    }

    /**
     * Fallback quando IA falha
     */
    private getFallbackInsights(anomalies: any[]): { summary: string; causes: string[]; actions: string[] } {
        return {
            summary: anomalies.length > 0
                ? `${anomalies.length} ponto(s) de atenção identificado(s)`
                : 'Operação dentro dos parâmetros normais',
            causes: anomalies.length > 0
                ? ['Variações podem ser sazonais', 'Verificar campanhas ativas']
                : [],
            actions: anomalyDetector.generateSuggestedActions(anomalies, 'services')
        };
    }

    /**
     * Calcula nível de confiança
     */
    private calculateConfidence(metrics: any[], anomalies: any[]): 'high' | 'medium' | 'low' {
        // Menos dados = menor confiança
        if (metrics.length < 3) return 'low';
        if (anomalies.some(a => a.severity === 'critical')) return 'medium';
        return 'high';
    }

    /**
     * Salva briefing no histórico
     */
    private async saveBriefHistory(
        tenantId: string,
        templateId: string,
        briefType: string,
        content: BriefContent
    ): Promise<void> {
        const { error } = await this.supabase
            .from('brief_history')
            .insert({
                tenant_id: tenantId,
                template_id: templateId,
                brief_type: briefType,
                content,
                delivery_status: 'pending',
                delivery_channel: 'whatsapp',
                recipient: '', // Será preenchido no envio
                metrics_snapshot: content.metrics,
                anomalies_detected: content.alerts,
                actions_suggested: content.actions,
                sources_used: content.sources,
                confidence_level: content.confidence
            });

        if (error) {
            console.error('[BriefingService] Error saving history:', error);
        }
    }

    /**
     * Formata briefing para mensagem WhatsApp
     */
    formatForWhatsApp(content: BriefContent, template?: BriefTemplate): string {
        const date = new Date(content.date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
        });

        // Métricas principais (prioridade 1)
        const topMetrics = content.metrics
            .slice(0, 3)
            .map(m => {
                const icon = m.trend === 'up' ? '📈' : m.trend === 'down' ? '📉' : '➡️';
                return `${icon} ${m.name}: ${m.value} (${m.change})`;
            })
            .join('\n');

        // Alertas
        const alerts = content.alerts.length > 0
            ? content.alerts.slice(0, 3).map(a => `• ${a}`).join('\n')
            : '✅ Operação normal';

        // Ações
        const actions = content.actions.length > 0
            ? content.actions.slice(0, 3).map((a, i) => `${i + 1}. ${a}`).join('\n')
            : 'Nenhuma ação urgente';

        // Confiança
        const confidenceEmoji = content.confidence === 'high' ? '🟢' :
            content.confidence === 'medium' ? '🟡' : '🔴';

        return `📊 *Briefing ${date}*

*Resumo:*
${content.summary}

*Métricas:*
${topMetrics}

⚠️ *Atenção:*
${alerts}

✅ *Ações Recomendadas:*
${actions}

💬 Pergunte: "detalhar" | "top produtos" | "comparar 30d"
📎 Fonte: ${content.sources.join(', ')} | ${confidenceEmoji} ${content.confidence.toUpperCase()}`;
    }

    /**
     * Processa pergunta do chat "pergunte ao dado"
     */
    async processQuestion(
        tenantId: string,
        question: string,
        userPhone: string
    ): Promise<string> {
        const startTime = Date.now();

        try {
            // 0. Validar e incrementar quota de minutos (1 min por interação no MVP)
            await UsageService.checkResetNeeded(tenantId);
            await UsageService.incrementMinutes(tenantId, 1);

            // Analisar intenção da pergunta
            const intent = await this.analyzeQuestionIntent(question);

            // Buscar dados relevantes
            let response = '';
            const sources: string[] = ['Supabase'];

            switch (intent.type) {
                case 'detail_metric':
                    response = await this.getMetricDetail(tenantId, intent.metric || 'revenue');
                    break;
                case 'top_items':
                    response = await this.getTopItems(tenantId, intent.dimension || 'product');
                    break;
                case 'compare_period':
                    response = await this.comparePeriod(tenantId, intent.period || '7d');
                    break;
                default:
                    response = await this.getGeneralAnswer(tenantId, question);
            }

            // Salvar interação
            await this.supabase.from('brief_interactions').insert({
                tenant_id: tenantId,
                user_phone: userPhone,
                question,
                answer: response,
                sources_used: sources,
                response_time_ms: Date.now() - startTime
            });

            return response;
        } catch (error) {
            console.error('[BriefingService] Question error:', error);
            return 'Desculpe, não consegui processar sua pergunta. Tente reformular ou pergunte sobre uma métrica específica.';
        }
    }

    /**
     * Analisa intenção da pergunta
     */
    private async analyzeQuestionIntent(question: string): Promise<{
        type: 'detail_metric' | 'top_items' | 'compare_period' | 'general';
        metric?: string;
        dimension?: string;
        period?: string;
    }> {
        const q = question.toLowerCase();

        if (q.includes('detalhar') || q.includes('por que caiu') || q.includes('por que subiu')) {
            const metric = this.extractMetricFromQuestion(q);
            return { type: 'detail_metric', metric };
        }

        if (q.includes('top') || q.includes('principais') || q.includes('melhores')) {
            const dimension = q.includes('produto') ? 'product' :
                q.includes('categoria') ? 'category' : 'product';
            return { type: 'top_items', dimension };
        }

        if (q.includes('comparar') || q.includes('30d') || q.includes('7d')) {
            const period = q.includes('30') ? '30d' : '7d';
            return { type: 'compare_period', period };
        }

        return { type: 'general' };
    }

    /**
     * Extrai métrica da pergunta
     */
    private extractMetricFromQuestion(question: string): string {
        const metricMappings: Record<string, string> = {
            'vendas': 'revenue',
            'faturamento': 'revenue',
            'conversão': 'conversion_rate',
            'carrinho': 'cart_abandonment',
            'roas': 'roas',
            'cac': 'cac',
            'churn': 'churn_rate',
            'mrr': 'mrr'
        };

        for (const [keyword, metric] of Object.entries(metricMappings)) {
            if (question.includes(keyword)) {
                return metric;
            }
        }

        return 'revenue';
    }

    /**
     * Obtém detalhe de métrica
     */
    private async getMetricDetail(tenantId: string, metricKey: string): Promise<string> {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const metrics = await metricsAggregator.getMetricsByPeriod(
            tenantId,
            metricKey,
            startDate.toISOString().split('T')[0],
            endDate
        );

        if (metrics.length === 0) {
            return `Não encontrei dados recentes para ${metricKey}. Verifique se as integrações estão configuradas.`;
        }

        const values = metrics.map(m => m.metric_value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const trend = values[values.length - 1] > avg ? 'acima' : 'abaixo';

        return `📊 *${metricKey}* (últimos 7 dias)

Valor atual: ${values[values.length - 1]}
Média: ${avg.toFixed(2)}
Status: ${trend} da média

Fonte: Supabase | ${metrics.length} registros`;
    }

    /**
     * Obtém top items
     */
    private async getTopItems(tenantId: string, dimension: string): Promise<string> {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const top = await metricsAggregator.getTopByDimension(
            tenantId,
            'revenue',
            dimension,
            startDate.toISOString().split('T')[0],
            endDate,
            5
        );

        if (top.length === 0) {
            return 'Não encontrei dados de ranking para este período.';
        }

        const list = top.map((item, i) =>
            `${i + 1}. ${item.dimension_value}: ${metricsAggregator.formatMetricValue(item.total, 'currency')}`
        ).join('\n');

        return `🏆 *Top 5 por ${dimension}* (30 dias)

${list}

Fonte: Supabase`;
    }

    /**
     * Compara períodos
     */
    private async comparePeriod(tenantId: string, period: string): Promise<string> {
        const days = period === '30d' ? 30 : 7;
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const metrics = await metricsAggregator.getMetricsSummary({
            tenantId,
            metricKeys: ['revenue', 'orders', 'conversion_rate'],
            startDate: startDate.toISOString().split('T')[0],
            endDate
        });

        const lines = metrics.map(m => {
            const icon = m.trend === 'up' ? '📈' : m.trend === 'down' ? '📉' : '➡️';
            return `${icon} ${m.metric_key}: ${m.current_value} (${m.change_percent > 0 ? '+' : ''}${m.change_percent.toFixed(1)}%)`;
        });

        return `📊 *Comparativo ${period}*

${lines.join('\n')}

vs período anterior`;
    }

    /**
     * Resposta geral via IA
     */
    private async getGeneralAnswer(tenantId: string, question: string): Promise<string> {
        // Simplificado - em produção usaria RAG ou context mais rico
        return `Entendi sua pergunta: "${question}"

Para análises específicas, experimente:
• "detalhar vendas"
• "top produtos"
• "comparar 30d"

Ou pergunte sobre uma métrica específica como ROAS, CAC, conversão, etc.`;
    }
}

export const briefingService = new BriefingService();
export default briefingService;
