import { GoogleService } from '../services/googleService.js';
import { AuditService } from '../services/auditService.js';
import { ResourceContextStore } from '../services/resourceContextStore.js';

/**
 * Ferramentas de execução para a LIA (Google Workspace)
 */

interface GoogleActionResponse {
    success: boolean;
    message: string;
    link?: string;
    error?: string;
}

/**
 * Cria uma planilha no Google Sheets
 */
export async function createGoogleSheet(userId: string, tenantId: string, title: string, headers: string[], rows: any[][]): Promise<GoogleActionResponse> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Solicitada criação de planilha: ${title}`);
        const sheets = await GoogleService.getSheetsClient(userId, tenantId);
        const drive = await GoogleService.getDriveClient(userId, tenantId);

        // 1. Criar planilha vazia
        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title }
            }
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId;
        if (!spreadsheetId) throw new Error('Falha ao criar ID da planilha');

        // 2. Adicionar dados (Headers + Rows)
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [headers, ...rows]
            }
        });

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Planilha "${title}" criada.`);

        // Salvar spreadsheet como ativo no contexto para edições futuras
        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
        await ResourceContextStore.setActiveSpreadsheet(userId, userId, spreadsheetId, spreadsheetUrl, title);

        return {
            success: true,
            message: `Planilha "${title}" criada com sucesso.`,
            link: spreadsheetUrl
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao criar Sheet:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha ao criar planilha: ${error.message}`);
        return { success: false, message: 'Falha ao criar planilha.', error: error.message };
    }
}

/**
 * Cria uma planilha PROFISSIONAL com múltiplas abas, fórmulas, gráficos e formatação
 * Esta é a ferramenta para quando o usuário pede planilha "detalhada" ou "profissional"
 */
export async function createAdvancedSheet(
    userId: string,
    tenantId: string,
    title: string,
    type: 'financial' | 'inventory' | 'custom' = 'financial'
): Promise<GoogleActionResponse> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Criando planilha profissional: ${title}`);
        const sheets = await GoogleService.getSheetsClient(userId, tenantId);

        // 1. Criar planilha com múltiplas abas
        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title },
                sheets: [
                    { properties: { title: 'Lançamentos', sheetId: 0 } },
                    { properties: { title: 'Resumo', sheetId: 1 } },
                    { properties: { title: 'Dashboard', sheetId: 2 } }
                ]
            }
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId;
        if (!spreadsheetId) throw new Error('Falha ao criar planilha');

        // 2. Aba Lançamentos - Header + Dados de exemplo
        const lancamentosHeader = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Forma de Pagamento'];
        const lancamentosData = [
            ['01/01/2025', 'Venda de Produto A', 'Entrada', 'Venda', '1500.00', 'PIX'],
            ['02/01/2025', 'Pagamento Fornecedor', 'Saída', 'Compra', '800.00', 'Boleto'],
            ['03/01/2025', 'Serviço Prestado', 'Entrada', 'Serviço', '2000.00', 'Transferência'],
            ['04/01/2025', 'Conta de Luz', 'Saída', 'Despesa', '350.00', 'Débito Automático'],
            ['05/01/2025', 'Venda de Produto B', 'Entrada', 'Venda', '950.00', 'Cartão']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Lançamentos!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [lancamentosHeader, ...lancamentosData] }
        });

        // 3. Aba Resumo - Com fórmulas REAIS
        const resumoData = [
            ['RESUMO FINANCEIRO', ''],
            ['', ''],
            ['Total de Entradas:', '=SUMIF(Lançamentos!C:C,"Entrada",Lançamentos!E:E)'],
            ['Total de Saídas:', '=SUMIF(Lançamentos!C:C,"Saída",Lançamentos!E:E)'],
            ['', ''],
            ['SALDO:', '=B3-B4'],
            ['', ''],
            ['Entradas por Categoria:', ''],
            ['Venda', '=SUMIFS(Lançamentos!E:E,Lançamentos!C:C,"Entrada",Lançamentos!D:D,"Venda")'],
            ['Serviço', '=SUMIFS(Lançamentos!E:E,Lançamentos!C:C,"Entrada",Lançamentos!D:D,"Serviço")'],
            ['', ''],
            ['Saídas por Categoria:', ''],
            ['Compra', '=SUMIFS(Lançamentos!E:E,Lançamentos!C:C,"Saída",Lançamentos!D:D,"Compra")'],
            ['Despesa', '=SUMIFS(Lançamentos!E:E,Lançamentos!C:C,"Saída",Lançamentos!D:D,"Despesa")']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Resumo!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: resumoData }
        });

        // 4. Aplicar formatação: congelar linha 1, filtros, cores
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    // Congelar primeira linha na aba Lançamentos
                    {
                        updateSheetProperties: {
                            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
                            fields: 'gridProperties.frozenRowCount'
                        }
                    },
                    // Formatar header como negrito e fundo azul
                    {
                        repeatCell: {
                            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    },
                    // Formatar coluna Valor como moeda
                    {
                        repeatCell: {
                            range: { sheetId: 0, startRowIndex: 1, endRowIndex: 100, startColumnIndex: 4, endColumnIndex: 5 },
                            cell: {
                                userEnteredFormat: {
                                    numberFormat: { type: 'CURRENCY', pattern: 'R$ #,##0.00' }
                                }
                            },
                            fields: 'userEnteredFormat.numberFormat'
                        }
                    },
                    // Adicionar filtros na aba Lançamentos
                    {
                        setBasicFilter: {
                            filter: {
                                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 100, startColumnIndex: 0, endColumnIndex: 6 }
                            }
                        }
                    },
                    // Título em negrito na aba Resumo
                    {
                        repeatCell: {
                            range: { sheetId: 1, startRowIndex: 0, endRowIndex: 1 },
                            cell: {
                                userEnteredFormat: {
                                    textFormat: { bold: true, fontSize: 14 }
                                }
                            },
                            fields: 'userEnteredFormat.textFormat'
                        }
                    }
                ]
            }
        });

        // 5. Criar gráfico de barras na aba Dashboard
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addChart: {
                            chart: {
                                spec: {
                                    title: 'Entradas vs Saídas',
                                    basicChart: {
                                        chartType: 'COLUMN',
                                        legendPosition: 'BOTTOM_LEGEND',
                                        axis: [
                                            { position: 'BOTTOM_AXIS', title: 'Tipo' },
                                            { position: 'LEFT_AXIS', title: 'Valor (R$)' }
                                        ],
                                        domains: [{
                                            domain: { sourceRange: { sources: [{ sheetId: 1, startRowIndex: 2, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 1 }] } }
                                        }],
                                        series: [{
                                            series: { sourceRange: { sources: [{ sheetId: 1, startRowIndex: 2, endRowIndex: 4, startColumnIndex: 1, endColumnIndex: 2 }] } },
                                            targetAxis: 'LEFT_AXIS'
                                        }]
                                    }
                                },
                                position: {
                                    overlayPosition: {
                                        anchorCell: { sheetId: 2, rowIndex: 1, columnIndex: 0 },
                                        widthPixels: 600,
                                        heightPixels: 400
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        });

        // 6. Dados informativos na aba Dashboard
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Dashboard!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [['📊 DASHBOARD - Controle Financeiro']] }
        });

        // 7. Validação: verificar que a planilha existe e tem as abas
        const validation = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetNames = validation.data.sheets?.map(s => s.properties?.title) || [];

        if (!sheetNames.includes('Lançamentos') || !sheetNames.includes('Resumo') || !sheetNames.includes('Dashboard')) {
            throw new Error('Validação falhou: abas não foram criadas corretamente');
        }

        const link = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Planilha profissional "${title}" criada com 3 abas, fórmulas e gráfico.`);

        // Salvar spreadsheet como ativo no contexto para edições futuras
        await ResourceContextStore.setActiveSpreadsheet(userId, userId, spreadsheetId, link, title);

        return {
            success: true,
            message: `Planilha profissional "${title}" criada com sucesso. Contém: 3 abas (Lançamentos, Resumo, Dashboard), fórmulas automáticas, gráfico e formatação.`,
            link
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao criar planilha profissional:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha ao criar planilha profissional: ${error.message}`);
        return { success: false, message: 'Falha ao criar planilha profissional.', error: error.message };
    }
}

