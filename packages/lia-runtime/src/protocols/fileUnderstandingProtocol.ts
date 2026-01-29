/**
 * LIA — Protocolo Oficial de Leitura e Interpretação de Arquivos (SSOT) v3.1
 * Fonte Única de Verdade para o pipeline de análise multimodal.
 * v3.1: Adicionado IntentMode.ACTION para Execution Router
 */

export enum IntentMode {
    ACTION = 'ACTION',      // Execução de ação real (deletar/criar/mover/etc)
    INCIDENT = 'INCIDENT',  // Diagnóstico e Execução (Bug/Erro)
    CONTENT = 'CONTENT',    // Produção e Transformação (Resumo/Extração)
    HYBRID = 'HYBRID'       // Misto (Geralmente Incidente seguido de Conteúdo)
}

export enum FileType {
    IMAGE = 'IMAGE',
    PDF = 'PDF',
    DOC = 'DOC',
    LOG = 'LOG',
    JSON = 'JSON',
    CONFIG = 'CONFIG',
    CODE = 'CODE',
    CSV = 'CSV',
    OTHER = 'OTHER'
}

export interface ProtocolConstraints {
    maxLines: number;
    requireFixAndValidation: boolean;
    allowLongForm: boolean;
}

export interface IntentResult {
    mode: IntentMode;
    fileTypes: FileType[];
    context: string;
}

/**
 * Inferir o modo de intenção baseado no texto do usuário e nos arquivos recebidos
 * ORDEM DE PRIORIDADE: ACTION > CONTENT > INCIDENT > DEFAULT
 */
export function inferIntentMode(
    userText: string,
    fileMimeTypes: string[] = [],
    conversationContext: string = ''
): IntentMode {
    // Normalizar texto: remover "Lia", "por favor" e normalizar espaços
    let text = (userText + ' ' + conversationContext).toLowerCase();
    text = text.replace(/\blia\b/g, '').replace(/\bpor favor\b/g, '').trim();

    // 0. NOVA REGRA: Pedidos de AÇÃO (ACTION) - ALTA PRIORIDADE
    const actionVerbs = [
        'delete', 'deleta', 'deletar', 'apague', 'apagar', 'exclua', 'excluir',
        'crie', 'criar', 'cria', 'faça', 'fazer', 'gere', 'gerar',
        'mova', 'mover', 'mude', 'mudar', 'transfira', 'transferir',
        'envie', 'enviar', 'mande', 'mandar',
        'agende', 'agendar', 'marque', 'marcar',
        'adicione', 'adicionar', 'insira', 'inserir',
        'remova', 'remover', 'tire', 'tirar',
        'atualize', 'atualizar', 'edite', 'editar',
        'conecte', 'conectar', 'desconecte', 'desconectar'
    ];

    // v1.2: Verbos de análise NÃO são ACTION - são consultas visuais
    const analysisVerbs = ['analise', 'analisar', 'veja', 'ver', 'olhe', 'olhar', 'leia', 'ler', 'verifique', 'verificar'];
    const hasAnalysisVerb = analysisVerbs.some(v => text.includes(v));

    const actionObjects = [
        'email', 'emails', 'e-mail', 'e-mails',
        'evento', 'eventos', 'reunião', 'reuniões', 'meet',
        'documento', 'doc', 'planilha', 'sheet', 'slide',
        'widget', 'card', 'componente',
        'mensagem', 'mensagens', 'arquivo', 'arquivos',
        'lixeira', 'trash', 'pasta', 'folder'
        // NOTA: 'print' e 'imagem' removidos - analisar print não é ACTION
    ];

    // Referências a contexto anterior
    const referenceIndicators = ['anterior', 'que eu enviei', 'acima', 'no print', 'na imagem'];
    const hasReference = referenceIndicators.some(r => text.includes(r));

    const hasActionVerb = actionVerbs.some(v => text.includes(v));
    const hasActionObject = actionObjects.some(o => text.includes(o));

    // Se é verbo de análise, NÃO é ACTION (mesmo com referência a print/imagem)
    if (hasAnalysisVerb) {
        // Pular para as outras verificações - não é ACTION
    } else if (hasActionVerb && (hasActionObject || hasReference)) {
        // Se houver verbo de ação + (objeto ou referência), é ACTION
        return IntentMode.ACTION;
    }


    // 1. Pedidos explícitos de transformação (CONTENT)
    const contentIndicators = [
        'transforme em documento', 'melhore', 'reescreva', 'resuma',
        'extraia as ideias', 'crie um relatório', 'organize', 'resumo'
    ];
    if (contentIndicators.some(ind => text.includes(ind))) {
        return IntentMode.CONTENT;
    }

    // 2. Pedidos de correção ou erro (INCIDENT)
    const incidentIndicators = [
        'não funciona', 'não executou', 'tá errado', 'bug', 'erro', 'falhou',
        'por que', 'o que está errado', 'como corrigir', 'valida', 'resolve',
        'inválido', 'quebrou', 'não deletou', 'não criou'
    ];
    if (incidentIndicators.some(ind => text.includes(ind))) {
        return IntentMode.INCIDENT;
    }

    // 3. Inferência baseada no tipo de arquivo (Heurística)
    const isCodeOrLog = fileMimeTypes.some(m =>
        m.includes('javascript') || m.includes('typescript') ||
        m.includes('text/plain') || m.includes('application/json')
    );

    if (isCodeOrLog && text.length < 50) {
        return IntentMode.INCIDENT; // Se enviar código/log com pouco texto, geralmente é erro
    }

    // Default: MODO A (Investigativo) conforme Regra de Ouro v3.0
    return IntentMode.INCIDENT;
}

