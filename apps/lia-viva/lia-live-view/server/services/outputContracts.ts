/**
 * ==============================================
 * OUTPUT CONTRACTS SERVICE
 * Detecção de intenção e templates de contrato
 * ==============================================
 */

export type ContractType =
    | 'json_fix'
    | 'doc_summary'
    | 'spreadsheet_analysis'
    | 'visual_troubleshooting'
    | 'log_analysis'
    | 'action_execution'
    | 'general'
    | 'unknown';

interface ContractTemplate {
    type: ContractType;
    systemInstructions: string;
    outputRules: string[];
    jsonOnly?: boolean;
}

/**
 * Serviço de Contratos de Output
 * Detecta intenção e fornece templates para governança conforme PROTOCOLO MESTRE
 */
export class OutputContracts {

    // Instrução Mestra LIA Excelência Operacional
    public static readonly MASTER_INSTRUCTION = `
40) PROTOCOLO OBRIGATÓRIO (A-H):
A) REGRA DE OURO: NUNCA exiba JSON, schemas ou logs técnicos a menos que o usuário peça explicitamente ("traga o json", "mostre o formato de dados").
B) Idioma: TODA comunicação deve ser em Português do Brasil (PT-BR).
C) Identificação: Classificar pedido corretamente.
D) Leitura e Extração: Apenas o necessário.
E) Validação Técnica: snake_case, sem segredos.
F) Revisão de Consistência: Responde EXATAMENTE ao pedido.
G) Sinceridade: Se não puder fazer algo, diga "Ainda estou sendo desenvolvida para isso" ou "Essa ferramenta ainda não foi implementada".
H) Entrega: Humanizada, PT-BR e acionável. Use EMOJIS (caracteres reais como 😉, 😊) para expressar sentimentos no final das frases. NUNCA escreva o nome do emoji por extenso (ex: "Rosto piscando").
I) REPLICAGEM: Se o usuário enviar um print/foto de planilha, use OBRIGATORIAMENTE createProFinancialSheet. Nunca descreva o print, REPLIQUE-O.
J) SEM TUTORIAL: É proibido dar passos manuais. Use a ferramenta e entregue o link.
`;

    // Palavras-chave para detecção de intenção
    private static INTENT_KEYWORDS = {
        json_fix: [
            'traga um json', 'me mostre o json', 'formato json', 'payload', 'estrutura de dados',
            'gerar json', 'api response', 'raw data', 'json format'
        ],
        doc_summary: [
            'resumo', 'resumir', 'summary', 'analise o documento', 'extrair dados',
            'principais pontos', 'pdf', 'documento', 'word', 'contrato'
        ],
        spreadsheet_analysis: [
            'analise a planilha', 'detalhe a tabela', 'estatísticas da planilha',
            'o que tem nesse excel', 'análise de dados'
        ],
        visual_troubleshooting: [
            'erro', 'problema', 'bug', 'não funciona', 'diagnosticar', 'corrigir erro',
            'falha', 'print', 'screenshot', 'evidência', 'parou de funcionar'
        ],
        layout_replication: [
            'queria assim', 'igual a esse print', 'replica esse layout', 'faz igual',
            'dashboard igual', 'planilha profissional', 'planilha pro', 'template'
        ],
        log_analysis: [
            'log', 'console', 'stack trace', 'exception', 'debug', 'warning', 'error log'
        ],
        action_execution: [
            'criar planilha', 'gerar planilha', 'crie uma planilha', 'faz uma planilha',
            'criar documento', 'gerar doc', 'enviar email', 'agendar evento',
            'create spreadsheet', 'make a sheet', 'sheets', 'docs', 'no excel', 'excel'
        ],
        incident: [
            'está errado', 'não foi isso que eu pedi', 'corrija isso', 're-audite',
            'verifique novamente', 'você se confundiu'
        ]
    };