/**
 * Cria uma planilha PRO de Controle Financeiro baseada em um TEMPLATE MASTER
 * Pipeline: Copy Master -> Rename/Move -> Fill Data -> Validate -> Deliver
 */
export async function createProFinancialSheet(
    userId: string,
    tenantId: string,
    title: string = 'Controle Financeiro PRO',
    initialDataFromAnalysis?: string
): Promise<GoogleActionResponse> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Iniciando Pipeline PRO para: ${title}`);

        const drive = await GoogleService.getDriveClient(userId, tenantId);
        const sheets = await GoogleService.getSheetsClient(userId, tenantId);

        // 1. Localizar o Template Master (por nome ou ID configurado)
        const templateName = 'LIA_PRO_FINANCEIRO_MASTER';
        console.log(`🔍 [GoogleWorkspace] Buscando template: ${templateName}`);

        const searchResult = await drive.files.list({
            q: `name = '${templateName}' and mimeType = 'application/vnd.google-apps.spreadsheet'`,
            fields: 'files(id, name)',
            pageSize: 1
        });

        const templateId = searchResult.data.files?.[0]?.id;

        if (!templateId) {
            console.warn(`⚠️ [GoogleWorkspace] Template '${templateName}' não encontrado no Drive.`);
            // Fallback para criação manual (mantida como backup ou erro informativo)
            return {
                success: false,
                message: 'Template Master não encontrado. Por favor, crie uma planilha nomeada "LIA_PRO_FINANCEIRO_MASTER" para servir de modelo.'
            };
        }

        // 2. Clonar o Template
        console.log(`📋 [GoogleWorkspace] Clonando template ID: ${templateId}`);
        const copyResponse = await drive.files.copy({
            fileId: templateId,
            requestBody: {
                name: `${title} - ${new Date().toLocaleDateString('pt-BR')}`,
                properties: { generatedBy: 'LIA_LUMINNUS' }
            }
        });

        const spreadsheetId = copyResponse.data.id;
        if (!spreadsheetId) throw new Error('Falha ao clonar template.');

        // 3. Preencher Dados Iniciais (Transações)
        // Se houver dados da análise, tentar formatar como matriz. Senão usa demoData.
        let valuesToInsert = [
            ['01/01/2025', 'Saldo Inicial', 'Entrada', 'Investimentos', '5000.00', 'Transferência', 'Saldo de abertura'],
            ['02/01/2025', 'Aluguel Escritório', 'Saída', 'Aluguel', '2500.00', 'Boleto', 'Referente Janeiro'],
            ['05/01/2025', 'Venda Serviço A', 'Entrada', 'Vendas', '3800.00', 'PIX', 'Cliente Alpha']
        ];

        if (initialDataFromAnalysis) {
            try {
                // Tentar converter de JSON se vier estruturado ou formatar texto em linhas
                console.log(`📊 [GoogleWorkspace] Processando dados de análise para injeção.`);
                // Lógica de parser simples para demonstração (pode ser expandida)
                if (initialDataFromAnalysis.includes('[')) {
                    const parsed = JSON.parse(initialDataFromAnalysis);
                    if (Array.isArray(parsed)) valuesToInsert = parsed;
                }
            } catch (e) {
                console.warn(`⚠️ [GoogleWorkspace] Falha ao parsear initialDataFromAnalysis, usando demoData.`);
            }
        }

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Transações!A2',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: valuesToInsert }
        });

        // 4. Validação Pós-Execução (Garantir que arquivo existe e é acessível)
        const fileMetadata = await drive.files.get({
            fileId: spreadsheetId,
            fields: 'webViewLink, id, name'
        });

        const link = fileMetadata.data.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

        // 5. Persistir no Contexto
        await ResourceContextStore.setActiveSpreadsheet(userId, userId, spreadsheetId, link, title);

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Planilha PRO clonada e personalizada: ${spreadsheetId}`);

        return {
            success: true,
            message: `Sua planilha profissional "${title}" está pronta! Clonei o template master e já configurei o dashboard para você.`,
            link
        };

    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro no Pipeline PRO:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha no Pipeline PRO: ${error.message}`);
        return { success: false, message: 'Não consegui criar a planilha PRO usando o template.', error: error.message };
    }
}

/**
 * Edita uma planilha existente no Google Sheets
 * @param spreadsheetId ID da planilha existente
 * @param operations Lista de operações a executar
 */
export async function updateGoogleSheet(
    userId: string,
    tenantId: string,
    spreadsheetId: string,
    operations: {
        addSheet?: { title: string };
        updateRange?: { range: string; values: any[][] };
        addFormula?: { range: string; formula: string };
        formatRange?: { range: string; format: 'bold' | 'currency' | 'date' | 'color'; color?: string };
        freezeRows?: number;
        addFilter?: { sheetId: number; range: string };
    }[]
): Promise<GoogleActionResponse> {
    try {
        // Se spreadsheetId não foi fornecido ou está vazio, buscar do contexto
        let effectiveSpreadsheetId = spreadsheetId;
        if (!spreadsheetId || spreadsheetId === '' || spreadsheetId === 'undefined') {
            const context = await ResourceContextStore.getActiveSpreadsheet(userId);
            if (context) {
                effectiveSpreadsheetId = context.id;
                console.log(`📋 [UpdateSheet] Usando spreadsheetId do contexto: ${effectiveSpreadsheetId}`);
            } else {
                return {
                    success: false,
                    message: 'Não há planilha ativa no contexto. Por favor, crie uma planilha primeiro.',
                    error: 'NO_ACTIVE_SPREADSHEET'
                };
            }
        }

        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Solicitada edição de planilha: ${effectiveSpreadsheetId}`);
        const sheets = await GoogleService.getSheetsClient(userId, tenantId);

        for (const op of operations) {
            // Adicionar nova aba
            if (op.addSheet) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: effectiveSpreadsheetId,
                    requestBody: {
                        requests: [{ addSheet: { properties: { title: op.addSheet.title } } }]
                    }
                });
            }

            // Atualizar range com valores
            if (op.updateRange) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: effectiveSpreadsheetId,
                    range: op.updateRange.range,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: op.updateRange.values }
                });
            }

            // Adicionar fórmula
            if (op.addFormula) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: effectiveSpreadsheetId,
                    range: op.addFormula.range,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [[op.addFormula.formula]] }
                });
            }

            // Congelar linhas
            if (op.freezeRows) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: effectiveSpreadsheetId,
                    requestBody: {
                        requests: [{
                            updateSheetProperties: {
                                properties: { sheetId: 0, gridProperties: { frozenRowCount: op.freezeRows } },
                                fields: 'gridProperties.frozenRowCount'
                            }
                        }]
                    }
                });
            }
        }

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Planilha atualizada com ${operations.length} operações.`);
        return {
            success: true,
            message: `Planilha atualizada com sucesso (${operations.length} modificações).`,
            link: `https://docs.google.com/spreadsheets/d/${effectiveSpreadsheetId}`
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao editar Sheet:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha ao editar planilha: ${error.message}`);
        return { success: false, message: 'Falha ao editar planilha.', error: error.message };
    }
}

/**
 * Cria um documento no Google Docs
 */
export async function createGoogleDoc(userId: string, tenantId: string, title: string, content: string): Promise<GoogleActionResponse> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Solicitada criação de documento: ${title}`);
        const docs = await GoogleService.getDocsClient(userId, tenantId);
        const drive = await GoogleService.getDriveClient(userId, tenantId);

        // 1. Criar documento
        const doc = await drive.files.create({
            requestBody: {
                name: title,
                mimeType: 'application/vnd.google-apps.document'
            }
        });

        const documentId = doc.data.id;
        if (!documentId) throw new Error('Falha ao criar ID do documento');

        // 2. Inserir conteúdo
        await docs.documents.batchUpdate({
            documentId,
            requestBody: {
                requests: [
                    {
                        insertText: {
                            location: { index: 1 },
                            text: content
                        }
                    }
                ]
            }
        });

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Documento "${title}" criado.`);
        return {
            success: true,
            message: `Documento "${title}" criado com sucesso.`,
            link: `https://docs.google.com/document/d/${documentId}`
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao criar Doc:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha ao criar documento: ${error.message}`);
        return { success: false, message: 'Falha ao criar documento.', error: error.message };
    }
}

/**
 * Sanitiza endereços de e-mail provenientes de transcrição de voz
 */
function sanitizeEmail(email: string): string {
    if (!email) return email;

    let sanitized = email.toLowerCase().trim();

    // Substituições comuns de transcrição
    sanitized = sanitized
        .replace(/\s+arroba\s+/g, '@')
        .replace(/\s+aobo\s+/g, '@')
        .replace(/(\s+)aobo(\s+)/g, '@')
        .replace(/aobo/g, '@')
        .replace(/\s+ponto\s+com/g, '.com')
        .replace(/\s+ponto\s+br/g, '.br')
        .replace(/\s+ponto\s+/g, '.')
        .replace(/,/g, '.')
        .replace(/\s+/g, ''); // Remove todos os espaços restantes

    console.log(`📧 [GmailService] Sanitizando e-mail: "${email}" -> "${sanitized}"`);
    return sanitized;
}

/**
 * Envia um e-mail via Gmail
 */
export async function sendGmail(userId: string, tenantId: string, to: string, subject: string, body: string): Promise<GoogleActionResponse> {
    try {
        // Sanitizar destinatário (vital para voz)
        const sanitizedTo = sanitizeEmail(to);

        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Solicitado envio de e-mail para: ${sanitizedTo} (original: ${to})`);
        const gmail = await GoogleService.getGmailClient(userId, tenantId);

        // Construir mensagem RFC 2822
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `To: ${sanitizedTo}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            body
        ];
        const message = messageParts.join('\n');

        // Base64Url encode
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `E-mail enviado para ${sanitizedTo}.`);
        return {
            success: true,
            message: `E-mail enviado para ${sanitizedTo} com sucesso.`
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao enviar Gmail:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha ao enviar e-mail: ${error.message}`);
        return { success: false, message: 'Falha ao enviar e-mail.', error: error.message };
    }
}

