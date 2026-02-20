// ======================================================================
// 🔍 VISION ROUTES - Análise de imagens/PDFs com Gemini Vision
// ======================================================================
// Suporta: Imagens, PDFs, Planilhas, Documentos
// Capacidades: Análise, Extração de dados, OCR, Gráficos, Tabelas
// ======================================================================

import { Express } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { AuditService } from '../services/auditService.js';
import { AIRouter } from '../services/aiRouter.js';
import { FileService } from '../services/fileService.js';
import { saveMessage } from '../config/supabase.js';
import crypto from 'crypto';




// Criar pasta uploads se não existir
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar multer para upload de arquivos
const upload = multer({
    dest: uploadsDir,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            // PDFs
            'application/pdf',
            // Microsoft Office
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-powerpoint', // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            // Google Docs exportados
            'application/rtf',
            // Compactados
            'application/zip', 'application/x-zip-compressed', 'application/x-tar', 'application/gzip',
            // Código
            'application/javascript', 'application/x-javascript', 'text/javascript',
            'application/typescript', 'text/typescript',
            'application/json', 'application/xml', 'text/html', 'text/css',
            'application/x-python', 'text/x-python', 'text/x-java-source',
            // E-mails
            'message/rfc822', // .eml
        ];

        if (allowedTypes.includes(file.mimetype) ||
            file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('text/') ||
            file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|js|ts|tsx|py|java|go|cs|env|md|rtf|log|yml|yaml|xml|html|eml|msg)$/i)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype}`));
        }
    },
});


export function setupVisionRoutes(app: Express) {

    // ======================================================================
    // POST /api/vision/analyze - Análise completa de arquivos
    // ======================================================================
    app.post('/api/vision/analyze', upload.array('files', 10), async (req, res) => {
        let filePaths: string[] = [];

        try {
            const files = req.files as Express.Multer.File[];
            const userPrompt = req.body.prompt || '';
            const userId = req.body.userId;
            const tenantId = req.body.tenantId;

            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }

            if (!userId || !tenantId) {
                return res.status(400).json({ error: 'userId e tenantId são obrigatórios' });
            }

            filePaths = files.map(f => f.path);
            const geminiApiKey = process.env.GEMINI_API_KEY;

            if (!geminiApiKey) {
                return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
            }

            console.log(`📤 Analisando ${files.length} arquivo(s). Primeiro: ${files[0].originalname}`);

            const processedFilesForAIRouter: any[] = [];
            const attachmentsForMessage: any[] = [];
            let inventoryPromptParts: string[] = [];
            let wordTextPromptParts: string[] = [];

            // IDs validados (já checados acima)
            const finalUserId = userId;
            const finalTenantId = tenantId;

            for (const file of files) {
                const filePath = file.path;
                console.log(`  -> Processando: ${file.originalname} (${file.mimetype})`);

                // 1. Log Ingestão
                await AuditService.log(finalUserId, finalTenantId, 'native', 'file_ingested', 'success', `Arquivo recebido: ${file.originalname}`);

                // Buffers e base64 para o Gemini
                const fileBuffer = fs.readFileSync(filePath);
                let base64Data = fileBuffer.toString('base64');
                let effectiveMimetype = file.mimetype;

                // Determinar tipo de análise baseado no arquivo
                const analysisType = getAnalysisType(file.mimetype, file.originalname);

                // ========================================
                // TRATAMENTO ESPECIAL: Word Documents (.docx)
                // ========================================
                const isWordDoc = file.mimetype.includes('wordprocessingml') ||
                    file.originalname.toLowerCase().endsWith('.docx') ||
                    file.originalname.toLowerCase().endsWith('.doc');

                let extractedText = '';
                if (isWordDoc) {
                    try {
                        const mammoth = await import('mammoth');
                        const extractFn = (mammoth as any).extractRawText || (mammoth as any).default?.extractRawText;
                        if (!extractFn) throw new Error('Não foi possível encontrar a função de extração do mammoth');

                        const result = await extractFn({ buffer: fileBuffer });
                        extractedText = result.value;
                        console.log(`    📄 Texto extraído do Word: ${extractedText.length} caracteres`);

                        // Converter para texto simples para o Gemini
                        base64Data = Buffer.from(extractedText, 'utf-8').toString('base64');
                        effectiveMimetype = 'text/plain';
                        wordTextPromptParts.push(`CONTEÚDO DO DOCUMENTO "${file.originalname}":\n\n${extractedText}`);
                    } catch (wordError: any) {
                        console.error('    ❌ Erro ao extrair texto do Word:', wordError);
                    }
                }

                // Tratamento especial para compactados
                if (analysisType === 'archive') {
                    try {
                        const { ArchiveService } = await import('../services/archiveService.js');
                        const inventory = ArchiveService.getInventory(filePath, file.originalname);
                        inventoryPromptParts.push(`INVENTÁRIO DO ARQUIVO COMPACTADO "${file.originalname}":\n${JSON.stringify(inventory, null, 2)}`);
                        console.log(`    📦 Inventário gerado para ${file.originalname}`);
                    } catch (archiveErr) {
                        console.error('    ❌ Erro ao gerar inventário:', archiveErr);
                    }
                }

                // 1. Upload do arquivo para Supabase Storage
                let storageUrl: string | null = null;
                let storagePath: string | null = null;
                let fileId: string | undefined = undefined;

                try {
                    const uploadResult = await FileService.uploadToStorage(
                        finalTenantId,
                        finalUserId,
                        fileBuffer,
                        file.originalname,
                        file.mimetype
                    );

                    if (uploadResult) {
                        storageUrl = uploadResult.url;
                        storagePath = uploadResult.path;
                        console.log(`    ✅ Arquivo salvo no Storage: ${storagePath}`);

                        // Determinar pasta
                        let folderName = 'Documentos';
                        if (file.mimetype.startsWith('image/')) folderName = 'Imagens';
                        else if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.originalname.match(/\.(xls|xlsx|csv)$/i)) folderName = 'Planilhas';
                        else if (file.mimetype.includes('presentation') || file.originalname.match(/\.(ppt|pptx)$/i)) folderName = 'Apresentações';

                        const folderId = await FileService.getOrCreateFolder(finalTenantId, finalUserId, folderName, 'lia_shared');

                        // 2. REGISTRO NO BANCO DE DADOS
                        const fileRecord = await FileService.saveMetadata({
                            tenant_id: finalTenantId,
                            user_id: finalUserId,
                            file_name: file.originalname,
                            file_type: file.mimetype,
                            file_size: file.size,
                            storage_path: storagePath,
                            storage_url: storageUrl,
                            folder_id: folderId,
                            parse_method: 'gemini-vision',
                            status: 'uploaded',
                            scope: 'lia_shared',
                            source: 'lia_attachment'
                        });

                        fileId = fileRecord?.id;

                        // Emitir evento Socket
                        const io = req.app.get('io');
                        if (io && fileRecord) {
                            io.to(`tenant:${finalTenantId}`).emit('file-uploaded', fileRecord);
                        }

                        // Adicionar aos anexos da mensagem
                        attachmentsForMessage.push({
                            id: fileId,
                            name: file.originalname,
                            type: file.mimetype.startsWith('image/') ? 'image' : 'document',
                            url: storageUrl || '',
                            snapshot: extractedText || null
                        });

                        // Adicionar ao array para o AIRouter
                        processedFilesForAIRouter.push({
                            mimetype: effectiveMimetype,
                            data: base64Data,
                            name: file.originalname,
                            size: file.size,
                            id: fileId,
                            storage_url: storageUrl || undefined,
                            storage_path: storagePath || undefined,
                            folder_id: folderId || undefined
                        });
                    }
                } catch (persistError: any) {
                    // v17.0: PERSIST_WARN - Logar mas não abortar
                    console.error(JSON.stringify({
                        timestamp: new Date().toISOString(),
                        component: 'VISION_ROUTE',
                        stage: 'PERSIST_WARN',
                        conversationId: req.body.conversationId,
                        userId,
                        tenantId,
                        fileName: file.originalname,
                        error: {
                            message: persistError.message,
                            code: persistError.code,
                            constraint: persistError.constraint
                        }
                    }));

                    // Continuar com dados mínimos para análise
                    processedFilesForAIRouter.push({
                        name: file.originalname,
                        mimetype: effectiveMimetype,
                        data: base64Data,
                        size: file.size,
                        extracted_text: extractedText
                    });
                }
            }

            // Gating: Verificar se pelo menos um arquivo foi processado
            if (processedFilesForAIRouter.length === 0) {
                return res.status(500).json({ error: 'Nenhum arquivo pôde ser processado ou salvo no Storage.' });
            }

            // Construir prompt final
            let finalPrompt = userPrompt;
            if (inventoryPromptParts.length > 0) {
                finalPrompt = `${finalPrompt}\n\n${inventoryPromptParts.join('\n\n')}`;
            }
            if (wordTextPromptParts.length > 0) {
                finalPrompt = `${finalPrompt}\n\n${wordTextPromptParts.join('\n\n')}`;
            }

            // Detectar intenção
            let userIntent: 'resumo' | 'tabela' | 'completo' = 'resumo';
            const lowerPrompt = (userPrompt || '').toLowerCase();
            if (lowerPrompt.includes('tabela') || lowerPrompt.includes('planilha') || lowerPrompt.includes('coluna')) {
                userIntent = 'tabela';
            } else if (lowerPrompt.includes('extrai tudo') || lowerPrompt.includes('completo') || lowerPrompt.includes('detalhar')) {
                userIntent = 'completo';
            }

            // Governança de Output (Prompt Enrichment)
            const { OutputGovernance } = await import('../services/outputGovernance.js');
            const userPlan = req.body.userPlan || 'free';
            const userRole = req.body.userRole || 'client';
            const enrichedPrompt = OutputGovernance.enrichPrompt(finalPrompt, files.map(f => ({ type: f.mimetype })), userPlan);

            // 2. Processar via AIRouter
            const connections = req.body.connections || {};

            let result = await AIRouter.route({
                userId,
                tenantId,
                prompt: enrichedPrompt,
                conversationId: req.body.conversationId,
                userIntent,
                userPlan,
                userRole,
                connections,
                files: processedFilesForAIRouter
            });

            // Governança de Output (Response)
            if (!result.detailPayload?.isFallback) {
                try {
                    const { OpenAIService } = await import('../services/openAIService.js');
                    const governed = await OutputGovernance.forMultiModal(
                        result.text || '',
                        finalPrompt,
                        async (retryPrompt) => {
                            const retryResult = await OpenAIService.chat(retryPrompt, [], 'gpt-4o-mini');
                            return retryResult.text;
                        },
                        files.map(f => ({ type: f.mimetype })),
                        userPlan
                    );
                    result = { ...result, text: governed.markdown, detailPayload: governed.detailPayload };
                } catch (govError) {
                    console.warn('⚠️ [OutputGovernance] Erro na governança multimodal:', govError);
                }
            }

            // 4. Persistir mensagens no Banco de Dados
            const conversationId = req.body.conversationId;
            let messageId = req.body.messageId;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            // Validar se o messageId recebido é um UUID válido, senão gerar novo
            if (!messageId || !uuidRegex.test(messageId)) {
                console.warn(`⚠️ [Vision] messageId inválido recebido: "${messageId}". Gerando novo UUID.`);
                messageId = crypto.randomUUID();
            }

            let responseMessageId: string | undefined;

            // v17.0: Persistir mensagens - Blindar contra falhas de DB
            if (conversationId) {
                try {
                    // GARANTIR UUID VÁLIDO para a resposta também
                    responseMessageId = crypto.randomUUID();

                    // Salvar mensagem do usuário
                    await saveMessage(conversationId, 'user', userPrompt || `Analise ${files.length} arquivo(s)`, 'multimodal', attachmentsForMessage, messageId);

                    // Salvar resposta da LIA (SEM attachments - evita duplicação)
                    await saveMessage(conversationId, 'assistant', result.text, 'multimodal', [], responseMessageId);

                    // Emitir eventos Socket
                    const io = req.app.get('io');
                    if (io) {
                        io.to(`conv:${conversationId}`).emit('lia-message', {
                            id: messageId || `user_${Date.now()}`,
                            conversation_id: conversationId,
                            role: 'user',
                            type: 'user',
                            content: userPrompt || `Analise ${files.length} arquivo(s)`,
                            origin: 'multimodal',
                            attachments: attachmentsForMessage,
                            created_at: new Date().toISOString()
                        });

                        io.to(`conv:${conversationId}`).emit('lia-message', {
                            id: responseMessageId,
                            conversation_id: conversationId,
                            role: 'assistant',
                            type: 'lia',
                            content: result.text,
                            origin: 'multimodal',
                            attachments: [], // v17.1: Não duplicar attachments na resposta da LIA
                            created_at: new Date().toISOString()
                        });
                    }
                } catch (saveError: any) {
                    // v17.0: PERSIST_WARN - Logar mas não abortar entrega da resposta
                    console.error(JSON.stringify({
                        timestamp: new Date().toISOString(),
                        component: 'VISION_ROUTE',
                        stage: 'PERSIST_WARN',
                        conversationId,
                        userId,
                        tenantId,
                        error: {
                            message: saveError.message,
                            operation: 'saveMessage'
                        }
                    }));
                }
            }

            // Limpar arquivos temporários
            for (const f of files) {
                if (fs.existsSync(f.path)) {
                    fs.unlinkSync(f.path);
                }
            }

            // v17.0: CRITICAL - Garantir que result.text nunca seja vazio/undefined
            if (!result?.text || result.text.trim().length === 0) {
                console.error(JSON.stringify({
                    timestamp: new Date().toISOString(),
                    component: 'VISION_ROUTE',
                    stage: 'ERROR',
                    conversationId: req.body.conversationId,
                    userId,
                    tenantId,
                    error: 'AIRouter retornou texto vazio para análise multimodal'
                }));

                return res.status(500).json({
                    error: 'Erro ao processar análise: resposta vazia do orquestrador'
                });
            }

            res.json({
                success: true,
                id: responseMessageId,
                fileIds: processedFilesForAIRouter.map(f => f.id),
                analysis: {
                    title: files.length > 1 ? `${files.length} Arquivos` : files[0].originalname,
                    summary: result.text, // v17.0: Nunca usar fallback silencioso
                    detailPayload: result?.detailPayload
                },
                provider: result?.provider || 'hybrid',
                model: result?.model || 'lia-execution'
            });

        } catch (error: any) {
            console.error('❌ Erro ao analisar arquivo:', error);

            // Limpar arquivos
            if (filePaths && Array.isArray(filePaths)) {
                for (const path of filePaths) {
                    if (fs.existsSync(path)) {
                        try { fs.unlinkSync(path); } catch (e) { }
                    }
                }
            }

            res.status(500).json({
                error: 'Falha ao analisar arquivo',
                details: error.message,
            });
        }
    });

    // ======================================================================
    // POST /api/vision/generate - Gera conteúdo visual (gráficos, diagramas)
    // ======================================================================
    app.post('/api/vision/generate', async (req, res) => {
        try {
            const { type, data, prompt } = req.body;
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
                return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
            }

            // Gerar conteúdo estruturado para visualização
            const generationPrompt = `Você é um gerador de dados para visualização.
      