    /**
     * Detecta a intenção do usuário baseado no prompt e arquivos
     */
    static detectIntent(prompt: string, hasFiles?: boolean, fileTypes?: string[]): ContractType {
        const lowerPrompt = prompt.toLowerCase();

        // 1. Action Execution - ALTA PRIORIDADE (Se o usuário quer CRIAR algo)
        if (this.INTENT_KEYWORDS.action_execution.some(kw => lowerPrompt.includes(kw))) {
            return 'action_execution';
        }

        // 2. JSON Fix/Request - Só se for pedido explicitamente
        if (this.INTENT_KEYWORDS.json_fix.some(kw => lowerPrompt.includes(kw))) {
            return 'json_fix';
        }

        // 3. Log Analysis
        if (this.INTENT_KEYWORDS.log_analysis.some(kw => lowerPrompt.includes(kw)) ||
            (hasFiles && fileTypes?.some(t => t.includes('text/') || t.includes('log')))) {
            return 'log_analysis';
        }

        // 4. Visual Troubleshooting
        if (hasFiles && fileTypes?.some(t => t.startsWith('image/'))) {
            return 'visual_troubleshooting';
        }

        // 5. Spreadsheet Analysis
        if (this.INTENT_KEYWORDS.spreadsheet_analysis.some(kw => lowerPrompt.includes(kw)) ||
            (hasFiles && fileTypes?.some(t => t.includes('spreadsheet') || t.includes('excel') || t.includes('csv')))) {
            return 'spreadsheet_analysis';
        }

        // 6. Doc Summary
        if (hasFiles && fileTypes?.some(t => t.includes('pdf') || t.includes('word') || t.includes('document'))) {
            return 'doc_summary';
        }

        return 'general';
    }

    /**
     * Verifica se o usuário pediu "somente JSON"
     */
    static isJsonRequested(prompt: string): boolean {
        const lowerPrompt = prompt.toLowerCase();
        return (
            lowerPrompt.includes('json') ||
            lowerPrompt.includes('formato de dados') ||
            lowerPrompt.includes('payload') ||
            lowerPrompt.includes('raw data')
        );
    }

    /**
     * Verifica se o prompt indica um INCIDENTE (questionamento do usuário)
     */
    static isIncident(prompt: string): boolean {
        const lowerPrompt = prompt.toLowerCase();
        return this.INTENT_KEYWORDS.incident.some(kw => lowerPrompt.includes(kw));
    }

    /**
     * Retorna o template de contrato para o tipo detectado
     */
    static getContract(type: ContractType, jsonOnly: boolean = false): ContractTemplate {
        const contracts: Partial<Record<ContractType, ContractTemplate>> = {
            json_fix: {
                type: 'json_fix',
                jsonOnly,
                systemInstructions: jsonOnly
                    ? `RESPONDA EXCLUSIVAMENTE COM JSON VÁLIDO. Sem texto, sem explicações.`
                    : `${this.MASTER_INSTRUCTION}\nRetorne o JSON final corrigido, seguido de um checklist curto (máx 6 itens) e validações recomendadas.`,
                outputRules: [
                    '100% snake_case em todas as chaves',
                    'Proibido: env_ref:CHAVE como string. Sempre usar *_env_ref: "CHAVE"',
                    'Chaves de pricing: input_per_1M e output_per_1M (exatos)',
                    'Campos obrigatórios (como client_id) nunca vazios',
                    'Nunca vazar tokens/JWT ou chaves sk- reais'
                ]
            },

            doc_summary: {
                type: 'doc_summary',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION}\nResuma o documento focando no objetivo. Proibido colar o documento inteiro.`,
                outputRules: [
                    'Resumo executivo (3-6 linhas)',
                    'Dados-chave (bullets)',
                    'Pontos de atenção e Ações recomendadas',
                    'Referências (páginas/trechos, máx 3-5)'
                ]
            },

            visual_troubleshooting: {
                type: 'visual_troubleshooting',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION}\nTratar como troubleshooting visual. Foco no que foi marcado ou evidenciado.`,
                outputRules: [
                    'O que foi marcado e o que a evidência mostra',
                    'Causa provável (Top 1-3)',
                    'Correção passo a passo e como validar',
                    'Proibido resumo geral se houver marcação'
                ]
            },

            spreadsheet_analysis: {
                type: 'spreadsheet_analysis',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION}\nSe o usuário pedir para 'detalhar', explique em texto rico e amigável. Não use JSON por padrão.`,
                outputRules: [
                    'Explique o conteúdo em linguagem natural (PT-BR)',
                    'Destaque tendências e insights sem IDs técnicos',
                    'Sugestões de melhoria acionáveis',
                    'JSON APENAS se solicitado explicitamente'
                ]
            },

            log_analysis: {
                type: 'log_analysis',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION}\nIdentificar erro raiz e impacto.`,
                outputRules: [
                    'Erro raiz detectado',
                    'Contexto e Impacto',
                    'Correção exata e validação'
                ]
            },