/**
 * Cria um evento no Google Calendar COM DETECÇÃO DE CONFLITOS
 */
export async function createCalendarEvent(
    userId: string,
    tenantId: string,
    title: string,
    start: string,
    end: string,
    description?: string,
    forceCreate: boolean = false
): Promise<GoogleActionResponse & { conflictDetected?: boolean; existingEvents?: any[] }> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Solicitado agendamento de evento: ${title}`);
        const calendar = await GoogleService.getCalendarClient(userId, tenantId);

        const startDate = new Date(start);
        const endDate = new Date(end);

        // DETECÇÃO DE CONFLITOS: Verifica se já existe evento no mesmo horário
        if (!forceCreate) {
            const existingEvents = await calendar.events.list({
                calendarId: 'primary',
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true
            });

            const conflicts = existingEvents.data.items || [];
            if (conflicts.length > 0) {
                const conflictNames = conflicts.map(e => `"${e.summary}"`).join(', ');
                console.log(`⚠️ [GoogleWorkspace] Conflito detectado: ${conflictNames}`);
                await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Conflito detectado: ${conflictNames}`);



                return {
                    success: false,
                    message: `⚠️ **CONFLITO DETECTADO!** Já existe(m) evento(s) neste horário: ${conflictNames}. Deseja agendar mesmo assim? (diga "sim, pode agendar")`,
                    conflictDetected: true,
                    existingEvents: conflicts.map(e => ({
                        id: e.id,
                        title: e.summary,
                        start: e.start?.dateTime || e.start?.date,
                        end: e.end?.dateTime || e.end?.date
                    }))
                };
            }
        }

        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: title,
                description,
                start: { dateTime: startDate.toISOString() },
                end: { dateTime: endDate.toISOString() }
            }
        });

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Evento "${title}" agendado.`);
        return {
            success: true,
            message: `Evento "${title}" agendado com sucesso.`,
            link: event.data.htmlLink || undefined
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao agendar evento:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha ao agendar evento: ${error.message}`);
        return { success: false, message: 'Falha ao agendar evento.', error: error.message };
    }
}