Solicitação: ${prompt}
Tipo: ${type || 'auto'}
Dados fornecidos: ${JSON.stringify(data || {})}

RETORNE APENAS JSON VÁLIDO com a estrutura apropriada:

Para GRÁFICOS:
{
  "type": "chart",
  "title": "Título do gráfico",
  "chartType": "line|bar|pie|area",
  "labels": ["Label1", "Label2", ...],
  "datasets": [
    { "label": "Série 1", "data": [10, 20, 30], "color": "#00f3ff" }
  ]
}

Para TABELAS:
{
  "type": "table",
  "title": "Título da tabela",
  "headers": ["Col1", "Col2"],
  "rows": [["val1", "val2"], ["val3", "val4"]]
}

Para ANÁLISES:
{
  "type": "analysis",
  "title": "Título",
  "summary": "Resumo",
  "details": ["Ponto 1", "Ponto 2"],
  "insights": ["Insight 1"]
}

Gere dados realistas e úteis baseados no contexto.`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: generationPrompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
                    })
                }
            );

            const responseData = await response.json();
            const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';

            let generatedContent;
            try {
                const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    responseText.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
                generatedContent = JSON.parse(jsonStr.trim());
            } catch (e) {
                generatedContent = { type: 'text', data: responseText };
            }

            res.json({ success: true, content: generatedContent });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

}

// ======================================================================
// HELPER FUNCTIONS
// ======================================================================

function getAnalysisType(mimeType: string, filename: string): string {
    if (mimeType.startsWith('image/')) {
        // Detectar se é screenshot, documento, gráfico, etc
        const lowerName = filename.toLowerCase();
        if (lowerName.includes('chart') || lowerName.includes('graph') || lowerName.includes('grafico')) {
            return 'chart_image';
        }
        if (lowerName.includes('table') || lowerName.includes('tabela') || lowerName.includes('planilha')) {
            return 'table_image';
        }
        if (lowerName.includes('screenshot') || lowerName.includes('screen') || lowerName.includes('print')) {
            return 'screenshot';
        }
        return 'general_image';
    }

    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) return 'archive';
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || filename.match(/\.(js|ts|py|java|go|cs)$/i)) return 'code';
    if (filename.match(/\.(eml|msg)$/i)) return 'email';

    return 'general';
}

function buildAnalysisPrompt(analysisType: string, userPrompt: string, filename: string): string {
    const baseInstruction = `Você é LIA, assistente inteligente da Luminnus. Analise este arquivo detalhadamente.

