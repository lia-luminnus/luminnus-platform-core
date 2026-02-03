// ======================================================================
// 🎯 ORQUESTRADOR MULTIMODAL v2.0 - Gemini as Core Brain
// ======================================================================
// Gemini 2.0 Flash = Cérebro, Olhos, Mãos e Voz
// OpenAI (Whisper/TTS) = Interfaces Periféricas de Áudio
// ======================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { runGemini } from '../assistants/gemini.js';
import { LIA_FULL_PERSONALITY } from '../personality/lia-personality.js';
import OpenAI from 'openai';
import { ToolService } from './toolService.js';
import { GovernorAssurance } from './governorAssurance.js';
import { IntentMode } from '@luminnus/lia-runtime';

// ======================================================================
// CONFIGURAÇÃO
// ======================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ======================================================================
// FUNÇÕES DE DECISÃO
// ======================================================================

/**
 * Decide qual modelo usar baseado no input do usuário
 */
function decidirModelo(input) {
  const { hasImage, hasDocument, requestType } = input;

  // v2.0: Gemini assume todos os papéis inteligentes
  if (hasImage || hasDocument) {
    return { model: 'gemini-vision', reason: 'Análise multimodal nativa' };
  }

  if (requestType === 'chart' || requestType === 'table') {
    return { model: 'gemini-visual-generation', reason: 'Geração estruturada' };
  }

  if (requestType === 'image-generation') {
    return { model: 'gemini-imagen', reason: 'Geração visual' };
  }

  return { model: 'gemini-brain', reason: 'Cérebro LIA (Gemini 2.0 Flash)' };
}

/**
 * v7.0: Intent Routing - Classifica a intenção do usuário
 * v9.0: Sincronização com OutputContracts - isola pedido do usuário dos contratos
 */
function classificarIntencao(message: string, hasAttachments: boolean): 'ANALYZE' | 'CREATE' | 'CORRECT' | 'HYBRID' {
  let lower = message.toLowerCase();

  // v9.0: Se o prompt foi enriquecido pelo OutputGovernance, isolar apenas o pedido real do usuário
  const userRequestMarker = '=== pedido do usuário ===';
  if (lower.includes(userRequestMarker)) {
    const userRequestIndex = lower.indexOf(userRequestMarker);
    lower = lower.substring(userRequestIndex + userRequestMarker.length).trim();
  }

  // v9.0: Detecção de contratos visuais - forçar ANALYZE para visual_analysis
  if (message.includes('CONTRATO DE OUTPUT: VISUAL_ANALYSIS') ||
    message.includes('MODO ANÁLISE VISUAL')) {
    console.log('🎯 [IntentRouter] Contrato visual_analysis detectado → forçando ANALYZE');
    return 'ANALYZE';
  }

  // v7.5: Verbos de ação real (Ações destrutivas ou de criação sistêmica)
  // v9.0: Usar regex de palavra inteira para evitar falsos positivos
  // v10.1: Adicionar keywords de impressão/PDF
  const creationKeywords = ['crie', 'gere', 'monte', 'construa', 'salve', 'exporte', 'create', 'generate', 'make', 'faça', 'faz', 'montar', 'imprimir', 'pdf', 'exportar pdf', 'gerar pdf'];
  const actionKeywords = ['deleta', 'apaga', 'exclua', 'move', 'transfira', 'envia', 'agenda', 'marca'];
  const correctionKeywords = ['corrija', 'conserte', 'fix', 'correct'];

  // v8.0: Remover keywords de erro de analysisKeywords para evitar falsos positivos
  const analysisKeywords = ['analise', 'veja', 'explique', 'resuma', 'entenda', 'analyze', 'explain', 'summarize', 'diga', 'fale', 'qual', 'quais', 'mostre', 'pergunta', 'duvida', 'verifique', 'ajuste', 'o que você acha', 'sua opinião'];

  // v8.0: Keywords específicas de troubleshooting (separadas para evitar conflito)
  // v9.0: Usar apenas em contexto de pedido real do usuário (após isolamento)
  const troubleshootingKeywords = ['erro', 'bug', 'problema', 'não funciona', 'falha', 'quebrado', 'crash'];

  const isCreation = creationKeywords.some(k => lower.includes(k));
  const isAction = actionKeywords.some(k => lower.includes(k));
  const isCorrection = correctionKeywords.some(k => lower.includes(k));
  const isTroubleshooting = troubleshootingKeywords.some(k => lower.includes(k));
  const isAnalysis = analysisKeywords.some(k => lower.includes(k)) || (!isCreation && !isAction && !isCorrection && hasAttachments && !isTroubleshooting);

  // Se o usuário está perguntando "o que está acontecendo", é ANALYZE, mesmo se falar "ajuste"
  if (lower.includes('acontecendo') || lower.includes('perdi') || lower.includes('perdido')) return 'ANALYZE';

  // v10.0: Se tem troubleshooting keywords, diferenciar diagnóstico de correção ativa
  if (isTroubleshooting) {
    // Se é troubleshooting mas não tem comando explícito de criação ou correção, 
    // assumir que é um pedido de diagnóstico (ANÁLISE)
    if (!isCreation && !isAction && !isCorrection) {
      console.log('🔍 [IntentRouter] Troubleshooting detectado sem verbos de ação → ANALYZE (diagnóstico)');
      return 'ANALYZE';
    }
    console.log('🔧 [IntentRouter] Troubleshooting + verbo de ação → CORRECT (correção ativa)');
    return 'CORRECT';
  }

  if ((isCreation || isAction) && isAnalysis) return 'HYBRID';
  if (isCreation || isAction) return 'CREATE';
  if (isCorrection) return 'CORRECT';
  return 'ANALYZE';
}