/**
 * Atualiza um evento existente no Google Calendar
 * Usado para mover eventos de data/hora ou alterar título/descrição
 */
export async function updateCalendarEvent(
    userId: string,
    tenantId: string,
    eventId: string,
    updates: { title?: string; start?: string; end?: string; description?: string }
): Promise<GoogleActionResponse> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Atualizando evento: ${eventId}`);
        const calendar = await GoogleService.getCalendarClient(userId, tenantId);

        // Construir objeto de patch apenas com campos fornecidos
        const patchBody: any = {};
        if (updates.title) patchBody.summary = updates.title;
        if (updates.description !== undefined) patchBody.description = updates.description;
        if (updates.start) patchBody.start = { dateTime: new Date(updates.start).toISOString() };
        if (updates.end) patchBody.end = { dateTime: new Date(updates.end).toISOString() };

        const event = await calendar.events.patch({
            calendarId: 'primary',
            eventId,
            requestBody: patchBody
        });

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Evento "${event.data.summary}" atualizado.`);
        return {
            success: true,
            message: `Evento "${event.data.summary}" atualizado com sucesso.`,
            link: event.data.htmlLink || undefined
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao atualizar evento:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha ao atualizar evento: ${error.message}`);
        return { success: false, message: 'Falha ao atualizar evento.', error: error.message };
    }
}

/**
 * Deleta um evento do Google Calendar
 */
export async function deleteCalendarEvent(
    userId: string,
    tenantId: string,
    eventId: string
): Promise<GoogleActionResponse> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Deletando evento: ${eventId}`);
        const calendar = await GoogleService.getCalendarClient(userId, tenantId);

        // Primeiro buscar o evento para ter o nome
        const eventData = await calendar.events.get({ calendarId: 'primary', eventId });
        const eventName = eventData.data.summary || 'Evento';

        await calendar.events.delete({ calendarId: 'primary', eventId });

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Evento "${eventName}" deletado.`);
        return {
            success: true,
            message: `Evento "${eventName}" deletado com sucesso.`
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao deletar evento:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha ao deletar evento: ${error.message}`);
        return { success: false, message: 'Falha ao deletar evento.', error: error.message };
    }
}