${userPrompt ? `INSTRUÇÃO DO USUÁRIO: ${userPrompt}\n` : ''}
ARQUIVO: ${filename}

`;

    const typeInstructions: Record<string, string> = {
        chart_image: `Este parece ser um GRÁFICO. Extraia:
- Tipo de gráfico (linha, barra, pizza, etc.)
- Todos os valores e rótulos visíveis
- Tendências e padrões
- Insights de negócio`,

        table_image: `Esta parece ser uma TABELA. Extraia:
- Todos os cabeçalhos
- Todos os dados das células
- Totais e subtotais se houver
- Análise dos dados`,

        screenshot: `Este é um SCREENSHOT/PRINT (possivelmente com marcações/anotações do usuário).

**EXECUTE O PIPELINE DE TROUBLESHOOTING VISUAL v1.2:**

📌 **PASSO 1 — LEITURA GLOBAL (Tela Inteira):**
- Identifique: aplicativo/página, seção, estado (logado, loading, erro, sucesso)
- Detecte sinais críticos: mensagens de erro, logs de console, warnings, status HTTP, toasts, modais, formulários, métricas atípicas
- Capture: URLs, endpoints, nomes de arquivos, versões, timestamps

📌 **PASSO 2 — LEITURA GUIADA (ROI - Áreas Marcadas):**
- Priorize qualquer área com setas, círculos, destaques ou texto manuscrito/desenhado
- Extraia texto exato (OCR) na região marcada e nas adjacências (linha do console, campo do form, resposta de request)
- Se não houver marcação explícita, identifique o elemento mais "problemático" visualmente (vermelho, warning, erro)

