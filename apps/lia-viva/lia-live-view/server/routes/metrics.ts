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

    let data: any;

    switch (qType) {
      case 'alerts': {
        // Sem alertas para contas novas (ou buscar real do DB depois)
        data = [];
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

        data = suggestions;
        break;
      }

      case 'kpi':
        data = [
          {
            metric_key: mKey,
            current_value: 0,
            previous_value: 0,
            change_percent: 0,
            trend: 'up',
            label: mKey
          }
        ];
        break;

      case 'breakdown':
        data = [];
        break;

      case 'funnel':
        data = [];
        break;

      case 'table':
        data = [];
        break;

      case 'timeseries':
      default:
        // Linha do tempo vazia nos últimos 7 dias para evitar erro visual no gráfico
        data = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          data.push({
            period: d.toISOString().split('T')[0], // YYYY-MM-DD
            value: 0,
            previous_value: 0
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