/**
 * Obtém detalhes de um evento específico do Google Calendar
 */
export async function getCalendarEvent(
    userId: string,
    tenantId: string,
    eventId: string
): Promise<GoogleActionResponse & { event?: any }> {
    try {
        const calendar = await GoogleService.getCalendarClient(userId, tenantId);
        const response = await calendar.events.get({ calendarId: 'primary', eventId });
        const event = response.data;

        const startTime = event.start?.dateTime || event.start?.date;
        const endTime = event.end?.dateTime || event.end?.date;

        return {
            success: true,
            message: `Evento: "${event.summary}" de ${new Date(startTime).toLocaleString('pt-BR')} até ${new Date(endTime).toLocaleString('pt-BR')}`,
            event: {
                id: event.id,
                title: event.summary,
                description: event.description,
                start: startTime,
                end: endTime,
                link: event.htmlLink
            }
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao buscar evento:', error);
        return { success: false, message: 'Evento não encontrado.', error: error.message };
    }
}

/**
 * Pesquisa eventos por título no Google Calendar
 */
export async function searchCalendarEvents(
    userId: string,
    tenantId: string,
    query: string,
    daysAhead: number = 30
): Promise<GoogleActionResponse & { events?: any[] }> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Pesquisando eventos: "${query}"`);
        const calendar = await GoogleService.getCalendarClient(userId, tenantId);

        const now = new Date();
        const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: futureDate.toISOString(),
            q: query, // Busca no título e descrição
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.data.items || [];
        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Encontrados ${events.length} eventos para "${query}".`);

        if (events.length === 0) {
            return {
                success: true,
                message: `Não encontrei eventos com "${query}" nos próximos ${daysAhead} dias.`,
                events: []
            };
        }

        let message = `Encontrei ${events.length} evento(s) com "${query}":\n\n`;
        events.forEach((event, i) => {
            const startTime = event.start?.dateTime || event.start?.date;
            const dateStr = new Date(startTime).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
            const timeStr = new Date(startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            message += `${i + 1}. **${event.summary}** - ${dateStr} às ${timeStr}\n`;
        });

        return {
            success: true,
            message,
            events: events.map(e => ({
                id: e.id,
                title: e.summary,
                description: e.description,
                start: e.start?.dateTime || e.start?.date,
                end: e.end?.dateTime || e.end?.date,
                link: e.htmlLink
            }))
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao pesquisar eventos:', error);
        return { success: false, message: 'Falha ao pesquisar eventos.', error: error.message };
    }
}