📌 **PASSO 3 — CORRELAÇÃO COM CONTEXTO DO CHAT:**
- Cruze o que está visível no print com a descrição/pergunta do usuário
- Se houver discrepância entre o que o usuário disse e o que o print mostra, APONTE claramente

📌 **PASSO 4 — DIAGNÓSTICO + PLANO DE AÇÃO:**
- Liste as causas prováveis (Top 1-3) ordenadas por probabilidade
- Forneça passos de correção executáveis e específicos
- Indique como validar que o problema foi resolvido

**REGRAS DE SEGURANÇA:**
- MASCARE tokens, API keys, senhas, e-mails pessoais, telefones
- NUNCA repita credenciais visíveis no print

**CLASSIFICAÇÃO AUTOMÁTICA:**
- Se houver erro/warning/console/toast/network → modo TROUBLESHOOTING (diagnóstico + correção)
- Se for pedido de "resumir/extrair/transcrever" → modo EXTRAÇÃO (listar conteúdo)`,


        pdf: `Este é um DOCUMENTO PDF. Extraia:
- Título e autor (se visível)
- Resumo do conteúdo
- Pontos principais
- Dados e tabelas (se houver)`,

        presentation: `Esta é uma APRESENTAÇÃO. Analise:
- Título e tópicos principais
- Estrutura de slides
- Principais conclusões exibidas
- Insights visuais`,

        archive: `Este é um ARQUIVO COMPACTADO. Liste:
