/**
 * Metrics Routes
 * 
 * API endpoints para consulta de métricas
 */

import { Router, Request, Response } from 'express';
import metricsService from '../services/metricsService.js';

const router: Router = Router();

/**
 * GET /api/metrics/query
 * Query metrics with various parameters
 */
router.get('/query', async (req: Request, res: Response) => {
    try {
        const {
            tenant_id,
            metric_key,
            start_date,
            end_date,
            group_by = 'day',
            dimension = 'category',
            limit = '10',
            type = 'timeseries', // 'timeseries', 'breakdown', 'kpi', 'funnel', 'table', 'alerts', 'suggestions'
            entity_type = 'transactions',
        } = req.query;

        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id is required' });
        }

        // metric_key is required for timeseries and breakdown
        if ((type === 'timeseries' || type === 'breakdown') && !metric_key) {
            return res.status(400).json({ error: 'metric_key is required for this query type' });
        }

        // Default date range: last 30 days
        const today = new Date();
        const defaultStart = new Date(today);
        defaultStart.setDate(defaultStart.getDate() - 30);

        const startDate = (start_date as string) || defaultStart.toISOString().split('T')[0];
        const endDate = (end_date as string) || today.toISOString().split('T')[0];

        let data: any;

        switch (type) {
            case 'breakdown':
                data = await metricsService.queryBreakdown({
                    tenantId: tenant_id as string,
                    metricKey: metric_key as string,
                    startDate,
                    endDate,
                    dimension: dimension as string,
                    limit: parseInt(limit as string),
                });
                break;

            case 'kpi':
                data = await metricsService.queryKPISummary(
                    tenant_id as string,
                    startDate,
                    endDate
                );
                break;

            case 'funnel':
                data = await metricsService.queryDealsFunnel(tenant_id as string);
                break;

            case 'table':
                data = await metricsService.queryRecentRecords(
                    tenant_id as string,
                    entity_type as any,
                    { startDate, endDate, limit: parseInt(limit as string) }
                );
                break;

            case 'alerts':
                data = await metricsService.queryAlerts(
                    tenant_id as string,
                    parseInt(limit as string)
                );
                break;

            case 'suggestions':
                data = await metricsService.querySuggestions(
                    tenant_id as string,
                    parseInt(limit as string)
                );
                break;

            case 'timeseries':
            default:
                data = await metricsService.queryTimeseries({
                    tenantId: tenant_id as string,
                    metricKey: metric_key as string,
                    startDate,
                    endDate,
                    groupBy: group_by as 'day' | 'week' | 'month',
                });
                break;
        }

        return res.json({
            success: true,
            data,
            meta: {
                tenant_id,
                metric_key,
                start_date: startDate,
                end_date: endDate,
                type,
            },
        });
    } catch (err) {
        console.error('[MetricsRoutes] Query error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/metrics/kpi-summary
 * Get KPI summary for dashboard
 */
router.get('/kpi-summary', async (req: Request, res: Response) => {
    try {
        const { tenant_id, start_date, end_date } = req.query;

        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id is required' });
        }

        const today = new Date();
        const defaultStart = new Date(today);
        defaultStart.setDate(defaultStart.getDate() - 30);

        const startDate = (start_date as string) || defaultStart.toISOString().split('T')[0];
        const endDate = (end_date as string) || today.toISOString().split('T')[0];

        const data = await metricsService.queryKPISummary(
            tenant_id as string,
            startDate,
            endDate
        );

        return res.json({ success: true, data });
    } catch (err) {
        console.error('[MetricsRoutes] KPI summary error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/metrics/funnel
 * Get deals funnel data
 */
router.get('/funnel', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.query;

        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id is required' });
        }

        const data = await metricsService.queryDealsFunnel(tenant_id as string);

        return res.json({ success: true, data });
    } catch (err) {
        console.error('[MetricsRoutes] Funnel error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