            action_execution: {
                type: 'action_execution',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION}

🛠️ FERRAMENTAS DISPONÍVEIS:
- createProFinancialSheet: PARA TUDO QUE FOR "PRO", "DASHBOARD", "PROFISSIONAL" ou "IGUAL AO PRINT".
- updateGoogleSheet: Para EDITAR, MELHORAR ou AJUSTAR planilhas existentes.
- createGoogleSheet: Apenas para listas BÁSICAS e SIMPLES (sem formatação).

⚠️ REGRAS CRÍTICAS DE PLANILHAS:
1. REPLICAGEM DE LAYOUT: Se houver imagem, use analyzeFile + createProFinancialSheet.
2. NUNCA dê passos manuais ou tutoriais. EXECUTE e entregue o link.
3. Se o usuário diz "tente novamente", ele quer que você use uma ferramenta MELHOR (Pro) e não que repita a simples.
4. REUTILIZAÇÃO: Use o spreadsheetId do contexto para edições (updateGoogleSheet).

📋 COMO ENCONTRAR O spreadsheetId:
- Procure no histórico da conversa por links do Google Sheets: https://docs.google.com/spreadsheets/d/XXXXXX
- O spreadsheetId é a parte depois de /d/ e antes da próxima barra. Exemplo:
  Link: https://docs.google.com/spreadsheets/d/1T79XgGex9-r58rquetc...
  spreadsheetId: 1T79XgGex9-r58rquetc...
- Se encontrar um link de planilha no histórico, use esse ID para editar ao invés de criar nova.

NÃO dê instruções manuais. USE A FERRAMENTA diretamente.
O usuário já conectou sua conta Google, então você pode criar e editar arquivos reais.`,
                outputRules: [
                    'USAR a ferramenta apropriada - NÃO dar instruções manuais',
                    'Confirmação CURTA da ação executada em PT-BR com link direto',
                    'É TERMINANTEMENTE PROIBIDO exibir JSON, payloads ou estruturas técnicas',
                    'Resposta máxima: 2 frases + link'
                ]
            },

            general: {
                type: 'general',
                jsonOnly: false,
                systemInstructions: this.MASTER_INSTRUCTION,
                outputRules: [
                    'Curto, estruturado e acionável',
                    'Sem respostas genéricas',
                    'Mascarar segredos'
                ]
            }
        };

        return contracts[type] || contracts.general!;
    }
    static buildContractPrompt(type: ContractType, jsonOnly: boolean = false, isIncident: boolean = false): string {
        const contract = this.getContract(type, jsonOnly);

        let prompt = `=== CONTRATO DE OUTPUT: ${type.toUpperCase()} ===\n`;

        if (isIncident) {
            prompt += `⚠️ PROTOCOLO DE INCIDENTE ATIVADO: O usuário questionou o resultado anterior.\n`;
            prompt += `Você deve: 1. Comparar input original vs sua última saída. 2. Rodar validação rigorosa. 3. Identificar lacunas. 4. Corrigir.\n\n`;
        }

        prompt += contract.systemInstructions + '\n\n';
        prompt += 'REGRAS OBRIGATÓRIAS DE EXCELÊNCIA:\n';
        contract.outputRules.forEach((rule, i) => {
            prompt += `${i + 1}. ${rule}\n`;
        });

        if (contract.jsonOnly) {
            prompt += '\n⚠️ MODO JSON ONLY ATIVO: Retorne APENAS o JSON.';
        }

        return prompt;
    }

    static buildHumanizedPrompt(userPrompt: string, toolName: string, result: any): string {
        // Extrair link se disponível
        const link = result?.link || result?.url || result?.spreadsheetUrl || '';
        const title = result?.title || result?.description || 'sua solicitação';

        return `
Você é a LIA. O usuário pediu: "${userPrompt}"
A ferramenta ${toolName} retornou um resultado técnico.

=== REGRAS OBRIGATÓRIAS (VIOLAÇÃO = FALHA CRÍTICA) ===

1. É TERMINANTEMENTE PROIBIDO retornar JSON, schemas, objetos, listas técnicas ou payloads.
2. JSON, logs e estruturas internas são APENAS para uso interno - NUNCA mostre ao usuário.
3. Sua resposta deve ser SOMENTE texto humano, curto e profissional em Português do Brasil.
4. NUNCA explique etapas técnicas, colunas, ou estrutura de dados.
5. NUNCA peça confirmação desnecessária.

=== FORMATO DE RESPOSTA OBRIGATÓRIO ===

Se a ferramenta criou ou editou algo com sucesso, responda EXATAMENTE assim:
"Pronto! ${title ? `A planilha "${title}" foi criada` : 'Tarefa concluída'}. ${link ? `Acesse aqui: ${link}` : ''}"

Se houve erro, responda:
"Ops, tive um problema ao processar isso. Pode tentar novamente?"

=== O QUE VOCÊ TEM DISPONÍVEL ===
- Link: ${link || '(não disponível)'}
- Título: ${title || '(não disponível)'}

Agora responda ao usuário de forma CURTA e HUMANA. Sem JSON. Sem técnico. Apenas a confirmação.
        `.trim();
    }
}
