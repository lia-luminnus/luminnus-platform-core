import { supabase } from '../config/supabase.js';
import { ToolService } from './toolService.js';
import { OpenAIService } from './openAIService.js';
import { getContext } from './memoryService.js';
import { WhatsAppService } from './whatsappService.js';

export interface ExecutionContext {
    vars: Record<string, any>;
    system: Record<string, any>;
    context: Record<string, any>;
    metadata: Record<string, any>;
}

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

            const flow = automation.flow_definition || { nodes: [], edges: [] };

            // Standardized Execution Context
            const execContext: ExecutionContext = {
                vars: run.input_payload?.vars || {},
                system: {
                    tenantId,
                    automationId: automation.id,
                    runId,
                    now: new Date().toISOString()
                },
                context: run.input_payload?.context || {},
                metadata: {
                    steps: 0,
                    start_time: startTime
                }
            };

            // Support both old array-style and new graph-style
            const nodes = Array.isArray(flow) ? flow : (flow.nodes || []);
            const edges = Array.isArray(flow) ? [] : (flow.edges || []);

            // Start node finding
            let currentNode = nodes.find((n: any) => n.id === 'start') || nodes[0];

            while (currentNode) {
                execContext.metadata.steps++;
                await this.log(runId, tenantId, 'info', `Executing node: ${currentNode.type} (${currentNode.id})`, currentNode.data);

                try {
                    const result = await this.executeNode(currentNode, execContext, tenantId);

                    // Update vars with node result
                    if (result && typeof result === 'object') {
                        execContext.vars = { ...execContext.vars, ...result };
                    }

                    // Find next node
                    if (currentNode.type === 'decide') {
                        // Decide node logic: result is expected to be the label of the edge to follow
                        const edge = edges.find((e: any) => e.source === currentNode.id && e.label === result);
                        currentNode = edge ? nodes.find((n: any) => n.id === edge.target) : null;
                    } else {
                        // Linear node: follow 'next' edge or next in array (compat)
                        const edge = edges.find((e: any) => e.source === currentNode.id);
                        if (edge) {
                            currentNode = nodes.find((n: any) => n.id === edge.target);
                        } else if (Array.isArray(flow)) {
                            const index = nodes.indexOf(currentNode);
                            currentNode = nodes[index + 1];
                        } else {
                            currentNode = null;
                        }
                    }
                } catch (nodeError: any) {
                    await this.log(runId, tenantId, 'error', `Node ${currentNode.id} failed: ${nodeError.message}`, { error: nodeError.stack });
                    throw nodeError;
                }
            }

            // Finish success
            const duration = Date.now() - startTime;
            await supabase.from('automation_runs').update({
                status: 'success',
                finished_at: new Date().toISOString(),
                duration_ms: duration,
                output_payload: execContext.vars
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

    private static async executeNode(node: any, execContext: ExecutionContext, tenantId: string) {
        const payload = { ...execContext.vars, ...execContext.context };

        switch (node.type) {
            case 'start':
                return {};

            case 'log':
                console.log(`[Flow Log] ${node.data?.message || 'Empty log'}`);
                return { log: 'ok' };

            case 'wait':
                const ms = (node.data?.seconds || 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, ms));
                return { waited: ms };

            case 'decide':
                // logic to evaluate conditions
                if (node.data?.conditions) {
                    for (const condition of node.data.conditions) {
                        // Simple equality check for now
                        const val = payload[condition.variable];
                        if (val === condition.value) {
                            return condition.label;
                        }
                    }
                    return node.data.default_label || 'default';
                }
                return 'next';

            case 'http_request':
                const resp = await fetch(node.data.url, {
                    method: node.data.method || 'GET',
                    headers: { 'Content-Type': 'application/json', ...node.data.headers },
                    body: node.data.method !== 'GET' ? JSON.stringify(node.data.body || payload) : undefined
                });
                if (!resp.ok) throw new Error(`HTTP Error: ${resp.status} ${resp.statusText}`);
                return await resp.json();

            case 'whatsapp_send':
                return await ToolService.execute('whatsappSendMessage', {
                    to: node.data.to || payload.phone,
                    message: node.data.message
                }, { tenantId, userId: 'system' } as any);

            case 'whatsapp_interactive':
                return await WhatsAppService.sendInteractiveMessage(tenantId, node.data.to || payload.phone, node.data.interactive);

            case 'crm_update':
                return await ToolService.execute('crmUpdateLead', node.data, { tenantId, userId: 'system' } as any);

            case 'agent':
                const prompt = node.data?.prompt || "Responda como LIA assistants.";
                const model = node.data?.model || 'gpt-4o-mini';

                // Get memory context if conversation_id is available
                let history: any[] = [];
                if (execContext.context.conversationId) {
                    const memContext = await getContext(execContext.context.conversationId, tenantId, payload.message || '');
                    history = memContext.history;
                }

                const response = await OpenAIService.chat(
                    prompt,
                    history,
                    model,
                    node.data?.tools_enabled ? ToolService.getTools() : []
                );

                if (response.function_call) {
                    const toolResult = await ToolService.execute(
                        response.function_call.name,
                        JSON.parse(response.function_call.arguments),
                        { tenantId, userId: 'system' } as any
                    );
                    return {
                        agent_response: response.text,
                        tool_result: toolResult,
                        last_action: response.function_call.name
                    };
                }

                return { agent_response: response.text };

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