/**
 * Detecta tipo de requisição automaticamente
 */
function detectarTipoRequisicao(message) {
  const lower = message.toLowerCase();

  // Gráficos
  if (lower.match(/gráfico|chart|graph|plot|visualiz/)) {
    return 'chart';
  }

  // Tabelas
  if (lower.match(/tabela|table|planilha|spreadsheet/)) {
    return 'table';
  }

  // Geração de imagem
  if (lower.match(/crie uma imagem|gere uma imagem|desenhe|ilustr/)) {
    return 'image-generation';
  }

  // Código
  if (lower.match(/crie (um|uma|o) código|gere código|função|class|def /)) {
    return 'code';
  }

  // Documento
  if (lower.match(/crie (um|uma) documento|gere relatório|monte report|no docs|no google docs/)) {
    return 'document';
  }

  return null;
}

// ======================================================================
// PROCESSAMENTO MULTIMODAL
// ======================================================================

/**
 * Processa requisição multimodal completa
 * v3.0: Adicionado userId e tenantId para execução de ferramentas
 */
async function processarRequisicaoMultimodal({
  message,
  images = [],
  documents = [],
  conversationId,
  personality = 'viva',
  userId = '',
  tenantId = '',
}: {
  message: string;
  images?: any[];
  documents?: any[];
  conversationId?: string;
  personality?: 'clara' | 'viva' | 'firme';
  userId?: string;
  tenantId?: string;
}) {
  try {
    // 1. Detectar tipo de requisição
    const requestType = detectarTipoRequisicao(message);

    // v7.0: Intent Routing
    const intent = classificarIntencao(message, (images.length + documents.length) > 0);

    // v7.3: Carregar histórico e contexto completo (Garantir persistência/leitura de arquivos anteriores)
    let history = [];
    let memories = [];
    let systemInstruction = LIA_FULL_PERSONALITY;

    if (conversationId) {
      try {
        const { getContext } = await import('./memoryService.js');
        const context = await getContext(conversationId, userId, message);
        history = context.history || [];
        memories = context.memories || [];
        systemInstruction = context.systemInstruction;
        console.log(`🧠 [Orquestrador] Contexto carregado: ${history.length} mensagens e ${memories.length} memórias.`);
      } catch (ctxErr) {
        console.warn('⚠️ [Orquestrador] Erro ao carregar contexto adicional:', ctxErr);
      }
    }

    // 2. Decidir qual modelo usar
    const decision = decidirModelo({
      message,
      hasImage: images.length > 0,
      hasDocument: documents.length > 0,
      requestType,
    });

    console.log(`✅ Decisão: ${decision.model} (${decision.reason})`);

    // 3. Processar conforme modelo escolhido
    let response;

    switch (decision.model) {
      case 'gemini-vision':
        response = await processarComGeminiVision({
          message,
          images,
          documents,
          userId,
          tenantId,
          intent, // v7.0: Passar intenção para o vision
          history, // v7.3: Injetar histórico no vision
          memories, // v7.5: Injetar memórias
          systemInstruction // v7.3: Injetar instrução completa
        });
        break;

      case 'gemini-visual-generation':
        response = await processarGeracaoVisual({
          message,
          requestType,
        });
        break;

      case 'gemini-imagen':
        response = await processarGeracaoImagem({
          message,
        });
        break;

      case 'gemini-brain':
        try {
          response = await processarComGeminiBrain({
            message,
            conversationId,
            personality: personality as any,
            userId,
            tenantId,
            intent,
            images,
            documents,
            history, // v7.3: Injetar histórico no brain
            memories, // v7.5: Injetar memórias (evitar ReferenceError)
            systemInstruction // v7.3: Injetar instrução completa
          });
        } catch (err) {
          console.error('❌ [Orquestrador] Falha crítica no Gemini Brain:', err);
          response = { content: 'Tive um problema ao processar seu pedido. Pode tentar novamente?', toolResults: [] };
        }
        break;

    }

    // 4. Extract final content and tool results
    // Governança de output será aplicada em vision.ts via OutputGovernance
    const finalContent = response.content;
    const toolResults = response.toolResults || [];

    // 5. Adicionar metadados
    response.metadata = {
      modelUsed: decision.model,
      reason: decision.reason,
      requestType,
      intent, // v7.0: Salvar intenção nos metadados
      timestamp: Date.now(),
    };

    // v7.2: GOVERNOR ASSURANCE - Filtro final de segurança (SSOT)
    // v9.0: Melhorar mensagem de erro e permitir ferramentas de pesquisa
    const audit = await GovernorAssurance.audit({
      userId,
      tenantId,
      prompt: message,
      response: response.content,
      intent,
      toolsCalled: toolResults.map(tr => tr.name)
    });

    if (!audit.passed && (intent === 'CREATE' || intent === 'CORRECT')) {
      // v9.0: Mensagem de erro mais informativa
      const violationsFormatted = audit.violations.map(v => `• ${v}`).join('\n');
      response.content = `Não consegui completar sua solicitação de forma segura.\n\n**Motivo:**\n${violationsFormatted}\n\n**O que fazer:**\n• Reformule seu pedido sendo mais específico\n• Se precisa criar ou editar algo, mencione explicitamente\n• Se for apenas uma análise, deixe isso claro\n\nPosso ajudar de outra forma?`;
      response.metadata.assurance_failed = true;
      console.warn(`⚠️ [Orquestrador] Auditoria bloqueou resposta. Intent: ${intent}, Violations: ${audit.violations.length}, Score: ${audit.riskScore}`);
    }

    return response;

  } catch (error) {
    console.error('❌ Erro no orquestrador multimodal:', error);
    throw error;
  }
}