/**
 * Lista eventos do Google Calendar
 * @param timeMin Início do intervalo (ISO String, default: agora)
 * @param timeMax Fim do intervalo (ISO String, default: fim do dia)
 */
export async function listCalendarEvents(
    userId: string,
    tenantId: string,
    timeMin?: string,
    timeMax?: string
): Promise<GoogleActionResponse & { events?: any[] }> {
    try {
        const start = timeMin || new Date().toISOString();
        const end = timeMax || new Date(new Date().setHours(23, 59, 59, 999)).toISOString();

        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Listando eventos de ${start} até ${end}`);
        const calendar = await GoogleService.getCalendarClient(userId, tenantId);

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: start,
            timeMax: end,
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.data.items || [];

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Encontrados ${events.length} eventos.`);

        let message = `Encontrei ${events.length} eventos na sua agenda:\n\n`;
        events.forEach((event, i) => {
            const startTime = event.start?.dateTime || event.start?.date;
            const timeStr = new Date(startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            message += `${i + 1}. **${event.summary}** às ${timeStr}\n`;
        });

        return {
            success: true,
            message: events.length > 0 ? message : 'Nenhum evento encontrado para este período.',
            events: events.map(e => ({
                id: e.id,
                title: e.summary,
                description: e.description,
                start: e.start?.dateTime || e.start?.date,
                end: e.end?.dateTime || e.end?.date,
                link: e.htmlLink
            }))
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao listar eventos:', error);
        return { success: false, message: 'Falha ao listar eventos da agenda.', error: error.message };
    }
}


// ============== GMAIL READ TOOLS (v2.0) ==============

interface GmailMessage {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    link: string;
}

interface GmailListResponse extends GoogleActionResponse {
    emails?: GmailMessage[];
    count?: number;
    table?: any;
}

/**
 * Lista os e-mails mais recentes da caixa de entrada
 * @param maxResults Número máximo de e-mails a retornar (default: 10)
 * @param query Query opcional no formato do Gmail (ex: "is:unread", "from:fulano")
 */
export async function listGmailMessages(
    userId: string,
    tenantId: string,
    maxResults: number = 10,
    query?: string
): Promise<GmailListResponse> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Listando e-mails: maxResults=${maxResults}, query=${query || 'nenhuma'}`);
        const gmail = await GoogleService.getGmailClient(userId, tenantId);

        // 1. Listar IDs dos e-mails
        const listParams: any = {
            userId: 'me',
            maxResults,
            labelIds: ['INBOX']
        };
        if (query) {
            listParams.q = query;
        }

        const listResponse = await gmail.users.messages.list(listParams);
        const messageIds = listResponse.data.messages || [];

        if (messageIds.length === 0) {
            return {
                success: true,
                message: query
                    ? `Nenhum e-mail encontrado para a busca: "${query}"`
                    : 'Sua caixa de entrada está vazia.',
                emails: [],
                count: 0
            };
        }

        // 2. Buscar detalhes de cada e-mail
        const emails: GmailMessage[] = [];
        for (const msg of messageIds.slice(0, maxResults)) {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'Date']
            });

            const headers = detail.data.payload?.headers || [];
            const fromHeader = headers.find(h => h.name === 'From')?.value || 'Desconhecido';
            const subjectHeader = headers.find(h => h.name === 'Subject')?.value || '(Sem assunto)';
            const dateHeader = headers.find(h => h.name === 'Date')?.value || '';

            // Formatar data para DD/MM
            let formattedDate = dateHeader;
            try {
                const d = new Date(dateHeader);
                formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            } catch (e) { }

            // Criar link direto universal para o Gmail
            const gmailLink = `https://mail.google.com/mail/u/0/#all/${msg.id}`;

            emails.push({
                id: msg.id!,
                from: fromHeader.replace(/<.*>/, '').trim(), // Extrair só o nome
                subject: subjectHeader,
                date: formattedDate,
                snippet: detail.data.snippet || '',
                link: gmailLink
            });
        }

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `Listados ${emails.length} e-mails.`);

        // Criar mensagem formatada no padrão CARD VISUAL (Protocolo v2.0)
        let formattedMessage = `Aqui estão os e-mails importantes que encontrei:\n\n\n`;

        emails.forEach((email, index) => {
            const emoji = index === 0 ? '🚨' : '📩';
            formattedMessage += `### ${index + 1}. ${emoji} ${email.subject}\n\n`;
            formattedMessage += `**De:** ${email.from}\n`;
            formattedMessage += `**Data:** ${email.date}\n\n`;
            formattedMessage += `> **Resumo:**\n`;
            formattedMessage += `> ${email.snippet.substring(0, 150)}${email.snippet.length > 150 ? '...' : ''}\n\n`;
            formattedMessage += `🔗 **[Acessar este e-mail no Gmail](${email.link})**\n\n`;
            formattedMessage += `***\n\n\n`;
        });

        formattedMessage += `\n\nQuer que eu responda algum desses, arquive ou resuma alguma conversa?`;

        return {
            success: true,
            message: formattedMessage,
            emails,
            count: emails.length,
            table: {
                columns: ['Assunto', 'De', 'Data', 'Ação'],
                rows: emails.map(e => [
                    e.subject,
                    e.from,
                    e.date,
                    `[Abrir](${e.link})`
                ])
            }
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao listar e-mails:', error);
        await AuditService.log(userId, tenantId || 'system', 'google', 'execution_failed', 'error', `Falha ao listar e-mails: ${error.message}`);
        return { success: false, message: 'Falha ao acessar seus e-mails.', error: error.message };
    }
}

