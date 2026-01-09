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
    app.post('/api/vision/analyze', upload.single('file'), async (req, res) => {
        let filePath: string | null = null;

        try {
            const file = req.file;
            const userPrompt = req.body.prompt || '';
            const userId = req.body.userId || '00000000-0000-0000-0000-000000000001';
            const tenantId = req.body.tenantId || '00000000-0000-0000-0000-000000000001';

            if (!file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }

            filePath = file.path;
            const geminiApiKey = process.env.GEMINI_API_KEY;

            if (!geminiApiKey) {
                return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
            }

            console.log(`📤 Analisando: ${file.originalname} (${file.mimetype}, ${(file.size / 1024).toFixed(1)}KB)`);

            // 1. Log Ingestão (Seção 7.1)
            await AuditService.log(userId, tenantId, 'native', 'file_ingested', 'success', `Arquivo recebido: ${file.originalname}`);

            // Buffers e base64 para o Gemini
            const fileBuffer = fs.readFileSync(filePath);
            let base64Data = fileBuffer.toString('base64');
            let effectiveMimetype = file.mimetype;

            // Determinar tipo de análise baseado no arquivo
            const analysisType = getAnalysisType(file.mimetype, file.originalname);

            // ========================================
            // TRATAMENTO ESPECIAL: Word Documents (.docx)
            // Gemini não suporta .docx, então extraímos texto
            // ========================================
            const isWordDoc = file.mimetype.includes('wordprocessingml') ||
                file.originalname.toLowerCase().endsWith('.docx') ||
                file.originalname.toLowerCase().endsWith('.doc');

            let extractedText = '';
            if (isWordDoc) {
                try {
                    const mammoth = await import('mammoth');
                    const result = await mammoth.default.extractRawText({ buffer: fileBuffer });
                    extractedText = result.value;
                    console.log(`📄 Texto extraído do Word: ${extractedText.length} caracteres`);

                    // Converter para texto simples para o Gemini
                    base64Data = Buffer.from(extractedText, 'utf-8').toString('base64');
                    effectiveMimetype = 'text/plain';
                } catch (wordError: any) {
                    console.error('❌ Erro ao extrair texto do Word:', wordError);
                    throw new Error(`Não foi possível processar o arquivo Word: ${wordError.message}`);
                }
            }

            // Tratamento especial para compactados (v1.1 Inventário)
            let finalPrompt = userPrompt;
            if (analysisType === 'archive') {
                const { ArchiveService } = await import('../services/archiveService.js');
                const inventory = ArchiveService.getInventory(filePath, file.originalname);
                finalPrompt = `O usuário enviou um arquivo compactado. INVENTÁRIO DO ARQUIVO:\n${JSON.stringify(inventory, null, 2)}\n\nPergunta do usuário: ${userPrompt}`;
                console.log(`📦 Inventário gerado para ${file.originalname}: ${inventory.total_files} arquivos`);
            }

            // Se for Word, adicionar contexto ao prompt
            if (isWordDoc && extractedText) {
                finalPrompt = `O usuário enviou um documento Word. CONTEÚDO DO DOCUMENTO:\n\n${extractedText}\n\n---\nPergunta do usuário: ${userPrompt || 'Analise este documento e me dê um resumo.'}`;
            }

            // 1.5 Detectar intenção do usuário (v1.1.1)
            let userIntent: 'resumo' | 'tabela' | 'completo' = 'resumo';
            const lowerPrompt = (userPrompt || '').toLowerCase();
            if (lowerPrompt.includes('tabela') || lowerPrompt.includes('planilha') || lowerPrompt.includes('coluna')) {
                userIntent = 'tabela';
            } else if (lowerPrompt.includes('extrai tudo') || lowerPrompt.includes('completo') || lowerPrompt.includes('detalhar')) {
                userIntent = 'completo';
            }

            // =====================================================
            // OUTPUT GOVERNANCE v1.3 - Enriquecer prompt
            // =====================================================
            const { OutputGovernance } = await import('../services/outputGovernance.js');
            const enrichedPrompt = OutputGovernance.enrichPrompt(finalPrompt, [{ type: file.mimetype }]);

            // 2. Processar via AIRouter (Pipeline Híbrido v1.1.1)
            // Para Word, enviamos o texto extraído; para outros, o arquivo original
            let result = await AIRouter.route({
                userId,
                tenantId,
                prompt: enrichedPrompt,
                conversationId: req.body.conversationId, // v1.1.2: Para contexto
                userIntent,
                files: (analysisType === 'archive' || isWordDoc) ? [] : [{
                    mimetype: effectiveMimetype,
                    data: base64Data,
                    name: file.originalname,
                    size: file.size
                }]
            });

            // =====================================================
            // OUTPUT GOVERNANCE v1.3 - Validação, Retry, Formatação
            // =====================================================
            try {
                const { OutputGovernance } = await import('../services/outputGovernance.js');
                const { OpenAIService } = await import('../services/openAIService.js');

                const governed = await OutputGovernance.forMultiModal(
                    result.text || '',
                    finalPrompt,
                    async (retryPrompt) => {
                        const retryResult = await OpenAIService.chat(retryPrompt, [], 'gpt-4o-mini');
                        return retryResult.text;
                    },
                    [{ type: file.mimetype }]
                );

                result = { ...result, text: governed.markdown, detailPayload: governed.detailPayload };

                if (governed.retryAttempts > 0 || governed.secretsDetected) {
                    console.log(`📋 [OutputGovernance] MultiModal: ${governed.contractType}, Retries: ${governed.retryAttempts}`);
                }
            } catch (govError) {
                console.warn('⚠️ [OutputGovernance] Erro na governança multimodal:', govError);
            }

            // 3. Upload do arquivo para Supabase Storage (v2.0 - Persistência)
            let storageUrl: string | null = null;
            let storagePath: string | null = null;
            let storageError: string | null = null;

            try {
                // IDs de fallback mais robustos se não informados
                const finalUserId = userId || '00000000-0000-0000-0000-000000000001';
                const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

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
                    console.log(`✅ Arquivo salvo no Storage: ${storagePath}`);
                }
            } catch (upErr: any) {
                console.error('❌ Erro no upload (continuando análise):', upErr.message);
                storageError = upErr.message;
                if (storageError?.includes('Bucket not found')) {
                    storageError = "ERRO: O bucket 'user-files' não foi encontrado. Crie-o no Dashboard do Supabase.";
                }
            }

            // 4. Persistir mensagens no Banco de Dados (v2.1)
            const conversationId = req.body.conversationId;
            if (conversationId) {
                try {
                    // Salvar mensagem do usuário com o arquivo
                    await saveMessage(conversationId, 'user', userPrompt || `Analise: ${file.originalname}`, 'multimodal', [{
                        name: file.originalname,
                        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
                        url: storageUrl || ''
                    }]);

                    // Salvar resposta da LIA (usando 'assistant' para compatibilidade com DB)
                    await saveMessage(conversationId, 'assistant', result.text, 'multimodal', storageUrl ? [{
                        name: file.originalname,
                        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
                        url: storageUrl
                    }] : []);

                    console.log(`💾 Mensagens persistidas para conversa: ${conversationId}`);

                } catch (saveError) {
                    console.error('⚠️ Erro ao persistir mensagens (continuando):', saveError);
                }
            }

            // Limpar arquivo temporário
            if (filePath) {
                fs.unlinkSync(filePath);
                filePath = null;
            }


            res.json({
                success: true,
                filename: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                analysisType,
                // v2.0: URLs de download
                storageUrl,
                storagePath,
                storageError, // Para debug se necessário
                analysis: {
                    title: file.originalname,
                    summary: result?.text || 'Análise completa.',
                    details: [],
                    insights: [],
                    detailPayload: result?.detailPayload
                },
                provider: result?.provider || 'gemini',
                model: result?.model || 'vision'
            });





        } catch (error: any) {
            console.error('❌ Erro ao analisar arquivo:', error);

            // Limpar arquivo
            if (filePath && fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { }
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
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
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