// ======================================================================
// PROCESSADORES ESPECÍFICOS
// ======================================================================

/**
 * Processa com Gemini Brain (Substitui GPT-4o Mini)
 * v3.0: Integração completa com ToolService para execução de ferramentas
 */
async function processarComGeminiBrain({
  message,
  conversationId,
  personality,
  userId = '',
  tenantId = '',
  intent = 'ANALYZE',
  images = [],
  documents = [],
  history = [],
  memories = [], // v7.5: Adicionado para evitar ReferenceError
  systemInstruction = ''
}) {
  console.log(`🧠 Processando com Gemini 2.0 Flash (Brain) | Intent: ${intent}`);

  // v3.0: Usar ToolService.getTools() para obter todas as ferramentas disponíveis
  const allTools = ToolService.getTools();

  const context = {
    messages: history.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })),
    functions: allTools,
    conversationId,
    // v4.1: Passar imagens e documentos para o runGemini (brain)
    images,
    documents,
    systemInstruction, // v7.3: Instrução personalizada com snaps
    // v7.0: Se for ANALYZE, não permitimos chamadas de ferramentas de criação
    toolMode: (intent === 'CREATE' || intent === 'CORRECT' || intent === 'HYBRID') ? 'ANY' : 'NONE'
  };

  const result = await runGemini(message, context);

  // v3.0: Processar chamadas de ferramentas usando ToolService.execute()
  let toolResults: any[] = [];
  if (result.function_calls && result.function_calls.length > 0) {
    console.log(`🔧 [Orquestrador] ${result.function_calls.length} ferramenta(s) detectada(s)`);

    for (const call of result.function_calls) {
      try {
        const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
        console.log(`🔧 [Orquestrador] Executando: ${call.name}`, args);

        const toolResult = await ToolService.execute(call.name, args, { userId, tenantId });
        toolResults.push({
          name: call.name,
          result: toolResult
        });

        console.log(`✅ [Orquestrador] ${call.name} executado:`, (toolResult as any)?.success ? 'Sucesso' : 'Falha');
      } catch (err) {
        console.error(`❌ [Orquestrador] Erro ao executar ${call.name}:`, err);
        toolResults.push({
          name: call.name,
          error: String(err)
        });
      }
    }
  }

  let finalBrainText = result.text;

  // v7.0: Se houve chamadas de ferramentas, precisamos de um SEGUNDO TURNO para o link real
  if (toolResults.length > 0) {
    console.log(`🔄 [Orquestrador] Re-processando com resultados para gerar resposta final com links reais.`);

    // Preparar mensagens para o segundo turno
    const historyMessages = [
      ...memories.map(m => ({ role: 'user', content: `Lembrete: ${m.content}` })),
      { role: 'user', content: message },
      {
        role: 'assistant',
        content: result.text,
        function_calls: result.function_calls // Manter contexto das chamadas
      }
    ];

    // Adicionar resultados como mensagens de ferramenta
    const resultsAsMessages = toolResults.map(tr => {
      let contentString = '';
      try {
        contentString = typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result || tr.error);
      } catch (jsonErr) {
        console.warn(`⚠️ [Orquestrador] Erro ao serializar resultado da tool ${tr.name}. Usando fallback.`, jsonErr);
        contentString = "[Objeto Complexo / Erro de Serialização]";
      }

      return {
        role: 'tool',
        name: tr.name,
        content: contentString
      };
    });

    const secondTurnResponse = await runGemini(message, {
      ...context,
      messages: [...historyMessages, ...resultsAsMessages]
    });

    finalBrainText = secondTurnResponse.text;
  }

  return {
    mode: 'text',
    contentType: 'text',
    content: finalBrainText,
    toolResults
  };
}