- Conteúdo visível (se for possível ver nomes de arquivos)
- Estrutura de pastas
- Finalidade provável do pacote`,

        code: `Este é um ARQUIVO DE CÓDIGO. Realize auditoria estática:
- Linguagem e tecnologias usadas
- Funcionalidade principal
- Sugestões de melhoria ou bugs aparentes
- **NUNCA EXECUTE O CÓDIGO**`,

        email: `Este é um E-MAIL (.eml/.msg). Extraia:
- Remetente e Destinatário
- Assunto e Data
- Resumo do corpo da mensagem
- Anexos mencionados`,

        general: `Analise este arquivo e extraia todas as informações relevantes.`
    };

    const responseFormat = analysisType === 'screenshot' ? `

RESPONDA EM JSON ESTRUTURADO PARA TROUBLESHOOTING:
{
  "type": "troubleshooting",
  "context": "O que o usuário está fazendo (1 linha baseada na tela + chat)",
  "markedArea": "O que foi marcado/destacado no print (ou 'Sem marcação explícita')",
  "screenAnalysis": {
    "application": "Nome do app/site/IDE",
    "section": "Qual área/tela está visível",
    "state": "logado|loading|erro|sucesso|parcial",
    "criticalSignals": ["Erro X na linha Y", "Toast: mensagem Z", "Status 404"]
  },
  "diagnosis": {
    "causes": [
      { "rank": 1, "cause": "Causa mais provável", "confidence": "alta|média|baixa" },
      { "rank": 2, "cause": "Segunda causa", "confidence": "média" }
    ],
    "discrepancy": "null ou 'Você disse X, mas o print mostra Y'"
  },
  "action": {
    "steps": [
      "Passo 1: Ação específica",
      "Passo 2: Próxima ação"
    ],
    "validation": "Como confirmar que resolveu"
  },
  "missingInfo": "null ou 'Abre a aba Network e me envia o request X'",
  "extractedText": "Texto relevante extraído via OCR (mascarando credenciais)"
}

