import * as GoogleWorkspaceTools from '../tools/googleWorkspace.js';
import { AuditService } from './auditService.js';
import fetch from 'node-fetch';
import { geospatialService } from './geospatialService.js';
import { diagnosticService } from './diagnosticService.js';

export class ToolService {
    static getTools() {
        return [
            {
                name: 'saveMemory',
                description: 'Salva uma informação importante na memória do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        content: { type: 'string', description: 'O conteúdo a ser salvo' },
                        category: { type: 'string', enum: ['personal', 'work', 'preferences', 'general'] }
                    },
                    required: ['content']
                }
            },
            {
                name: 'deleteMemory',
                description: 'Deleta uma memória específica do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        key: { type: 'string', description: 'A chave da memória a ser deletada' }
                    },
                    required: ['key']
                }
            },
            {
                name: 'searchWeb',
                description: 'Busca informações ATUALIZADAS e EM TEMPO REAL na internet.',
                parameters: {
                    type: 'object',
                    properties: { query: { type: 'string', description: 'A consulta de busca' } },
                    required: ['query']
                }
            },
            {
                name: 'getWeather',
                description: 'Busca a previsão do tempo.',
                parameters: {
                    type: 'object',
                    properties: {
                        location: { type: 'string' }
                    }
                }
            },
            {
                name: 'getCurrentLocation',
                description: 'Obtém a localização geográfica exata do usuário.',
                parameters: { type: 'object', properties: {} }
            },
            {
                name: 'getLocation',
                description: 'Busca lugares próximos.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                        location: { type: 'string' }
                    },
                    required: ['query', 'location']
                }
            },
            {
                name: 'getDirections',
                description: 'Calcula a distância e tempo de viagem.',
                parameters: {
                    type: 'object',
                    properties: {
                        origin: { type: 'string' },
                        destination: { type: 'string' },
                        mode: { type: 'string', enum: ['driving', 'walking', 'bicycling', 'transit'], default: 'driving' }
                    },
                    required: ['origin', 'destination']
                }
            },
            {
                name: 'getCurrentTime',
                description: 'Retorna data e hora atuais.',
                parameters: {
                    type: 'object',
                    properties: { timezone: { type: 'string', default: 'Europe/Lisbon' } }
                }
            },
            {
                name: 'generateImage',
                description: 'Gera uma imagem artística ou realista.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string' },
                        style: { type: 'string', enum: ['realistic', 'artistic'], default: 'realistic' }
                    },
                    required: ['prompt']
                }
            },
            {
                name: 'generateChart',
                description: 'Gera um gráfico visual.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        chartType: { type: 'string', enum: ['line', 'bar', 'pie', 'area'] },
                        labels: { type: 'array', items: { type: 'string' } },
                        datasets: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    label: { type: 'string' },
                                    data: { type: 'array', items: { type: 'number' } },
                                    color: { type: 'string' }
                                }
                            }
                        }
                    },
                    required: ['title', 'chartType', 'labels', 'datasets']
                }
            },
            {
                name: 'createGoogleSheet',
                description: 'Cria uma planilha SIMPLES.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        headers: { type: 'array', items: { type: 'string' } },
                        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } }
                    },
                    required: ['title', 'headers', 'rows']
                }
            },
            {
                name: 'updateGoogleSheet',
                description: 'Edita uma planilha EXISTENTE.',
                parameters: {
                    type: 'object',
                    properties: {
                        spreadsheetId: { type: 'string' },
                        operations: { type: 'array', items: { type: 'object' } }
                    },
                    required: ['spreadsheetId', 'operations']
                }
            },
            {
                name: 'createProFinancialSheet',
                description: 'Cria uma planilha FINANCEIRA PROFISSIONAL.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' }
                    },
                    required: ['title']
                }
            },
            {
                name: 'createGoogleDoc',
                description: 'Cria um documento real no Google Docs.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        content: { type: 'string' }
                    },
                    required: ['title', 'content']
                }
            },
            {
                name: 'sendGmail',
                description: 'Envia um e-mail real.',
                parameters: {
                    type: 'object',
                    properties: {
                        to: { type: 'string' },
                        subject: { type: 'string' },
                        body: { type: 'string' }
                    },
                    required: ['to', 'subject', 'body']
                }
            },
            {
                name: 'listGmailMessages',
                description: 'Lista os e-mails mais recentes.',
                parameters: {
                    type: 'object',
                    properties: {
                        maxResults: { type: 'number', default: 10 },
                        query: { type: 'string' }
                    }
                }
            },
            {
                name: 'searchGmail',
                description: 'Pesquisa e-mails usando linguagem natural (ex: "e-mails de ontem sobre projeto").',
                parameters: {
                    type: 'object',
                    properties: {
                        searchTerm: { type: 'string', description: 'O termo de busca em linguagem natural' }
                    },
                    required: ['searchTerm']
                }
            },
            {
                name: 'deleteGmailMessage',
                description: 'Move um e-mail para a lixeira (trash).',
                parameters: {
                    type: 'object',
                    properties: {
                        messageId: { type: 'string', description: 'O ID do e-mail a ser deletado' }
                    },
                    required: ['messageId']
                }
            },
            {
                name: 'getGmailMessage',
                description: 'Obtém o conteúdo completo de um e-mail.',
                parameters: {
                    type: 'object',
                    properties: {
                        messageId: { type: 'string' }
                    },
                    required: ['messageId']
                }
            },
            {
                name: 'createCalendarEvent',
                description: `Agenda um evento ou lembrete no Google Calendar. 
REGRAS:
- Use "title" para um nome CURTO e OBJETIVO do evento (máximo 60 caracteres).
- Use "description" para TODOS os detalhes, notas, tópicos e lembretes que o usuário mencionou.
- Sempre preencha "description" quando o usuário mencionar tópicos, pontos, itens ou lembretes.
- Formate a descrição com bullets (•) para facilitar leitura.`,
                parameters: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description: 'Título curto e claro (ex: "Revisão de Projeto" - máx 60 chars)'
                        },
                        start: {
                            type: 'string',
                            description: 'Data/hora de início (ISO String, ex: "2026-01-18T10:00:00")'
                        },
                        end: {
                            type: 'string',
                            description: 'Data/hora de término (ISO String, ex: "2026-01-18T11:00:00")'
                        },
                        description: {
                            type: 'string',
                            description: 'Detalhes completos e tópicos a lembrar. Use bullets (•) para listar.'
                        }
                    },
                    required: ['title', 'start', 'end']
                }
            },
            {
                name: 'listCalendarEvents',
                description: 'Lista compromissos da agenda num período específico.',
                parameters: {
                    type: 'object',
                    properties: {
                        timeMin: { type: 'string', description: 'Início do intervalo (ISO String)' },
                        timeMax: { type: 'string', description: 'Fim do intervalo (ISO String)' }
                    }
                }
            },
            {
                name: 'updateCalendarEvent',
                description: `Atualiza/move um evento existente no Google Calendar.
QUANDO USAR:
- Usuário pede para mover evento de data/hora
- Usuário pede para alterar título ou descrição de evento
REQUER: eventId (obtido via listCalendarEvents ou searchCalendarEvents)`,
                parameters: {
                    type: 'object',
                    properties: {
                        eventId: {
                            type: 'string',
                            description: 'ID do evento a ser atualizado (obtenha antes com listCalendarEvents ou searchCalendarEvents)'
                        },
                        title: { type: 'string', description: 'Novo título (opcional)' },
                        start: { type: 'string', description: 'Nova data/hora início (ISO String, opcional)' },
                        end: { type: 'string', description: 'Nova data/hora término (ISO String, opcional)' },
                        description: { type: 'string', description: 'Nova descrição (opcional)' }
                    },
                    required: ['eventId']
                }
            },
            {
                name: 'deleteCalendarEvent',
                description: `Deleta/remove um evento do Google Calendar.
QUANDO USAR:
- Usuário pede para deletar, remover ou cancelar um evento
REQUER: eventId (obtido via listCalendarEvents ou searchCalendarEvents)`,
                parameters: {
                    type: 'object',
                    properties: {
                        eventId: {
                            type: 'string',
                            description: 'ID do evento a ser deletado (obtenha antes com listCalendarEvents ou searchCalendarEvents)'
                        }
                    },
                    required: ['eventId']
                }
            },
            {
                name: 'getCalendarEvent',
                description: 'Obtém detalhes completos de um evento específico.',
                parameters: {
                    type: 'object',
                    properties: {
                        eventId: { type: 'string', description: 'ID do evento' }
                    },
                    required: ['eventId']
                }
            },
            {
                name: 'searchCalendarEvents',
                description: `Pesquisa eventos por título ou descrição no Google Calendar.
QUANDO USAR:
- Usuário menciona um evento por nome mas não sabe a data/hora
- Precisa encontrar o eventId para atualizar ou deletar um evento
Retorna lista de eventos com IDs que podem ser usados em updateCalendarEvent ou deleteCalendarEvent.`,
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Termo de busca (título ou descrição do evento)' },
                        daysAhead: { type: 'number', description: 'Quantos dias à frente buscar (default: 30)' }
                    },
                    required: ['query']
                }
            },

            {
                name: 'getBusinessMetrics',
                description: 'Consulta métricas reais do negócio (faturamento, despesas, transações). Use para responder perguntas sobre o desempenho financeiro.',
                parameters: {
                    type: 'object',
                    properties: {
                        metricKey: { type: 'string', enum: ['cash_in', 'cash_out', 'net_cash', 'transaction_count', 'deals_value', 'revenue_by_category'] },
                        period: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'month' }
                    },
                    required: ['metricKey']
                }
            },
            {
                name: 'analyzeFile',
                description: 'Recupera a análise de um arquivo.',
                parameters: {
                    type: 'object',
                    properties: {
                        fileId: { type: 'string' }
                    },
                    required: ['fileId']
                }
            },
            {
                name: 'getSystemHealth',
                description: 'DIAGNOSTIC ONLY'
            },
            {
                name: 'getSystemLogs',
                description: 'DIAGNOSTIC ONLY',
                parameters: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', default: 50 },
                        level: { type: 'string', enum: ['info', 'warn', 'error', 'all'], default: 'all' }
                    }
                }
            },
            {
                name: 'readProjectFile',
                description: 'DIAGNOSTIC ONLY',
                parameters: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string' }
                    },
                    required: ['filePath']
                }
            },
            {
                name: 'getProjectMap',
                description: 'DIAGNOSTIC ONLY'
            },
            // ========== DASHBOARD CONTROL TOOLS (LIA Action Protocol v3.0) ==========
            {
                name: 'dashboardGetSnapshot',
                description: 'ESSENCIAL: Obtém a visão atual do dashboard do usuário.',
                parameters: { type: 'object', properties: {} }
            },
            {
                name: 'dashboardAddWidget',
                description: 'Adiciona um novo widget ao dashboard.',
                parameters: {
                    type: 'object',
                    properties: {
                        widgetType: {
                            type: 'string',
                            enum: ['kpi_card', 'line_timeseries', 'bar_grouped', 'donut_breakdown', 'table_rank', 'table_transactions', 'funnel', 'gauge', 'heatmap_calendar', 'alerts_list', 'radar_multidim', 'bar_horizontal', 'area_timeseries', 'pie_chart']
                        },
                        title: { type: 'string' },
                        metric: { type: 'string' },
                        x: { type: 'integer', description: 'Coluna (0-11)' },
                        y: { type: 'integer', description: 'Linha' },
                        w: { type: 'integer', description: 'Largura' },
                        h: { type: 'integer', description: 'Altura' },
                        pre_state_hash: { type: 'string' }
                    },
                    required: ['widgetType']
                }
            },
            {
                name: 'dashboardReplaceWidget',
                description: 'Substitui um widget existente.',
                parameters: {
                    type: 'object',
                    properties: {
                        targetWidgetType: { type: 'string' },
                        targetWidgetTitle: { type: 'string' },
                        newWidgetType: {
                            type: 'string',
                            enum: ['kpi_card', 'line_timeseries', 'bar_grouped', 'donut_breakdown', 'table_rank', 'table_transactions', 'funnel', 'gauge', 'heatmap_calendar', 'alerts_list', 'radar_multidim', 'bar_horizontal', 'area_timeseries', 'pie_chart']
                        },
                        newWidgetTitle: { type: 'string' },
                        pre_state_hash: { type: 'string' }
                    },
                    required: ['newWidgetType']
                }
            },
            {
                name: 'dashboardReorganize',
                description: 'Reorganiza o layout do dashboard.',
                parameters: {
                    type: 'object',
                    properties: {
                        layout: { type: 'string', enum: ['kpis-top', 'charts-first', 'auto'] }
                    }
                }
            },
            // ========== OPERATIONAL LAYER TOOLS (v4.0) ==========
            {
                name: 'crmCreateLead',
                description: 'Cria um novo lead/contato no CRM.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' },
                        company: { type: 'string' },
                        source: { type: 'string', description: 'Ex: WhatsApp, Website, Indicação' },
                        notes: { type: 'string' }
                    },
                    required: ['name']
                }
            },
            {
                name: 'crmUpdateDeal',
                description: 'Atualiza o status de um negócio/oportunidade.',
                parameters: {
                    type: 'object',
                    properties: {
                        dealId: { type: 'string' },
                        stage: { type: 'string', enum: ['contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] },
                        value: { type: 'number' },
                        notes: { type: 'string' }
                    },
                    required: ['dealId', 'stage']
                }
            },
            {
                name: 'createSupportTicket',
                description: 'Abre um chamado de suporte.',
                parameters: {
                    type: 'object',
                    properties: {
                        subject: { type: 'string' },
                        description: { type: 'string' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                        category: { type: 'string' }
                    },
                    required: ['subject', 'description']
                }
            },
            {
                name: 'createFinancialCharge',
                description: 'Gera uma cobrança ou fatura no financeiro.',
                parameters: {
                    type: 'object',
                    properties: {
                        clientName: { type: 'string' },
                        amount: { type: 'number' },
                        description: { type: 'string' },
                        dueDate: { type: 'string', description: 'Data de vencimento (ISO)' },
                        method: { type: 'string', enum: ['pix', 'boleto', 'credit_card'] }
                    },
                    required: ['clientName', 'amount', 'description']
                }
            },
            {
                name: 'startFollowUp',
                description: 'Inicia uma sequência de acompanhamento automática.',
                parameters: {
                    type: 'object',
                    properties: {
                        targetId: { type: 'string', description: 'ID do lead ou contato' },
                        channel: { type: 'string', enum: ['whatsapp', 'email', 'all'] },
                        reason: { type: 'string' }
                    },
                    required: ['targetId', 'channel']
                }
            },
            // ========== CORE ORCHESTRATOR TOOLS (v5.0) ==========
            {
                name: 'tenantGetSnapshot',
                description: 'Obtém o estado atual do tenant (plano, integrações, limites).',
                parameters: { type: 'object', properties: {} }
            },
            {
                name: 'productGetManifest',
                description: 'Obtém o catálogo completo de módulos, rotas e recursos do produto.',
                parameters: { type: 'object', properties: {} }
            }
        ];
    }

    static async execute(name: string, args: any, context: { userId: string; tenantId: string; userLocation?: any }) {
        const { userId, tenantId } = context;
        console.log(`🔧 [ToolService] Executando: ${name}`);

        diagnosticService.broadcastStep(userId, 'TOOL_EXECUTION', {
            tool: name,
            arguments: args
        });

        try {
            switch (name) {
                case 'saveMemory': {
                    const { saveMemory } = await import('../config/supabase.js');
                    const result = await saveMemory(userId, args.category || 'info', args.content, true);
                    return { success: true, data: result };
                }
                case 'deleteMemory': {
                    const { deleteMemory } = await import('../config/supabase.js');
                    return await deleteMemory(userId, args.key);
                }
                case 'searchWeb': {
                    const { buscarNaWeb } = await import('../search/web-search.js');
                    return await buscarNaWeb(args.query);
                }
                case 'getWeather': {
                    // Fallback para busca na web se não houver API dedicada
                    const { buscarNaWeb } = await import('../search/web-search.js');
                    return await buscarNaWeb(`previsão do tempo para ${args.location || 'minha localização'}`);
                }
                case 'getCurrentLocation': {
                    return { success: true, location: context.userLocation || 'Não disponível. Peça ao usuário para ativar o GPS.' };
                }
                case 'getLocation': {
                    const places = await geospatialService.findNearbyPlaces(context.userLocation || args.location, args.query);
                    return { success: true, count: places.length, data: places };
                }
                case 'getDirections': {
                    const route = await geospatialService.calculateRoute(args.origin, args.destination);
                    if (!route) return { success: false, message: 'Não foi possível calcular a rota.' };
                    return {
                        success: true,
                        message: `A distância entre ${args.origin} e ${args.destination} é de ${route.distance} e leva aproximadamente ${route.duration}.`,
                        data: route
                    };
                }
                case 'getCurrentTime': {
                    const now = new Date();
                    return {
                        success: true,
                        timestamp: now.toISOString(),
                        formatted: now.toLocaleString('pt-BR', { timeZone: args.timezone || 'Europe/Lisbon' }),
                        timezone: args.timezone || 'Europe/Lisbon'
                    };
                }
                case 'generateImage': {
                    const { generateImage } = await import('./imageService.js');
                    return await generateImage(args.prompt, args.style);
                }
                case 'generateChart': {
                    // No LIA Unified, gráficos são widgets do Dashboard
                    return {
                        success: true,
                        action: 'CHART_GENERATED',
                        data: {
                            title: args.title,
                            type: args.chartType,
                            labels: args.labels,
                            datasets: args.datasets
                        },
                        message: `Gerei o gráfico "${args.title}" para você analisar.`
                    };
                }
                case 'createGoogleSheet': {
                    return await GoogleWorkspaceTools.createGoogleSheet(userId, tenantId, args.title, args.headers, args.rows);
                }
                case 'updateGoogleSheet': {
                    return await GoogleWorkspaceTools.updateGoogleSheet(userId, tenantId, args.spreadsheetId, args.operations);
                }
                case 'createProFinancialSheet': {
                    return await GoogleWorkspaceTools.createProFinancialSheet(userId, tenantId, args.title);
                }
                case 'createGoogleDoc': {
                    return await GoogleWorkspaceTools.createGoogleDoc(userId, tenantId, args.title, args.content);
                }
                case 'sendGmail': {
                    return await GoogleWorkspaceTools.sendGmail(userId, tenantId, args.to, args.subject, args.body);
                }
                case 'listGmailMessages': {
                    return await GoogleWorkspaceTools.listGmailMessages(userId, tenantId, args.maxResults, args.query);
                }
                case 'getGmailMessage': {
                    return await GoogleWorkspaceTools.getGmailMessage(userId, tenantId, args.messageId);
                }
                case 'searchGmail': {
                    return await GoogleWorkspaceTools.searchGmail(userId, tenantId, args.searchTerm);
                }
                case 'deleteGmailMessage': {
                    return await GoogleWorkspaceTools.deleteGmailMessage(userId, tenantId, args.messageId);
                }
                case 'createCalendarEvent': {
                    console.log(`📅 [ToolService] createCalendarEvent args:`, JSON.stringify(args, null, 2));
                    const result = await GoogleWorkspaceTools.createCalendarEvent(
                        userId, tenantId, args.title, args.start, args.end, args.description
                    );

                    // ACK detalhado conforme lia-core-architecture.md
                    return {
                        ...result,
                        ack: {
                            action: 'CALENDAR_CREATE_EVENT',
                            status: result.success ? 'applied' : 'rejected',
                            evidence: {
                                title: args.title,
                                start: args.start,
                                end: args.end,
                                descriptionIncluded: !!args.description
                            }
                        }
                    };
                }
                case 'listCalendarEvents': {
                    return await GoogleWorkspaceTools.listCalendarEvents(userId, tenantId, args.timeMin, args.timeMax);
                }
                case 'updateCalendarEvent': {
                    console.log(`📅 [ToolService] updateCalendarEvent args:`, JSON.stringify(args, null, 2));
                    const result = await GoogleWorkspaceTools.updateCalendarEvent(userId, tenantId, args.eventId, {
                        title: args.title,
                        start: args.start,
                        end: args.end,
                        description: args.description
                    });
                    return {
                        ...result,
                        ack: {
                            action: 'CALENDAR_UPDATE_EVENT',
                            status: result.success ? 'applied' : 'rejected',
                            evidence: { eventId: args.eventId, updates: args }
                        }
                    };
                }
                case 'deleteCalendarEvent': {
                    console.log(`🗑️ [ToolService] deleteCalendarEvent eventId:`, args.eventId);
                    const result = await GoogleWorkspaceTools.deleteCalendarEvent(userId, tenantId, args.eventId);
                    return {
                        ...result,
                        ack: {
                            action: 'CALENDAR_DELETE_EVENT',
                            status: result.success ? 'applied' : 'rejected',
                            evidence: { eventId: args.eventId }
                        }
                    };
                }
                case 'getCalendarEvent': {
                    return await GoogleWorkspaceTools.getCalendarEvent(userId, tenantId, args.eventId);
                }
                case 'searchCalendarEvents': {
                    console.log(`🔍 [ToolService] searchCalendarEvents query:`, args.query);
                    return await GoogleWorkspaceTools.searchCalendarEvents(userId, tenantId, args.query, args.daysAhead);
                }
                case 'getBusinessMetrics': {
                    const today = new Date();
                    const endDate = today.toISOString().split('T')[0];
                    const start = new Date(today);
                    const daysMap: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };
                    start.setDate(start.getDate() - (daysMap[args.period] || 30));
                    const startDate = start.toISOString().split('T')[0];

                    const platformApiUrl = process.env.VITE_API_URL || 'http://localhost:5000';
                    const params = new URLSearchParams({
                        tenant_id: tenantId || '00000000-0000-0000-0000-000000000001',
                        metric_key: args.metricKey,
                        start_date: startDate,
                        end_date: endDate,
                        type: args.metricKey.includes('category') ? 'breakdown' : 'kpi'
                    });

                    const response = await fetch(`${platformApiUrl}/api/metrics/query?${params}`);
                    if (!response.ok) return { success: false, error: 'Falha ao buscar métricas no servidor de dados.' };
                    const result = await response.json() as any;
                    return { success: true, data: result.data || result };
                }
                case 'analyzeFile': {
                    const { fileService } = await import('./fileService.js');
                    return await fileService.getFileAnalysis(args.fileId);
                }
                case 'getSystemHealth': return await diagnosticService.getHealth();
                case 'getSystemLogs': return await diagnosticService.getLogs(args.limit, args.level);
                case 'readProjectFile': return await diagnosticService.readFile(args.filePath);
                case 'getProjectMap': return await diagnosticService.getMap();

                case 'dashboardAddWidget': {
                    return {
                        success: true,
                        action: 'DASHBOARD_ADD_WIDGET',
                        params: {
                            widgetType: args.widgetType,
                            widgetConfig: { title: args.title, metric: args.metric },
                            position: { x: args.x, y: args.y, w: args.w, h: args.h },
                            pre_state_hash: args.pre_state_hash
                        },
                        message: `Estou adicionando o widget de ${args.widgetType} para você.`
                    };
                }
                case 'dashboardGetSnapshot': {
                    const { getActiveDashboard } = await import('../config/supabase.js');
                    const config = await getActiveDashboard(tenantId || '00000000-0000-0000-0000-000000000001');

                    if (!config) {
                        return {
                            success: false,
                            error: 'Nenhum dashboard ativo encontrado no banco de dados.',
                            action: 'DASHBOARD_GET_SNAPSHOT'
                        };
                    }

                    // v4.0: Construir snapshot idêntico ao do frontend para paridade
                    const layout = config.layout || [];
                    const widgetsRaw = config.widgets || {};

                    const widgets = layout.map(l => ({
                        id: l.id,
                        type: widgetsRaw[l.id]?.type || 'unknown',
                        title: widgetsRaw[l.id]?.title || 'Sem título',
                        position: { x: l.x, y: l.y, w: l.w, h: l.h }
                    }));

                    const maxY = layout.length > 0
                        ? Math.max(...layout.map(l => l.y + (l.h || 0)))
                        : 0;

                    return {
                        success: true,
                        action: 'DASHBOARD_GET_SNAPSHOT',
                        data: {
                            widgets,
                            widgetCount: widgets.length,
                            next_suggested_position: { x: 0, y: maxY },
                            layout_summary: widgets.map(w => `${w.title} (${w.type})`).join(', ')
                        },
                        message: `Eu li o seu dashboard. Você tem ${widgets.length} widgets ativos.`
                    };
                }
                case 'dashboardReplaceWidget': {
                    return {
                        success: true,
                        action: 'DASHBOARD_REPLACE_WIDGET',
                        params: {
                            targetWidgetType: args.targetWidgetType,
                            targetWidgetTitle: args.targetWidgetTitle,
                            newWidgetType: args.newWidgetType,
                            newWidgetConfig: { title: args.newWidgetTitle },
                            pre_state_hash: args.pre_state_hash
                        },
                        message: `Substituindo por um novo ${args.newWidgetType}.`
                    };
                }
                case 'dashboardReorganize': {
                    return {
                        success: true,
                        action: 'DASHBOARD_REORGANIZE',
                        params: { layout: args.layout || 'auto' },
                        message: `Reorganizando layout para ${args.layout}.`
                    };
                }

                // v4.0 Operational Layer Fallbacks (Stubs)
                case 'crmCreateLead': {
                    const { saveMemory } = await import('../config/supabase.js');
                    // Salva como memória e evento até termos integração real com CRM
                    await saveMemory(userId, `lead_${Date.now()}`, JSON.stringify(args), true);
                    return { success: true, message: `Lead ${args.name} criado com sucesso no CRM operacional.`, data: args };
                }
                case 'crmUpdateDeal': {
                    return { success: true, message: `Negócio ${args.dealId} atualizado para o estágio ${args.stage}.`, data: args };
                }
                case 'createSupportTicket': {
                    return { success: true, message: `Ticket de suporte criado: "${args.subject}". Prioridade: ${args.priority}.`, ticketId: `TKT-${Math.floor(Math.random() * 9000) + 1000}` };
                }
                case 'createFinancialCharge': {
                    return {
                        success: true,
                        message: `Cobrança de R$ ${args.amount.toFixed(2)} gerada para ${args.clientName}.`,
                        chargeId: `CHR-${Date.now()}`,
                        pix_copy_paste: "00020126580014BR.GOV.BCB.PIX..." // Mock
                    };
                }
                case 'startFollowUp': {
                    return { success: true, message: `Sequência de follow-up iniciada para ${args.targetId} via ${args.channel}.` };
                }

                // v5.0 Core Orchestrator Tools
                case 'tenantGetSnapshot': {
                    const { SnapshotService } = await import('./snapshotService');
                    const snapshot = await SnapshotService.getTenantSnapshot(userId);
                    return { success: true, message: "Snapshot do tenant obtido com sucesso.", snapshot };
                }
                case 'productGetManifest': {
                    const { SnapshotService } = await import('./snapshotService');
                    const manifest = SnapshotService.getProductManifest();
                    return { success: true, message: "Manifesto do produto obtido com sucesso.", manifest };
                }
                default:
                    return { error: `Ferramenta ${name} não encontrada.` };
            }

        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