/**
 * Processa com Gemini Vision (análise de imagens e documentos)
 * v3.0: Suporte a ferramentas para ação após análise
 */
async function processarComGeminiVision({
  message,
  images,
  documents,
  userId = '',
  tenantId = '',
  intent = 'ANALYZE',
  history = [],
  memories = [], // v7.5: Adicionado para evitar erro de tipo
  systemInstruction = ''
}) {
  console.log(`👁️ Processando com Gemini Vision | Intent: ${intent} | Histórico: ${history.length} mensagens`);

  // v3.0: Incluir ferramentas para que Gemini possa executar ações
  const allTools = ToolService.getTools();

  // v4.0: Conversor recursivo de ferramentas para Gemini Vision
  const convertSchema = (schema: any): any => {
    if (!schema) return undefined;
    const type = (schema.type || 'object').toUpperCase();
    const result: any = { type };
    if (schema.description) result.description = schema.description;
    if (schema.enum) result.format = 'enum', result.enum = schema.enum;

    if (type === 'OBJECT') {
      result.properties = Object.entries(schema.properties || {}).reduce((acc: any, [k, v]: [string, any]) => {
        acc[k] = convertSchema(v);
        return acc;
      }, {});
      if (schema.required) result.required = schema.required;
    } else if (type === 'ARRAY') {
      result.items = convertSchema(schema.items);
    }
    return result;
  };

  const geminiTools = [{
    functionDeclarations: allTools.map(f => ({
      name: f.name,
      description: f.description,
      parameters: convertSchema(f.parameters)
    }))
  }];

  const currentSystemInstruction = `${systemInstruction || LIA_FULL_PERSONALITY}

    === DIRETRIZES DE RESPOSTA (v7.5) ===
    1. TONALIDADE: Você é a LIA. Fale de forma natural, empática e humana.
    2. DINAMISMO: Evite templates robóticos ou seções numeradas fixas, a menos que o usuário peça um relatório formal.
    3. MODO DE INTENÇÃO: Você está operando no modo ${intent}.
    4. DIAGNÓSTICO: Se o usuário relatar um problema ou enviar um print de erro, analise-o tecnicamente, mas explique como uma parceira ajudando a resolver, não como um robô de suporte.
    
    === PROTOCOLO DE EXECUÇÃO (Se aplicável) ===
    - Se ${intent} for 'CREATE' ou 'ACTION': Execute a ferramenta necessária (Sheets/Docs) e reporte o link real.
    - PROIBIDO: Placeholders como [Veja aqui].`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: currentSystemInstruction,
    tools: geminiTools as any,
    toolConfig: (intent === 'CREATE' || intent === 'CORRECT' || intent === 'HYBRID') ? {
      functionCallingConfig: {
        mode: 'ANY' as any
      }
    } : {
      functionCallingConfig: {
        mode: 'NONE' as any
      }
    }
  });

  // v7.3: Converter histórico para formato Gemini (Retrocompatibilidade SSOT)
  // v7.5: Mapeamento de histórico enriquecido (incluindo anexos)
  const contents = history.filter((m: any) => m.role !== 'system').map((m: any) => {
    if (m.role === 'function' || m.role === 'tool') {
      return {
        role: 'user',
        parts: [{ text: `Resultado da ferramenta ${m.name}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}` }]
      };
    }

    // v7.5: Se a mensagem tiver anexos, avisar o modelo
    let enrichedContent = m.content || "";
    if (m.attachments && m.attachments.length > 0) {
      const attachmentsInfo = m.attachments.map((a: any) => `[Arquivo: ${a.name || a.title || 'sem nome'}]`).join(', ');
      enrichedContent = `${enrichedContent}\n\n(Anexos nesta mensagem: ${attachmentsInfo})`;
    }

    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: enrichedContent }]
    };
  });

  // Preparar partes da mensagem atual (texto + imagens + documentos)
  const currentParts: any[] = [{ text: message }];

  // Adicionar imagens
  for (const imageData of images) {
    currentParts.push({
      inlineData: {
        mimeType: imageData.mimeType || 'image/jpeg',
        data: imageData.base64,
      },
    });
  }

  // v7.1: Adicionar documentos nativamente no prompt do Gemini 2.0
  for (const docData of documents) {
    currentParts.push({
      inlineData: {
        mimeType: docData.mimeType || 'application/pdf',
        data: docData.base64,
      },
    });
  }

  // Gerar conteúdo com HISTÓRICO (Multi-turn Vision)
  let result;
  let response;

  if (contents.length > 0) {
    const chat = model.startChat({
      history: contents,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7
      }
    });
    result = await chat.sendMessage(currentParts);
    response = result.response;
  } else {
    result = await model.generateContent(currentParts);
    response = result.response;
  }

  // v3.0: Verificar se há chamadas de ferramentas
  const calls = response.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall);
  let toolResults: any[] = [];

  if (calls && calls.length > 0) {
    console.log(`🔧 [Vision] ${calls.length} ferramenta(s) solicitada(s)`);

    for (const part of calls) {
      const call = part.functionCall;
      try {
        console.log(`🔧 [Vision] Executando: ${call.name}`, call.args);

        const toolResult = await ToolService.execute(call.name, call.args, { userId, tenantId });
        toolResults.push({
          name: call.name,
          result: toolResult
        });

        console.log(`✅ [Vision] ${call.name} executado:`, (toolResult as any)?.success ? 'Sucesso' : 'Falha');
      } catch (err) {
        console.error(`❌ [Vision] Erro ao executar ${call.name}:`, err);
        toolResults.push({
          name: call.name,
          error: String(err)
        });
      }
    }
  }

  const text = response.text();

  // v7.0: Se houve chamadas de ferramentas, precisamos de um SEGUNDO TURNO para o link real
  let finalText = text;
  if (toolResults.length > 0) {
    console.log(`🔄 [Vision] Iniciando segundo turno para integrar resultados das ferramentas.`);

    // Preparar histórico para o segundo turno (Incluindo histórico anterior + turno atual)
    const chat = model.startChat({
      history: [
        ...contents,
        { role: 'user', parts: currentParts },
        { role: 'model', parts: response.candidates?.[0]?.content?.parts || [] },
        {
          role: 'function',
          parts: toolResults.map(tr => {
            let responseObj = tr.result || { error: tr.error };

            // CRITICAL FIX: Gemini exige que functionResponse.response seja um objeto Struct (não string)
            if (typeof responseObj === 'string') {
              responseObj = { result: responseObj };
            }

            return {
              functionResponse: {
                name: tr.name,
                response: responseObj
              }
            };
          })
        }
      ]
    });

    const followUp = await chat.sendMessage("Finalize a resposta agora fornecendo o link real e confirmando a execução.");
    finalText = followUp.response.text();
  }

  return {
    mode: 'multimodal',
    contentType: 'analysis',
    content: finalText,
    toolResults
  };
}