/**
 * Pesquisa e-mails usando linguagem natural convertida para query do Gmail
 * @param searchTerm Termo de busca em linguagem natural
 */
export async function searchGmail(
    userId: string,
    tenantId: string,
    searchTerm: string
): Promise<GmailListResponse> {
    try {
        // Converter linguagem natural para query do Gmail
        let gmailQuery = '';
        const queryParts: string[] = [];

        // Padrões de conversão
        const lowerTerm = searchTerm.toLowerCase();

        // ==============================
        // CATEGORIAS/LABELS DO GMAIL
        // ==============================
        if (lowerTerm.includes('promoç') || lowerTerm.includes('promocao') || lowerTerm.includes('promocões')) {
            queryParts.push('category:promotions');
        }
        if (lowerTerm.includes('social')) {
            queryParts.push('category:social');
        }
        if (lowerTerm.includes('atualizaç') || lowerTerm.includes('updates')) {
            queryParts.push('category:updates');
        }
        if (lowerTerm.includes('principal') || lowerTerm.includes('primary')) {
            queryParts.push('category:primary');
        }
        if (lowerTerm.includes('fórum') || lowerTerm.includes('forums')) {
            queryParts.push('category:forums');
        }

        // ==============================
        // FILTROS TEMPORAIS (v3.0 - Robust Date Parsing)
        // ==============================
        const monthsPT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const monthsEN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

        function formatDate(date: Date) {
            return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        }

        if (lowerTerm.includes('hoje') || lowerTerm.includes('today')) {
            const today = new Date();
            queryParts.push(`after:${formatDate(today)}`);
        } else if (lowerTerm.includes('ontem') || lowerTerm.includes('yesterday')) {
            const yesterday = new Date(Date.now() - 86400000);
            const today = new Date();
            // Precisão: entre o início de ontem e o início de hoje
            queryParts.push(`after:${formatDate(yesterday)} before:${formatDate(today)}`);
        } else if (lowerTerm.includes('semana') || lowerTerm.includes('week')) {
            const weekAgo = new Date(Date.now() - 7 * 86400000);
            queryParts.push(`after:${formatDate(weekAgo)}`);
        } else {
            // Tentar extrair data específica (ex: "dia 13", "13 de janeiro", "january 13")
            const monthNames = [...monthsPT, ...monthsEN].join('|');
            const dayMatch = lowerTerm.match(/dia\s+(\d{1,2})/i) ||
                lowerTerm.match(new RegExp(`(\\d{1,2})(?:\\s+de\\s+|\\s+)?(?:${monthNames})`, 'i')) ||
                lowerTerm.match(new RegExp(`(?:${monthNames})\\s+(\\d{1,2})`, 'i'));

            if (dayMatch) {
                const day = parseInt(dayMatch[1]);
                let month = new Date().getMonth(); // Default mes atual
                let year = new Date().getFullYear();

                // Verificar se o mês foi mencionado
                for (let i = 0; i < 12; i++) {
                    if (lowerTerm.includes(monthsPT[i]) || lowerTerm.includes(monthsEN[i])) {
                        month = i;
                        break;
                    }
                }

                const targetDate = new Date(year, month, day);
                const dayAfter = new Date(year, month, day + 1);

                // Se a data for no futuro, assume que é do ano passado
                if (targetDate > new Date()) {
                    targetDate.setFullYear(year - 1);
                    dayAfter.setFullYear(year - 1);
                }

                queryParts.push(`after:${formatDate(targetDate)} before:${formatDate(dayAfter)}`);
            }
        }

        // ==============================
        // REMETENTE
        // ==============================
        const fromMatch = lowerTerm.match(/(?:de|from|do|da)\s+(\w+)/i);
        if (fromMatch) {
            queryParts.push(`from:${fromMatch[1]}`);
        }

        // ==============================
        // ASSUNTO
        // ==============================
        const subjectMatch = lowerTerm.match(/(?:sobre|subject|assunto)\s+(.+)/i);
        if (subjectMatch) {
            queryParts.push(`subject:${subjectMatch[1]}`);
        }

        // ==============================
        // STATUS
        // ==============================
        if (lowerTerm.includes('não lido') || lowerTerm.includes('não lidos') || lowerTerm.includes('unread')) {
            queryParts.push('is:unread');
        }

        // ==============================
        // ANEXOS
        // ==============================
        if (lowerTerm.includes('anexo') || lowerTerm.includes('arquivo') || lowerTerm.includes('attachment')) {
            queryParts.push('has:attachment');
            if (lowerTerm.includes('pdf')) {
                queryParts.push('filename:pdf');
            } else if (lowerTerm.includes('planilha') || lowerTerm.includes('excel')) {
                queryParts.push('filename:xlsx OR filename:xls');
            }
        }

        // Montar query final
        gmailQuery = queryParts.length > 0 ? queryParts.join(' ') : searchTerm;

        console.log(`🔍 [Gmail Search] Query convertida: "${searchTerm}" -> "${gmailQuery}"`);

        // Executar busca
        return await listGmailMessages(userId, tenantId, 10, gmailQuery);
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao pesquisar e-mails:', error);
        return { success: false, message: 'Falha ao pesquisar e-mails.', error: error.message };
    }
}

