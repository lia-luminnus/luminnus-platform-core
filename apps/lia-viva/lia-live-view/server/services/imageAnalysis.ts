// ======================================================================
// 👁️ IMAGE ANALYSIS SERVICE - Análise profissional de imagens
// ======================================================================
// Comportamento inteligente:
// - Prints de erro → Identifica e sugere correção
// - Interface/design → Analisa UX/UI
// - Código → Identifica bugs e propõe patches
// - Documentos → Extrai e estrutura informações
// ======================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ======================================================================
// FUNÇÕES PRINCIPAIS
// ======================================================================

/**
 * Analisa imagem com comportamento inteligente
 */
async function analisarImagem({ imageData, userMessage, analysisType = 'auto' }) {
  try {
    console.log('👁️ Analisando imagem...');

    // 1. Detectar tipo de análise automaticamente
    const detectedType = analysisType === 'auto'
      ? detectarTipoAnalise(userMessage)
      : analysisType;

    console.log(`📝 Tipo de análise: ${detectedType}`);

    // 2. Preparar prompt adequado
    const prompt = gerarPromptPorTipo(detectedType, userMessage);

    // 3. Processar com Gemini Vision
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: imageData.mimeType || 'image/jpeg',
          data: imageData.base64,
        },
      },
    ]);

    const response = await result.response;
    const analysis = response.text();

    // 4. Estruturar resposta
    return {
      type: detectedType,
      analysis,
      suggestions: extrairSugestoes(analysis, detectedType),
      metadata: {
        timestamp: Date.now(),
        model: 'gemini-2.0-flash-exp',
      },
    };

  } catch (error) {
    console.error('❌ Erro ao analisar imagem:', error);
    throw error;
  }
}

/**
 * Detecta tipo de análise baseado no contexto
 */
function detectarTipoAnalise(userMessage) {
  const lower = userMessage.toLowerCase();

  // Análise técnica (default se não pedir descrição)
  const pedidoDescricao = lower.match(/descrev|o que (é|e) |o que tem|o que voc[eê] v[eê]|leia/);

  if (pedidoDescricao) {
    return 'description';
  }

  // Tipos específicos
  if (lower.match(/erro|bug|exception|stack trace|console|log/)) {
    return 'error-analysis';
  }

  if (lower.match(/interface|ui|ux|design|layout|tela|screen/)) {
    return 'ui-analysis';
  }

  if (lower.match(/código|code|função|function|class|def |var |const |let /)) {
    return 'code-analysis';
  }

  if (lower.match(/documento|pdf|contract|report|relatório/)) {
    return 'document-extraction';
  }

  if (lower.match(/dashboard|gráfico|chart|metrics|dados|data/)) {
    return 'data-visualization-analysis';
  }

  // Default: análise técnica
  return 'technical-analysis';
}

/**
 * Gera prompt adequado por tipo de análise
 */