/**
 * Processa geração visual (gráficos, tabelas)
 */
async function processarGeracaoVisual({ message, requestType }) {
  console.log('📊 Processando geração visual com Gemini...');

  // Usar Gemini para extrair dados estruturados
  const systemPrompt = `Você é um assistente que extrai dados estruturados para gráficos e tabelas.
Retorne APENAS um JSON válido com title, labels, values (para gráfico) ou headers/rows (para tabela). Sem markdown.`;

  const result = await runGemini(message, {
    messages: [{ role: 'system', content: systemPrompt } as any],
    temperature: 0.2
  });

  try {
    const jsonStr = result.text.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return {
      mode: 'multimodal',
      contentType: requestType,
      content: data,
    };
  } catch (err) {
    console.error('❌ Erro ao parsear JSON visual:', err);
    throw err;
  }
}

/**
 * Processa geração de imagem
 */
async function processarGeracaoImagem({ message }) {
  console.log('🎨 Processando geração de imagem...');

  // Usar DALL-E 3 para imagens simples
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: message,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });

  return {
    mode: 'multimodal',
    contentType: 'image',
    content: {
      url: response.data[0].url,
      prompt: message,
    },
  };
}

// ======================================================================
// HELPERS
// ======================================================================

function getPersonalityPrompt(personality) {
  const prompts = {
    clara: 'Você é LIA (LUMINNUS AI), uma assistente clara, objetiva e precisa.',
    viva: 'Você é LIA (LUMINNUS AI), uma assistente energética, criativa e envolvente.',
    firme: 'Você é LIA (LUMINNUS AI), uma assistente assertiva, direta e profissional.',
  };
  return prompts[personality] || prompts.viva;
}

function getFunctions() {
  return [
    {
      name: 'saveMemory',
      description: 'Salva uma informação importante na memória do usuário.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'O conteúdo a ser salvo' },
          category: {
            type: 'string',
            enum: ['personal', 'work', 'preferences', 'general'],
            description: 'Categoria da memória',
          },
        },
        required: ['content'],
      },
    },
  ];
}

async function processFunctionCall(functionCall: any) {
  const { name, arguments: args } = functionCall;
  const params = JSON.parse(args);

  if (name === 'saveMemory') {
    const { saveMemory } = await import('./memoryService.js');
    await saveMemory(params.content, params.category || 'general');
    console.log('💾 Memória salva:', params.content);
  }
}

async function loadMemories() {
  try {
    const { getMemories } = await import('./memoryService.js');
    return await getMemories();
  } catch {
    return [];
  }
}

// ======================================================================
// EXPORTS
// ======================================================================

export {
  processarRequisicaoMultimodal,
  decidirModelo,
  detectarTipoRequisicao,
};