/**
 * Retorna as restrições do protocolo para o modo selecionado
 */
export function getResponseConstraints(mode: IntentMode, userWantsDetail: boolean = false): ProtocolConstraints {
    switch (mode) {
        case IntentMode.ACTION:
            return {
                maxLines: 10,  // Respostas ACTION são MUITO curtas
                requireFixAndValidation: false,
                allowLongForm: false
            };
        case IntentMode.INCIDENT:
            return {
                maxLines: userWantsDetail ? 30 : 12,
                requireFixAndValidation: true,
                allowLongForm: false
            };
        case IntentMode.CONTENT:
            return {
                maxLines: 200,
                requireFixAndValidation: false,
                allowLongForm: true
            };
        case IntentMode.HYBRID:
            return {
                maxLines: 50,
                requireFixAndValidation: true,
                allowLongForm: true
            };
        default:
            return {
                maxLines: 15,
                requireFixAndValidation: true,
                allowLongForm: false
            };
    }
}

/**
 * Template sugerido para MODO A (Incidente)
 * v7.5: Tornado OPCIONAL e mais humano.
 */
export function templateIncident(): string {
    return `
Analise o problema de forma natural seguindo estes pontos:
- O que está acontecendo (Achado Principal)
- Evidência ou erro detectado
- Causa provável
- Sugestão de correção e como validar
`.trim();
}

/**
 * Template obrigatório para MODO ACTION (Execução)
 * PROIBIDO: ACHADO, EVIDÊNCIA, CAUSA RAIZ
 * Máximo 8-10 linhas
 */
export function templateAction(executed: boolean, capability?: string): string {
    if (executed) {
        return `
✅ **STATUS**: Ação executada com sucesso.
• [O que foi feito - bullet 1]
• [O que foi feito - bullet 2]
🔍 **Validação**: [Como confirmar que funcionou]
`.trim();
    } else {
        return `
⚠️ **STATUS**: Não consigo executar essa ação diretamente${capability ? ` (${capability})` : ''}.
• [Motivo 1 - ex: falta permissão/conexão]
• [Como habilitar]
💡 **Próximo passo**: [Instrução objetiva para o usuário]
`.trim();
    }
}

/**
 * Validador de QA para a resposta gerada
 */
export function validateResponse(lowerText: string): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // v7.5: Flexibilidade Total - Validamos apenas se a resposta não é genérica demais
    // Anti-descrição vazia
    if (lowerText.includes('na imagem há') && !lowerText.includes('causa') && !lowerText.includes('porque') && lowerText.length < 100) {
        errors.push('Detectada descrição genérica sem diagnóstico/resolução');
    }

    return { ok: errors.length === 0, errors };
}