/**
 * Obtém o conteúdo completo de um e-mail específico
 * @param messageId ID do e-mail no Gmail
 */
export async function getGmailMessage(
    userId: string,
    tenantId: string,
    messageId: string
): Promise<GoogleActionResponse & { content?: string; attachments?: string[] }> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Lendo e-mail: ${messageId}`);
        const gmail = await GoogleService.getGmailClient(userId, tenantId);

        const detail = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
        });

        // Extrair headers
        const headers = detail.data.payload?.headers || [];
        const from = headers.find(h => h.name === 'From')?.value || 'Desconhecido';
        const subject = headers.find(h => h.name === 'Subject')?.value || '(Sem assunto)';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        // Extrair corpo (text/plain ou text/html)
        let body = '';
        const parts = detail.data.payload?.parts || [];
        const textPart = parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        } else if (detail.data.payload?.body?.data) {
            body = Buffer.from(detail.data.payload.body.data, 'base64').toString('utf-8');
        }

        // Listar anexos
        const attachments = parts
            .filter(p => p.filename && p.filename.length > 0)
            .map(p => p.filename as string);

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `E-mail lido: ${subject}`);

        return {
            success: true,
            message: `**De:** ${from}\n**Assunto:** ${subject}\n**Data:** ${date}`,
            content: body.substring(0, 2000), // Limitar para não sobrecarregar
            attachments
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao ler e-mail:', error);
        return { success: false, message: 'Falha ao ler o e-mail.', error: error.message };
    }
}

/**
 * Move um e-mail para a lixeira (trash)
 * @param messageId ID do e-mail no Gmail
 */
export async function deleteGmailMessage(
    userId: string,
    tenantId: string,
    messageId: string
): Promise<GoogleActionResponse> {
    try {
        await AuditService.log(userId, tenantId, 'google', 'execution_requested', 'success', `Deletando e-mail: ${messageId}`);
        const gmail = await GoogleService.getGmailClient(userId, tenantId);

        await gmail.users.messages.trash({
            userId: 'me',
            id: messageId
        });

        await AuditService.log(userId, tenantId, 'google', 'execution_success', 'success', `E-mail ${messageId} movido para a lixeira.`);

        return {
            success: true,
            message: 'E-mail movido para a lixeira com sucesso.'
        };
    } catch (error: any) {
        console.error('[GoogleWorkspace] Erro ao deletar e-mail:', error);
        return { success: false, message: 'Falha ao deletar o e-mail.', error: error.message };
    }
}