function gerarPromptPorTipo(type, userMessage) {
  const prompts = {
    'error-analysis': `Você é um engenheiro de software experiente analisando um erro.

TAREFA:
1. Identifique o erro exato
2. Explique a causa raiz
3. Sugira a correção específica
4. Indique arquivo e linha provável (se possível)
5. Proponha patch de código para correção

Mensagem do usuário: ${userMessage}

Seja técnico, preciso e direto ao ponto.`,

    'code-analysis': `Você é um code reviewer experiente.

TAREFA:
1. Analise o código mostrado
2. Identifique bugs, erros ou problemas
3. Sugira melhorias de performance
4. Proponha refatoração se necessário
5. Forneça código corrigido

Mensagem do usuário: ${userMessage}

Retorne análise técnica profissional.`,

    'ui-analysis': `Você é um especialista em interfaces de usuário (UI) e sistemas operacionais.
    
TAREFA:
1. Identifique EXATAMENTE o que está na tela (quais abas estão abertas, quais botões estão selecionados, quais mensagens estão visíveis).
2. Identifique o estado atual da interface (ex: aba selecionada, itens marcados, popups abertos).
3. Se houver uma seta ou marcação do usuário, foque no que ela aponta.
4. Identifique qualquer erro, warning ou comportamento inesperado na interface.

Mensagem do usuário: ${userMessage}

Seja extremamente observador. Não presuma nada que não esteja visualmente comprovado no print.`,

    'document-extraction': `Você é um assistente de extração de documentos.

TAREFA:
1. Extraia todas as informações relevantes
2. Estruture em formato legível
3. Identifique dados-chave
4. Resuma o conteúdo principal

Mensagem do usuário: ${userMessage}

Retorne dados estruturados.`,

    'data-visualization-analysis': `Você é um analista de dados experiente.

TAREFA:
1. Analise os dados visualizados
2. Identifique tendências e padrões
3. Extraia insights importantes
4. Sugira ações baseadas nos dados

Mensagem do usuário: ${userMessage}

Seja analítico e orientado a insights.`,

    'description': `Descreva a imagem de forma clara e detalhada.

Mensagem do usuário: ${userMessage}`,

    'technical-analysis': `Você é um analista técnico de sistemas.

Analise a imagem tecnicamente e forneça:
1. Identificação precisa do contexto e da aplicação mostrada.
2. Descrição do estado atual dos elementos (ex: checkboxes marcados, campos preenchidos, tabs ativas).
3. Diagnóstico de falhas ou comportamentos anômalos visíveis.
4. Plano de ação imediato para resolver qualquer problema identificado.

Mensagem do usuário: ${userMessage}

Seja direto, técnico e foque na funcionalidade, não na estética.`,
  };

  return prompts[type] || prompts['technical-analysis'];
}

/**
 * Extrai sugestões estruturadas da análise
 */
function extrairSugestoes(analysis, type) {
  const suggestions = [];

  // Padrões comuns de sugestões
  const patterns = [
    /sugest[ãa]o:?\s*(.+?)(?:\n|$)/gi,
    /corrija:?\s*(.+?)(?:\n|$)/gi,
    /recomend[oa]:?\s*(.+?)(?:\n|$)/gi,
    /melhoria:?\s*(.+?)(?:\n|$)/gi,
  ];

  for (const pattern of patterns) {
    const matches = analysis.matchAll(pattern);
    for (const match of matches) {
      suggestions.push(match[1].trim());
    }
  }

  // Se for análise de erro, extrair código proposto
  if (type === 'error-analysis' || type === 'code-analysis') {
    const codeBlocks = analysis.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      suggestions.push({
        type: 'code-patch',
        code: codeBlocks.map(block => block.replace(/```\w*\n?|\n?```/g, '')),
      });
    }
  }

  return suggestions;
}

/**
 * Analisa print de erro/console específico
 */
async function analisarPrintDeErro({ imageData, errorContext }) {
  console.log('🐛 Analisando print de erro...');

  const prompt = `Você é um engenheiro de software experiente analisando um erro.

CONTEXTO: ${errorContext || 'Print de console/erro enviado pelo usuário'}

TAREFA OBRIGATÓRIA:
1. **Identifique o erro exato** (tipo, mensagem, stack trace)
2. **Explique a causa raiz** (por que aconteceu)
3. **Arquivo e linha** (se visível no print)
4. **Correção específica** (código exato para corrigir)
5. **Impacto** (o que quebra se não corrigir)

FORMATO DA RESPOSTA:
## 🐛 Erro Identificado
[tipo e mensagem do erro]

## 🔍 Causa Raiz
[explicação técnica]

## 📁 Localização Provável
Arquivo: [nome do arquivo]
Linha: [número da linha]

## ✅ Correção Proposta
\`\`\`[linguagem]
[código corrigido]
\`\`\`

## ⚡ Impacto
[o que acontece se não corrigir]

## 📝 Commit Sugerido
\`\`\`
git commit -m "[tipo]: [descrição curta]"
\`\`\`

Seja EXTREMAMENTE técnico e preciso.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: imageData.mimeType || 'image/jpeg',
        data: imageData.base64,
      },
    },
  ]);

  const response = await result.response;
  return response.text();
}

// ======================================================================
// EXPORTS
// ======================================================================

export {
  analisarImagem,
  analisarPrintDeErro,
  detectarTipoAnalise,
};