Inclua apenas os campos relevantes. Responda em português brasileiro.
LEMBRE: mascare tokens, API keys, senhas, e-mails pessoais que aparecerem no print.` : `

RESPONDA EM JSON ESTRUTURADO:
{
  "type": "analysis",
  "title": "Título descritivo da análise",
  "summary": "Resumo executivo em 2-3 frases",
  "details": [
    "Ponto detalhado 1",
    "Ponto detalhado 2",
    "..."
  ],
  "insights": [
    "Insight de negócio ou observação importante 1",
    "Insight 2"
  ],
  "extractedData": {
    "tables": [{ "title": "...", "headers": [...], "rows": [[...]] }],
    "charts": [{ "chartType": "...", "title": "...", "labels": [...], "datasets": [{"label": "...", "data": [...]}] }],
    "text": "Texto extraído via OCR se aplicável",
    "numbers": { "chave": valor }
  },
  "recommendations": [
    "Recomendação ou próximo passo 1",
    "Recomendação 2"
  ]
}

Inclua apenas os campos relevantes. Responda em português brasileiro.`;

    return baseInstruction + (typeInstructions[analysisType] || typeInstructions.general) + responseFormat;
}


function parseGeminiResponse(text: string, filename: string, analysisType: string): any {
    try {
        // Tentar extrair JSON
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
            text.match(/```\s*([\s\S]*?)\s*```/) ||
            text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            return JSON.parse(jsonStr.trim());
        }
    } catch (e) {
        console.warn('⚠️ Não foi possível parsear JSON, usando fallback');
    }

    // Fallback: criar estrutura a partir do texto
    const lines = text.split('\n').filter(line => line.trim());

    return {
        type: 'analysis',
        title: `Análise de ${filename}`,
        summary: lines.slice(0, 2).join(' ').slice(0, 300),
        details: lines.slice(2, 10),
        insights: [],
        analysisType
    };
}
