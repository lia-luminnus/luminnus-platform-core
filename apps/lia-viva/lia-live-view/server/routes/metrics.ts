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

export function setupMetricsRoutes(app: any) {
  app.use('/api/metrics', router);
}
