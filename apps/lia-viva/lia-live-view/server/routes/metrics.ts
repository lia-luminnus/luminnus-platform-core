import express from 'express';
import {
  getMetrics,
  getRevenueTrend,
  getQueryDistribution,
  incrementAIQuery,
  addRevenue,
  updateEfficiency
} from '../services/metricsService.js';

const router = express.Router();

/**
 * GET /api/metrics - Get main metrics
 */
router.get('/', (req, res) => {
  try {
    const metrics = getMetrics();
    res.json({ success: true, metrics });
  } catch (error: any) {
    console.error('❌ Error getting metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/revenue-trend - Get revenue trend data
 */
router.get('/revenue-trend', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = getRevenueTrend(days);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error getting revenue trend:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/query-distribution - Get query distribution
 */
router.get('/query-distribution', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const data = getQueryDistribution(days);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error getting query distribution:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/metrics/increment-query - Increment AI query counter
 */
router.post('/increment-query', (req, res) => {
  try {
    const { model } = req.body;
    if (!['gpt', 'gemini'].includes(model)) {
      return res.status(400).json({ success: false, error: 'Invalid model' });
    }
    incrementAIQuery(model);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error incrementing query:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/metrics/add-revenue - Add revenue
 */
router.post('/add-revenue', (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    addRevenue(amount);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error adding revenue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/metrics/update-efficiency - Update efficiency
 */
router.post('/update-efficiency', (req, res) => {
  try {
    const { value } = req.body;
    if (typeof value !== 'number' || value < 0 || value > 100) {
      return res.status(400).json({ success: false, error: 'Invalid value' });
    }
    updateEfficiency(value);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error updating efficiency:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/query - Dashboard Engine Generic Query
 * Retorna dados mock ou reais baseados no tipo solicitado
 */
router.get('/query', async (req, res) => {
  try {
    const { metric_key, tenant_id, type = 'timeseries' } = req.query;
    const mKey = (metric_key as string) || 'unknown';
    const qType = (type as string) || 'timeseries';
    const tId = (tenant_id as string) || '00000000-0000-0000-0000-000000000001';

    console.log(`🔍 [Metrics] Query recebida: tenant=${tId}, metric=${mKey}, type=${qType}`);

    // Helper: Generate random number in range
    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randFloat = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

    let data: any;

    switch (qType) {
      case 'alerts': {
        // Alertas de anomalias e urgências (formato DashboardRenderer)
        data = [
          {
            alert_type: 'error',
            alert_message: 'Detetei uma queda brusca no checkout hoje (23%).',
            alert_timestamp: new Date().toISOString(),
            alert_metadata: { source: 'anomaly', priority: 'high' }
          },
          {
            alert_type: 'warning',
            alert_message: '3 novos leads do WhatsApp não foram respondidos há mais de 1h.',
            alert_timestamp: new Date().toISOString(),
            alert_metadata: { source: 'crm', priority: 'medium' }
          }
        ];
        break;
      }

      case 'suggestions': {
        // Sugestões reais baseadas em tarefas e CRM
        const { TaskService } = await import('../services/taskService.js');
        const { CRMService } = await import('../services/crmService.js');

        const [tasksRes, leadsRes] = await Promise.all([
          TaskService.listTasks({ userId: tId, tenantId: tId, filter: { status: 'pending' } }),
          CRMService.listLeads({ userId: tId, tenantId: tId, filter: { status: 'new' } })
        ]);

        const suggestions = [];

        if (tasksRes.success && tasksRes.tasks && tasksRes.tasks.length > 0) {
          suggestions.push({
            type: 'task',
            title: `Você tem ${tasksRes.tasks.length} tarefas pendentes`,
            description: `A tarefa "${tasksRes.tasks[0].title}" vence em breve.`,
            priority: tasksRes.tasks[0].priority
          });
        }

        if (leadsRes.success && leadsRes.leads && leadsRes.leads.length > 0) {
          suggestions.push({
            type: 'crm',
            title: `${leadsRes.leads.length} novos leads aguardando`,
            description: `O último lead é "${leadsRes.leads[0].name}".`,
            priority: 'high'
          });
        }

        // Sugestão fallback se não houver nada real
        if (suggestions.length === 0) {
          suggestions.push({
            type: 'insight',
            title: 'Resumo da análise diária pronto!',
            description: 'Seu faturamento cresceu 15% em relação à semana passada.',
            priority: 'medium'
          });
        }

        data = suggestions;
        break;
      }

      case 'kpi':
        // Frontend (KPICard.tsx) expects: current_value, previous_value, change_percent, trend
        data = [
          {
            metric_key: mKey,
            current_value: randFloat(20000, 80000),
            previous_value: randFloat(15000, 70000),
            change_percent: randFloat(-10, 30),
            trend: Math.random() > 0.3 ? 'up' : 'down',
            label: mKey
          }
        ];
        break;

      case 'breakdown':
        // Frontend (DonutBreakdown.tsx) expects: Array of { name, value } or { dimension_value, value }
        data = [
          { name: 'Produtos', value: rand(5000, 15000) },
          { name: 'Serviços', value: rand(3000, 10000) },
          { name: 'Consultoria', value: rand(2000, 7000) },
          { name: 'Eventos', value: rand(1000, 5000) }
        ];
        break;

      case 'funnel':
        // Frontend (Funnel.tsx) expects: stage, value
        data = [
          { stage: 'Visitantes', value: 1000 },
          { stage: 'Leads', value: 300 },
          { stage: 'MQLs', value: 150 },
          { stage: 'Oportunidades', value: 60 },
          { stage: 'Vendas', value: 25 }
        ];
        break;

      case 'table':
        // Frontend (TableTransactions.tsx) expects: TransactionRow { id, data: { date, description, type, category, amount } }
        data = [1, 2, 3, 4, 5].map(i => ({
          id: `tx-${i}`,
          data: {
            date: new Date(Date.now() - i * 86400000).toISOString(),
            description: `Transação Mock #${i}`,
            type: Math.random() > 0.5 ? 'in' : 'out',
            category: 'vendas',
            amount: randFloat(100, 2000)
          },
          created_at: new Date().toISOString()
        }));
        break;

      case 'timeseries':
      default:
        // Frontend (LineTimeseries.tsx) expects: period (ISO Date), value, previous_value
        // Generate last 7 days
        data = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          data.push({
            period: d.toISOString().split('T')[0], // YYYY-MM-DD
            value: rand(2000, 6000),
            previous_value: rand(1500, 5500)
          });
        }
        break;
    }

    const response = {
      success: true,
      data,
      meta: {
        tenant_id,
        metric_key: mKey,
        type: qType
      }
    };

    console.log(`✅ [Metrics] Retornando ${Array.isArray(data) ? data.length : 1} registros para ${mKey}`);
    res.json(response);

  } catch (error: any) {
    console.error('❌ Error in /api/metrics/query:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export function setupMetricsRoutes(app: any) {
  app.use('/api/metrics', router);
}
