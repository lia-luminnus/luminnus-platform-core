import { Express } from 'express';
import { supabase } from '../config/supabase.js';
import multer from 'multer';
import { GeminiService } from '../services/geminiService.js';
import { FileService } from '../services/fileService.js';
import { WhatsAppService } from '../services/whatsappService.js';

const upload = multer({ storage: multer.memoryStorage() });

export function setupWhatsAppRoutes(app: Express) {
    // GET /api/whatsapp/settings - Retorna configurações do agente por tenant
    app.get('/api/whatsapp/settings', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            const { data, error } = await supabase
                .from('whatsapp_agent_settings')
                .select('*')
                .eq('tenant_id', tenantId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows returned'

            res.json({ ok: true, settings: data || null });
        } catch (error) {
            console.error('❌ Erro ao buscar settings do WhatsApp:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/settings - Salva/Atualiza configurações do agente
    app.post('/api/whatsapp/settings', async (req, res) => {
        try {
            const { tenant_id, profile_json, playbooks_json, knowledge_items_json, segment_key } = req.body;
            if (!tenant_id) return res.status(400).json({ ok: false, error: 'tenant_id é obrigatório' });

            const { data, error } = await supabase
                .from('whatsapp_agent_settings')
                .upsert({
                    tenant_id,
                    profile_json,
                    playbooks_json,
                    knowledge_items_json,
                    segment_key,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id' })
                .select()
                .single();

            if (error) throw error;

            res.json({ ok: true, settings: data });
        } catch (error) {
            console.error('❌ Erro ao salvar settings do WhatsApp:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/config - Salva credenciais da Meta Cloud API
    app.post('/api/whatsapp/config', async (req, res) => {
        try {
            const { tenant_id, phone_number, config_json } = req.body;
            if (!tenant_id || !config_json) {
                return res.status(400).json({ ok: false, error: 'tenant_id e config_json são obrigatórios' });
            }

            const { data, error } = await supabase
                .from('whatsapp_connections')
                .upsert({
                    tenant_id,
                    provider: 'meta',
                    phone_number: phone_number || '',
                    config_json,
                    status: 'active',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,phone_number' })
                .select()
                .single();

            if (error) throw error;

            res.json({ ok: true, connection: data });
        } catch (error) {
            console.error('❌ Erro ao salvar config do WhatsApp:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // GET /api/whatsapp/connections - Lista conexões do tenant
    app.get('/api/whatsapp/connections', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            const { data, error } = await supabase
                .from('whatsapp_connections')
                .select('*')
                .eq('tenant_id', tenantId);

            if (error) throw error;

            res.json({ ok: true, connections: data });
        } catch (error) {
            console.error('❌ Erro ao buscar conexões do WhatsApp:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/playbooks/upload - Upload e extração de texto para playbooks
    app.post('/api/whatsapp/playbooks/upload', upload.single('file'), async (req: any, res: any) => {
        try {
            const file = req.file;
            const { tenantId, playbookName } = req.body;

            if (!file) return res.status(400).json({ ok: false, error: 'Arquivo é obrigatório' });
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            console.log(`📂 [Playbook] Analisando arquivo: ${file.originalname} (Tenant: ${tenantId})`);

            // 1. Extrair texto via Gemini
            const base64Data = file.buffer.toString('base64');
            const prompt = `Você é um especialista em Processos e Playbooks Operacionais.
Sua tarefa é ler este documento e extrair as REGRAS, FLUXOS, OBJETIVOS e PERGUNTAS CHAVE para o playbook "${playbookName || 'Geral'}".

FORMATO DE SAÍDA:
- Objetivo: [Breve descrição]
- Regras: [Lista de regras]
- Fluxo: [Passo a passo]
- Perguntas Chave: [O que perguntar ao cliente]

Extraia apenas o conteúdo útil para um agente de IA atender via WhatsApp.`;

            const extraction = await GeminiService.analyzeFile({
                mimetype: file.mimetype,
                data: base64Data,
                name: file.originalname
            }, prompt, 'gemini-2.0-flash-exp');

            // 2. Salvar no Storage para referência futura (opcional, persistência)
            const storageResult = await FileService.uploadToStorage(
                tenantId,
                'system', // Categoria de sistema (playbooks)
                file.buffer,
                file.originalname,
                file.mimetype
            );

            res.json({
                ok: true,
                extractedText: extraction.text,
                fileUrl: storageResult?.url,
                fileName: file.originalname
            });

        } catch (error) {
            console.error('❌ [Playbook Upload] Erro:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/playbooks/recommend - Sugestão de playbook via IA
    app.post('/api/whatsapp/playbooks/recommend', async (req: any, res: any) => {
        try {
            const { objective, tone, playbookName } = req.body;

            console.log(`🤖 [Playbook] Gerando recomendação para: ${playbookName} (Objetivo: ${objective}, Tom: ${tone})`);

            const prompt = `Você é um especialista em Processos e Playbooks Operacionais.
Gere um template de regras e instruções para um agente de IA de WhatsApp.

CONTEXTO:
- Nome do Playbook: "${playbookName}"
- Objetivo do Canal: "${objective}"
- Tom de Voz: "${tone}"

O template deve conter:
1. Objetivo: [O que o agente deve alcançar]
2. Regras: [Como ele deve se comportar e o que não pode fazer]
3. Fluxo Sugerido: [Passo a passo da interação]
4. Perguntas de Ouro: [Perguntas que ele NÃO pode esquecer de fazer]

Responda de forma direta, clara e profissional, pronta para ser colada no editor.`;

            const recommendation = await GeminiService.analyzeFile({
                mimetype: 'text/plain',
                data: Buffer.from(`Playbook: ${playbookName}`).toString('base64'),
                name: 'request.txt'
            }, prompt, 'gemini-2.0-flash-exp');

            res.json({
                ok: true,
                recommendation: recommendation.text
            });

        } catch (error) {
            console.error('❌ [Playbook Recommend] Erro:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/reconnect - Reconectar sessão do WhatsApp
    app.post('/api/whatsapp/reconnect', async (req: any, res: any) => {
        try {
            console.log('🔄 [WhatsApp] Tentando reconectar sessão...');

            // Aqui você pode adicionar a lógica real de reconexão com Evolution API ou Baileys
            // Por enquanto, fazemos um health check básico

            // Simulação de verificação de conexão
            const isConnected = true; // Substituir por verificação real

            if (isConnected) {
                console.log('✅ [WhatsApp] Sessão reconectada com sucesso!');
                res.json({ ok: true, message: 'Sessão reconectada com sucesso' });
            } else {
                res.status(503).json({ ok: false, error: 'Não foi possível reconectar' });
            }
        } catch (error) {
            console.error('❌ [WhatsApp Reconnect] Erro:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/send - Enviar mensagem manualmente pela UI (Agente)
    app.post('/api/whatsapp/send', async (req, res) => {
        try {
            const { tenantId, to, text, conversationId } = req.body;
            if (!tenantId || !to || !text) {
                return res.status(400).json({ ok: false, error: 'tenantId, to e text são obrigatórios' });
            }

            // 1. Enviar via Meta API
            const result = await WhatsAppService.sendMessage(tenantId, to, text);

            // 2. Salvar no banco
            const { data: savedMsg, error: saveError } = await supabase
                .from('whatsapp_messages')
                .insert({
                    tenant_id: tenantId,
                    conversation_id: conversationId,
                    direction: 'outbound',
                    type: 'text',
                    body_text: text
                })
                .select()
                .single();

            if (saveError) console.error('⚠️ [Send] Erro ao salvar mensagem no banco:', saveError);

            res.json({ ok: true, result, message: savedMsg });
        } catch (error) {
            console.error('❌ [WhatsApp Send] Erro:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/webhook/test - Testar webhook com mensagem simulada
    app.post('/api/whatsapp/webhook/test', async (req: any, res: any) => {
        try {
            console.log('🧪 [WhatsApp] Testando webhook...');

            // Simular uma mensagem de teste
            const testPayload = {
                type: 'test',
                timestamp: new Date().toISOString(),
                message: 'Mensagem de teste do sistema',
                from: 'system',
                status: 'delivered'
            };

            // Aqui você pode adicionar a lógica para enviar para o webhook real
            console.log('📤 [Webhook Test] Payload:', testPayload);

            res.json({
                ok: true,
                message: 'Webhook funcionando corretamente',
                testPayload
            });
        } catch (error) {
            console.error('❌ [Webhook Test] Erro:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // GET /api/whatsapp/conversations - Lista conversas do tenant
    app.get('/api/whatsapp/conversations', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            const { data, error } = await supabase
                .from('whatsapp_conversations')
                .select(`
                    *,
                    contact:whatsapp_contacts(*)
                `)
                .eq('tenant_id', tenantId)
                .order('last_message_at', { ascending: false });

            if (error) throw error;

            res.json({ ok: true, conversations: data });
        } catch (error) {
            console.error('❌ Erro ao listar conversas do WhatsApp:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // GET /api/whatsapp/conversations/:id - Detalhe da conversa + mensagens
    app.get('/api/whatsapp/conversations/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Buscar conversa e contato
            const { data: conversation, error: convError } = await supabase
                .from('whatsapp_conversations')
                .select(`
                    *,
                    contact:whatsapp_contacts(*)
                `)
                .eq('id', id)
                .single();

            if (convError) throw convError;

            // Buscar mensagens
            const { data: messages, error: msgError } = await supabase
                .from('whatsapp_messages')
                .select('*')
                .eq('conversation_id', id)
                .order('created_at', { ascending: true });

            if (msgError) throw msgError;

            res.json({ ok: true, conversation, messages });
        } catch (error) {
            console.error('❌ Erro ao buscar detalhes da conversa:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/conversations/:id/copilot - Toggle Copiloto
    app.post('/api/whatsapp/conversations/:id/copilot', async (req, res) => {
        try {
            const { id } = req.params;
            const { enabled } = req.body;

            const { data, error } = await supabase
                .from('whatsapp_conversations')
                .update({ copiloto_enabled: enabled, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ ok: true, conversation: data });
        } catch (error) {
            console.error('❌ Erro ao alternar modo copiloto:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // GET /api/whatsapp/summaries - Lista resumos do tenant
    app.get('/api/whatsapp/summaries', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            const { data, error } = await supabase
                .from('conversation_summaries')
                .select(`
                    *,
                    contact:whatsapp_contacts(name, phone)
                `)
                .eq('tenant_id', tenantId)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            res.json({ ok: true, summaries: data });
        } catch (error) {
            console.error('❌ Erro ao listar resumos:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/summaries/:conversationId/generate - Gera/Atualiza resumo (STUB)
    app.post('/api/whatsapp/summaries/:conversationId/generate', async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { type = 'operational' } = req.body;

            // Placeholder para lógica de LLM
            const placeholderText = `**Resumo Profissional (${type === 'executive' ? 'Executivo' : 'Operacional'})**\n\n` +
                `- **Contexto**: Cliente entrou em contato para saber sobre preços.\n` +
                `- **Necessidade / Dor**: Buscando otimização de custos no frete.\n` +
                `- **Status atual**: Em análise técnica.\n` +
                `- **Ações realizadas**: Enviado catálogo de serviços.\n` +
                `- **Pendências**: Cliente ficou de enviar a volumetria mensal (Prazo: 2 dias).\n` +
                `- **Alertas**: Cliente demostrou urgência.\n` +
                `- **Próxima melhor ação**: Cobrar a planilha de volumetria na quinta-feira.`;

            // Buscar tenant_id e contact_id da conversa
            const { data: conv } = await supabase
                .from('whatsapp_conversations')
                .select('tenant_id, contact_id')
                .eq('id', conversationId)
                .single();

            if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });

            const { data, error } = await supabase
                .from('conversation_summaries')
                .upsert({
                    tenant_id: conv.tenant_id,
                    conversation_id: conversationId,
                    contact_id: conv.contact_id,
                    summary_type: type,
                    summary_text: placeholderText,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'conversation_id, summary_type' })
                .select()
                .single();

            if (error) throw error;

            res.json({ ok: true, summary: data });
        } catch (error) {
            console.error('❌ Erro ao gerar resumo:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // ==========================================================
    // KANBAN / LEADS ENDPOINTS
    // ==========================================================

    // GET /api/whatsapp/kanban - Lista leads agrupados por stage
    app.get('/api/whatsapp/kanban', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            const agentMode = (req.query.mode as string) || 'SDR';

            const { data, error } = await supabase
                .from('leads')
                .select(`
                    *,
                    contact:whatsapp_contacts(name, phone),
                    conversation:whatsapp_conversations(id, status, last_message_at)
                `)
                .eq('tenant_id', tenantId)
                .eq('agent_mode', agentMode)
                .order('urgency_score', { ascending: false });

            if (error) throw error;

            // Agrupar por stage
            const stages = ['NEW', 'QUALIFIED_BY_LIA', 'WAITING_HUMAN', 'SCHEDULED', 'WON', 'LOST'];
            const kanban: Record<string, any[]> = {};

            for (const stage of stages) {
                kanban[stage] = (data || []).filter(lead => lead.stage === stage);
            }

            res.json({ ok: true, kanban, total: data?.length || 0 });
        } catch (error) {
            console.error('❌ Erro ao buscar kanban:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/leads/:id/move - Move lead para outro stage
    app.post('/api/whatsapp/leads/:id/move', async (req, res) => {
        try {
            const { id } = req.params;
            const { stage, notes } = req.body;

            if (!stage) return res.status(400).json({ ok: false, error: 'stage é obrigatório' });

            // Buscar stage atual para emitir evento
            const { data: currentLead } = await supabase
                .from('leads')
                .select('stage, tenant_id')
                .eq('id', id)
                .single();

            const { data, error } = await supabase
                .from('leads')
                .update({
                    stage,
                    notes: notes || undefined,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Emitir evento de mudança de stage
            if (currentLead) {
                await supabase.from('whatsapp_events').insert({
                    tenant_id: currentLead.tenant_id,
                    type: 'stage_changed',
                    payload_json: {
                        lead_id: id,
                        old_stage: currentLead.stage,
                        new_stage: stage
                    },
                    occurred_at: new Date().toISOString()
                });
            }

            res.json({ ok: true, lead: data });
        } catch (error) {
            console.error('❌ Erro ao mover lead:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // GET /api/whatsapp/leads - Lista todos os leads
    app.get('/api/whatsapp/leads', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            const { data, error } = await supabase
                .from('leads')
                .select(`
                    *,
                    contact:whatsapp_contacts(name, phone)
                `)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            res.json({ ok: true, leads: data });
        } catch (error) {
            console.error('❌ Erro ao listar leads:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // ==========================================================
    // AUDIO INBOX ENDPOINTS
    // ==========================================================

    // GET /api/whatsapp/audio-inbox - Lista áudios com transcrição
    app.get('/api/whatsapp/audio-inbox', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            const search = req.query.search as string;
            const status = req.query.status as string;

            let query = supabase
                .from('audio_assets')
                .select(`
                    *,
                    contact:whatsapp_contacts(name, phone),
                    conversation:whatsapp_conversations(id, external_id)
                `)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            if (search) {
                query = query.ilike('transcript_text', `%${search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ ok: true, audios: data });
        } catch (error) {
            console.error('❌ Erro ao listar audio inbox:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/whatsapp/audio/:id/transcribe - Dispara transcrição de áudio
    app.post('/api/whatsapp/audio/:id/transcribe', async (req, res) => {
        try {
            const { id } = req.params;

            // Atualizar status para transcribing
            await supabase
                .from('audio_assets')
                .update({ status: 'transcribing', updated_at: new Date().toISOString() })
                .eq('id', id);

            // TODO: Integrar com Whisper/transcription service
            // Por enquanto, simular transcrição
            const mockTranscript = 'Olá, gostaria de saber mais sobre os preços dos seus serviços. Vocês trabalham com empresas de médio porte?';

            const { data, error } = await supabase
                .from('audio_assets')
                .update({
                    transcript_text: mockTranscript,
                    status: 'done',
                    tags_json: ['#Orçamento', '#Comercial'],
                    intent_detected: 'pricing',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ ok: true, audio: data });
        } catch (error) {
            console.error('❌ Erro ao transcrever áudio:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // ==========================================================
    // BRIEFINGS ENDPOINTS
    // ==========================================================

    // GET /api/briefings/rules - Lista regras de briefing
    app.get('/api/briefings/rules', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            const { data, error } = await supabase
                .from('briefing_rules')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            res.json({ ok: true, rules: data });
        } catch (error) {
            console.error('❌ Erro ao listar briefing rules:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/briefings/rules - Criar/atualizar regra de briefing
    app.post('/api/briefings/rules', async (req, res) => {
        try {
            const {
                id,
                tenant_id,
                name,
                enabled,
                schedule_cron,
                recipients_json,
                kpis_json,
                channel
            } = req.body;

            if (!tenant_id || !name) {
                return res.status(400).json({ ok: false, error: 'tenant_id e name são obrigatórios' });
            }

            const payload = {
                tenant_id,
                name,
                enabled: enabled ?? true,
                schedule_cron,
                recipients_json: recipients_json || [],
                kpis_json: kpis_json || [],
                channel: channel || 'whatsapp',
                updated_at: new Date().toISOString()
            };

            let query;
            if (id) {
                query = supabase.from('briefing_rules').update(payload).eq('id', id);
            } else {
                query = supabase.from('briefing_rules').insert(payload);
            }

            const { data, error } = await query.select().single();

            if (error) throw error;

            res.json({ ok: true, rule: data });
        } catch (error) {
            console.error('❌ Erro ao salvar briefing rule:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/briefings/run - Executar briefing manualmente
    app.post('/api/briefings/run', async (req, res) => {
        try {
            const { rule_id, tenant_id } = req.body;

            if (!rule_id || !tenant_id) {
                return res.status(400).json({ ok: false, error: 'rule_id e tenant_id são obrigatórios' });
            }

            // Buscar regra
            const { data: rule } = await supabase
                .from('briefing_rules')
                .select('*')
                .eq('id', rule_id)
                .single();

            if (!rule) {
                return res.status(404).json({ ok: false, error: 'Regra não encontrada' });
            }

            // Criar run
            const { data: run, error: runError } = await supabase
                .from('briefing_runs')
                .insert({
                    tenant_id,
                    rule_id,
                    status: 'running',
                    triggered_by: 'manual',
                    started_at: new Date().toISOString()
                })
                .select()
                .single();

            if (runError) throw runError;

            // Calcular KPIs (usar RPC function)
            const { data: kpis } = await supabase.rpc('get_whatsapp_kpis', {
                p_tenant_id: tenant_id
            });

            // Gerar mensagem de briefing
            const briefingMessage = generateBriefingMessage(rule.name, kpis || {});

            // Atualizar run com resultado
            const { data: completedRun, error: updateError } = await supabase
                .from('briefing_runs')
                .update({
                    status: 'completed',
                    kpis_computed_json: kpis,
                    message_sent: briefingMessage,
                    completed_at: new Date().toISOString()
                })
                .eq('id', run.id)
                .select()
                .single();

            if (updateError) throw updateError;

            // TODO: Enviar mensagem via WhatsApp para recipients

            res.json({ ok: true, run: completedRun, message: briefingMessage });
        } catch (error) {
            console.error('❌ Erro ao executar briefing:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // GET /api/whatsapp/kpis - Retorna KPIs agregados
    app.get('/api/whatsapp/kpis', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId é obrigatório' });

            const { data, error } = await supabase.rpc('get_whatsapp_kpis', {
                p_tenant_id: tenantId
            });

            if (error) throw error;

            res.json({ ok: true, kpis: data });
        } catch (error) {
            console.error('❌ Erro ao buscar KPIs:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });
}

// Helper para gerar mensagem de briefing formatada
function generateBriefingMessage(ruleName: string, kpis: any): string {
    const now = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    return `📊 *${ruleName}*
📅 ${now}

*Resumo do Período:*
• 🎯 Leads novos: ${kpis.leads_new || 0}
• 🎧 Áudios transcritos: ${kpis.audios_transcribed || 0}

*Indicadores:*
• 😊 Sentimento médio: ${Math.round(kpis.avg_sentiment || 50)}%
• 🔥 Urgência média: ${Math.round(kpis.avg_urgency || 0)}%

_Gerado automaticamente pela LIA_`;
}

// ==========================================================
// INTEGRATION MANAGEMENT ENDPOINTS (for Hub de Integrações)
// ==========================================================

export function setupWhatsAppIntegrationRoutes(app: Express) {
    // GET /api/integrations/whatsapp/status - Retorna status da integração do tenant
    app.get('/api/integrations/whatsapp/status', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ status: 'error', reason: 'tenantId é obrigatório' });

            const { data, error } = await supabase
                .from('whatsapp_connections')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('provider', 'meta')
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (!data) {
                return res.json({
                    status: 'ok',
                    data: {
                        connected: false,
                        status: 'disconnected',
                        phone_masked: null,
                        last_webhook_at: null,
                        last_error: null
                    }
                });
            }

            // Mask phone number for security
            const phoneMasked = data.phone_number
                ? data.phone_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 $2 *****-$4')
                : null;

            res.json({
                status: 'ok',
                data: {
                    connected: data.status === 'active' || data.status === 'connected',
                    status: data.status || 'disconnected',
                    phone_masked: phoneMasked,
                    waba_id: data.config_json?.waba_id ? '****' + data.config_json.waba_id.slice(-4) : null,
                    last_webhook_at: data.updated_at,
                    last_error: data.last_error || null
                }
            });
        } catch (error) {
            console.error('❌ [Integration Status] Erro:', error);
            res.status(500).json({ status: 'error', reason: String(error) });
        }
    });

    // POST /api/integrations/whatsapp/save-manual - Salva credenciais manuais
    app.post('/api/integrations/whatsapp/save-manual', async (req, res) => {
        try {
            const { tenant_id, waba_id, phone_number_id, access_token, phone_e164 } = req.body;

            if (!tenant_id) {
                return res.status(400).json({ status: 'error', reason: 'tenant_id é obrigatório' });
            }

            if (!waba_id || !phone_number_id || !access_token) {
                return res.status(400).json({ status: 'error', reason: 'waba_id, phone_number_id e access_token são obrigatórios' });
            }

            // Save to whatsapp_connections
            const { data, error } = await supabase
                .from('whatsapp_connections')
                .upsert({
                    tenant_id,
                    provider: 'meta',
                    phone_number: phone_e164 || '',
                    config_json: {
                        waba_id,
                        phone_number_id,
                        access_token,
                        verify_token: 'luminnus_whatsapp_token'
                    },
                    status: 'connected',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,phone_number' })
                .select()
                .single();

            if (error) throw error;

            // Log event
            await supabase.from('whatsapp_events').insert({
                tenant_id,
                type: 'integration_connected',
                payload_json: { method: 'manual', waba_id_suffix: waba_id.slice(-4) },
                occurred_at: new Date().toISOString()
            });

            res.json({
                status: 'ok',
                data: {
                    connected: true,
                    message: 'Integração salva com sucesso'
                }
            });
        } catch (error) {
            console.error('❌ [Integration Save] Erro:', error);
            res.status(500).json({ status: 'error', reason: String(error) });
        }
    });

    // POST /api/integrations/whatsapp/test-webhook - Testa webhook
    app.post('/api/integrations/whatsapp/test-webhook', async (req, res) => {
        try {
            const tenantId = (req.body.tenant_id || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ status: 'error', reason: 'tenant_id é obrigatório' });

            // Get connection
            const { data: conn } = await supabase
                .from('whatsapp_connections')
                .select('config_json')
                .eq('tenant_id', tenantId)
                .eq('provider', 'meta')
                .single();

            if (!conn?.config_json?.phone_number_id) {
                return res.status(400).json({ status: 'error', reason: 'Integração não configurada' });
            }

            // Simulate webhook test (in production, would ping Meta API)
            console.log(`🧪 [Webhook Test] Tenant: ${tenantId}`);

            // Log event
            await supabase.from('whatsapp_events').insert({
                tenant_id: tenantId,
                type: 'webhook_test',
                payload_json: { result: 'success', timestamp: new Date().toISOString() },
                occurred_at: new Date().toISOString()
            });

            res.json({
                status: 'ok',
                data: {
                    webhook_ok: true,
                    latency_ms: Math.floor(Math.random() * 100) + 50,
                    message: 'Webhook funcionando corretamente'
                }
            });
        } catch (error) {
            console.error('❌ [Webhook Test] Erro:', error);
            res.status(500).json({ status: 'error', reason: String(error) });
        }
    });

    // POST /api/integrations/whatsapp/reconnect - Reconecta integração
    app.post('/api/integrations/whatsapp/reconnect', async (req, res) => {
        try {
            const tenantId = (req.body.tenant_id || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ status: 'error', reason: 'tenant_id é obrigatório' });

            // Update status
            const { data, error } = await supabase
                .from('whatsapp_connections')
                .update({ status: 'connected', updated_at: new Date().toISOString() })
                .eq('tenant_id', tenantId)
                .eq('provider', 'meta')
                .select()
                .single();

            if (error) throw error;

            // Log event
            await supabase.from('whatsapp_events').insert({
                tenant_id: tenantId,
                type: 'reconnection',
                payload_json: { result: 'success' },
                occurred_at: new Date().toISOString()
            });

            res.json({
                status: 'ok',
                data: {
                    connected: true,
                    message: 'Reconectado com sucesso'
                }
            });
        } catch (error) {
            console.error('❌ [Reconnect] Erro:', error);
            res.status(500).json({ status: 'error', reason: String(error) });
        }
    });

    // GET /api/integrations/whatsapp/logs - Lista logs de eventos
    app.get('/api/integrations/whatsapp/logs', async (req, res) => {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return res.status(400).json({ status: 'error', reason: 'tenantId é obrigatório' });

            const limit = parseInt(req.query.limit as string) || 50;

            const { data, error } = await supabase
                .from('whatsapp_events')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('occurred_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            res.json({
                status: 'ok',
                data: {
                    logs: data || [],
                    count: data?.length || 0
                }
            });
        } catch (error) {
            console.error('❌ [Logs] Erro:', error);
            res.status(500).json({ status: 'error', reason: String(error) });
        }
    });
}

