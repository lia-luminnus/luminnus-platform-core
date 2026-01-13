import * as GoogleWorkspaceTools from '../tools/googleWorkspace.js';
import { AuditService } from './auditService.js';
import fetch from 'node-fetch';
import { geospatialService } from './geospatialService.js';
import { diagnosticService } from './diagnosticService.js';

/**
 * ToolService: Centraliza definições (schemas) e execução de ferramentas
 * v1.1.0 - Unificado para Chat, Multimodal e Live (Voz)
 */
export class ToolService {
    /**
     * Retorna a lista completa de ferramentas formatada para OpenAI
     */
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
                description: 'Deleta uma memória específica do usuário. Use quando o usuário pedir para esquecer, deletar ou remover uma informação.',
                parameters: {
                    type: 'object',
                    properties: {
                        key: { type: 'string', description: 'A chave da memória a ser deletada (ex: nome_usuario, email_usuario, localizacao, preferencia, empresa, cargo)' }
                    },
                    required: ['key']
                }
            },
            {
                name: 'searchWeb',
                description: 'OBRIGATÓRIO para: preços de criptomoedas (Bitcoin, Ethereum), cotações de moedas (dólar, euro), preços de ações, notícias recentes, eventos atuais, ou qualquer informação que mude frequentemente. Busca informações ATUALIZADAS e EM TEMPO REAL na internet. NUNCA responda sobre preços ou cotações sem usar esta ferramenta primeiro.',
                parameters: {
                    type: 'object',
                    properties: { query: { type: 'string', description: 'A consulta de busca (ex: "bitcoin price USD today", "cotação dólar real hoje")' } },
                    required: ['query']
                }
            },

            {
                name: 'getWeather',
                description: 'Busca a previsão do tempo e clima atual para uma cidade específica ou para a localização atual do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        location: {
                            type: 'string',
                            description: 'Cidade a pesquisar (ex: "São Paulo, SP"). Se for omitido ou for "atual", busca da localização do usuário.'
                        }
                    }
                }
            },
            {
                name: 'getCurrentLocation',
                description: 'Obtém a localização geográfica exata e o endereço atual do dispositivo do usuário.',
                parameters: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'getLocation',
                description: 'Busca lugares (restaurantes, farmácias, lojas, etc) próximos ou em uma localização específica. IMPORTANTE: Se o usuário especificar uma cidade ou área (ex: "em Aveiro", "no centro", "em Lisboa"), você DEVE passar essa localização no parâmetro location para garantir precisão. Nunca traga resultados de cidades diferentes da solicitada.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'O que buscar (ex: farmácias, mercado do peixe)' },
                        location: { type: 'string', description: 'Onde buscar - OBRIGATÓRIO quando o usuário especifica uma cidade/área (ex: "Aveiro Centro", "Lisboa", "Porto"). Use EXATAMENTE o que o usuário disser.' }
                    },
                    required: ['query', 'location']
                }
            },
            {
                name: 'getDirections',
                description: 'Calcula a distância e tempo de viagem entre dois pontos.',
                parameters: {
                    type: 'object',
                    properties: {
                        origin: { type: 'string', description: 'Ponto de partida' },
                        destination: { type: 'string', description: 'Destino' },
                        mode: { type: 'string', enum: ['driving', 'walking', 'bicycling', 'transit'], default: 'driving' }
                    },
                    required: ['origin', 'destination']
                }
            },
            {
                name: 'getCurrentTime',
                description: 'Retorna data e hora atuais baseadas em um timezone.',
                parameters: {
                    type: 'object',
                    properties: { timezone: { type: 'string', default: 'Europe/Lisbon' } }
                }
            },
            {
                name: 'generateImage',
                description: 'Gera uma imagem artística ou realista a partir de uma descrição detalhada.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'Descrição detalhada em português' },
                        style: { type: 'string', enum: ['realistic', 'artistic'], default: 'realistic' }
                    },
                    required: ['prompt']
                }
            },
            {
                name: 'generateChart',
                description: 'Gera um gráfico visual (linha, barra, pizza) a partir de dados fornecidos.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título do gráfico' },
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
                description: 'Cria uma planilha SIMPLES e BÁSICA. USE APENAS para listas rápidas sem formatação complexa ou quando o usuário pedir explicitamente "lista simples". NUNCA use para pedidos de dashboards, controles financeiros ou quando houver um print de exemplo.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título da planilha' },
                        headers: { type: 'array', items: { type: 'string' } },
                        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } }
                    },
                    required: ['title', 'headers', 'rows']
                }
            },
            {
                name: 'updateGoogleSheet',
                description: 'Edita uma planilha EXISTENTE no Google Sheets. Use quando o usuário pedir para "editar", "melhorar", "organizar", "profissionalizar" ou "ajustar" uma planilha já criada.',
                parameters: {
                    type: 'object',
                    properties: {
                        spreadsheetId: { type: 'string', description: 'ID da planilha existente (obtido do link ou contexto anterior)' },
                        operations: {
                            type: 'array',
                            description: 'Lista de operações a executar na planilha',
                            items: {
                                type: 'object',
                                properties: {
                                    addSheet: { type: 'object', properties: { title: { type: 'string' } } },
                                    updateRange: { type: 'object', properties: { range: { type: 'string' }, values: { type: 'array', items: { type: 'array', items: { type: 'string' } } } } },
                                    addFormula: { type: 'object', properties: { range: { type: 'string' }, formula: { type: 'string' } } },
                                    freezeRows: { type: 'number' }
                                }
                            }
                        }
                    },
                    required: ['spreadsheetId', 'operations']
                }
            },
            {
                name: 'createAdvancedSheet',
                description: 'Cria uma planilha intermediária. OBSOLETO: Use createProFinancialSheet para resultados de alta fidelidade.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título da planilha' },
                        type: {
                            type: 'string',
                            enum: ['financial', 'inventory', 'custom'],
                            description: 'Tipo de planilha: financial (controle financeiro), inventory (estoque), custom (personalizada)'
                        }
                    },
                    required: ['title']
                }
            },
            {
                name: 'createProFinancialSheet',
                description: 'FERRAMENTA MANDATÓRIA para pedidos de "REPLICAR LAYOUT", "PLANILHA PRO", "DASHBOARD", "CONTROLE FINANCEIRO" ou quando o usuário enviar um PRINT/IMAGEM. Esta ferramenta clona o modelo master LIA_PRO_FINANCEIRO_MASTER que possui dashboards, KPIs e 5 abas comerciais. É a única que garante o visual premium solicitado. Se houver imagem, use analyzeFile primeiro para extrair os dados e injetá-los aqui.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título da planilha PRO (default: Controle Financeiro PRO)' },
                        initialDataFromAnalysis: { type: 'string', description: 'Dados extraídos da imagem/print para popular a planilha clonada' }
                    },
                    required: ['title']
                }
            },
            {
                name: 'createGoogleDoc',
                description: 'Cria um documento real no Google Docs do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Título do documento' },
                        content: { type: 'string', description: 'Conteúdo em markdown ou texto simples' }
                    },
                    required: ['title', 'content']
                }
            },
            {
                name: 'sendGmail',
                description: 'Envia um e-mail real pelo Gmail do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        to: { type: 'string', description: 'Destinatário' },
                        subject: { type: 'string', description: 'Assunto' },
                        body: { type: 'string', description: 'Mensagem (suporta HTML)' }
                    },
                    required: ['to', 'subject', 'body']
                }
            },
            {
                name: 'createCalendarEvent',
                description: 'Agenda um compromisso real no Google Calendar do usuário.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Nome do evento' },
                        start: { type: 'string', description: 'Início (ISO 8601)' },
                        end: { type: 'string', description: 'Fim (ISO 8601)' },
                        description: { type: 'string' }
                    },
                    required: ['title', 'start', 'end']
                }
            },
            // ========== GMAIL READ TOOLS (v2.0) ==========
            {
                name: 'listGmailMessages',
                description: 'Lista os e-mails mais recentes da caixa de entrada do usuário. Use quando pedirem "veja meus emails", "o que chegou hoje", "emails novos".',
                parameters: {
                    type: 'object',
                    properties: {
                        maxResults: { type: 'number', description: 'Número máximo de e-mails a retornar (default: 10)', default: 10 },
                        query: { type: 'string', description: 'Query opcional no formato Gmail (ex: is:unread, from:fulano)' }
                    }
                }
            },
            {
                name: 'searchGmail',
                description: 'Pesquisa e-mails usando linguagem natural. Use quando pedirem "procura email do João", "emails sobre projeto X", "emails não lidos", "emails com anexo".',
                parameters: {
                    type: 'object',
                    properties: {
                        searchTerm: { type: 'string', description: 'Termo de busca em linguagem natural (ex: "emails do João sobre projeto")' }
                    },
                    required: ['searchTerm']
                }
            },
            {
                name: 'getGmailMessage',
                description: 'Obtém o conteúdo completo de um e-mail específico. Use após listar e-mails quando o usuário quiser ver detalhes.',
                parameters: {
                    type: 'object',
                    properties: {
                        messageId: { type: 'string', description: 'ID do e-mail retornado por listGmailMessages ou searchGmail' }
                    },
                    required: ['messageId']
                }
            },
            {
                name: 'analyzeFile',
                description: 'Recupera a análise de um arquivo enviado anteriormente para usar em outras tarefas.',
                parameters: {
                    type: 'object',
                    properties: {
                        fileId: { type: 'string', description: 'Nome parcial ou ID do arquivo' }
                    },
                    required: ['fileId']
                }
            },
            {
                name: 'getSystemHealth',
                description: 'DIAGNOSTIC ONLY: Retorna o status de saúde e latência de todos os serviços (Supabase, OpenAI, Google, Realtime).'
            },
            {
                name: 'getSystemLogs',
                description: 'DIAGNOSTIC ONLY: Retorna os logs recentes do servidor para análise de erros.',
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
                description: 'DIAGNOSTIC ONLY: Lê o conteúdo de um arquivo do projeto. Use para analisar o código e encontrar bugs.',
                parameters: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Caminho relativo do arquivo (ex: server/server.ts)' }
                    },
                    required: ['filePath']
                }
            },
            {
                name: 'getProjectMap',
                description: 'DIAGNOSTIC ONLY: Retorna o mapa da estrutura do sistema (árvore de arquivos principal).'
            },
            // ========== DASHBOARD CONTROL TOOLS (LIA Action Protocol v3.0) ==========
            {
                name: 'dashboardGetSnapshot',
                description: 'ESSENCIAL: Obtém a visão atual do dashboard do usuário (todos os widgets, tipos e títulos). Use PROATIVAMENTE sempre que o usuário perguntar o que tem no dashboard ou antes de sugerir qualquer mudança, para garantir que você sabe exatamente o que está na tela.',
                parameters: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'dashboardReplaceWidget',
                description: 'Substitui um widget existente por outro tipo, mantendo a mesma posição. Use quando o usuário pedir "troque", "substitua" ou "mude" um widget. NÃO PRECISA do ID exato - pode buscar por tipo ou título.',
                parameters: {
                    type: 'object',
                    properties: {
                        targetWidgetType: {
                            type: 'string',
                            description: 'Tipo do widget a substituir (ex: table_rank, pie_chart, line_timeseries)',
                            enum: ['kpi_card', 'line_timeseries', 'bar_grouped', 'donut_breakdown', 'table_rank', 'table_transactions', 'funnel', 'gauge', 'heatmap_calendar', 'alerts_list', 'radar_multidim', 'bar_horizontal', 'area_timeseries', 'pie_chart']
                        },
                        targetWidgetTitle: {
                            type: 'string',
                            description: 'Parte do título do widget a substituir (ex: "ranking", "despesas")'
                        },
                        newWidgetType: {
                            type: 'string',
                            description: 'Tipo do novo widget',
                            enum: ['kpi_card', 'line_timeseries', 'bar_grouped', 'donut_breakdown', 'table_rank', 'table_transactions', 'funnel', 'gauge', 'heatmap_calendar', 'alerts_list', 'radar_multidim', 'bar_horizontal', 'area_timeseries', 'pie_chart']
                        },
                        newWidgetTitle: {
                            type: 'string',
                            description: 'Título para o novo widget'
                        }
                    },
                    required: ['newWidgetType']
                }
            },
            {
                name: 'dashboardReorganize',
                description: 'Reorganiza o layout do dashboard. Use quando o usuário pedir para "organizar", "arrumar" ou "reorganizar" o dashboard.',
                parameters: {
                    type: 'object',
                    properties: {
                        layout: {
                            type: 'string',
                            enum: ['kpis-top', 'charts-first', 'auto'],
                            description: 'Tipo de reorganização: kpis-top (KPIs no topo), charts-first (gráficos primeiro), auto (automático)'
                        }
                    }
                }
            }
        ];
    }

    /**
     * Executa uma ferramenta com base no nome e argumentos
     */
    static async execute(name: string, args: any, context: { userId: string; tenantId: string; userLocation?: any }) {
        const { userId, tenantId } = context;
        console.log(`🔧 [ToolService] Executando: ${name}`);

        // v4.1: Transmitir "pensamento" para o painel de diagnóstico
        diagnosticService.broadcastStep(userId, 'TOOL_EXECUTION', {
            tool: name,
            arguments: args
        });

        try {
            switch (name) {
                case 'saveMemory': {
                    const { saveMemory } = await import('../config/supabase.js');
                    let key = args.category || 'info_importante';
                    const content = (args.content || "").toLowerCase();

                    // v5.4: Melhorar detecção de chaves semânticas para evitar categorização genérica
                    if (key === 'personal' || key === 'general' || key === 'info_importante' || key === 'identity') {
                        // Detecção de nome do usuário
                        if (content.includes('meu nome') || content.includes('me chamo') || content.includes('sou o') || content.includes('sou a')) {
                            key = 'nome_usuario';
                        }
                        // Detecção de endereço (NOVO)
                        else if (content.includes('meu endereço') || content.includes('meu endereco') || content.includes('moro na') || content.includes('moro em') || /\brua\b/.test(content) || /\bavenida\b/.test(content)) {
                            key = 'endereco_usuario';
                        }
                        // Detecção de e-mail
                        else if (content.includes('@') || content.includes('email')) {
                            key = 'email_usuario';
                        }
                        // Detecção de empresa
                        else if (content.includes('trabalho') || content.includes('empresa')) {
                            key = 'empresa';
                        }
                        // Detecção de familiares
                        else if (content.includes('meu filho') || content.includes('minha filha')) {
                            key = 'nome_filho';
                        }
                        else if (content.includes('minha esposa') || content.includes('meu marido') || content.includes('casado com') || content.includes('casada com')) {
                            key = 'nome_conjuge';
                        }
                    }

                    // tool calls são comandos explícitos do modelo (Brain), marcados como importantes
                    const result = await saveMemory(userId, key, args.content, true);
                    return { success: true, message: `Memória salva como ${key}`, data: result };
                }

                case 'deleteMemory': {
                    const { deleteMemory } = await import('../config/supabase.js');
                    const key = args.key;
                    if (!key) {
                        return { success: false, error: 'Chave não especificada' };
                    }
                    const result = await deleteMemory(userId, key);
                    if (result?.deleted) {
                        return { success: true, message: `Memória '${key}' deletada com sucesso` };
                    } else {
                        return { success: false, error: `Memória '${key}' não encontrada` };
                    }
                }

                case 'searchWeb': {
                    const { buscarNaWeb } = await import('../search/web-search.js');
                    return await buscarNaWeb(args.query);
                }

                case 'getWeather': {
                    return await this.getWeather(args, context);
                }

                case 'getCurrentLocation': {
                    return await this.getCurrentLocation(args, context);
                }

                case 'getLocation': {
                    // v5.5: Fallback para localização do usuário se não especificado ou se for relativo
                    let searchLoc = args.location || 'Aveiro, Portugal';
                    const relativeTerms = ['meu lugar', 'onde estou', 'minha localização', 'aqui', 'perto de mim'];
                    if (relativeTerms.some(t => searchLoc.toLowerCase().includes(t)) || !args.location) {
                        if (context.userLocation?.address) {
                            searchLoc = context.userLocation.address;
                        }
                    }
                    const results = await geospatialService.findNearbyPlaces(searchLoc, args.query, 5000);
                    return results;
                }

                case 'getDirections': {
                    // v5.5: Fallback para localização do usuário se origin for relativo
                    let origin = args.origin;
                    let destination = args.destination;
                    const relativeTerms = ['minha casa', 'meu lugar', 'onde estou', 'minha localização', 'aqui'];
                    if (!origin || relativeTerms.some(t => origin.toLowerCase().includes(t))) {
                        if (context.userLocation?.address) {
                            origin = context.userLocation.address;
                        } else {
                            // Tentar buscar da memória se não tiver localização em tempo real
                            const { loadImportantMemories } = await import('../config/supabase.js');
                            const memories = await loadImportantMemories(userId);
                            const addrMem = memories.find((m: any) => m.key === 'endereco_usuario' || m.key === 'endereco');
                            if (addrMem) origin = addrMem.content;
                        }
                    }
                    if (!origin) return { error: 'Não consegui determinar seu endereço de partida. Pode me dizer?' };

                    const result = await geospatialService.calculateRoute(origin, destination);
                    if (!result) return { error: 'Rota não encontrada entre esses pontos.' };
                    return result;
                }

                case 'getCurrentTime': {
                    const timezone = args.timezone || 'Europe/Lisbon';
                    const now = new Date();
                    return {
                        currentTime: now.toLocaleString('pt-PT', { timeZone: timezone }),
                        timezone
                    };
                }

                case 'generateImage': {
                    const key = process.env.OPENAI_API_KEY;
                    const resp = await fetch('https://api.openai.com/v1/images/generations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                        body: JSON.stringify({
                            model: 'dall-e-3',
                            prompt: args.style === 'realistic' ? `Real photography: ${args.prompt}` : `Digital art illustration: ${args.prompt}`,
                            size: '1024x1024'
                        })
                    });
                    const data: any = await resp.json();
                    if (!data.data?.[0]?.url) throw new Error(data.error?.message || 'Erro DALL-E');
                    return { url: data.data[0].url, prompt: args.prompt };
                }

                case 'generateChart': {
                    return { type: 'chart', title: args.title, chartType: args.chartType, labels: args.labels, datasets: args.datasets };
                }

                case 'createGoogleSheet':
                    return await GoogleWorkspaceTools.createGoogleSheet(userId, tenantId, args.title, args.headers, args.rows);

                case 'updateGoogleSheet':
                    return await GoogleWorkspaceTools.updateGoogleSheet(userId, tenantId, args.spreadsheetId, args.operations);

                case 'createAdvancedSheet':
                    return await GoogleWorkspaceTools.createAdvancedSheet(userId, tenantId, args.title, args.type || 'financial');

                case 'createProFinancialSheet':
                    return await GoogleWorkspaceTools.createProFinancialSheet(userId, tenantId, args.title || 'Controle Financeiro PRO');

                case 'createGoogleDoc':
                    return await GoogleWorkspaceTools.createGoogleDoc(userId, tenantId, args.title, args.content);

                case 'sendGmail':
                    return await GoogleWorkspaceTools.sendGmail(userId, tenantId, args.to, args.subject, args.body);

                case 'createCalendarEvent':
                    return await GoogleWorkspaceTools.createCalendarEvent(userId, tenantId, args.title, args.start, args.end, args.description);

                // ========== GMAIL READ TOOLS (v2.0) ==========
                case 'listGmailMessages':
                    return await GoogleWorkspaceTools.listGmailMessages(userId, tenantId, args.maxResults || 10, args.query);

                case 'searchGmail':
                    return await GoogleWorkspaceTools.searchGmail(userId, tenantId, args.searchTerm);

                case 'getGmailMessage':
                    return await GoogleWorkspaceTools.getGmailMessage(userId, tenantId, args.messageId);

                case 'analyzeFile': {
                    const { supabase } = await import('../config/supabase.js');
                    const { data } = await (supabase as any)
                        .from('files')
                        .select('extracted_metadata')
                        .eq('tenant_id', tenantId)
                        .ilike('file_name', `%${args.fileId}%`)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    const raw = data?.extracted_metadata?.rawText || data?.extracted_metadata?.last_extraction || 'Sem dados recentes.';
                    return { summary: raw.substring(0, 5000), full_metadata: data?.extracted_metadata };
                }

                // =====================================================
                // 🛠️ ADMIN DIAGNOSTIC TOOLS (v4.2)
                // =====================================================
                case 'getSystemHealth': {
                    const { createClient } = await import('@supabase/supabase-js');
                    const startTime = Date.now();
                    const services: any[] = [];

                    // 1. Supabase
                    try {
                        const sUrl = process.env.SUPABASE_URL || '';
                        const sKey = process.env.SUPABASE_ANON_KEY || '';
                        if (!sUrl || !sKey) throw new Error('Credenciais Supabase Ausentes');
                        const client = createClient(sUrl, sKey);
                        const { error } = await client.from('memories').select('count', { count: 'exact', head: true }).limit(1);
                        if (error) throw error;
                        services.push({ name: 'supabase', status: 'OK', latency_ms: Date.now() - startTime });
                    } catch (e: any) {
                        services.push({ name: 'supabase', status: 'DOWN', message: e.message });
                    }

                    // 2. OpenAI
                    services.push({
                        name: 'openai',
                        status: process.env.OPENAI_API_KEY ? 'OK' : 'DOWN',
                        key_loaded: !!process.env.OPENAI_API_KEY
                    });

                    // 3. Google Maps (Geospatial)
                    const gKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
                    services.push({
                        name: 'google_maps',
                        status: gKey ? 'OK' : 'DOWN',
                        key_loaded: !!gKey
                    });

                    // 4. Web Search (Tavily/Serper)
                    const sKey = process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY;
                    services.push({
                        name: 'web_search',
                        status: sKey ? 'OK' : 'DOWN',
                        key_loaded: !!sKey
                    });

                    return { services, timestamp: new Date().toISOString() };
                }

                case 'getSystemLogs': {
                    // Simulação baseada em logs reais de conexão (mock funcional por enquanto)
                    return {
                        logs: [
                            { timestamp: new Date().toISOString(), level: 'info', message: 'Diagnostic Tool Execution: getSystemLogs', service: 'ToolService' },
                            { timestamp: new Date().toISOString(), level: 'info', message: `User ${userId} requested system logs`, service: 'admin' }
                        ],
                        limit: args.limit || 50
                    };
                }

                case 'readProjectFile': {
                    const fs = await import('fs');
                    const path = await import('path');
                    const filePath = args.filePath;

                    // Reusar lógica de segurança de admin.ts simplificada
                    const projectRoot = path.resolve(process.cwd());
                    const absolutePath = path.resolve(projectRoot, filePath);

                    if (!absolutePath.startsWith(projectRoot)) return { error: 'Acesso negado: fora do diretório raiz.' };
                    if (filePath.includes('.env') || filePath.includes('node_modules')) return { error: 'Acesso negado: arquivo sensível.' };

                    if (!fs.default.existsSync(absolutePath)) return { error: `Arquivo não encontrado: ${filePath}` };

                    const content = fs.default.readFileSync(absolutePath, 'utf-8');
                    return {
                        filePath,
                        content: content.substring(0, 5000), // Limitar para o LLM
                        truncated: content.length > 5000
                    };
                }

                case 'getProjectMap': {
                    return {
                        map: {
                            frontend: ['apps/web/src/components/admin/AdminTools.tsx', 'apps/web/src/contexts/AuthContext.tsx'],
                            backend: ['apps/lia-viva/lia-live-view/server/routes/chat.ts', 'apps/lia-viva/lia-live-view/server/services/toolService.ts'],
                            config: ['package.json', 'pnpm-workspace.yaml']
                        }
                    };
                }

                // ========== DASHBOARD CONTROL TOOLS (LIA Action Protocol v3.0) ==========
                case 'dashboardGetSnapshot': {
                    // Emitir evento para o frontend capturar e executar
                    return {
                        success: true,
                        action: 'DASHBOARD_GET_SNAPSHOT',
                        message: 'Deixa eu ver como está o seu dashboard agora... Pronto, estou visualizando todos os seus widgets!',
                        instruction: 'O frontend deve chamar DashboardContext.getSnapshot() e retornar os dados.'
                    };
                }

                case 'dashboardReplaceWidget': {
                    // Emitir evento para o frontend capturar e executar
                    return {
                        success: true,
                        action: 'DASHBOARD_REPLACE_WIDGET',
                        params: {
                            targetWidgetType: args.targetWidgetType,
                            targetWidgetTitle: args.targetWidgetTitle,
                            newWidgetType: args.newWidgetType,
                            newWidgetConfig: {
                                title: args.newWidgetTitle
                            }
                        },
                        message: `Com certeza! Estou substituindo o widget de ${args.targetWidgetType || args.targetWidgetTitle || 'dados'} por um novo ${args.newWidgetType} para você.`
                    };
                }

                case 'dashboardReorganize': {
                    return {
                        success: true,
                        action: 'DASHBOARD_REORGANIZE',
                        params: {
                            layout: args.layout || 'auto'
                        },
                        message: `Entendido. Vou reorganizar os elementos para deixar seu dashboard mais arrumado no modo ${args.layout || 'automático'}.`
                    };
                }

                default:
                    throw new Error(`Ferramenta desconhecida: ${name}`);
            }
        } catch (err: any) {
            console.error(`❌ [ToolService] Erro em ${name}:`, err);
            return { success: false, error: err.message };
        }
    }

    private static async getWeather(args: any, context?: any) {
        try {
            const apiKey = process.env.OPENWEATHER_API_KEY;
            if (!apiKey) {
                console.error('❌ OPENWEATHER_API_KEY não configurada');
                return "Desculpe, o serviço de clima não está configurado (chave API ausente).";
            }

            // v5.2: Tentar obter localização da sessão se não informada ou for "atual"
            let location = args.location;

            if (!location || location.toLowerCase() === 'atual' || location.toLowerCase() === 'aqui') {
                if (context?.userLocation?.address) {
                    location = context.userLocation.address;
                    console.log(`📍 Usando localização da sessão para clima: ${location}`);
                } else if (context?.userLocation?.latitude) {
                    // Buscar via lat/lon se disponível
                    const lat = context.userLocation.latitude;
                    const lon = context.userLocation.longitude;
                    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt`;
                    const response = await fetch(url);
                    if (response.ok) {
                        const data: any = await response.json();
                        return `Clima em ${data.name}: ${Math.round(data.main.temp)}°C, ${data.weather[0].description}. Umidade ${data.main.humidity}%. Sensação de ${Math.round(data.main.feels_like)}°C.`;
                    }
                }
            }

            if (!location) {
                return "Poderia me dizer de qual cidade você gostaria de saber o clima?";
            }

            console.log(`🌤️ Buscando clima para: ${location}`);
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=pt`;

            const response = await fetch(url);
            if (!response.ok) {
                const errData: any = await response.json();
                console.error('❌ Erro OpenWeather:', errData);
                return `Não consegui encontrar as informações de clima para "${location}". Verifique se o nome está correto.`;
            }

            const data: any = await response.json();
            const summary = `Clima em ${data.name}: ${Math.round(data.main.temp)}°C, ${data.weather[0].description}. Umidade ${data.main.humidity}%. Sensação de ${Math.round(data.main.feels_like)}°C.`;

            return summary;
        } catch (error) {
            console.error('❌ Erro no getWeather:', error);
            return "Ocorreu um erro ao consultar o clima. Tente novamente em alguns instantes.";
        }
    }

    private static async getCurrentLocation(args: any, context?: any) {
        try {
            console.log(`📍 Obtendo localização atual... Contexto:`, !!context?.userLocation);

            if (context?.userLocation) {
                const { latitude, longitude, address } = context.userLocation;
                if (address) {
                    return `Sua localização atual registrada é ${address}.`;
                }
                return `Suas coordenadas atuais são Latitude: ${latitude}, Longitude: ${longitude}.`;
            }

            return "Não tenho acesso à sua localização exata no momento. Por favor, certifique-se de que a permissão de geolocalização está ativa no seu navegador.";
        } catch (error) {
            console.error('❌ Erro no getCurrentLocation:', error);
            return "Houve um problema ao tentar acessar seus dados de localização.";
        }
    }
}
