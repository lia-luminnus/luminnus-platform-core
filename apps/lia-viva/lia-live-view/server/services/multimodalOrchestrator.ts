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
    return { model: 'gemini-visual', reason: 'Geração estruturada' };
  }

  if (requestType === 'image-generation') {
    return { model: 'gemini-imagen', reason: 'Geração visual' };
  }

  return { model: 'gemini-brain', reason: 'Cérebro LIA (Gemini 2.0 Flash)' };
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
  if (lower.match(/crie (um|uma) documento|gere relatório|monte report/)) {
    return 'document';
  }

  return null;
}

// ======================================================================
// PROCESSAMENTO MULTIMODAL
// ======================================================================

/**
 * Processa requisição multimodal completa
 */
async function processarRequisicaoMultimodal({
  message,
  images = [],
  documents = [],
  conversationId,
  personality = 'viva',
}) {
  try {
    console.log('🎯 Orquestrador Multimodal ativado');

    // 1. Detectar tipo de requisição
    const requestType = detectarTipoRequisicao(message);

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
      default:
        response = await processarComGeminiBrain({
          message,
          conversationId,
          personality,
        });
        break;
    }

    // 4. Adicionar metadados
    response.metadata = {
      modelUsed: decision.model,
      reason: decision.reason,
      requestType,
      timestamp: Date.now(),
    };

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
 */
async function processarComGeminiBrain({ message, conversationId, personality }) {
  console.log('🧠 Processando com Gemini 2.0 Flash (Brain)...');

  const memories = await loadMemories();
  const context = {
    messages: memories.map(m => ({ role: 'user', content: `Lembrete: ${m.content}` })),
    functions: getFunctions(),
    conversationId
  };

  const result = await runGemini(message, context);

  if (result.function_call) {
    await processFunctionCall(result.function_call);
  }

  return {
    mode: 'text',
    contentType: 'text',
    content: result.text,
  };
}

/**
 * Processa com Gemini Vision (análise de imagens)
 */
async function processarComGeminiVision({ message, images, documents }) {
  console.log('👁️ Processando com Gemini Vision...');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  // Preparar partes (texto + imagens)
  const parts: any[] = [{ text: message }];

  // Adicionar imagens
  for (const imageData of images) {
    parts.push({
      inlineData: {
        mimeType: imageData.mimeType || 'image/jpeg',
        data: imageData.base64,
      },
    });
  }

  // Gerar conteúdo
  const result = await model.generateContent(parts);
  const response = await result.response;
  const text = response.text();

  return {
    mode: 'multimodal',
    contentType: 'analysis',
    content: text,
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
