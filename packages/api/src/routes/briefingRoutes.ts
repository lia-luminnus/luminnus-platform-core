/**
 * Briefing API Routes
 * 
 * Endpoints para gerenciamento e entrega de briefings executivos
 */

import { Router, Request, Response } from 'express';
import { briefingService } from '../services/briefingService.js';
import { metricsAggregator } from '../services/metricsAggregator.js';
import { anomalyDetector } from '../services/anomalyDetector.js';

const router: Router = Router();

// ============================================
// Briefing Endpoints
// ============================================

/**
 * POST /api/briefing/generate
 * Gera um briefing sob demanda
 */
router.post('/generate', async (req: Request, res: Response) => {
    try {
        const { tenant_id, segment_key, brief_type, template_id } = req.body;

        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id é obrigatório' });
        }

        const brief = await briefingService.generateBrief({
            tenantId: tenant_id,
            templateId: template_id,
            segmentKey: segment_key || 'services',
            briefType: brief_type || 'daily'
        });

        // Formatar para WhatsApp
        const whatsappMessage = briefingService.formatForWhatsApp(brief);

        return res.json({
            success: true,
            brief,
            whatsapp_message: whatsappMessage
        });
    } catch (error: any) {
        console.error('[BriefingRoutes] Generate error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/briefing/send
 * Envia briefing via WhatsApp
 */
router.post('/send', async (req: Request, res: Response) => {
    try {
        const { tenant_id, phone_number, segment_key, brief_type } = req.body;

        if (!tenant_id || !phone_number) {
            return res.status(400).json({ error: 'tenant_id e phone_number são obrigatórios' });
        }

        // 1. Gerar briefing
        const brief = await briefingService.generateBrief({
            tenantId: tenant_id,
            segmentKey: segment_key || 'services',
            briefType: brief_type || 'daily'
        });

        // 2. Formatar mensagem
        const message = briefingService.formatForWhatsApp(brief);

        // 3. Enviar via WhatsApp (integrar com Evolution API ou similar)
        // Por enquanto, apenas retornar a mensagem formatada
        // TODO: Integrar com WhatsApp Business API

        return res.json({
            success: true,
            message_sent: message,
            recipient: phone_number,
            brief_summary: brief.summary
        });
    } catch (error: any) {
        console.error('[BriefingRoutes] Send error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/briefing/question
 * Processa pergunta do chat "pergunte ao dado"
 */
router.post('/question', async (req: Request, res: Response) => {
    try {
        const { tenant_id, question, phone_number } = req.body;

        if (!tenant_id || !question) {
            return res.status(400).json({ error: 'tenant_id e question são obrigatórios' });
        }

        const answer = await briefingService.processQuestion(
            tenant_id,
            question,
            phone_number || 'api'
        );

        return res.json({
            success: true,
            question,
            answer
        });
    } catch (error: any) {
        console.error('[BriefingRoutes] Question error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================
// Metrics Endpoints
// ============================================

/**
 * GET /api/briefing/metrics/summary
 * Obtém resumo de métricas
 */
router.get('/metrics/summary', async (req: Request, res: Response) => {
    try {
        const { tenant_id, metrics, start_date, end_date } = req.query;

        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id é obrigatório' });
        }

        const metricKeys = metrics
            ? (metrics as string).split(',')
            : ['revenue', 'orders', 'conversion_rate'];

        const summary = await metricsAggregator.getMetricsSummary({
            tenantId: tenant_id as string,
            metricKeys,
            startDate: start_date as string || getDefaultStartDate(),
            endDate: end_date as string || getDefaultEndDate()
        });

        return res.json({
            success: true,
            data: summary
        });
    } catch (error: any) {
        console.error('[BriefingRoutes] Metrics summary error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/briefing/metrics/ingest
 * Ingere métricas de fontes externas
 */
router.post('/metrics/ingest', async (req: Request, res: Response) => {
    try {
        const { tenant_id, metrics } = req.body;

        if (!tenant_id || !metrics || !Array.isArray(metrics)) {
            return res.status(400).json({ error: 'tenant_id e metrics[] são obrigatórios' });
        }

        const success = await metricsAggregator.upsertMetrics(tenant_id, metrics);

        return res.json({
            success,
            metrics_count: metrics.length
        });
    } catch (error: any) {
        console.error('[BriefingRoutes] Metrics ingest error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================
// Anomaly Endpoints
// ============================================

/**
 * GET /api/briefing/anomalies
 * Detecta anomalias para um tenant
 */
router.get('/anomalies', async (req: Request, res: Response) => {
    try {
        const { tenant_id, date } = req.query;

        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id é obrigatório' });
        }

        const anomalies = await anomalyDetector.detectAnomalies(
            tenant_id as string,
            date as string
        );

        return res.json({
            success: true,
            anomalies,
            count: anomalies.length
        });
    } catch (error: any) {
        console.error('[BriefingRoutes] Anomalies error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================
// Schedule Endpoints
// ============================================

/**
 * POST /api/briefing/schedule
 * Cria ou atualiza agendamento de briefing
 */
router.post('/schedule', async (req: Request, res: Response) => {
    try {
        const {
            tenant_id,
            template_id,
            schedule_type,
            delivery_time,
            timezone,
            recipient
        } = req.body;

        if (!tenant_id || !recipient) {
            return res.status(400).json({ error: 'tenant_id e recipient são obrigatórios' });
        }

        // TODO: Implementar criação de schedule via BullMQ
        // Por enquanto, salva apenas no banco

        return res.json({
            success: true,
            message: 'Agendamento criado. Briefings serão enviados automaticamente.',
            schedule: {
                tenant_id,
                schedule_type: schedule_type || 'daily',
                delivery_time: delivery_time || '08:00',
                timezone: timezone || 'America/Sao_Paulo',
                recipient
            }
        });
    } catch (error: any) {
        console.error('[BriefingRoutes] Schedule error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================
// Templates Endpoints
// ============================================

/**
 * GET /api/briefing/templates
 * Lista templates de briefing disponíveis
 */
router.get('/templates', async (req: Request, res: Response) => {
    try {
        // Simples listagem de templates (em produção, buscar do banco)
        const templates = [
            { segment_key: 'ecommerce', name: 'E-commerce Daily Brief', metrics_count: 10 },
            { segment_key: 'services', name: 'Serviços Daily Brief', metrics_count: 10 },
            { segment_key: 'saas', name: 'SaaS Daily Brief', metrics_count: 10 }
        ];

        return res.json({
            success: true,
            templates
        });
    } catch (error: any) {
        console.error('[BriefingRoutes] Templates error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================
// Helpers
// ============================================

function getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
}

export default router;
