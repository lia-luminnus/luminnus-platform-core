import { supabase } from '../config/supabase.js';
import { ToolService } from './toolService.js';

export interface AutomationRun {
    id: string;
    tenant_id: string;
    automation_id: string;
    status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
    input_payload: any;
    output_payload: any;
    initiated_by: 'system' | 'user' | 'lia' | 'webhook';
}

export class AutomationRunner {
    static async trigger(automationId: string, tenantId: string, payload: any = {}, initiatedBy: string = 'system') {
        // 1. Create run record
        const { data: run, error } = await supabase
            .from('automation_runs')
            .insert([{
                automation_id: automationId,
                tenant_id: tenantId,
                status: 'queued',
                input_payload: payload,
                initiated_by: initiatedBy
            }])
            .select()
            .single();

        if (error) {
            console.error('[AutomationRunner] Error creating run:', error);
            return;
        }

        // 2. Start execution (async)
        this.execute(run.id, tenantId).catch(err => {
            console.error(`[AutomationRunner] Critical failure in run ${run.id}:`, err);
        });

        return run;
    }

    static async execute(runId: string, tenantId: string) {
        console.log(`🚀 [AutomationRunner] Starting run ${runId}`);
        const startTime = Date.now();

        try {
            // Update status to running
            await supabase.from('automation_runs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runId);

            // Fetch run and automation
            const { data: run } = await supabase.from('automation_runs').select('*, automations(*)').eq('id', runId).single();
            const automation = run.automations;

            if (!automation || !automation.is_enabled) {
                throw new Error('Automation not found or disabled');
            }

            const flow = automation.flow_definition || [];
            let currentPayload = run.input_payload || {};

            // Sort nodes by order if applicable, or follow edges
            // MVP: Simple sequential execution of nodes in flow_definition array
            for (const node of flow) {
                await this.log(runId, tenantId, 'info', `Executing node: ${node.type} (${node.id})`, node.data);

                try {
                    const result = await this.executeNode(node, currentPayload, tenantId);
                    currentPayload = { ...currentPayload, ...result };
                } catch (nodeError: any) {
                    await this.log(runId, tenantId, 'error', `Node ${node.id} failed: ${nodeError.message}`, { error: nodeError.stack });
                    throw nodeError;
                }
            }

            // Finish success
            const duration = Date.now() - startTime;
            await supabase.from('automation_runs').update({
                status: 'success',
                finished_at: new Date().toISOString(),
                duration_ms: duration,
                output_payload: currentPayload
            }).eq('id', runId);

            // Update automation last run
            await supabase.from('automations').update({ last_run_at: new Date().toISOString() }).eq('id', automation.id);

            console.log(`✅ [AutomationRunner] Run ${runId} finished successfully in ${duration}ms`);

        } catch (err: any) {
            const duration = Date.now() - startTime;
            console.error(`❌ [AutomationRunner] Run ${runId} failed:`, err.message);

            await supabase.from('automation_runs').update({
                status: 'failed',
                finished_at: new Date().toISOString(),
                duration_ms: duration,
                error_message: err.message
            }).eq('id', runId);
            
            await supabase.from('automations').update({ status: 'error' }).eq('id', runId);
        }
    }

    private static async executeNode(node: any, payload: any, tenantId: string) {
        switch (node.type) {
            case 'log':
                console.log(`[Flow Log] ${node.data?.message || 'Empty log'}`);
                return { log: 'ok' };

            case 'wait':
                const ms = (node.data?.seconds || 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, ms));
                return { waited: ms };

            case 'http_request':
                const resp = await fetch(node.data.url, {
                    method: node.data.method || 'GET',
                    headers: { 'Content-Type': 'application/json', ...node.data.headers },
                    body: node.data.method !== 'GET' ? JSON.stringify(node.data.body || payload) : undefined
                });
                if (!resp.ok) throw new Error(`HTTP Error: ${resp.status} ${resp.statusText}`);
                return await resp.json();

            case 'whatsapp_send':
                // Integration with existing WhatsAppService
                // Placeholder: call tool service
                return await ToolService.execute('whatsappSendMessage', {
                    to: node.data.to || payload.phone,
                    message: node.data.message
                }, { tenantId, userId: 'system' } as any);

            case 'crm_update':
                return await ToolService.execute('crmUpdateLead', node.data, { tenantId, userId: 'system' } as any);

            case 'lia_task':
                // Logic for LIA intelligence
                return { lia_insight: "LIA processed this step." };

            default:
                console.warn(`[AutomationRunner] Unknown node type: ${node.type}`);
                return {};
        }
    }

    private static async log(runId: string, tenantId: string, level: string, message: string, data: any = {}) {
        await supabase.from('automation_run_logs').insert([{
            run_id: runId,
            tenant_id: tenantId,
            level,
            message,
            data
        }]);
    }
}
